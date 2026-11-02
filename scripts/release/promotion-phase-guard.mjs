/**
 * Restricciones de fase para promoción con migraciones (R6-C3).
 */

import {
  BOOTSTRAP_JOB_NAME,
  REPORT_OPERATION_BY_INPUT,
  normalizeRunId,
} from './promotion-plan-contract.mjs';

const COMMIT_SHA_RE = /^[0-9a-f]{40}$/;

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
  if (normalizeRunId(evidence.release_build_run_id) !== normalizeRunId(expected.releaseBuildRunId)) {
    errors.push('migrate evidence: release_build_run_id no coincide.');
  }
  if (expected.automationSha !== undefined && evidence.automation_sha !== expected.automationSha) {
    errors.push('migrate evidence: automation_sha no coincide con el commit de main que ejecuta este apply.');
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
  if (normalizeRunId(binding.release_build_run_id) !== normalizeRunId(expected.releaseBuildRunId)) {
    errors.push('plan binding: release_build_run_id no coincide.');
  }
  if (binding.plan_mode !== expected.planMode) {
    errors.push('plan binding: plan_mode no coincide.');
  }
  // El plan solo vale para el commit de main (scripts y Terraform) bajo el que se generó.
  if (typeof binding.automation_sha !== 'string' || !COMMIT_SHA_RE.test(binding.automation_sha)) {
    errors.push('plan binding: falta automation_sha (commit de main del verify). Repetir verify y plan.');
  } else if (binding.automation_sha !== expected.automationSha) {
    errors.push(
      'plan binding: el plan se generó con otro commit de main que el que ejecuta este apply. '
      + 'Main cambió desde el verify: repetir verify, plan y binding.',
    );
  }
  if (typeof binding.plan_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(binding.plan_sha256)) {
    errors.push('plan binding: plan_sha256 inválido.');
  }
  if (expected.planSha256 && binding.plan_sha256 !== expected.planSha256) {
    errors.push('plan binding: plan_sha256 no coincide con el input del workflow.');
  }
  return errors;
}

/**
 * Los inputs de la fase apply deben describir la misma operación que el bundle del verify.
 * Sin esto, un bundle de promoción podría aplicarse con operation=rollback (o al revés) o con
 * otro git_sha, porque el workflow solo comparaba el binding contra los inputs.
 *
 * @param {object} input
 * @param {string} [input.inputOperation] promote | rollback
 * @param {string} [input.inputGitSha]
 * @param {string} [input.inputReleaseBuildRunId]
 * @param {string} [input.inputTargetDeploymentId]
 * @param {string} [input.inputAutomationSha] commit de main que ejecuta este apply (GITHUB_SHA)
 * @param {Record<string, unknown>} input.report promotion-report.json del bundle
 */
export function validateApplyInputsMatchReport(input) {
  const errors = [];
  const report = input.report ?? {};

  // El bundle lo produjo el verify bajo un commit de main concreto. Si main avanzó, los
  // scripts y el Terraform de este apply ya no son los que se revisaron.
  if (typeof input.inputAutomationSha !== 'string' || !COMMIT_SHA_RE.test(input.inputAutomationSha)) {
    errors.push('Falta el commit de main que ejecuta el apply (--automation-sha).');
  } else if (typeof report.automation_sha !== 'string' || !COMMIT_SHA_RE.test(report.automation_sha)) {
    errors.push('El bundle del verify no declara automation_sha. Repetir la fase verify.');
  } else if (report.automation_sha !== input.inputAutomationSha) {
    errors.push(
      `El verify corrió con el commit de main ${report.automation_sha} y este apply con ${input.inputAutomationSha}. `
      + 'Main cambió: repetir verify, plan y binding.',
    );
  }
  const reportOperation = report.operation === 'promote' ? 'forward' : (report.operation ?? 'forward');

  if (input.inputOperation !== undefined) {
    const expected = REPORT_OPERATION_BY_INPUT[input.inputOperation];
    if (expected === undefined) {
      errors.push('operation del workflow inválida.');
    } else if (expected !== reportOperation) {
      errors.push(
        `operation=${input.inputOperation} no corresponde al bundle del verify (${String(report.operation)}).`,
      );
    }
  }
  if (input.inputGitSha !== undefined && input.inputGitSha !== report.git_sha) {
    errors.push('git_sha del workflow no coincide con el del bundle del verify.');
  }
  if (
    input.inputReleaseBuildRunId !== undefined
    && normalizeRunId(input.inputReleaseBuildRunId) !== normalizeRunId(report.release_build_run_id)
  ) {
    errors.push('release_build_run_id del workflow no coincide con el del bundle del verify.');
  }
  if (reportOperation === 'rollback') {
    if (
      input.inputTargetDeploymentId !== undefined
      && input.inputTargetDeploymentId !== String(report.target_deployment_id ?? '')
    ) {
      errors.push('target_deployment_id del workflow no coincide con el del bundle del verify.');
    }
  } else if (input.inputTargetDeploymentId) {
    errors.push('target_deployment_id solo aplica a rollback.');
  }
  return errors;
}

/**
 * Las imágenes del informe de promoción deben ser las del manifiesto del bundle: son las que
 * el plan, la verificación posterior y el registro van a dar por aprobadas.
 *
 * @param {Record<string, unknown>} reportImages
 * @param {Record<string, string>} manifestTfvars frontend_image, backend_image, jobs_image
 */
export function validateReportImagesMatchManifest(reportImages, manifestTfvars) {
  const errors = [];
  for (const key of ['frontend_image', 'backend_image', 'jobs_image']) {
    if (reportImages?.[key] !== manifestTfvars[key]) {
      errors.push(`promotion-report.json: ${key} no coincide con el manifiesto del bundle.`);
    }
  }
  return errors;
}
