/**
 * Selección de objetivo de rollback solo desde registro GCS verificado.
 */

import {
  findDeploymentById,
  getCurrentDeployment,
  sameDeploymentImages,
  parseDeploymentRegistry,
} from './deployment-registry.mjs';
import { validateDeploymentRecord } from './deployment-registry-contract.mjs';

/**
 * @param {object} input
 * @param {unknown[]} input.registryRecords
 * @param {string} input.targetDeploymentId
 * @param {string} [input.assertGitSha]
 * @param {string} [input.assertReleaseBuildRunId]
 */
export function validateRollbackTargetSelection(input) {
  const errors = [];
  const parsed = parseDeploymentRegistry(input.registryRecords);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors ?? ['Registro corrupto.'] };
  }
  const records = parsed.records ?? [];

  const target = findDeploymentById(records, input.targetDeploymentId);
  if (!target) {
    errors.push('Target de rollback inexistente en el registro de despliegues.');
    return { ok: false, errors };
  }

  const targetCheck = validateDeploymentRecord(target, {
    expectedDeploymentId: input.targetDeploymentId,
  });
  if (!targetCheck.ok) {
    errors.push(...(targetCheck.errors ?? []));
  }
  if (target.outcome !== 'succeeded') {
    errors.push('Solo se puede rollback a un despliegue con outcome succeeded.');
  }
  if (target.operation === 'baseline' && !target.cloud_run_digest_evidence) {
    errors.push(
      'Baseline R5: exige cloud_run_digest_evidence verificada antes de usarse como target.',
    );
  }

  const current = getCurrentDeployment(records);
  if (!current) {
    errors.push('No hay despliegue actual succeeded en el registro.');
    return { ok: false, errors };
  }

  if (target.deployment_id === current.deployment_id) {
    errors.push('El target ya es el despliegue actual.');
  }
  if (sameDeploymentImages(target, current)) {
    errors.push('Los digests del target coinciden con el despliegue actual; rollback innecesario.');
  }
  if (target.git_sha === current.git_sha) {
    errors.push('El git_sha del target ya está desplegado.');
  }

  if (input.assertGitSha && input.assertGitSha !== target.git_sha) {
    errors.push('git_sha del workflow no coincide con el registro GCS (no se aceptan valores arbitrarios).');
  }
  if (
    input.assertReleaseBuildRunId
    && String(target.release_build_run_id) !== String(input.assertReleaseBuildRunId)
  ) {
    errors.push('release_build_run_id no coincide con el registro GCS.');
  }

  if (errors.length > 0) {
    return { ok: false, errors, target, current };
  }

  return {
    ok: true,
    target,
    current,
    rollback_from: {
      deployment_id: current.deployment_id,
      git_sha: current.git_sha,
      images: current.images,
      applied_at: current.applied_at,
    },
  };
}

/**
 * @param {Record<string, unknown>} targetImages
 * @param {Record<string, string>} manifestTfvars
 */
export function assertRegistryMatchesManifestImages(targetImages, manifestTfvars) {
  const errors = [];
  const img = /** @type {Record<string, string>} */ (targetImages);
  for (const key of ['frontend_image', 'backend_image', 'jobs_image']) {
    if (manifestTfvars[key] !== img[key]) {
      errors.push(
        `Manifiesto no coincide con registro GCS en ${key} (rechazar JSON/imagen arbitraria).`,
      );
    }
  }
  return errors;
}
