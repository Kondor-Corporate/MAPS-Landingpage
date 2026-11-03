/**
 * Verificación de digests y etiqueta OCI en Artifact Registry (R6-C2).
 * Usa gcloud en PATH; no agrega SDK de GCP.
 */

import { spawnSync } from 'node:child_process';

import { REGISTRY } from './manifest-contract.mjs';

const OCI_REVISION_LABEL = 'org.opencontainers.image.revision';

/**
 * `gcloud artifacts docker images describe` devuelve el digest en
 * `image_summary.digest`. La consulta real de las imágenes de R6 no incluye
 * etiquetas OCI en ese objeto.
 * @param {unknown} parsed
 * @returns {string | null}
 */
export function digestFromImageDescribe(parsed) {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const body = /** @type {Record<string, unknown>} */ (parsed);
  const summary = body.image_summary;
  if (summary !== null && typeof summary === 'object' && !Array.isArray(summary)) {
    const digest = /** @type {Record<string, unknown>} */ (summary).digest;
    if (typeof digest === 'string' && digest.startsWith('sha256:')) {
      return digest;
    }
    const qualified = /** @type {Record<string, unknown>} */ (summary).fully_qualified_digest;
    if (typeof qualified === 'string') {
      const at = qualified.lastIndexOf('@');
      const extracted = at >= 0 ? qualified.slice(at + 1) : '';
      if (extracted.startsWith('sha256:')) {
        return extracted;
      }
    }
  }
  for (const key of ['version', 'digest']) {
    const value = body[key];
    if (typeof value === 'string' && value.startsWith('sha256:')) {
      return value;
    }
  }
  return null;
}

/**
 * @param {unknown} parsed
 * @returns {string | null}
 */
export function ociRevisionFromImageDescribe(parsed) {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const body = /** @type {Record<string, unknown>} */ (parsed);
  const summary = body.image_summary;
  const summaryLabels =
    summary !== null && typeof summary === 'object' && !Array.isArray(summary)
      ? /** @type {Record<string, unknown>} */ (summary).labels
      : undefined;
  const dockerVersion = body.docker_version;
  const dockerLabels =
    dockerVersion !== null && typeof dockerVersion === 'object' && !Array.isArray(dockerVersion)
      ? /** @type {{ metadata?: { labels?: Record<string, unknown> } }} */ (dockerVersion).metadata?.labels
      : undefined;
  const metadata = body.metadata;
  const metadataLabels =
    metadata !== null && typeof metadata === 'object' && !Array.isArray(metadata)
      ? /** @type {Record<string, unknown>} */ (metadata).labels
      : undefined;
  const labels = summaryLabels ?? dockerLabels ?? metadataLabels ?? {};
  const revision = /** @type {Record<string, unknown>} */ (labels)[OCI_REVISION_LABEL];
  return typeof revision === 'string' ? revision : null;
}

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
      'images',
      'describe',
      `${imageUri}:${tag}`,
      `--project=${project}`,
      '--format=json',
    ],
    options,
  );

  if (describeTag.status !== 0) {
    const detail = describeTag.stderr || 'sin stderr';
    errors.push(`${id}: no se pudo describir ${imageUri}:${tag} (${detail}).`);
    return { ok: false, errors };
  }

  let tagJson;
  try {
    tagJson = JSON.parse(describeTag.stdout);
  } catch {
    errors.push(`${id}: respuesta inesperada de gcloud artifacts docker images describe.`);
    return { ok: false, errors };
  }

  const registryDigest = digestFromImageDescribe(tagJson);
  if (registryDigest === null) {
    errors.push(`${id}: Artifact Registry no devolvió digest para el tag.`);
  } else if (registryDigest !== wantDigest) {
    errors.push(
      `${id}: digest del registry (${registryDigest}) no coincide con el manifiesto (${wantDigest}).`,
    );
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
  if (describeDigest.status !== 0 || !describeDigest.stdout) {
    errors.push(
      `${id}: no se pudo describir la imagen por digest (${describeDigest.stderr || 'sin stderr'}).`,
    );
  }

  if (errors.length === 0 && wantSha) {
    const imageAtDigest = `${imageUri}@${wantDigest}`;
    const oci = readOciRevision(imageAtDigest, options);
    if (!oci.ok) {
      errors.push(...oci.errors.map((error) => `${id}: ${error}`));
    } else if (oci.revision !== wantSha) {
      errors.push(
        `${id}: etiqueta ${OCI_REVISION_LABEL}=${oci.revision} no coincide con el SHA esperado.`,
      );
    } else {
      ociRevision = oci.revision;
    }
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
 * La etiqueta OCI vive en la configuración de la imagen, no en el JSON de
 * `gcloud artifacts docker images describe`.
 * @param {unknown} parsed salida de `docker image inspect`
 * @returns {string | null}
 */
export function ociRevisionFromDockerInspect(parsed) {
  const image = Array.isArray(parsed) ? parsed[0] : parsed;
  if (image === null || typeof image !== 'object') {
    return null;
  }
  const config = /** @type {{ Config?: { Labels?: Record<string, unknown> } }} */ (image).Config;
  const revision = config?.Labels?.[OCI_REVISION_LABEL];
  return typeof revision === 'string' && revision.length > 0 ? revision : null;
}

/**
 * @param {string} imageAtDigest
 * @param {{ runCommandFn?: typeof runCommand }} [options]
 * @returns {{ ok: true, revision: string } | { ok: false, errors: string[] }}
 */
export function readOciRevision(imageAtDigest, options = {}) {
  const run = options.runCommandFn ?? runCommand;
  const host = imageAtDigest.split('/')[0];
  if (!host || !imageAtDigest.includes('@sha256:')) {
    return { ok: false, errors: [`Referencia de imagen inválida para leer la etiqueta OCI: ${imageAtDigest}`] };
  }
  const auth = run('gcloud', ['auth', 'configure-docker', host, '--quiet'], options);
  if (auth.status !== 0) {
    return { ok: false, errors: [`autenticación de Docker con Artifact Registry falló (${auth.stderr || 'sin stderr'}).`] };
  }
  const pull = run('docker', ['pull', imageAtDigest], options);
  if (pull.status !== 0) {
    return { ok: false, errors: [`docker pull del digest falló (${pull.stderr || 'sin stderr'}).`] };
  }
  const inspect = run('docker', ['image', 'inspect', imageAtDigest], options);
  if (inspect.status !== 0) {
    return { ok: false, errors: [`docker image inspect falló (${inspect.stderr || 'sin stderr'}).`] };
  }
  let parsed;
  try {
    parsed = JSON.parse(inspect.stdout);
  } catch {
    return { ok: false, errors: ['docker image inspect no devolvió JSON.'] };
  }
  const revision = ociRevisionFromDockerInspect(parsed);
  if (revision === null) {
    return { ok: false, errors: [`falta etiqueta ${OCI_REVISION_LABEL} en la configuración de la imagen.`] };
  }
  return { ok: true, revision };
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ commandPath?: string }} [options]
 */
export function runCommand(command, args, options = {}) {
  const bin = options.commandPath ?? command;
  const result = spawnSync(bin, args, {
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
 * @param {Record<string, unknown>} manifest
 * @param {{ project?: string, gcloudPath?: string, runGcloudFn?: typeof runGcloud, runCommandFn?: typeof runCommand }} [options]
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
