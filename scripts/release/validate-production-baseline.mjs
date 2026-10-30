/**
 * Validación del baseline R5 antes de promoción automática.
 */

const GIT_SHA_RE = /^[0-9a-f]{40}$/;
const IMAGE_REF_RE = /@sha256:[0-9a-f]{64}$/i;

/**
 * @param {unknown} baseline
 */
export function validateProductionBaseline(baseline) {
  const errors = [];
  if (baseline === null || typeof baseline !== 'object' || Array.isArray(baseline)) {
    return { ok: false, errors: ['Baseline inválido.'] };
  }
  const b = /** @type {Record<string, unknown>} */ (baseline);

  if (b.schema_version !== 1) {
    errors.push('schema_version debe ser 1.');
  }

  const gitSha = b.git_sha;
  if (typeof gitSha !== 'string' || !GIT_SHA_RE.test(gitSha)) {
    errors.push(
      'git_sha debe ser el commit R5 desplegado (40 hex). Sin SHA verificable no hay comparación automática de migraciones.',
    );
  }

  const images = b.images;
  if (images === null || typeof images !== 'object' || Array.isArray(images)) {
    errors.push('images debe ser un objeto con frontend_image, backend_image y jobs_image.');
    return { ok: false, errors };
  }
  const img = /** @type {Record<string, unknown>} */ (images);
  for (const key of ['frontend_image', 'backend_image', 'jobs_image']) {
    const value = img[key];
    if (typeof value !== 'string' || !IMAGE_REF_RE.test(value)) {
      errors.push(`${key} debe ser una referencia inmutable @sha256 (sin null ni tags).`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, automatic_migration_comparison: false };
  }
  return { ok: true, automatic_migration_comparison: true };
}
