#!/usr/bin/env node
/**
 * Escribe evidencia de maps-prod-migrate en GCS (create-only).
 */

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { gcloudStorageCreateOnlyCopy } from './gcloud-storage.mjs';
import { gcsMigrateEvidencePath } from './promotion-plan-contract.mjs';

/**
 * @param {object} input
 */
export function buildMigrateEvidenceRecord(input) {
  return {
    schema_version: 1,
    verify_run_id: input.verifyRunId,
    git_sha: input.gitSha,
    // Commit de main (scripts y Terraform) bajo el que se ejecutó la migración; el apply
    // services-only solo la acepta si corre con ese mismo commit.
    automation_sha: input.automationSha,
    release_build_run_id: String(input.releaseBuildRunId),
    job_name: 'maps-prod-migrate',
    execution_name: input.executionName,
    succeeded: true,
    recorded_at: new Date().toISOString(),
    recorded_by: input.recordedBy ?? 'release-promote',
  };
}

/**
 * @param {object} input
 * @param {string} bucket
 */
export function uploadMigrateEvidence(input, bucket) {
  const record = buildMigrateEvidenceRecord(input);
  const localPath = 'migrate-evidence.json';
  writeFileSync(localPath, JSON.stringify(record, null, 2));
  const objectPath = gcsMigrateEvidencePath(input.verifyRunId);
  const dest = `gs://${bucket}/${objectPath}`;
  const result = gcloudStorageCreateOnlyCopy(localPath, dest);
  if (!result.ok) {
    return result;
  }
  return { ok: true, record, gcsPath: dest };
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
  if (
    !args.bucket
    || !args['verify-run-id']
    || !args['git-sha']
    || !args['release-build-run-id']
    || !args['execution-name']
    || !/^[0-9a-f]{40}$/.test(args['automation-sha'] ?? '')
  ) {
    process.stderr.write(
      'Uso: node record-migrate-evidence.mjs --bucket=BUCKET --verify-run-id=... --git-sha=... --release-build-run-id=... --execution-name=... --automation-sha=<GITHUB_SHA>\n',
    );
    process.exit(2);
  }
  const result = uploadMigrateEvidence(
    {
      verifyRunId: args['verify-run-id'],
      gitSha: args['git-sha'],
      releaseBuildRunId: args['release-build-run-id'],
      executionName: args['execution-name'],
      automationSha: args['automation-sha'],
    },
    args.bucket,
  );
  if (!result.ok) {
    for (const e of result.errors ?? []) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(`Evidencia en ${result.gcsPath}\n`);
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
