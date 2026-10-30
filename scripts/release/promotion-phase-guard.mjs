/**
 * Restricciones de fase para promoción con migraciones (R6-C3).
 */

import { BOOTSTRAP_JOB_NAME } from './promotion-plan-contract.mjs';

/**
 * @param {object} input
 * @param {'full' | 'jobs-only' | 'services-only'} input.planMode
 * @param {Record<string, unknown>} input.migration
 * @param {Record<string, unknown> | null | undefined} input.migrateEvidence
 * @param {string} input.verifyRunId
 * @param {string} input.gitSha
 * @param {string} input.releaseBuildRunId
 */
export function validatePromotionPhaseGate(input) {
  const errors = [];
  const operation = input.operation ?? 'forward';

  if (operation === 'rollback') {
    if (input.planMode !== 'full') {
      errors.push('Rollback: solo plan_mode full (imágenes Cloud Run).');
    }
    const migration = input.migration ?? {};
    if (migration.requires_human_schema_review === true) {
      errors.push(
        'Rollback bloqueado: hay migraciones entre target y versión actual, o el diff no es fiable. No se acepta auto-aprobación. Recuperación por backup de Cloud SQL.',
      );
    }
    if (errors.length > 0) {
      return { ok: false, errors };
    }
    return { ok: true };
  }

  const migration = input.migration ?? {};
  const requiresJobsFirst = migration.requires_jobs_first_apply === true;
  const automatic = migration.automatic_migration_comparison !== false;

  if (!automatic && requiresJobsFirst) {
    errors.push(
      'Comparación automática de migraciones bloqueada: exige revisión manual de compatibilidad antes de promover.',
    );
  }

  if (requiresJobsFirst) {
    if (input.planMode === 'full') {
      errors.push(
        'Hay migraciones nuevas: plan_mode full prohibido. Usar jobs-only, migrate, luego services-only.',
      );
    }
    if (input.planMode === 'services-only') {
      if (!input.migrateEvidence) {
        errors.push(
          'services-only exige evidencia de maps-prod-migrate exitoso para este verify_run_id.',
        );
      } else {
        errors.push(...validateMigrateEvidence(input.migrateEvidence, input));
      }
    }
  } else if (input.planMode === 'jobs-only') {
    errors.push('jobs-only no aplica si no hay migraciones nuevas.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

/**
 * @param {Record<string, unknown>} evidence
 * @param {object} expected
 */
export function validateMigrateEvidence(evidence, expected) {
  const errors = [];
  if (evidence.schema_version !== 1) {
    errors.push('migrate evidence: schema_version inválida.');
  }
  if (evidence.verify_run_id !== expected.verifyRunId) {
    errors.push('migrate evidence: verify_run_id no coincide.');
  }
  if (evidence.git_sha !== expected.gitSha) {
    errors.push('migrate evidence: git_sha no coincide.');
  }
  if (String(evidence.release_build_run_id) !== String(expected.releaseBuildRunId)) {
    errors.push('migrate evidence: release_build_run_id no coincide.');
  }
  if (evidence.job_name !== 'maps-prod-migrate') {
    errors.push('migrate evidence: job_name debe ser maps-prod-migrate.');
  }
  if (evidence.succeeded !== true) {
    errors.push('migrate evidence: migrate no registrado como exitoso.');
  }
  if (typeof evidence.execution_name !== 'string' || evidence.execution_name.length === 0) {
    errors.push('migrate evidence: falta execution_name.');
  }
  const blob = JSON.stringify(evidence);
  if (blob.toLowerCase().includes(BOOTSTRAP_JOB_NAME)) {
    errors.push('migrate evidence: referencia a bootstrap prohibida.');
  }
  return errors;
}

/**
 * @param {Record<string, unknown>} binding
 * @param {object} expected
 */
export function validatePlanBinding(binding, expected) {
  const errors = [];
  if (binding.schema_version !== 1) {
    errors.push('plan binding: schema_version inválida.');
  }
  if (binding.verify_run_id !== expected.verifyRunId) {
    errors.push('plan binding: verify_run_id no coincide.');
  }
  if (binding.git_sha !== expected.gitSha) {
    errors.push('plan binding: git_sha no coincide.');
  }
  if (String(binding.release_build_run_id) !== String(expected.releaseBuildRunId)) {
    errors.push('plan binding: release_build_run_id no coincide.');
  }
  if (binding.plan_mode !== expected.planMode) {
    errors.push('plan binding: plan_mode no coincide.');
  }
  if (typeof binding.plan_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(binding.plan_sha256)) {
    errors.push('plan binding: plan_sha256 inválido.');
  }
  if (expected.planSha256 && binding.plan_sha256 !== expected.planSha256) {
    errors.push('plan binding: plan_sha256 no coincide con el input del workflow.');
  }
  return errors;
}
