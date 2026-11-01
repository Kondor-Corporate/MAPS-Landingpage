/** Contrato de promoción R6-C3 (Terraform plan + Cloud Run). */

export const PROMOTION_CONCURRENCY_GROUP = 'maps-prod-release';

export const PROMOTE_WORKFLOW_PATH = '.github/workflows/release-promote.yml';

export const BOOTSTRAP_JOB_NAME = 'maps-prod-bootstrap';
export const MIGRATE_JOB_NAME = 'maps-prod-migrate';

/** Direcciones Terraform permitidas en cualquier plan de promoción. */
export const ALLOWED_CLOUD_RUN_ADDRESSES = [
  'module.runtime_services.google_cloud_run_v2_service.frontend',
  'module.runtime_services.google_cloud_run_v2_service.backend',
  'module.runtime_jobs.google_cloud_run_v2_job.migrate',
  'module.runtime_jobs.google_cloud_run_v2_job.bootstrap',
];

/**
 * @typedef {'full' | 'jobs-only' | 'services-only'} PromotionPlanMode
 */

/** @type {Record<PromotionPlanMode, string[]>} */
export const ALLOWED_CHANGES_BY_MODE = {
  full: ALLOWED_CLOUD_RUN_ADDRESSES,
  'jobs-only': [
    'module.runtime_jobs.google_cloud_run_v2_job.migrate',
    'module.runtime_jobs.google_cloud_run_v2_job.bootstrap',
  ],
  'services-only': [
    'module.runtime_services.google_cloud_run_v2_service.frontend',
    'module.runtime_services.google_cloud_run_v2_service.backend',
  ],
};

/** Imagen de producción (variable tfvars) que debe tener cada recurso Cloud Run. */
export const IMAGE_KEY_BY_ADDRESS = {
  'module.runtime_services.google_cloud_run_v2_service.frontend': 'frontend_image',
  'module.runtime_services.google_cloud_run_v2_service.backend': 'backend_image',
  'module.runtime_jobs.google_cloud_run_v2_job.migrate': 'jobs_image',
  'module.runtime_jobs.google_cloud_run_v2_job.bootstrap': 'jobs_image',
};

export const PLAN_MODES = ['full', 'jobs-only', 'services-only'];

/** Operación del input del workflow -> nombre usado en promotion-report.json. */
export const REPORT_OPERATION_BY_INPUT = { promote: 'forward', rollback: 'rollback' };

/** Recursos de Cloud Run verificados tras el apply, por componente. */
export const CLOUD_RUN_SERVICES = ['maps-prod-frontend', 'maps-prod-backend'];
export const CLOUD_RUN_JOBS = [MIGRATE_JOB_NAME, BOOTSTRAP_JOB_NAME];

/**
 * Componentes que la verificación posterior debe comprobar según el modo de plan.
 * services-only también comprueba los jobs: la fase jobs-only previa ya los dejó
 * con la imagen nueva y el registro final declara las tres.
 */
export const VERIFY_COMPONENTS_BY_MODE = {
  full: ['services', 'jobs'],
  'services-only': ['services', 'jobs'],
  'jobs-only': ['jobs'],
};

/** @param {unknown} value */
export function normalizeRunId(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value).trim();
  return text === 'null' ? '' : text;
}

export const FORBIDDEN_PLAN_ACTIONS = ['delete', 'create', 'replace'];

export const GCS_PLAN_OBJECT_PREFIX = 'promotion/plans';
export const GCS_MIGRATE_EVIDENCE_PREFIX = 'promotion/migrate-done';

/** @param {string} verifyRunId @param {string} planMode */
export function gcsPlanObjectPath(verifyRunId, planMode) {
  return `${GCS_PLAN_OBJECT_PREFIX}/${verifyRunId}/${planMode}.tfplan`;
}

/** @param {string} verifyRunId @param {string} planMode */
export function gcsPlanBindingPath(verifyRunId, planMode) {
  return `${GCS_PLAN_OBJECT_PREFIX}/${verifyRunId}/${planMode}.binding.json`;
}

/** @param {string} verifyRunId */
export function gcsMigrateEvidencePath(verifyRunId) {
  return `${GCS_MIGRATE_EVIDENCE_PREFIX}/${verifyRunId}.json`;
}

export const PRODUCTION_BASELINE_PATH = 'config/release/production-baseline.json';
