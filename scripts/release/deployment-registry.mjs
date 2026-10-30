/**
 * Lectura lógica del registro de despliegues (GCS → JSON en workflow).
 */

import { validateDeploymentRecord } from './deployment-registry-contract.mjs';

/**
 * @param {unknown[]} rawRecords
 */
export function parseDeploymentRegistry(rawRecords) {
  const errors = [];
  /** @type {Record<string, unknown>[]} */
  const records = [];
  if (!Array.isArray(rawRecords)) {
    return { ok: false, errors: ['El registro debe ser un array JSON.'] };
  }
  const seen = new Set();
  for (const item of rawRecords) {
    const check = validateDeploymentRecord(item);
    if (!check.ok) {
      errors.push(...(check.errors ?? ['Registro inválido.']));
      continue;
    }
    const id = String(check.record?.deployment_id);
    if (seen.has(id)) {
      errors.push(`deployment_id duplicado: ${id}.`);
      continue;
    }
    seen.add(id);
    records.push(/** @type {Record<string, unknown>} */ (check.record));
  }
  if (errors.length > 0) {
    return { ok: false, errors, records };
  }
  return { ok: true, records };
}

/**
 * @param {Record<string, unknown>[]} records
 */
export function getSuccessfulDeployments(records) {
  return records
    .filter((r) => r.outcome === 'succeeded')
    .sort((a, b) => String(b.applied_at).localeCompare(String(a.applied_at)));
}

/**
 * @param {Record<string, unknown>[]} records
 */
export function getCurrentDeployment(records) {
  const ok = getSuccessfulDeployments(records);
  return ok[0] ?? null;
}

/**
 * @param {Record<string, unknown>[]} records
 * @param {string} deploymentId
 */
export function findDeploymentById(records, deploymentId) {
  return records.find((r) => r.deployment_id === deploymentId) ?? null;
}

/**
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 */
export function deploymentImageFingerprint(deployment) {
  const images = /** @type {Record<string, string>} */ (deployment.images ?? {});
  return [images.frontend_image, images.backend_image, images.jobs_image].join('|');
}

/**
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 */
export function sameDeploymentImages(a, b) {
  return deploymentImageFingerprint(a) === deploymentImageFingerprint(b);
}
