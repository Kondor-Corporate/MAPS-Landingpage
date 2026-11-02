/**
 * Extrae imágenes de producción (tres digests) desde un manifiesto R6-B validado.
 */

const PROD_IMAGE_IDS = {
  frontend_image: 'frontend',
  backend_image: 'backend',
  jobs_image: 'backend-jobs',
};

/**
 * @param {Record<string, unknown>} manifest
 * @returns {{ ok: true, tfvars: Record<string, string>, images: Record<string, string> } | { ok: false, errors: string[] }}
 */
export function productionImagesFromManifest(manifest) {
  const errors = [];
  if (!Array.isArray(manifest.images)) {
    return { ok: false, errors: ['Manifiesto sin images[].'] };
  }

  /** @type {Record<string, string>} */
  const tfvars = {};
  /** @type {Record<string, string>} */
  const images = {};

  for (const [varName, imageId] of Object.entries(PROD_IMAGE_IDS)) {
    const entry = manifest.images.find(
      (img) => img && typeof img === 'object' && img.id === imageId,
    );
    if (!entry || typeof entry !== 'object') {
      errors.push(`Falta imagen ${imageId} en el manifiesto.`);
      continue;
    }
    const ref = entry.immutable_ref;
    if (typeof ref !== 'string' || !/@sha256:[0-9a-f]{64}$/i.test(ref)) {
      errors.push(`${imageId}: se exige immutable_ref terminada en @sha256.`);
      continue;
    }
    tfvars[varName] = ref;
    images[varName] = ref;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, tfvars, images };
}

/**
 * @param {Record<string, string>} tfvars
 * @returns {string}
 */
export function formatPromotionTfvarsHcl(tfvars) {
  const lines = ['# Generado desde release-manifest (R6). No editar a mano.'];
  for (const [key, value] of Object.entries(tfvars)) {
    lines.push(`${key} = "${value}"`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * @param {string} expectedRunId
 * @param {Record<string, unknown>} manifest
 */
export function assertManifestMatchesReleaseRun(expectedRunId, manifest) {
  const errors = [];
  const buildUrl = manifest.build_run_url;
  if (typeof buildUrl !== 'string') {
    errors.push('build_run_url ausente.');
    return errors;
  }
  const match = buildUrl.match(/\/actions\/runs\/([0-9]+)/);
  if (!match) {
    errors.push('build_run_url no contiene un run id.');
    return errors;
  }
  if (match[1] !== String(expectedRunId)) {
    errors.push(
      `release_build_run_id (${expectedRunId}) no coincide con build_run_url (${match[1]}).`,
    );
  }
  return errors;
}
