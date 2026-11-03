#!/usr/bin/env node
/**
 * Punto de partida del apply: antes de tocar Cloud Run, comprueba que el estado de
 * producción del que parte la promoción es el que el verify dio por supuesto.
 *
 * El preflight compara migraciones contra MAPS_PRODUCTION_BASELINE_JSON, una variable que
 * alguien mantiene a mano. Si estuviera adelantada respecto de lo realmente desplegado, se
 * omitirían migraciones pendientes y los servicios nuevos arrancarían sobre un esquema viejo.
 * Este control no confía en esa variable: la contrasta con dos fuentes que el apply puede
 * leer con la identidad que ya tiene (sin permisos nuevos):
 *
 *   1. el registro de despliegues de GCS (promotion/deployments/*.json), cuyo último
 *      `succeeded` es el despliegue actual, y
 *   2. Cloud Run (`gcloud run ... describe`), que debe servir exactamente esas imágenes.
 *
 * Falla cerrado: sin registro, sin despliegue actual o sin poder leer Cloud Run, no hay apply.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { getSuccessfulDeployments, parseDeploymentRegistry } from './deployment-registry.mjs';
import { fetchDeploymentRegistryFromGcs } from './fetch-deployment-registry.mjs';
import { describeWithGcloud, extractJobImage, extractServiceImage } from './post-promotion-verify.mjs';
import { CLOUD_RUN_JOBS, CLOUD_RUN_SERVICES } from './promotion-plan-contract.mjs';

const COMMIT_SHA_RE = /^[0-9a-f]{40}$/;
const [FRONTEND, BACKEND] = CLOUD_RUN_SERVICES;

/**
 * Imágenes que sirve Cloud Run ahora, por recurso.
 * @param {(kind: 'services' | 'jobs', name: string) => { ok: true, json: any } | { ok: false, error: string }} describe
 */
export function readLiveImages(describe) {
  const errors = [];
  /** @type {Record<string, string>} */
  const live = {};
  const targets = [
    ...CLOUD_RUN_SERVICES.map((name) => /** @type {const} */ (['services', name])),
    ...CLOUD_RUN_JOBS.map((name) => /** @type {const} */ (['jobs', name])),
  ];
  for (const [kind, name] of targets) {
    const described = describe(kind, name);
    if (!described.ok) {
      errors.push(`${name}: no se pudo leer de Cloud Run (${described.error}).`);
      continue;
    }
    const image = kind === 'services' ? extractServiceImage(described.json) : extractJobImage(described.json);
    if (!image) {
      errors.push(`${name}: Cloud Run no devolvió imagen.`);
      continue;
    }
    live[name] = image;
  }
  return { ok: errors.length === 0, errors, live };
}

/**
 * @param {object} input
 * @param {unknown[]} input.registryRecords registro de despliegues (promotion/deployments/*.json)
 * @param {Record<string, any>} input.report promotion-report.json del bundle
 * @param {'full' | 'jobs-only' | 'services-only'} input.planMode
 * @param {Record<string, string>} input.live imágenes que sirve Cloud Run, por nombre de recurso
 * @param {(ancestor: string, descendant: string) => boolean | null} input.isAncestor
 *        true/false; null si no se puede establecer (commit ausente del checkout)
 */
