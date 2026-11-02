#!/usr/bin/env node
/**
 * Comprobaciones previas al apply (fase, binding, bootstrap).
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  assertManifestMatchesReleaseRun,
  productionImagesFromManifest,
} from './promotion-images.mjs';
import {
  validateApplyInputsMatchReport,
  validatePlanBinding,
  validatePromotionPhaseGate,
  validateReportImagesMatchManifest,
} from './promotion-phase-guard.mjs';
import { assertCommandDoesNotRunBootstrap } from './validate-terraform-plan.mjs';

/**
 * @param {object} options
 */
export function validatePromotionApplyGate(options) {
  const errors = [];
  // En un apply, toda evidencia (bundle, binding, migrate) debe estar ligada al commit de main
  // que lo ejecuta; sin ese dato la comprobación no puede hacerse y se bloquea.
  if ((options.report || options.planBinding || options.migrateEvidence) && !options.automationSha) {
    errors.push('Falta automationSha (commit de main que ejecuta el apply): no se puede ligar la evidencia.');
  }
  errors.push(
    ...validatePromotionPhaseGate({
      planMode: options.planMode,
      operation: options.operation ?? options.migration?.operation ?? 'forward',
      migration: options.migration ?? {},
      migrateEvidence: options.migrateEvidence ?? null,
      schemaApproval: options.schemaApproval ?? null,
      verifyRunId: options.verifyRunId,
      gitSha: options.gitSha,
      releaseBuildRunId: options.releaseBuildRunId,
      targetDeploymentId: options.targetDeploymentId,
      currentGitSha: options.currentGitSha,
      automationSha: options.automationSha,
    }).errors ?? [],
  );

  if (options.planBinding) {
    errors.push(
      ...validatePlanBinding(options.planBinding, {
        verifyRunId: options.verifyRunId,
        gitSha: options.gitSha,
        releaseBuildRunId: options.releaseBuildRunId,
        planMode: options.planMode,
        planSha256: options.planSha256,
        automationSha: options.automationSha,
      }),
    );
  } else if (options.requirePlanBinding) {
    errors.push('Falta plan binding JSON en GCS.');
  }

  if (options.report) {
    errors.push(
      ...validateApplyInputsMatchReport({
        inputOperation: options.inputOperation,
        inputGitSha: options.gitSha,
        inputReleaseBuildRunId: options.releaseBuildRunId,
        inputTargetDeploymentId: options.inputTargetDeploymentId,
        inputAutomationSha: options.automationSha,
        report: options.report,
      }),
    );
    if (options.bundleManifest) {
      // Con origen github/registry el manifiesto cita su corrida release-build; el baseline
      // R5 no tiene corrida y su manifiesto es sintético.
      if ((options.report.manifest_source ?? 'github') !== 'baseline') {
        errors.push(
          ...assertManifestMatchesReleaseRun(options.releaseBuildRunId, options.bundleManifest),
        );
      }
      const fromManifest = productionImagesFromManifest(options.bundleManifest);
      if (!fromManifest.ok) {
        errors.push(...fromManifest.errors);
      } else {
        errors.push(...validateReportImagesMatchManifest(options.report.images, fromManifest.tfvars));
      }
    }
  }

  if (options.shellCommand) {
    errors.push(...assertCommandDoesNotRunBootstrap(options.shellCommand));
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

function runCli(argv) {
  const args = Object.fromEntries(
    argv
      .filter((a) => a.startsWith('--'))
      .map((a) => {
        const [k, v] = a.slice(2).split('=');
        return [k, v ?? 'true'];
      }),
  );
  const reportPath = args['promotion-report'];
  const bindingPath = args['plan-binding'];
  const evidencePath = args['migrate-evidence'];
  const manifestPath = args.manifest;
  if (!reportPath || !args['plan-mode'] || !args['verify-run-id']) {
    process.stderr.write(
      'Uso: node validate-promotion-apply-gate.mjs --promotion-report=... --plan-mode=... --verify-run-id=... [--plan-binding=...] [--migrate-evidence=...] [--plan-sha256=...] [--git-sha=...] [--release-build-run-id=...] [--operation=promote|rollback] [--target-deployment-id=...] [--manifest=release-manifest.json] [--automation-sha=<GITHUB_SHA>]\n',
    );
    process.exit(2);
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const binding = bindingPath ? JSON.parse(readFileSync(bindingPath, 'utf8')) : null;
  const migrateEvidence = evidencePath ? JSON.parse(readFileSync(evidencePath, 'utf8')) : null;
  const schemaApprovalPath = args['schema-approval'];
  const schemaApproval = schemaApprovalPath
    ? JSON.parse(readFileSync(schemaApprovalPath, 'utf8'))
    : null;
  const result = validatePromotionApplyGate({
    planMode: /** @type any */ (args['plan-mode']),
    operation: report.operation ?? 'forward',
    migration: report.migration ?? {},
    migrateEvidence,
    schemaApproval,
    verifyRunId: args['verify-run-id'],
    gitSha: args['git-sha'] ?? report.git_sha,
    releaseBuildRunId: args['release-build-run-id'] ?? report.release_build_run_id,
    // Solo si el workflow pasa los inputs se contrastan con el bundle (fase apply).
    report: args['git-sha'] !== undefined ? report : undefined,
    inputOperation: args.operation,
    inputTargetDeploymentId: args['target-deployment-id'],
    automationSha: args['automation-sha'],
    bundleManifest: manifestPath ? JSON.parse(readFileSync(manifestPath, 'utf8')) : undefined,
    targetDeploymentId: report.target_deployment_id,
    currentGitSha: report.migration?.current_git_sha,
    planBinding: binding,
    requirePlanBinding: args['require-plan-binding'] === 'true',
    planSha256: args['plan-sha256'],
    shellCommand: args['shell-command'],
  });
  if (!result.ok) {
    for (const e of result.errors ?? []) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }
  process.stdout.write('Apply gate OK.\n');
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
