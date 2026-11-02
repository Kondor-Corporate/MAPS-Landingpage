/**
 * Controles posteriores a un apply (R6-C3). Solo lectura: `gcloud run ... describe`.
 * Necesita gcloud autenticado; sin él cada describe falla y el resultado es no verificado.
 */

import { spawnSync } from 'node:child_process';

import {
  CLOUD_RUN_JOBS,
  CLOUD_RUN_SERVICES,
  MIGRATE_JOB_NAME,
} from './promotion-plan-contract.mjs';

/** Imagen del primer contenedor de un servicio (API v1 de gcloud, o v2 como respaldo). */
export function extractServiceImage(json) {
  return json?.spec?.template?.spec?.containers?.[0]?.image
    ?? json?.template?.containers?.[0]?.image
    ?? '';
}

/** Imagen del primer contenedor de un job (API v1 de gcloud, o v2 como respaldo). */
export function extractJobImage(json) {
  return json?.spec?.template?.spec?.template?.spec?.containers?.[0]?.image
    ?? json?.template?.template?.containers?.[0]?.image
    ?? '';
}

/**
 * @param {'services' | 'jobs'} kind
 * @param {string} name
 * @param {{ project?: string, region?: string, gcloudPath?: string }} [options]
 * @returns {{ ok: true, json: any } | { ok: false, error: string }}
 */
export function describeWithGcloud(kind, name, options = {}) {
  const project = options.project ?? 'maps-prod-landing-page';
  const region = options.region ?? 'southamerica-east1';
  const result = spawnSync(
    options.gcloudPath ?? 'gcloud',
    ['run', kind, 'describe', name, `--project=${project}`, `--region=${region}`, '--format=json'],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );
  if (result.status !== 0) {
    return { ok: false, error: 'describe falló.' };
  }
  try {
    return { ok: true, json: JSON.parse(result.stdout) };
  } catch {
    return { ok: false, error: 'respuesta JSON inválida.' };
  }
}

/**
 * Revisión servida: Ready, creada = lista, y todo el tráfico en ella.
 * Los campos ausentes no se inventan: solo se contrastan los que gcloud devuelve.
 * @param {any} json
 * @param {string} name
 */
function serviceRevisionErrors(json, name) {
  const errors = [];
  const conditions = json?.status?.conditions ?? [];
  const ready = conditions.find((c) => c.type === 'Ready');
  if (ready?.status !== 'True') {
    errors.push(`${name}: revisión no Ready.`);
  }
  const created = json?.status?.latestCreatedRevisionName;
  const readyRevision = json?.status?.latestReadyRevisionName;
  if (created && readyRevision && created !== readyRevision) {
    errors.push(`${name}: la última revisión creada (${created}) no es la lista (${readyRevision}).`);
  }
  const traffic = json?.status?.traffic;
  if (Array.isArray(traffic) && traffic.length > 0 && readyRevision) {
    const onLatest = traffic
      .filter((t) => t.latestRevision === true || t.revisionName === readyRevision)
      .reduce((sum, t) => sum + Number(t.percent ?? 0), 0);
    if (onLatest !== 100) {
      errors.push(`${name}: el tráfico no está al 100 % en la revisión lista (${onLatest} %).`);
    }
  }
  return errors;
}

/**
 * @param {Record<string, string>} expectedImages frontend_image, backend_image, jobs_image
 * @param {{
 *   project?: string,
 *   region?: string,
 *   components?: Array<'services' | 'jobs'>,
 *   describe?: (kind: 'services' | 'jobs', name: string) => { ok: true, json: any } | { ok: false, error: string },
 * }} [options]
 */
export function verifyCloudRunDigests(expectedImages, options = {}) {
  const components = options.components ?? ['services', 'jobs'];
  const describe = options.describe ?? ((kind, name) => describeWithGcloud(kind, name, options));
  const errors = [];

  const targets = [];
  if (components.includes('services')) {
    targets.push(
      ['services', CLOUD_RUN_SERVICES[0], expectedImages.frontend_image],
      ['services', CLOUD_RUN_SERVICES[1], expectedImages.backend_image],
    );
  }
  if (components.includes('jobs')) {
    for (const job of CLOUD_RUN_JOBS) {
      targets.push(['jobs', job, expectedImages.jobs_image]);
    }
  }
  if (targets.length === 0) {
    return { ok: false, errors: ['Ningún componente de Cloud Run para verificar.'] };
  }

  for (const [kind, name, want] of targets) {
    if (typeof want !== 'string' || !/@sha256:[0-9a-f]{64}$/i.test(want)) {
      errors.push(`${name}: imagen esperada ausente o no inmutable.`);
      continue;
    }
    const described = describe(kind, name);
    if (!described.ok) {
      errors.push(`${name}: ${described.error}`);
      continue;
    }
    const image = kind === 'services'
      ? extractServiceImage(described.json)
      : extractJobImage(described.json);
    if (image !== want) {
      errors.push(`${name}: imagen ${image || '(vacía)'} != ${want}`);
    }
    if (kind === 'services') {
      errors.push(...serviceRevisionErrors(described.json, name));
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

/**
 * @param {string} command
 */
export function verifyMigrateCommand(command) {
  const errors = [];
  const lowered = command.toLowerCase();
  if (!lowered.includes(MIGRATE_JOB_NAME)) {
    errors.push(`El comando debe ejecutar ${MIGRATE_JOB_NAME}.`);
  }
  if (lowered.includes('bootstrap')) {
    errors.push('No ejecutar bootstrap en la misma operación.');
  }
  return errors;
}

/**
 * Diseño de smoke tests: pendiente DNS/certificado oficial.
 */
export const PUBLIC_SMOKE_STATUS = 'pending_dns_and_certificate';