export function assertStartingPoint(input) {
  const errors = [];
  const warnings = [];
  const report = input.report ?? {};
  const migration = report.migration ?? {};

  const parsed = parseDeploymentRegistry(input.registryRecords);
  if (!parsed.ok) {
    return { ok: false, errors: ['Registro de despliegues corrupto: ' + (parsed.errors ?? []).join(' ')], warnings };
  }
  const current = getSuccessfulDeployments(parsed.records ?? [])[0];
  if (!current) {
    return {
      ok: false,
      errors: [
        'El registro no tiene ningún despliegue succeeded (falta r5-baseline): sin evidencia del estado actual no se modifica producción. '
        + 'Registrar el baseline R5 (runbook, «Registro baseline R5») antes de la primera promoción.',
      ],
      warnings,
    };
  }
  const want = /** @type {Record<string, string>} */ (current.images);

  // 1) Cloud Run sirve lo que el registro dice que está desplegado.
  const expectedByResource = {
    [FRONTEND]: [want.frontend_image],
    [BACKEND]: [want.backend_image],
  };
  // Promoción en dos fases (migraciones nuevas): el único estado intermedio legítimo es el que
  // deja el `jobs-only` previo, con los dos jobs en la imagen nueva y los servicios todavía en
  // la registrada. Sin migraciones, o en cualquier otro modo, los jobs siguen en la registrada.
  const targetJobs = report.images?.jobs_image;
  let jobImage = want.jobs_image;
  let jobLabel = `registro, despliegue ${String(current.deployment_id)}`;
  if (input.planMode === 'services-only' && report.operation !== 'rollback') {
    if (migration.requires_jobs_first_apply === true) {
      jobImage = targetJobs;
      jobLabel = 'imagen que debe haber dejado el jobs-only previo';
    } else if (targetJobs !== want.jobs_image) {
      // Sin migraciones el jobs-only está prohibido: los jobs no cambiarían y el post-verify
      // terminaría en `partial` con los servicios ya cambiados.
      errors.push(
        'services-only sin migraciones nuevas dejaría los jobs en la imagen anterior (la verificación posterior fallaría con los servicios ya cambiados). Usar plan_mode=full.',
      );
    }
  }
  if (typeof jobImage !== 'string') {
    errors.push('El informe del verify no declara la imagen de jobs esperada.');
  }
  for (const job of CLOUD_RUN_JOBS) {
    expectedByResource[job] = [jobImage];
  }
  for (const [name, allowed] of Object.entries(expectedByResource)) {
    const image = input.live?.[name];
    const label = CLOUD_RUN_JOBS.includes(name) ? jobLabel : `registro, despliegue ${String(current.deployment_id)}`;
    if (!image) {
      errors.push(`${name}: sin lectura de Cloud Run; no se puede comprobar el punto de partida.`);
    } else if (!allowed.includes(image)) {
      errors.push(
        `${name}: Cloud Run sirve ${image} y se esperaba ${String(allowed[0])} (${label}). `
        + 'Producción no está donde se esperaba: reconciliar antes de promover.',
      );
    }
  }

  // 2) El baseline con el que el verify calculó las migraciones es el desplegado o uno anterior.
  const deployedSha = String(current.git_sha);
  if (report.operation === 'rollback') {
    if (migration.current_git_sha !== deployedSha) {
      errors.push(
        `El verify del rollback partió de ${String(migration.current_git_sha)} y el despliegue actual del registro es ${deployedSha}. Repetir verify.`,
      );
    }
  } else {
    const baselineSha = migration.baseline_git_sha;
    if (typeof baselineSha !== 'string' || !COMMIT_SHA_RE.test(baselineSha)) {
      errors.push('El informe del verify no declara baseline_git_sha: no se puede comprobar el punto de partida.');
    } else if (baselineSha !== deployedSha) {
      const ancestor = input.isAncestor(baselineSha, deployedSha);
      if (ancestor === true) {
        // Baseline atrasado: el diff de migraciones incluye de más, nunca de menos.
        warnings.push(
          `MAPS_PRODUCTION_BASELINE_JSON (${baselineSha}) está por detrás del despliegue actual (${deployedSha}): `
          + 'el plan puede exigir jobs-only de más, nunca de menos. Actualizar la variable tras esta promoción.',
        );
      } else if (ancestor === false) {
        errors.push(
          `MAPS_PRODUCTION_BASELINE_JSON (${baselineSha}) no es el despliegue actual ni un antecesor suyo (${deployedSha}). `
          + 'Un baseline adelantado o ajeno oculta migraciones pendientes. Corregir la variable y repetir verify.',
        );
      } else {
        errors.push(
          `No se pudo establecer la relación entre el baseline (${baselineSha}) y el despliegue actual (${deployedSha}) en el checkout. Bloqueado.`,
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    current: { deployment_id: current.deployment_id, git_sha: deployedSha },
  };
}

/**
 * `git merge-base --is-ancestor`: true / false, o null si git no puede responder (p. ej. un
 * commit que no está en el checkout). Quien llama trata null como bloqueo.
 * @param {string} [cwd]
 * @returns {(ancestor: string, descendant: string) => boolean | null}
 */
export function gitIsAncestor(cwd = process.cwd()) {
  return (ancestor, descendant) => {
    const res = spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { cwd, encoding: 'utf8' });
    if (res.status === 0) return true;
    if (res.status === 1) return false;
    return null;
  };
}

function runCli(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const idx = a.indexOf('=');
      args[idx === -1 ? a.slice(2) : a.slice(2, idx)] = idx === -1 ? 'true' : a.slice(idx + 1);
    }
  }
  if (args['live-only'] === 'true') {
    const live = readLiveImages((kind, name) => describeWithGcloud(kind, name));
    if (!live.ok) {
      for (const e of live.errors) process.stderr.write(`error: ${e}\n`);
      process.exit(1);
    }
    const names = [...CLOUD_RUN_SERVICES, ...CLOUD_RUN_JOBS];
    for (const name of names) {
      const image = live.live[name];
      if (typeof image !== 'string' || !/@sha256:[0-9a-f]{64}$/i.test(image)) {
        process.stderr.write(`error: ${name}: imagen ausente o sin digest.\n`);
        process.exit(1);
      }
      process.stdout.write(`${name} ${image}\n`);
    }
    process.exit(0);
  }
  if (!args.report || !args.bucket || !args['plan-mode']) {
    process.stderr.write(
      'Uso: node scripts/release/verify-starting-point.mjs --report=promotion-report.json --plan-mode=<modo> --bucket=BUCKET\n',
    );
    process.exit(2);
  }
  const fetched = fetchDeploymentRegistryFromGcs(args.bucket);
  if (!fetched.ok) {
    process.stderr.write(`error: registro de despliegues: ${(fetched.errors ?? []).join(' ')}\n`);
    process.exit(1);
  }
  const live = readLiveImages((kind, name) => describeWithGcloud(kind, name));
  if (!live.ok) {
    for (const e of live.errors) process.stderr.write(`error: ${e}\n`);
    process.exit(1);
  }
  const result = assertStartingPoint({
    registryRecords: fetched.records ?? [],
    report: JSON.parse(readFileSync(args.report, 'utf8')),
    planMode: /** @type any */ (args['plan-mode']),
    live: live.live,
    isAncestor: gitIsAncestor(),
  });
  for (const w of result.warnings) process.stdout.write(`aviso: ${w}\n`);
  if (!result.ok) {
    for (const e of result.errors) process.stderr.write(`error: ${e}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `Punto de partida verificado: despliegue ${String(result.current?.deployment_id)} (${result.current?.git_sha}) coincide con Cloud Run.\n`,
  );
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
