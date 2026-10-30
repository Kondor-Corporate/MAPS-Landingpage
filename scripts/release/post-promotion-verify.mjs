/**
 * Controles posteriores a un apply (diseño R6-C3). No accede a producción sin gcloud autenticado.
 */

import { spawnSync } from 'node:child_process';

import { MIGRATE_JOB_NAME } from './promotion-plan-contract.mjs';

/**
 * @param {Record<string, string>} expectedImages frontend/backend/jobs immutable refs
 * @param {{ project?: string, region?: string }} [options]
 */
export function verifyCloudRunDigests(expectedImages, options = {}) {
  const project = options.project ?? 'maps-prod-landing-page';
  const region = options.region ?? 'southamerica-east1';
  const errors = [];

  const services = [
    ['maps-prod-frontend', expectedImages.frontend_image],
    ['maps-prod-backend', expectedImages.backend_image],
  ];

  for (const [name, want] of services) {
    const describe = spawnSync(
      'gcloud',
      [
        'run',
        'services',
        'describe',
        name,
        `--project=${project}`,
        `--region=${region}`,
        '--format=json',
      ],
      { encoding: 'utf8', shell: process.platform === 'win32' },
    );
    if (describe.status !== 0) {
      errors.push(`${name}: describe falló.`);
      continue;
    }
    try {
      const json = JSON.parse(describe.stdout);
      const image = json.spec?.template?.spec?.containers?.[0]?.image ?? '';
      if (image !== want) {
        errors.push(`${name}: imagen ${image} != ${want}`);
      }
      const conditions = json.status?.conditions ?? [];
      const ready = conditions.find((c) => c.type === 'Ready');
      if (ready?.status !== 'True') {
        errors.push(`${name}: revisión no Ready.`);
      }
    } catch {
      errors.push(`${name}: respuesta JSON inválida.`);
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
