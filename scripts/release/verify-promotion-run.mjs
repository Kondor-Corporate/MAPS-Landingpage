#!/usr/bin/env node
/**
 * Autenticidad de la corrida de verify que respalda un apply.
 *
 * El apply descarga `promotion-bundle` de `verify_run_id`. Sin esta comprobación
 * cualquier run del repositorio con un artifact de ese nombre sería aceptado. Se exige
 * que sea una corrida terminada en success de release-promote.yml, lanzada a mano desde
 * main, y que el artifact siga vigente y pertenezca a esa corrida.
 */

import { pathToFileURL } from 'node:url';

import { GITHUB_REPOSITORY } from './manifest-contract.mjs';
import { artifactWorkflowRunId, createGithubReleaseClient } from './github-release-api.mjs';
import { PROMOTE_WORKFLOW_PATH } from './promotion-plan-contract.mjs';

export const PROMOTION_BUNDLE_ARTIFACT = 'promotion-bundle';

/**
 * @param {Record<string, unknown>} run respuesta de GET /actions/runs/{id}
 * @param {Array<Record<string, unknown>>} artifacts artifacts de esa corrida
 * @param {string} verifyRunId
 * @param {{ automationSha?: string }} [options] automationSha = commit de main que ejecuta el apply
 */
export function assertPromotionVerifyRun(run, artifacts, verifyRunId, options = {}) {
  const errors = [];
  // El verify revisó scripts y Terraform de un commit de main. Si el apply corre con otro,
  // el plan aprobado ya no corresponde al código que lo va a aplicar.
  if (typeof options.automationSha !== 'string' || !/^[0-9a-f]{40}$/.test(options.automationSha)) {
    errors.push('Falta el commit de main del apply (--automation-sha): no se puede ligar con el verify.');
  } else if (run.head_sha !== options.automationSha) {
    errors.push(
      `La corrida de verify usó el commit de main ${String(run.head_sha)} y este apply corre en ${options.automationSha}. `
      + 'Main cambió desde el verify: repetir verify, plan y binding.',
    );
  }
  if (String(run.id) !== String(verifyRunId)) {
    errors.push('La API de GitHub devolvió otra corrida que verify_run_id.');
  }
  if (run.status !== 'completed' || run.conclusion !== 'success') {
    errors.push('La corrida de verify no terminó en success.');
  }
  if (run.event !== 'workflow_dispatch') {
    errors.push('La corrida de verify no es workflow_dispatch.');
  }
  // GitHub puede devolver el path con sufijo "@refs/heads/<rama>".
  const path = typeof run.path === 'string' ? run.path.split('@')[0] : '';
  if (path !== PROMOTE_WORKFLOW_PATH) {
    errors.push(`verify_run_id no es una corrida de ${PROMOTE_WORKFLOW_PATH} (path=${String(run.path)}).`);
  }
  if (run.head_branch !== 'main') {
    errors.push(`La corrida de verify no salió de main (head_branch=${String(run.head_branch)}).`);
  }
  const fullName = /** @type {{ full_name?: string } | undefined} */ (run.repository)?.full_name;
  if (fullName !== undefined && fullName !== GITHUB_REPOSITORY) {
    errors.push('La corrida de verify pertenece a otro repositorio.');
  }

  const bundle = artifacts.find(
    (a) => a.name === PROMOTION_BUNDLE_ARTIFACT && artifactWorkflowRunId(a) === String(verifyRunId),
  );
  if (!bundle) {
    errors.push(`La corrida ${verifyRunId} no tiene el artifact ${PROMOTION_BUNDLE_ARTIFACT}.`);
  } else if (bundle.expired) {
    errors.push(
      `El artifact ${PROMOTION_BUNDLE_ARTIFACT} de la corrida ${verifyRunId} expiró; repetir la fase verify.`,
    );
  }
  return errors;
}

/**
 * @param {string} verifyRunId
 * @param {string} automationSha
 * @param {ReturnType<typeof createGithubReleaseClient>} [client]
 */
export async function verifyPromotionVerifyRun(verifyRunId, automationSha, client = createGithubReleaseClient()) {
  try {
    const run = await client.getWorkflowRun(verifyRunId);
    const artifacts = await client.listRunArtifacts(verifyRunId);
    const errors = assertPromotionVerifyRun(run, artifacts, verifyRunId, { automationSha });
    return errors.length > 0 ? { ok: false, errors } : { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: [`GitHub: ${message}`] };
  }
}

async function runCli(argv) {
  const verifyRunId = argv.find((a) => a.startsWith('--verify-run-id='))?.slice('--verify-run-id='.length);
  const automationSha = argv.find((a) => a.startsWith('--automation-sha='))?.slice('--automation-sha='.length);
  if (!verifyRunId || !/^[0-9]+$/.test(verifyRunId) || !automationSha) {
    process.stderr.write(
      'Uso: node scripts/release/verify-promotion-run.mjs --verify-run-id=<numérico> --automation-sha=<GITHUB_SHA del apply>\n',
    );
    process.exit(2);
  }
  const result = await verifyPromotionVerifyRun(verifyRunId, automationSha);
  if (!result.ok) {
    for (const e of result.errors) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(`Corrida de verify ${verifyRunId} auténtica.\n`);
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
