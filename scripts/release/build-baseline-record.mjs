#!/usr/bin/env node
/**
 * Arma el registro `r5-baseline` del registro de despliegues a partir del baseline R5 y de
 * los `gcloud run ... describe --format=json` reales de producción. Solo lee archivos
 * locales y escribe un JSON: no sube nada a GCS (lo imprime como comando para el operador).
 *
 * Cada describe tiene que mostrar exactamente la imagen que declara el baseline. Si
 * difiere, no hay registro: el baseline sería una afirmación sin evidencia.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { gcsDeploymentRecordPath } from './deployment-registry-contract.mjs';
import { extractJobImage, extractServiceImage } from './post-promotion-verify.mjs';
import { readJsonFile } from './json-file.mjs';
import { detectShell } from './prepare-promotion-plan.mjs';
import { buildR5BaselineDeploymentRecord } from './record-deployment-outcome.mjs';
import { validateProductionBaseline } from './validate-production-baseline.mjs';

const RESOURCES = [
  { arg: 'frontend', name: 'maps-prod-frontend', kind: 'services', imageKey: 'frontend_image' },
  { arg: 'backend', name: 'maps-prod-backend', kind: 'services', imageKey: 'backend_image' },
  { arg: 'migrate-job', name: 'maps-prod-migrate', kind: 'jobs', imageKey: 'jobs_image' },
  { arg: 'bootstrap-job', name: 'maps-prod-bootstrap', kind: 'jobs', imageKey: 'jobs_image' },
];

/**
 * @param {object} input
 * @param {Record<string, unknown>} input.baseline contenido de production-baseline.json
 * @param {Record<string, any>} input.describes JSON de describe por clave (frontend, backend, migrate-job, bootstrap-job)
 * @param {string} [input.verifiedAt]
 */
export function buildBaselineRecordFromDescribes(input) {
  const check = validateProductionBaseline(input.baseline);
  if (!check.ok) {
    return { ok: false, errors: check.errors };
  }
  const baseline = /** @type {Record<string, any>} */ (input.baseline);
  const errors = [];
  /** @type {Record<string, { image: string }>} */
  const resources = {};

  for (const res of RESOURCES) {
    const json = input.describes[res.arg];
    if (!json) {
      errors.push(`Falta el describe de ${res.name} (--${res.arg}).`);
      continue;
    }
    const image = res.kind === 'services' ? extractServiceImage(json) : extractJobImage(json);
    if (image !== baseline.images[res.imageKey]) {
      errors.push(`${res.name}: Cloud Run sirve ${image || '(sin imagen)'} y el baseline declara ${baseline.images[res.imageKey]}.`);
      continue;
    }
    resources[res.name] = { image };
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const built = buildR5BaselineDeploymentRecord({
    gitSha: baseline.git_sha,
    images: baseline.images,
    appliedAt: baseline.recorded_at,
    cloudRunDigestEvidence: {
      verified_at: input.verifiedAt ?? new Date().toISOString(),
      method: 'gcloud_run_describe',
      resources,
    },
  });
  if (!built.ok) {
    return { ok: false, errors: built.errors };
  }
  return { ok: true, record: built.record };
}

function runCli(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const idx = a.indexOf('=');
      args[idx === -1 ? a.slice(2) : a.slice(2, idx)] = idx === -1 ? 'true' : a.slice(idx + 1);
    }
  }
  const needed = ['baseline', ...RESOURCES.map((r) => r.arg)];
  if (needed.some((k) => !args[k])) {
    process.stderr.write(
      `Uso: node scripts/release/build-baseline-record.mjs ${needed.map((k) => `--${k}=<archivo.json>`).join(' ')} [--out=r5-baseline.json] [--shell=powershell|bash]\n`,
    );
    process.exit(2);
  }
  const result = buildBaselineRecordFromDescribes({
    baseline: readJsonFile(args.baseline),
    describes: Object.fromEntries(
      RESOURCES.map((r) => [r.arg, readJsonFile(args[r.arg])]),
    ),
  });
  if (!result.ok) {
    for (const e of result.errors ?? []) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }
  const out = args.out ?? 'r5-baseline.json';
  const shell = args.shell ?? detectShell();
  if (shell !== 'powershell' && shell !== 'bash') {
    process.stderr.write('error: --shell debe ser powershell o bash.\n');
    process.exit(2);
  }
  writeFileSync(out, `${JSON.stringify(result.record, null, 2)}\n`);
  process.stdout.write(
    `Registro baseline escrito en ${out}. Subir (create-only; no ejecutado por este script; sintaxis ${shell}):\n`,
  );
  process.stdout.write(`  ${baselineUploadCommand(out, shell)}\n`);
}

/**
 * @param {string} file
 * @param {'powershell' | 'bash'} shell
 */
export function baselineUploadCommand(file, shell) {
  const objectPath = gcsDeploymentRecordPath('r5-baseline');
  return shell === 'powershell'
    ? `gsutil -h "x-goog-if-generation-match:0" cp "${file}" "gs://\${env:TF_STATE_BUCKET}/${objectPath}"`
    : `gsutil -h "x-goog-if-generation-match:0" cp ${file} gs://$TF_STATE_BUCKET/${objectPath}`;
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
