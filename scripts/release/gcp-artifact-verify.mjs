/**
 * Verificación de digests y etiqueta OCI en Artifact Registry (R6-C2).
 * Usa gcloud en PATH; no agrega SDK de GCP.
 */

import { spawnSync } from 'node:child_process';

import { REGISTRY } from './manifest-contract.mjs';

const OCI_REVISION_LABEL = 'org.opencontainers.image.revision';

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ gcloudPath?: string }} [options]
 */
export function runGcloud(cmd, args, options = {}) {
  const gcloud = options.gcloudPath ?? 'gcloud';
  const result = spawnSync(gcloud, [cmd, ...args], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return {
    status: result.status ?? 1,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
}

/**
 * @param {Record<string, unknown>} imageEntry from manifest.images[]
 * @param {{ project?: string, gcloudPath?: string }} [options]
 * @returns {Promise<{ ok: true, digest: string, ociRevision: string | null } | { ok: false, errors: string[] }>}
 */
export function verifyImageInArtifactRegistry(imageEntry, options = {}) {
  const exec = options.runGcloudFn ?? runGcloud;
  const errors = [];
  const project = options.project ?? REGISTRY.project;
  const id = String(imageEntry.id ?? 'unknown');
  const wantDigest = imageEntry.digest;
  const wantSha = imageEntry.git_sha;
  const imageUri = imageEntry.image;
  const tag = imageEntry.tag;

  if (typeof wantDigest !== 'string' || typeof imageUri !== 'string' || typeof tag !== 'string') {
    return { ok: false, errors: [`${id}: faltan image, tag o digest en el manifiesto.`] };
  }

  const describeTag = exec(
    'artifacts',
    [
      'docker',
      'tags',
      'describe',
      `${imageUri}:${tag}`,
      `--project=${project}`,
      '--format=json',
    ],
    options,
  );

  if (describeTag.status !== 0) {
    errors.push(`${id}: no se pudo describir el tag en Artifact Registry (${describeTag.stderr || 'sin stderr'}).`);
    return { ok: false, errors };
  }

  let tagJson;
  try {
    tagJson = JSON.parse(describeTag.stdout);
  } catch {
    errors.push(`${id}: respuesta inesperada de gcloud tags describe.`);
    return { ok: false, errors };
  }

  const registryDigest = tagJson.version ?? tagJson.image_summary?.digest ?? tagJson.digest;
  if (typeof registryDigest !== 'string') {
    errors.push(`${id}: Artifact Registry no devolvió digest para el tag.`);
  } else {
    const normalized = registryDigest.startsWith('sha256:') ? registryDigest : `sha256:${registryDigest}`;
    if (normalized !== wantDigest) {
      errors.push(
        `${id}: digest del registry (${normalized}) no coincide con el manifiesto (${wantDigest}).`,
      );
    }
  }

  const describeDigest = exec(
    'artifacts',
    [
      'docker',
      'images',
      'describe',
      `${imageUri}@${wantDigest}`,
      `--project=${project}`,
      '--format=json',
    ],
    options,
  );

  let ociRevision = null;
  if (describeDigest.status === 0 && describeDigest.stdout) {
    try {
      const imageJson = JSON.parse(describeDigest.stdout);
      const labels =
        imageJson.docker_version?.metadata?.labels
        ?? imageJson.image_summary?.labels
        ?? imageJson.metadata?.labels
        ?? {};
      ociRevision = labels[OCI_REVISION_LABEL] ?? null;
      if (typeof ociRevision === 'string' && wantSha && ociRevision !== wantSha) {
        errors.push(
          `${id}: etiqueta ${OCI_REVISION_LABEL}=${ociRevision} no coincide con el SHA esperado.`,
        );
      }
      if (ociRevision === null && wantSha) {
        errors.push(
          `${id}: falta etiqueta ${OCI_REVISION_LABEL} en la imagen del registry.`,
        );
      }
    } catch {
      errors.push(`${id}: no se pudo interpretar metadatos OCI desde gcloud.`);
    }
  } else {
    errors.push(
      `${id}: no se pudo describir la imagen por digest (${describeDigest.stderr || 'sin stderr'}).`,
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    digest: wantDigest,
    ociRevision: typeof ociRevision === 'string' ? ociRevision : null,
  };
}

/**
 * @param {Record<string, unknown>} manifest
 * @param {{ project?: string, gcloudPath?: string, runGcloudFn?: typeof runGcloud }} [options]
 */
export function verifyManifestImagesInRegistry(manifest, options = {}) {
  const errors = [];
  const images = manifest.images;
  if (!Array.isArray(images)) {
    return { ok: false, errors: ['Manifiesto sin images[].'] };
  }
  for (const entry of images) {
    const result = verifyImageInArtifactRegistry(
      /** @type {Record<string, unknown>} */ (entry),
      options,
    );
    if (!result.ok) {
      errors.push(...result.errors);
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

/**
 * Comprueba que una referencia @sha256 exista. No exige etiqueta OCI (baseline R5).
 * @param {string} imageRef
 * @param {{ runGcloudFn?: typeof runGcloud }} [options]
 */
export function verifyImmutableImageRef(imageRef, options = {}) {
  const exec = options.runGcloudFn ?? runGcloud;
  if (typeof imageRef !== 'string' || !/@sha256:[0-9a-f]{64}$/i.test(imageRef)) {
    return { ok: false, errors: [`Referencia no inmutable: ${String(imageRef)}`] };
  }
  const described = exec(
    'artifacts',
    ['docker', 'images', 'describe', imageRef, '--format=json'],
    options,
  );
  if (described.status !== 0) {
    return { ok: false, errors: [`${imageRef} no está en Artifact Registry.`] };
  }
  return { ok: true };
}
