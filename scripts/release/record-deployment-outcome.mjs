#!/usr/bin/env node
/**
 * Registra un despliegue exitoso (o fallido) en GCS — create-only.
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import {
  DEPLOYMENT_RECORD_SCHEMA_VERSION,
  gcsDeploymentRecordPath,
} from './deployment-registry-contract.mjs';
import { validateDeploymentRecord } from './deployment-registry-contract.mjs';

/**
 * @param {object} input
 */
export function buildDeploymentRecord(input) {
  const record = {
    schema_version: DEPLOYMENT_RECORD_SCHEMA_VERSION,
    deployment_id: input.deploymentId,
    operation: input.operation ?? 'forward',
    git_sha: input.gitSha,
    release_build_run_id: input.releaseBuildRunId ?? null,
    images: input.images,
    promotion_verify_run_id: input.promotionVerifyRunId,
    apply_run_id: input.applyRunId,
    applied_at: input.appliedAt ?? new Date().toISOString(),
    outcome: input.outcome ?? 'succeeded',
    migrations_executed: input.migrationsExecuted === true,
    cloud_run_digest_evidence: input.cloudRunDigestEvidence ?? null,
    replaced_deployment_id: input.replacedDeploymentId ?? null,
    previous_git_sha: input.previousGitSha ?? null,
    schema_review: input.schemaReview ?? null,
    post_verify: input.postVerify ?? null,
    verified_manifest: input.verifiedManifest ?? null,
  };
  const check = validateDeploymentRecord(record, { expectedDeploymentId: input.deploymentId });
  if (!check.ok) {
    return { ok: false, errors: check.errors };
  }
  return { ok: true, record };
}

/**
 * @param {object} input
 * @param {string} bucket
 */
export function uploadDeploymentRecord(input, bucket) {
  const built = buildDeploymentRecord(input);
  if (!built.ok) {
    return { ok: false, errors: built.errors };
  }
  const localPath = 'deployment-record.json';
  writeFileSync(localPath, JSON.stringify(built.record, null, 2));
  const objectPath = gcsDeploymentRecordPath(input.deploymentId);
  const dest = `gs://${bucket}/${objectPath}`;
  const result = spawnSync(
    'gsutil',
    ['-h', 'x-goog-if-generation-match:0', 'cp', localPath, dest],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );
  if (result.status !== 0) {
    return {
      ok: false,
      errors: [(result.stderr || result.stdout || 'gsutil cp falló').trim()],
    };
  }
  return { ok: true, record: built.record, gcsPath: dest };
}

/**
 * @param {object} input baseline R5 with cloud_run_digest_evidence
 */
export function buildR5BaselineDeploymentRecord(input) {
  return buildDeploymentRecord({
    deploymentId: input.deploymentId ?? 'r5-baseline',
    operation: 'baseline',
    gitSha: input.gitSha,
    releaseBuildRunId: null,
    images: input.images,
    promotionVerifyRunId: input.promotionVerifyRunId ?? 'manual-r5',
    applyRunId: input.applyRunId ?? 'manual-r5',
    appliedAt: input.appliedAt,
    outcome: 'succeeded',
    migrationsExecuted: false,
    cloudRunDigestEvidence: input.cloudRunDigestEvidence,
    schemaReview: {
      note: 'Baseline inicial; evidencia Cloud Run verificada manualmente.',
    },
  });
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
  const postPath = args['post-verify'];
  if (!args.bucket || !args['deployment-id'] || !args['promotion-verify-run-id'] || !reportPath) {
    process.stderr.write(
      'Uso: node record-deployment-outcome.mjs --bucket=B --deployment-id=... --promotion-verify-run-id=... --apply-run-id=... --promotion-report=... [--post-verify=...] [--outcome=succeeded|partial|failed]\n',
    );
    process.exit(2);
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const postVerify = postPath ? JSON.parse(readFileSync(postPath, 'utf8')) : null;
  const manifestPath = args.manifest;
  const verifiedManifest = manifestPath ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
  let outcome = args.outcome ?? (postVerify?.ok === false ? 'partial' : 'succeeded');
  if (outcome === 'succeeded' && postVerify?.ok !== true && report.operation !== 'baseline') {
    outcome = 'partial';
  }
  const result = uploadDeploymentRecord(
    {
      deploymentId: args['deployment-id'],
      operation: report.operation === 'forward' ? 'promote' : (report.operation ?? 'promote'),
      gitSha: report.git_sha,
      releaseBuildRunId: report.release_build_run_id,
      images: report.images,
      promotionVerifyRunId: args['promotion-verify-run-id'],
      applyRunId: args['apply-run-id'] ?? args['promotion-verify-run-id'],
      outcome,
      migrationsExecuted: report.migration?.migrations_executed === true,
      replacedDeploymentId: report.rollback_from?.deployment_id ?? null,
      previousGitSha: report.rollback_from?.git_sha ?? null,
      schemaReview: null,
      postVerify,
      cloudRunDigestEvidence: postVerify?.cloud_run ?? null,
      verifiedManifest,
    },
    args.bucket,
  );
  if (!result.ok) {
    for (const e of result.errors ?? []) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(`Registro en ${result.gcsPath}\n`);
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
