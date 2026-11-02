/** Registro persistente de despliegues en GCS (R6-C4). */

export const DEPLOYMENT_RECORD_SCHEMA_VERSION = 1;

export const GCS_DEPLOYMENT_REGISTRY_PREFIX = 'promotion/deployments';
export const GCS_ROLLBACK_SCHEMA_APPROVAL_PREFIX = 'promotion/rollback-schema-approvals';

/**
 * Valores aceptados en `operation`. El workflow escribe `promote` o `rollback`; el baseline R5
 * es `baseline`. `forward` es el nombre interno de promotion-report.json y se tolera al leer.
 * @typedef {'promote' | 'forward' | 'rollback' | 'baseline'} DeploymentOperation
 */

/** @param {string} deploymentId */
export function gcsDeploymentRecordPath(deploymentId) {
  return `${GCS_DEPLOYMENT_REGISTRY_PREFIX}/${deploymentId}.json`;
}

/** @param {string} verifyRunId */
export function gcsRollbackSchemaApprovalPath(verifyRunId) {
  return `${GCS_ROLLBACK_SCHEMA_APPROVAL_PREFIX}/${verifyRunId}.json`;
}

const GIT_SHA_RE = /^[0-9a-f]{40}$/;
const IMAGE_REF_RE = /@sha256:[0-9a-f]{64}$/i;

/**
 * @param {unknown} record
 * @param {{ expectedDeploymentId?: string }} [options]
 */
