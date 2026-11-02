#!/usr/bin/env node
/**
 * Validación estructural de release-manifest.json (R6-C1).
 * No comprueba existencia en Artifact Registry ni autenticidad del artifact de GitHub.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  CI_WORKFLOW,
  CLOUD_BUILD_ID_RE,
  DEFAULT_BRANCH,
  DIGEST_RE,
  GIT_SHA_RE,
  IMAGE_IDS,
  PUBLISH_TO,
  REGISTRY,
  SCHEMA_VERSION,
  SHARING_BETWEEN_PROJECTS,
  SOURCE_BRANCH_REQUIRED,
  expectedImageUri,
  isGithubActionsRunUrl,
} from './manifest-contract.mjs';

/**
 * @param {unknown} manifest
 * @param {string} expectedGitSha
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validateReleaseManifest(manifest, expectedGitSha) {
  const errors = [];

  const requireSha = (label, value) => {
    if (typeof value !== 'string' || !GIT_SHA_RE.test(value)) {
      errors.push(`${label}: se espera un SHA de 40 hexadecimales en minúscula.`);
      return false;
    }
    return true;
  };

  if (!requireSha('expectedGitSha (argumento)', expectedGitSha)) {
    return { ok: false, errors };
  }

  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    errors.push('El manifiesto tiene que ser un objeto JSON.');
    return { ok: false, errors };
  }

  const m = /** @type {Record<string, unknown>} */ (manifest);

  if (m.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version tiene que ser ${SCHEMA_VERSION}.`);
  }

  if (!requireSha('git_sha', m.git_sha)) {
    /* ya registrado */
  } else if (m.git_sha !== expectedGitSha) {
    errors.push('git_sha del manifiesto no coincide con el SHA esperado.');
  }

  if (m.source_branch_required !== SOURCE_BRANCH_REQUIRED) {
    errors.push(`source_branch_required tiene que ser "${SOURCE_BRANCH_REQUIRED}".`);
  }
  if (m.default_branch !== DEFAULT_BRANCH) {
    errors.push(`default_branch tiene que ser "${DEFAULT_BRANCH}".`);
  }
  if (m.default_branch_is_release_source !== false) {
    errors.push('default_branch_is_release_source tiene que ser false.');
  }
  if (m.ci_workflow !== CI_WORKFLOW) {
    errors.push(`ci_workflow tiene que ser "${CI_WORKFLOW}".`);
  }
  if (typeof m.ci_run_url !== 'string' || !isGithubActionsRunUrl(m.ci_run_url)) {
    errors.push('ci_run_url tiene que ser una URL de ejecución de GitHub Actions del repositorio.');
  }
  if (typeof m.build_run_url !== 'string' || !isGithubActionsRunUrl(m.build_run_url)) {
    errors.push('build_run_url tiene que ser una URL de ejecución de GitHub Actions del repositorio.');
  }

  const registry = m.registry;
  if (registry === null || typeof registry !== 'object' || Array.isArray(registry)) {
    errors.push('registry tiene que ser un objeto.');
  } else {
    const r = /** @type {Record<string, unknown>} */ (registry);
    if (r.project !== REGISTRY.project) {
      errors.push(`registry.project tiene que ser "${REGISTRY.project}".`);
    }
    if (r.location !== REGISTRY.location) {
      errors.push(`registry.location tiene que ser "${REGISTRY.location}".`);
    }
    if (r.repository !== REGISTRY.repository) {
      errors.push(`registry.repository tiene que ser "${REGISTRY.repository}".`);
    }
  }

  if (m.publish_to !== PUBLISH_TO) {
    errors.push(`publish_to tiene que ser "${PUBLISH_TO}".`);
  }
  if (m.sharing_between_projects !== SHARING_BETWEEN_PROJECTS) {
    errors.push(`sharing_between_projects tiene que ser "${SHARING_BETWEEN_PROJECTS}".`);
  }
  if (m.staging_reads_production_registry !== false) {
    errors.push('staging_reads_production_registry tiene que ser false.');
  }
  if (m.deploys !== false) {
    errors.push('deploys tiene que ser false.');
  }

  if (!Array.isArray(m.images)) {
    errors.push('images tiene que ser un arreglo.');
    return { ok: false, errors };
  }

  if (m.images.length !== 4) {
    errors.push('images tiene que contener exactamente cuatro entradas.');
  }

  const ids = [];
  for (const entry of m.images) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push('Cada elemento de images tiene que ser un objeto.');
      continue;
    }
    const img = /** @type {Record<string, unknown>} */ (entry);
    const id = img.id;
    if (typeof id !== 'string') {
      errors.push('Cada imagen necesita id.');
      continue;
    }
    if (ids.includes(id)) {
      errors.push(`id duplicado: ${id}.`);
    }
    ids.push(id);

    if (requireSha(`images[${id}].git_sha`, img.git_sha) && img.git_sha !== expectedGitSha) {
      errors.push(`images[${id}].git_sha no coincide con el SHA esperado.`);
    }

    if (img.project !== REGISTRY.project) {
      errors.push(`images[${id}].project tiene que ser "${REGISTRY.project}".`);
    }
    if (img.repository !== REGISTRY.repository) {
      errors.push(`images[${id}].repository tiene que ser "${REGISTRY.repository}".`);
    }

    const wantUri = expectedImageUri(id);
    if (img.image !== wantUri) {
      errors.push(`images[${id}].image tiene que ser ${wantUri}.`);
    }

    if (img.tag !== expectedGitSha) {
      errors.push(`images[${id}].tag tiene que ser el SHA completo (referencia mutable no admitida).`);
    }

    if (typeof img.digest !== 'string' || !DIGEST_RE.test(img.digest)) {
      errors.push(`images[${id}].digest tiene formato inválido (se espera sha256:…).`);
    }

    if (typeof img.image === 'string' && typeof img.digest === 'string') {
      const wantImmutable = `${img.image}@${img.digest}`;
      if (img.immutable_ref !== wantImmutable) {
        errors.push(`images[${id}].immutable_ref tiene que ser image@digest.`);
      }
      const mutableTagRef = `${img.image}:${expectedGitSha}`;
      if (img.immutable_ref === mutableTagRef) {
        errors.push(`images[${id}].immutable_ref no debe usar un tag mutable (:sha).`);
      }
    }

    if (typeof img.cloud_build_id !== 'string' || !CLOUD_BUILD_ID_RE.test(img.cloud_build_id)) {
      errors.push(`images[${id}].cloud_build_id tiene que ser un UUID de Cloud Build.`);
    }

    if (img.oci_revision !== expectedGitSha) {
      errors.push(`images[${id}].oci_revision tiene que coincidir con el SHA esperado.`);
    }
    if (img.deploy_identifier !== 'digest') {
      errors.push(`images[${id}].deploy_identifier tiene que ser "digest".`);
    }

    validateImageVariant(id, img, errors);
  }

  const sortedIds = [...ids].sort();
  const expectedSorted = [...IMAGE_IDS].sort();
  if (sortedIds.join(',') !== expectedSorted.join(',')) {
    errors.push(
      `Los id de images tienen que ser exactamente: ${IMAGE_IDS.join(', ')}.`,
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} img
 * @param {string[]} errors
 */
function validateImageVariant(id, img, errors) {
  const dockerTarget = img.docker_target;
  const variant = img.variant;
  const vite = img.vite;

  switch (id) {
    case 'backend':
      if (dockerTarget !== 'runner' || variant !== 'runner') {
        errors.push('backend: docker_target runner y variant runner.');
      }
      if (vite !== null) {
        errors.push('backend: vite tiene que ser null.');
      }
      break;
    case 'backend-jobs':
      if (dockerTarget !== 'jobs' || variant !== 'jobs') {
        errors.push('backend-jobs: docker_target jobs y variant jobs.');
      }
      if (vite !== null) {
        errors.push('backend-jobs: vite tiene que ser null.');
      }
      break;
    case 'frontend':
      if (dockerTarget !== 'runner' || variant !== 'production') {
        errors.push('frontend: docker_target runner y variant production.');
      }
      validateProductionVite(vite, errors, 'frontend');
      break;
    case 'frontend-staging':
      if (dockerTarget !== 'runner' || variant !== 'staging') {
        errors.push('frontend-staging: docker_target runner y variant staging.');
      }
      validateStagingVite(vite, errors, 'frontend-staging');
      break;
    default:
      errors.push(`id de imagen no admitido: ${id}.`);
  }
}

/**
 * @param {unknown} vite
 * @param {string[]} errors
 * @param {string} label
 */
function validateProductionVite(vite, errors, label) {
  if (vite === null || typeof vite !== 'object' || Array.isArray(vite)) {
    errors.push(`${label}: vite tiene que ser un objeto de producción.`);
    return;
  }
  const v = /** @type {Record<string, unknown>} */ (vite);
  if (v.VITE_API_BASE_URL !== '/api/v1') {
    errors.push(`${label}: VITE_API_BASE_URL tiene que ser /api/v1.`);
  }
  if (v.VITE_PUBLIC_INDEXING !== 'true') {
    errors.push(`${label}: VITE_PUBLIC_INDEXING tiene que ser "true" (indexación habilitada).`);
  }
  if (v.VITE_PUBLIC_SITE_URL !== 'https://mapsasesores.com.ar') {
    errors.push(`${label}: VITE_PUBLIC_SITE_URL tiene que ser https://mapsasesores.com.ar.`);
  }
  if (v.VITE_MAPS_WHATSAPP_NUMBER !== null) {
    errors.push(`${label}: VITE_MAPS_WHATSAPP_NUMBER tiene que ser null en el manifiesto actual.`);
  }
}

