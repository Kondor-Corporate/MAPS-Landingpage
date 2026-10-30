#!/usr/bin/env node
/**
 * Comprobaciones previas al apply (fase, binding, bootstrap).
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  validateMigrateEvidence,
  validatePlanBinding,
  validatePromotionPhaseGate,
} from './promotion-phase-guard.mjs';
import { assertCommandDoesNotRunBootstrap } from './validate-terraform-plan.mjs';

/**
 * @param {object} options
 */
export function validatePromotionApplyGate(options) {
  const errors = [];
  errors.push(
    ...validatePromotionPhaseGate({
      planMode: options.planMode,
      migration: options.migration ?? {},
      migrateEvidence: options.migrateEvidence ?? null,
      verifyRunId: options.verifyRunId,
      gitSha: options.gitSha,
      releaseBuildRunId: options.releaseBuildRunId,
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
      }),
    );
  } else if (options.requirePlanBinding) {
    errors.push('Falta plan binding JSON en GCS.');
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
  if (!reportPath || !args['plan-mode'] || !args['verify-run-id']) {
    process.stderr.write(
      'Uso: node validate-promotion-apply-gate.mjs --promotion-report=... --plan-mode=... --verify-run-id=... [--plan-binding=...] [--migrate-evidence=...] [--plan-sha256=...] [--git-sha=...] [--release-build-run-id=...]\n',
    );
    process.exit(2);
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const binding = bindingPath ? JSON.parse(readFileSync(bindingPath, 'utf8')) : null;
  const migrateEvidence = evidencePath ? JSON.parse(readFileSync(evidencePath, 'utf8')) : null;
  const result = validatePromotionApplyGate({
    planMode: /** @type any */ (args['plan-mode']),
    migration: report.migration ?? {},
    migrateEvidence,
    verifyRunId: args['verify-run-id'],
    gitSha: args['git-sha'] ?? report.git_sha,
    releaseBuildRunId: args['release-build-run-id'] ?? report.release_build_run_id,
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
