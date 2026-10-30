#!/usr/bin/env node
/**
 * Preflight de rollback (R6-C4): target solo desde registro GCS + manifiesto ligado.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { fetchReleaseManifestFromGithub } from './download-release-manifest.mjs';
import { createGithubReleaseClient } from './github-release-api.mjs';
import { resolveRollbackManifest } from './rollback-manifest.mjs';
import {
  validateRollbackTargetSelection,
} from './rollback-selection.mjs';
import { evaluateRollbackSchemaRisk } from './rollback-schema-guard.mjs';
import { formatPromotionTfvarsHcl } from './promotion-images.mjs';
import { validateReleaseManifest } from './validate-manifest.mjs';
import { verifyGithubAuthenticity } from './verify-release-authenticity.mjs';

/**
 * @param {string} repoRoot
 */
export function loadDeploymentRegistry(repoRoot) {
  const inline = process.env.DEPLOYMENT_REGISTRY_JSON ?? process.env.MAPS_DEPLOYMENT_REGISTRY_JSON;
  if (inline) {
    return JSON.parse(inline);
  }
  const path = process.env.DEPLOYMENT_REGISTRY_PATH
    ?? join(repoRoot, 'config/release/deployment-registry.snapshot.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * @param {object} options
 */
export async function runRollbackPreflight(options) {
  const errors = [];
  const repoRoot = options.repoRoot ?? process.cwd();
  const outDir = options.outDir ?? join(repoRoot, 'promotion-artifacts');

  let registryRecords;
  try {
    registryRecords = loadDeploymentRegistry(repoRoot);
    if (!Array.isArray(registryRecords)) {
      errors.push('Registro de despliegues debe ser un array JSON.');
      return { ok: false, errors };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Registro GCS/snapshot: ${message}`);
    return { ok: false, errors };
  }

  const selection = validateRollbackTargetSelection({
    registryRecords,
    targetDeploymentId: options.targetDeploymentId,
    assertGitSha: options.gitSha,
    assertReleaseBuildRunId:
      targetRunIdOrEmpty(options.releaseBuildRunId),
  });
  if (!selection.ok) {
    return { ok: false, errors: selection.errors ?? ['Selección de rollback inválida.'] };
  }

  const target = /** @type {Record<string, unknown>} */ (selection.target);
  const current = /** @type {Record<string, unknown>} */ (selection.current);
  const gitSha = String(target.git_sha);

  const schema = evaluateRollbackSchemaRisk({
    repoRoot,
    targetGitSha: gitSha,
    currentGitSha: String(current.git_sha),
  });
  if (!schema.ok) {
    errors.push(...(schema.errors ?? []));
  }

  /** @type {{ ok: true, manifest: Record<string, unknown> } | { ok: false, errors: string[] } | null} */
  let github = null;
  if (target.operation !== 'baseline') {
    const client = createGithubReleaseClient();
    try {
      const manifest = await fetchReleaseManifestFromGithub(
        client,
        String(target.release_build_run_id),
        gitSha,
      );
      const structural = validateReleaseManifest(manifest, gitSha);
      const gh = await verifyGithubAuthenticity(
        manifest,
        gitSha,
        String(target.release_build_run_id),
        client,
      );
      if (!structural.ok || !gh.ok) {
        github = { ok: false, errors: [...(structural.errors ?? []), ...(gh.errors ?? [])] };
      } else {
        github = { ok: true, manifest };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      github = { ok: false, errors: [`Artifact o API de GitHub: ${message}`] };
    }
  }

  const resolved = resolveRollbackManifest({ target, github });
  if (!resolved.ok) {
    errors.push(...(resolved.errors ?? []));
    return { ok: false, errors };
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const tfvarsHcl = formatPromotionTfvarsHcl(resolved.tfvars);
  const report = {
    operation: 'rollback',
    git_sha: gitSha,
    release_build_run_id: resolved.release_build_run_id,
    target_deployment_id: options.targetDeploymentId,
    manifest_source: resolved.manifest_source,
    rollback_from: selection.rollback_from,
    images: resolved.images,
    schema_rollback: schema,
    migration: {
      requires_jobs_first_apply: false,
      automatic_migration_comparison: schema.automatic_assessment !== false,
      requires_human_schema_review: false,
      target_deployment_id: options.targetDeploymentId,
      current_git_sha: String(current.git_sha),
      notes: 'Rollback: no ejecutar migrate Prisma. Si hay migraciones intermedias el preflight ya falló.',
    },
    plan_review_procedure: [
      'Rollback usa el mismo flujo de plan/binding/apply que promoción (R6-C3).',
      'plan_mode: full. Scripts y Terraform del apply salen de main, no del SHA de la app.',
      'Subir plan/binding a promotion/plans/<verify_run_id>/full.*.',
    ],
  };

  return {
    ok: true,
    manifest: resolved.manifest,
    tfvarsHcl,
    report,
    outDir,
  };
}

/** @param {string | undefined} value */
function targetRunIdOrEmpty(value) {
  if (value == null || value === '' || value === 'null') {
    return undefined;
  }
  return value;
}

async function runCli(argv) {
  const args = Object.fromEntries(
    argv
      .filter((a) => a.startsWith('--'))
      .map((a) => {
        const [k, v] = a.slice(2).split('=');
        return [k, v ?? 'true'];
      }),
  );
  const positional = argv.filter((a) => !a.startsWith('--'));
  if (!args['target-deployment-id'] || positional.length < 2) {
    process.stderr.write(
      'Uso: node run-rollback-preflight.mjs <git-sha> <release-build-run-id> <out-dir> --target-deployment-id=ID [--schema-approval=path.json]\n',
    );
    process.exit(2);
  }
  const [gitSha, runId, outDirArg] = positional;

  const result = await runRollbackPreflight({
    gitSha,
    releaseBuildRunId: runId,
    targetDeploymentId: args['target-deployment-id'],
    repoRoot: process.cwd(),
    outDir: outDirArg,
  });

  if (!result.ok) {
    for (const e of result.errors ?? []) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }

  const outDir = result.outDir ?? join(process.cwd(), 'promotion-artifacts');
  mkdirSync(outDir, { recursive: true });
  const manifestOut = result.manifest ?? {
    git_sha: result.report.git_sha,
    manifest_source: 'baseline',
    images: [
      { id: 'frontend', immutable_ref: result.report.images.frontend_image },
      { id: 'backend', immutable_ref: result.report.images.backend_image },
      { id: 'backend-jobs', immutable_ref: result.report.images.jobs_image },
    ],
  };
  writeFileSync(join(outDir, 'release-manifest.json'), JSON.stringify(manifestOut, null, 2));
  writeFileSync(join(outDir, 'promotion.auto.tfvars'), result.tfvarsHcl);
  writeFileSync(join(outDir, 'promotion-report.json'), JSON.stringify(result.report, null, 2));
  process.stdout.write(`Rollback preflight OK. Artefactos en ${outDir}\n`);
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