/**
 * @param {unknown} vite
 * @param {string[]} errors
 * @param {string} label
 */
function validateStagingVite(vite, errors, label) {
  if (vite === null || typeof vite !== 'object' || Array.isArray(vite)) {
    errors.push(`${label}: vite tiene que ser un objeto de staging.`);
    return;
  }
  const v = /** @type {Record<string, unknown>} */ (vite);
  if (v.VITE_API_BASE_URL !== '/api/v1') {
    errors.push(`${label}: VITE_API_BASE_URL tiene que ser /api/v1.`);
  }
  if (v.VITE_PUBLIC_INDEXING !== 'false') {
    errors.push(`${label}: VITE_PUBLIC_INDEXING tiene que ser "false" (sin indexación).`);
  }
  if (v.VITE_PUBLIC_SITE_URL !== null) {
    errors.push(`${label}: VITE_PUBLIC_SITE_URL tiene que ser null (sin canónico de producción).`);
  }
  if (v.VITE_MAPS_WHATSAPP_NUMBER !== null) {
    errors.push(`${label}: VITE_MAPS_WHATSAPP_NUMBER tiene que ser null en el manifiesto actual.`);
  }
}

/**
 * @param {string} filePath
 * @param {string} expectedGitSha
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validateReleaseManifestFile(filePath, expectedGitSha) {
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: [`No se pudo leer el manifiesto: ${message}`] };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ['JSON mal formado.'] };
  }

  return validateReleaseManifest(parsed, expectedGitSha);
}

function printUsage() {
  process.stderr.write(
    'Uso: node scripts/release/validate-manifest.mjs <ruta-manifiesto.json> <git-sha-40-hex>\n',
  );
}

function runCli(argv) {
  if (argv.length !== 2) {
    printUsage();
    process.exit(2);
  }

  const [manifestPath, expectedSha] = argv;
  const result = validateReleaseManifestFile(manifestPath, expectedSha);

  if (result.ok) {
    process.stdout.write('Manifiesto válido según el contrato de release-build.\n');
    process.exit(0);
  }

  for (const err of result.errors) {
    process.stderr.write(`error: ${err}\n`);
  }
  process.exit(1);
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
