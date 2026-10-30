#!/usr/bin/env node
/**
 * Ayuda a armar production-baseline.json comparando exports de gcloud (solo lectura).
 * No llama APIs de GCP; el operador pega salidas en archivos JSON o flags.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { validateProductionBaseline } from './validate-production-baseline.mjs';

const IMAGE_REF_RE = /@sha256:[0-9a-f]{64}$/i;

/**
 * @param {string} raw
 */
function normalizeImageRef(raw) {
  const trimmed = raw.trim();
  if (IMAGE_REF_RE.test(trimmed)) {
    return trimmed;
  }
  throw new Error(`Referencia de imagen inválida (se exige @sha256): ${trimmed.slice(0, 80)}`);
}

/**
 * @param {string} path
 */
function readImageFile(path) {
  const text = readFileSync(path, 'utf8').trim();
  if (text.startsWith('{')) {
    const j = JSON.parse(text);
    const img =
      j.image
      ?? j.spec?.template?.spec?.containers?.[0]?.image
      ?? j.template?.template?.spec?.containers?.[0]?.image;
    if (typeof img === 'string') {
      return normalizeImageRef(img);
    }
  }
  return normalizeImageRef(text);
}

/**
 * @param {object} input
 */
export function buildBaselineFromCaptures(input) {
  const errors = [];
  if (!/^[0-9a-f]{40}$/.test(input.gitSha)) {
    errors.push('git_sha debe ser 40 hex.');
  }
  let frontend;
  let backend;
  let jobs;
  try {
    frontend = readImageFile(input.frontendPath);
    backend = readImageFile(input.backendPath);
    jobs = readImageFile(input.jobsPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  const baseline = {
    schema_version: 1,
    recorded_at: new Date().toISOString(),
    recorded_by: input.recordedBy ?? 'capture-production-baseline.mjs',
    git_sha: input.gitSha,
    images: {
      frontend_image: frontend,
      backend_image: backend,
      jobs_image: jobs,
    },
    notes: 'Generado por capture-production-baseline.mjs; revisar contra terraform plan antes de promover.',
  };
  const check = validateProductionBaseline(baseline);
  if (!check.ok) {
    return { ok: false, errors: check.errors };
  }
  return { ok: true, baseline };
}

function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (const a of argv) {
    if (!a.startsWith('--')) {
      continue;
    }
    const [k, v] = a.slice(2).split('=');
    args[k] = v ?? 'true';
  }
  return args;
}

function runCli(argv) {
  const args = parseArgs(argv);
  if (!args['git-sha'] || !args['frontend'] || !args['backend'] || !args['jobs']) {
    process.stderr.write(
      'Uso: node capture-production-baseline.mjs --git-sha=<40hex> --frontend=<file> --backend=<file> --jobs=<file> [--recorded-by=...]\n',
    );
    process.exit(2);
  }
  const result = buildBaselineFromCaptures({
    gitSha: args['git-sha'],
    frontendPath: args.frontend,
    backendPath: args.backend,
    jobsPath: args.jobs,
    recordedBy: args['recorded-by'],
  });
  if (!result.ok) {
    for (const e of result.errors ?? []) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(`${JSON.stringify(result.baseline, null, 2)}\n`);
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
