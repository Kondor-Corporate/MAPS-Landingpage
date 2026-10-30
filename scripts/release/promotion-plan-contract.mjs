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
