#!/usr/bin/env node
/**
 * Preflight de promoción (R6-C3): descarga manifiesto desde GitHub, autenticidad, tfvars e informe de migraciones.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildMigrationPromotionReport } from './detect-prisma-migrations.mjs';
import { fetchReleaseManifestFromGithub } from './download-release-manifest.mjs';
import { createGithubReleaseClient } from './github-release-api.mjs';
import { PRODUCTION_BASELINE_PATH } from './promotion-plan-contract.mjs';
import {
  assertManifestMatchesReleaseRun,
  formatPromotionTfvarsHcl,
  productionImagesFromManifest,
} from './promotion-images.mjs';
import {
  verifyGithubAuthenticity,
  verifyShaOnDevelopmentViaGithub,
} from './verify-release-authenticity.mjs';
import { validateReleaseManifest } from './validate-manifest.mjs';

/**
 * @param {string} repoRoot
 */
export function loadProductionBaseline(repoRoot) {
  const inline = process.env.PRODUCTION_BASELINE_JSON ?? process.env.MAPS_PRODUCTION_BASELINE_JSON;
  if (inline) {
    return JSON.parse(inline);
  }
  return JSON.parse(readFileSync(join(repoRoot, PRODUCTION_BASELINE_PATH), 'utf8'));
}

/**
 * @param {object} options
 * @param {string} options.gitSha
 * @param {string} options.releaseBuildRunId
 * @param {string} [options.repoRoot]
 * @param {string} [options.outDir]
 */
export async function runPromotionPreflight(options) {
  const errors = [];
  const repoRoot = options.repoRoot ?? process.cwd();
  const outDir = options.outDir ?? join(repoRoot, 'promotion-artifacts');

  const client = createGithubReleaseClient();
  let manifest;
  try {
    manifest = await fetchReleaseManifestFromGithub(
      client,
      options.releaseBuildRunId,
      options.gitSha,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: [`Descarga del manifiesto: ${message}`] };
  }

  errors.push(...assertManifestMatchesReleaseRun(options.releaseBuildRunId, manifest));

  const structural = validateReleaseManifest(manifest, options.gitSha);
  if (!structural.ok) {
    errors.push(...structural.errors);
  }

  const gh = await verifyGithubAuthenticity(
    manifest,
    options.gitSha,
    options.releaseBuildRunId,
    client,
  );
  if (!gh.ok) {
    errors.push(...gh.errors);
  }

  const dev = await verifyShaOnDevelopmentViaGithub(client, options.gitSha);
  if (!dev.ok) {
    errors.push(...dev.errors);
  }

  const images = productionImagesFromManifest(manifest);
  if (!images.ok) {
    errors.push(...images.errors);
  }

  let migrationReport = null;
  try {
    const baseline = loadProductionBaseline(repoRoot);
    migrationReport = buildMigrationPromotionReport(
      baseline,
      options.gitSha,
      repoRoot,
    );
    if (!migrationReport.ok) {
      errors.push(...(migrationReport.errors ?? []));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Baseline de producción: ${message}`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const tfvarsHcl = formatPromotionTfvarsHcl(images.tfvars);
  const report = {
    operation: 'forward',
    git_sha: options.gitSha,
    release_build_run_id: options.releaseBuildRunId,
    images: images.images,
    migration: migrationReport,
    plan_review_procedure: [
      'Generar plan local con tfvars de promoción y variables de producción existentes.',
      'Exportar JSON: terraform show -json plan.tfplan > plan.json',
      'Validar: node scripts/release/validate-terraform-plan.mjs plan.json --mode <full|jobs-only|services-only>',
      'Subir plan aprobado (sin sobrescribir): gsutil -h "x-goog-if-generation-match:0" cp plan.tfplan gs://BUCKET/promotion/plans/<verify_run_id>/<plan_mode>.tfplan',
      'Subir binding: promotion/plans/<verify_run_id>/<plan_mode>.binding.json con verify_run_id, git_sha, release_build_run_id, plan_mode, plan_sha256.',
      'Disparar workflow fase apply con verify_run_id y plan_sha256.',
    ],
  };

  return {
    ok: true,
    manifest,
    tfvarsHcl,
    report,
    outDir,
  };
}

async function runCli(argv) {
  if (argv.length < 2) {
    process.stderr.write(
      'Uso: node scripts/release/run-promotion-preflight.mjs <git-sha> <release-build-run-id> [out-dir]\n',
    );
    process.exit(2);
  }
  const [gitSha, runId, outDirArg] = argv;
  const repoRoot = process.cwd();
  const result = await runPromotionPreflight({
    gitSha,
    releaseBuildRunId: runId,
    repoRoot,
    outDir: outDirArg,
  });

  if (!result.ok) {
    for (const e of result.errors ?? []) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }

  const outDir = result.outDir ?? join(repoRoot, 'promotion-artifacts');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'release-manifest.json'), JSON.stringify(result.manifest, null, 2));
  writeFileSync(join(outDir, 'promotion.auto.tfvars'), result.tfvarsHcl);
  writeFileSync(join(outDir, 'promotion-report.json'), JSON.stringify(result.report, null, 2));
  process.stdout.write(`Preflight OK. Artefactos en ${outDir}\n`);
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
