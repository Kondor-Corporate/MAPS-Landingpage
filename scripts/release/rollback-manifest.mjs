/**
 * Origen del manifiesto en rollback: GitHub (si vive), copia persistida en el
 * registro de despliegue, o imágenes del baseline R5. Nunca un JSON suelto del operador.
 */

import { productionImagesFromManifest } from './promotion-images.mjs';
import { assertRegistryMatchesManifestImages } from './rollback-selection.mjs';

const IMAGE_REF_RE = /@sha256:[0-9a-f]{64}$/i;

/**
 * @param {Record<string, unknown>} record
 */
export function tfvarsFromDeploymentImages(record) {
  const errors = [];
  const images = /** @type {Record<string, unknown>} */ (record.images ?? {});
  /** @type {Record<string, string>} */
  const tfvars = {};
  for (const key of ['frontend_image', 'backend_image', 'jobs_image']) {
    const value = images[key];
    if (typeof value !== 'string' || !IMAGE_REF_RE.test(value)) {
      errors.push(`${key} del registro no es @sha256.`);
      continue;
    }
    tfvars[key] = value;
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, tfvars, images: tfvars };
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} manifest
 */
export function storedManifestBindsDeployment(record, manifest) {
  const errors = [];
  if (manifest.git_sha !== record.git_sha) {
    errors.push('Manifiesto persistido: git_sha no coincide con el registro.');
  }
  if (
    typeof manifest.build_run_url === 'string'
    && record.release_build_run_id != null
    && !manifest.build_run_url.includes(`/runs/${record.release_build_run_id}`)
  ) {
    errors.push('Manifiesto persistido: build_run_url no contiene el release_build_run_id del registro.');
  }
  const images = productionImagesFromManifest(manifest);
  if (!images.ok) {
    errors.push(...(images.errors ?? ['Manifiesto persistido inválido.']));
    return errors;
  }
  errors.push(...assertRegistryMatchesManifestImages(record.images, images.tfvars));
  return errors;
}

/**
 * @param {object} input
 * @param {Record<string, unknown>} input.target
 * @param {{ ok: true, manifest: Record<string, unknown> } | { ok: false, errors: string[] } | null} input.github
 */
export function resolveRollbackManifest(input) {
  const target = input.target;
  if (target.operation === 'baseline') {
    if (!target.cloud_run_digest_evidence || typeof target.cloud_run_digest_evidence !== 'object') {
      return {
        ok: false,
        errors: [
          'Baseline R5 sin cloud_run_digest_evidence: rollback bloqueado. Completar evidencia real de Cloud Run (ver config/release/README.md) antes de registrar el baseline.',
        ],
      };
    }
    if (target.release_build_run_id != null) {
      return {
        ok: false,
        errors: ['Baseline R5 no debe inventar release_build_run_id.'],
      };
    }
    const fromImages = tfvarsFromDeploymentImages(target);
    if (!fromImages.ok) {
      return fromImages;
    }
    return {
      ok: true,
      manifest: null,
      tfvars: fromImages.tfvars,
      images: fromImages.images,
      manifest_source: 'baseline',
      release_build_run_id: null,
    };
  }

  const github = input.github;
  if (github && github.ok) {
    const images = productionImagesFromManifest(github.manifest);
    if (images.ok) {
      const mismatch = assertRegistryMatchesManifestImages(target.images, images.tfvars);
      if (mismatch.length === 0) {
        return {
          ok: true,
          manifest: github.manifest,
          tfvars: images.tfvars,
          images: images.images,
          manifest_source: 'github',
          release_build_run_id: String(target.release_build_run_id),
        };
      }
    }
  }

  const stored = target.verified_manifest;
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    const bindErrors = storedManifestBindsDeployment(
      target,
      /** @type {Record<string, unknown>} */ (stored),
    );
    if (bindErrors.length === 0) {
      const images = productionImagesFromManifest(/** @type {Record<string, unknown>} */ (stored));
      if (images.ok) {
        return {
          ok: true,
          manifest: /** @type {Record<string, unknown>} */ (stored),
          tfvars: images.tfvars,
          images: images.images,
          manifest_source: 'registry',
          release_build_run_id: String(target.release_build_run_id),
          github_unavailable: github && !github.ok ? github.errors : undefined,
        };
      }
    }
  }

  const errors = [
    'No hay manifiesto utilizable: el artifact de GitHub no está disponible y el registro de despliegue no conserva verified_manifest ligado a este deployment_id.',
  ];
  if (github && !github.ok) {
    errors.push(...github.errors);
  }
  return { ok: false, errors };
}