export function validateDeploymentRecord(record, options = {}) {
  const errors = [];
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, errors: ['Registro de despliegue inválido.'] };
  }
  const r = /** @type {Record<string, unknown>} */ (record);

  if (r.schema_version !== DEPLOYMENT_RECORD_SCHEMA_VERSION) {
    errors.push('schema_version debe ser 1.');
  }

  const deploymentId = r.deployment_id;
  if (typeof deploymentId !== 'string' || deploymentId.length === 0) {
    errors.push('deployment_id obligatorio.');
  } else if (options.expectedDeploymentId && deploymentId !== options.expectedDeploymentId) {
    errors.push('deployment_id no coincide con el objeto solicitado (posible manipulación).');
  }

  const operation = r.operation;
  if (operation !== 'forward' && operation !== 'promote' && operation !== 'rollback' && operation !== 'baseline') {
    errors.push('operation debe ser promote, rollback o baseline.');
  }

  const gitSha = r.git_sha;
  if (typeof gitSha !== 'string' || !GIT_SHA_RE.test(gitSha)) {
    errors.push('git_sha debe ser 40 hex.');
  }

  // Un rollback al baseline R5 restaura imágenes sin corrida release-build: lo declara
  // restored_baseline=true y entonces el run id tiene que ser nulo. Sin ese marcador
  // explícito, todo despliegue no baseline exige run id.
  const restoredBaseline = r.restored_baseline === true;
  if (restoredBaseline && operation !== 'rollback') {
    errors.push('restored_baseline solo aplica a operation rollback.');
  }
  if (restoredBaseline && r.release_build_run_id != null) {
    errors.push('Un rollback al baseline R5 no debe incluir release_build_run_id.');
  }
  if (operation !== 'baseline' && !restoredBaseline) {
    const runId = r.release_build_run_id;
    if (typeof runId !== 'string' && typeof runId !== 'number') {
      errors.push('release_build_run_id obligatorio salvo baseline R5.');
    }
  } else if (operation === 'baseline' && r.release_build_run_id != null) {
    errors.push('Baseline R5 no debe incluir release_build_run_id.');
  }

  const images = r.images;
  if (images === null || typeof images !== 'object' || Array.isArray(images)) {
    errors.push('images inválido.');
  } else {
    const img = /** @type {Record<string, unknown>} */ (images);
    for (const key of ['frontend_image', 'backend_image', 'jobs_image']) {
      const value = img[key];
      if (typeof value !== 'string' || !IMAGE_REF_RE.test(value)) {
        errors.push(`${key} debe ser @sha256 inmutable.`);
      }
    }
  }

  const outcome = r.outcome;
  if (outcome !== 'succeeded' && outcome !== 'failed' && outcome !== 'partial') {
    errors.push('outcome debe ser succeeded, failed o partial.');
  }

  if (typeof r.applied_at !== 'string' || r.applied_at.length === 0) {
    errors.push('applied_at obligatorio (ISO-8601).');
  }

  if (outcome === 'succeeded' && operation === 'baseline') {
    if (r.cloud_run_digest_evidence == null || typeof r.cloud_run_digest_evidence !== 'object') {
      errors.push('Baseline succeeded exige cloud_run_digest_evidence (describe real de Cloud Run).');
    }
  }
  if (outcome === 'succeeded' && operation !== 'baseline') {
    const post = /** @type {Record<string, any> | null | undefined} */ (r.post_verify);
    if (post == null || typeof post !== 'object' || post.ok !== true) {
      errors.push('outcome succeeded exige post_verify.ok (no declarar éxito sin verificación).');
    } else {
      errors.push(...validateSucceededPostVerify(post, r.images));
    }
    if (r.verified_manifest == null || typeof r.verified_manifest !== 'object') {
      errors.push('outcome succeeded exige verified_manifest capturado en el apply (no un JSON posterior).');
    }
  }

  if (typeof r.promotion_verify_run_id !== 'string') {
    errors.push('promotion_verify_run_id obligatorio.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, record: r };
}

/**
 * Un despliegue `succeeded` tiene que haber comprobado servicios Y jobs, y lo comprobado
 * tiene que ser exactamente lo registrado. Un jobs-only (servicios sin tocar) o un informe
 * de otra imagen no pueden figurar como éxito.
 *
 * @param {Record<string, any>} post
 * @param {unknown} images
 */
export function validateSucceededPostVerify(post, images) {
  const errors = [];
  const cloudRun = post.cloud_run;
  if (!cloudRun || cloudRun.verified !== true) {
    errors.push('outcome succeeded exige post_verify.cloud_run.verified=true.');
    return errors;
  }
  const components = Array.isArray(cloudRun.components) ? cloudRun.components : [];
  for (const needed of ['services', 'jobs']) {
    if (!components.includes(needed)) {
      errors.push(`outcome succeeded exige haber verificado ${needed} en Cloud Run.`);
    }
  }
  for (const key of ['frontend_image', 'backend_image', 'jobs_image']) {
    if (cloudRun.expected?.[key] !== /** @type {Record<string, unknown>} */ (images ?? {})[key]) {
      errors.push(`post_verify verificó otra ${key} que la registrada.`);
    }
  }
  return errors;
}

/**
 * @param {unknown} approval
 * @param {object} expected
 */
export function validateRollbackSchemaApproval(approval, expected) {
  const errors = [];
  if (approval === null || typeof approval !== 'object' || Array.isArray(approval)) {
    return ['Aprobación de esquema inválida.'];
  }
  const a = /** @type {Record<string, unknown>} */ (approval);
  if (a.schema_version !== 1) {
    errors.push('schema approval: schema_version inválida.');
  }
  if (a.verify_run_id !== expected.verifyRunId) {
    errors.push('schema approval: verify_run_id no coincide.');
  }
  if (a.target_deployment_id !== expected.targetDeploymentId) {
    errors.push('schema approval: target_deployment_id no coincide.');
  }
  if (a.target_git_sha !== expected.targetGitSha) {
    errors.push('schema approval: target_git_sha no coincide.');
  }
  if (a.current_git_sha !== expected.currentGitSha) {
    errors.push('schema approval: current_git_sha no coincide.');
  }
  if (a.approved !== true) {
    errors.push('schema approval: debe estar explícitamente approved=true.');
  }
  if (typeof a.reviewed_by !== 'string' || a.reviewed_by.length === 0) {
    errors.push('schema approval: falta reviewed_by.');
  }
  if (typeof a.statement !== 'string' || a.statement.length < 20) {
    errors.push('schema approval: falta statement de compatibilidad (mín. 20 caracteres).');
  }
  return errors;
}
