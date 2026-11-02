#!/usr/bin/env node
/**
 * Informe de retención de imágenes (R6-D). SOLO LECTURA: no etiqueta, no borra, no cambia
 * nada en Artifact Registry ni en Cloud Run. Imprime los comandos de etiquetado para que
 * los revise y ejecute un operador autorizado.
 *
 * Responde, con el registro de despliegues de R6-C como única fuente de verdad:
 *   - qué digests están desplegados hoy (current) y cuál es la versión anterior válida
 *     para rollback (previous), más el baseline R5 y la ventana de rollback;
 *   - si algún digest protegido sería candidato a borrado con la política de
 *     infra/terraform/modules/artifact-registry (espejo en config/release/retention-policy.json);
 *   - si falta la etiqueta prod-* que protege cada digest protegido;
 *   - si lo que Cloud Run sirve coincide con lo que el registro dice que está desplegado.
 *
 * Qué es local y qué necesita GCP:
 *   - Con archivos (--registry, --images, --running) corre sin credenciales y es una
 *     SIMULACIÓN LOCAL del criterio de la política. Sirve para revisar y para tests.
 *   - --bucket / --live-images / --live-running leen GCP (gsutil/gcloud, solo lectura) y
 *     requieren credenciales. Que el digest histórico siga existiendo solo se sabe así.
 *   - La verdad sobre qué borraría Artifact Registry es su dry-run (logs Data Access),
 *     no este informe. Ver docs/GCP_PRODUCTION_RUNBOOK.md, «Retención de imágenes».
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getSuccessfulDeployments, parseDeploymentRegistry } from './deployment-registry.mjs';
import { fetchDeploymentRegistryFromGcs } from './fetch-deployment-registry.mjs';
import { readJsonFile } from './json-file.mjs';
import { runGcloud } from './gcp-artifact-verify.mjs';
import { REGISTRY } from './manifest-contract.mjs';
import { describeWithGcloud, extractJobImage, extractServiceImage } from './post-promotion-verify.mjs';
import { validateRollbackTargetSelection } from './rollback-selection.mjs';

const IMAGE_KEYS = ['frontend_image', 'backend_image', 'jobs_image'];
const DAY_MS = 24 * 60 * 60 * 1000;
const DIGEST_REF_RE = /^(.+)@(sha256:[0-9a-f]{64})$/i;

/** @param {string} repoRoot */
export function loadRetentionPolicy(repoRoot) {
  return JSON.parse(readFileSync(join(repoRoot, 'config/release/retention-policy.json'), 'utf8'));
}

/** @param {string} ref */
export function parseImageRef(ref) {
  const m = typeof ref === 'string' ? ref.match(DIGEST_REF_RE) : null;
  return m ? { image: m[1], digest: m[2].toLowerCase() } : null;
}

/**
 * Normaliza la salida de `gcloud artifacts docker images list --include-tags --format=json`.
 * @param {unknown[]} raw
 */
export function normalizeArtifactImages(raw) {
  return raw.map((item) => {
    const it = /** @type {Record<string, any>} */ (item);
    const tags = Array.isArray(it.tags)
      ? it.tags.map(String)
      : String(it.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
    return {
      image: String(it.package ?? ''),
      digest: String(it.version ?? it.digest ?? '').toLowerCase(),
      tags,
      createTime: new Date(String(it.createTime ?? it.create_time ?? '')),
    };
  });
}

/**
 * Criterio local de la política (espejo de Terraform): candidata = sin tag, con más de N días
 * y fuera de las últimas K versiones de su imagen. Una keep gana siempre a la delete.
 * @param {ReturnType<typeof normalizeArtifactImages>} items
 * @param {Record<string, any>} policy
 * @param {Date} now
 * @returns {Map<string, { candidate: boolean, keptByTag: boolean, keptRecent: boolean }>}
 */
export function simulateCleanup(items, policy, now) {
  const verdicts = new Map();
  const byImage = new Map();
  for (const it of items) {
    if (!byImage.has(it.image)) byImage.set(it.image, []);
    byImage.get(it.image).push(it);
  }
  for (const group of byImage.values()) {
    const recent = new Set(
      [...group]
        .sort((a, b) => b.createTime.getTime() - a.createTime.getTime())
        .slice(0, policy.keep_recent_versions)
        .map((it) => it.digest),
    );
    for (const it of group) {
      const keptByTag = it.tags.some((t) => policy.protected_tag_prefixes.some((p) => t.startsWith(p)));
      const keptRecent = recent.has(it.digest);
      const untagged = it.tags.length === 0;
      const old = Number.isNaN(it.createTime.getTime())
        ? false // sin fecha fiable no se afirma que sea vieja: se trata como no candidata
        : now.getTime() - it.createTime.getTime() > policy.untagged_delete_after_days * DAY_MS;
      verdicts.set(`${it.image}@${it.digest}`, {
        candidate: untagged && old && !keptByTag && !keptRecent,
        keptByTag,
        keptRecent,
      });
    }
  }
  return verdicts;
}

/**
 * Despliegue actual, versión anterior válida para rollback, baseline y ventana.
 * "Anterior válida" reutiliza validateRollbackTargetSelection de R6-C4: el mismo criterio
 * que aplicaría el workflow de rollback, sin duplicarlo.
 * @param {unknown[]} registryRecords
 * @param {Record<string, any>} policy
 */
export function identifyDeployments(registryRecords, policy) {
  const parsed = parseDeploymentRegistry(registryRecords);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors ?? ['Registro corrupto.'] };
  }
  const records = parsed.records ?? [];
  const successful = getSuccessfulDeployments(records);
  const current = successful[0];
  if (!current) {
    return { ok: false, errors: ['El registro no tiene ningún despliegue succeeded: no hay nada que proteger por referencia.'] };
  }
  const previous = successful.slice(1).find((candidate) =>
    validateRollbackTargetSelection({
      registryRecords: records,
      targetDeploymentId: String(candidate.deployment_id),
    }).ok);
  const baseline = records.find((r) => r.operation === 'baseline' && r.outcome === 'succeeded') ?? null;
  const window = successful.slice(0, policy.rollback_window_deployments);
  return { ok: true, current, previous: previous ?? null, baseline, window };
}

/**
 * @param {object} input
 * @param {unknown[]} input.registryRecords
 * @param {unknown[]} input.arImages salida cruda de gcloud
 * @param {Record<string, string> | null} [input.running] imágenes que sirve Cloud Run
 * @param {Record<string, any>} input.policy
 * @param {Date} [input.now]
 */
export function buildRetentionReport(input) {
  const now = input.now ?? new Date();
  const errors = [];
  const warnings = [];
  /** Protecciones obligatorias que todavía no están en su sitio (separadas de la simulación). */
  const protectionGaps = [];

  const found = identifyDeployments(input.registryRecords, input.policy);
  if (!found.ok) {
    return {
      ok: false,
      simulation_ok: false,
      protection_ready: false,
      errors: found.errors,
      protection_gaps: [],
      warnings,
      protected: [],
      candidates: [],
      tagCommands: [],
    };
  }
  const items = normalizeArtifactImages(input.arImages);
  const verdicts = simulateCleanup(items, input.policy, now);
  const byRef = new Map(items.map((it) => [`${it.image}@${it.digest}`, it]));

  /** @type {Array<Record<string, any>>} */
  const protectedImages = [];
  const seen = new Set();
  const protect = (role, images, requiredTag, hard) => {
    for (const key of IMAGE_KEYS) {
      const parsed = parseImageRef(images?.[key]);
      if (!parsed) {
        errors.push(`${role}: ${key} no es una referencia @sha256 válida.`);
        continue;
      }
      const ref = `${parsed.image}@${parsed.digest}`;
      const item = byRef.get(ref);
      const verdict = verdicts.get(ref);
      const entry = {
        role, key, ref,
        in_registry: Boolean(item),
        tags: item?.tags ?? [],
        candidate: verdict?.candidate === true,
        required_tag: requiredTag ?? null,
        has_required_tag: requiredTag ? Boolean(item?.tags.includes(requiredTag)) : null,
      };
      protectedImages.push(entry);
      const label = `${role} ${key} (${ref})`;
      if (!item) {
        (hard ? errors : warnings).push(`${label}: el digest NO está en Artifact Registry.`);
      } else if (entry.candidate) {
        (hard ? errors : warnings).push(`${label}: sería candidato a borrado con la política.`);
      }
      if (item && requiredTag && !entry.has_required_tag) {
        protectionGaps.push(`${label}: falta la etiqueta ${requiredTag}; sin ella solo lo protege la regla de versiones recientes.`);
      }
      seen.add(ref);
    }
  };

  protect('current', found.current.images, input.policy.required_tags.current, true);
  if (found.previous) {
    protect('previous', found.previous.images, input.policy.required_tags.previous, true);
  } else {
    warnings.push('No hay una versión anterior válida para rollback en el registro (¿primer despliegue?).');
  }
  if (found.baseline) {
    protect('baseline', found.baseline.images, input.policy.required_tags.baseline, true);
  } else {
    warnings.push('El registro no tiene el baseline R5 (r5-baseline): sin él no hay rollback a R5.');
  }
  for (const dep of found.window) {
    if (dep.deployment_id === found.current.deployment_id || dep.deployment_id === found.previous?.deployment_id) {
      continue;
    }
    protect(`window:${dep.deployment_id}`, dep.images, null, false);
  }

  if (input.running) {
    for (const key of IMAGE_KEYS) {
      if (input.running[key] !== found.current.images[key]) {
        errors.push(`Deriva: Cloud Run sirve ${String(input.running[key])} y el registro dice ${found.current.images[key]} (${key}).`);
      }
    }
  }

  const candidates = items
    .filter((it) => verdicts.get(`${it.image}@${it.digest}`)?.candidate)
    .map((it) => `${it.image}@${it.digest}`);
  for (const ref of candidates) {
    if (seen.has(ref)) {
      continue;
    }
    const known = getSuccessfulDeployments(/** @type {any} */ (input.registryRecords)).some((d) =>
      IMAGE_KEYS.some((k) => d.images?.[k] === ref));
    if (known) {
      warnings.push(`${ref}: candidato a borrado y figura en un despliegue histórico fuera de la ventana de rollback.`);
    }
  }

  const tagCommands = protectedImages
    .filter((p) => p.in_registry && p.required_tag && !p.has_required_tag)
    .map((p) => {
      const parsed = /** @type {{ image: string }} */ (parseImageRef(p.ref));
      return `gcloud artifacts docker tags add ${p.ref} ${parsed.image}:${p.required_tag} --project=${REGISTRY.project}`;
    });

  // Dos preguntas distintas: (1) ¿la simulación local protege lo desplegado? y (2) ¿están ya
  // puestas las etiquetas que hacen que la protección no dependa de la regla de «últimas N»?
  // Solo con las dos en verde la protección está lista para revisar el dry-run real.
  const simulationOk = errors.length === 0;
  const protectionReady = simulationOk && protectionGaps.length === 0;

  return {
    ok: protectionReady,
    simulation_ok: simulationOk,
    protection_ready: protectionReady,
    errors,
    protection_gaps: protectionGaps,
    warnings,
    generated_at: now.toISOString(),
    scope: 'Simulación local del criterio de la política; la verdad es el dry-run de Artifact Registry.',
    current: { deployment_id: found.current.deployment_id, git_sha: found.current.git_sha },
    previous: found.previous
      ? { deployment_id: found.previous.deployment_id, git_sha: found.previous.git_sha }
      : null,
    protected: protectedImages,
    candidates,
    candidate_count: candidates.length,
    tagCommands,
  };
}

// --- CLI -----------------------------------------------------------------------

/** @param {string[]} argv */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (const a of argv) {
    if (!a.startsWith('--')) continue;
    const idx = a.indexOf('=');
    args[idx === -1 ? a.slice(2) : a.slice(2, idx)] = idx === -1 ? 'true' : a.slice(idx + 1);
  }
  return args;
}

function readJson(path) {
  return readJsonFile(path);
}

function liveImages() {
  const repo = `${REGISTRY.location}-docker.pkg.dev/${REGISTRY.project}/${REGISTRY.repository}`;
  const res = runGcloud('artifacts', ['docker', 'images', 'list', repo, '--include-tags', '--format=json']);
  if (res.status !== 0) {
    throw new Error(`gcloud artifacts docker images list falló: ${res.stderr}`);
  }
  return JSON.parse(res.stdout);
}

function liveRunning() {
  const pick = (kind, name, extract) => {
    const d = describeWithGcloud(kind, name);
    if (!d.ok) {
      throw new Error(`${name}: ${d.error}`);
    }
    return extract(d.json);
  };
  const migrate = pick('jobs', 'maps-prod-migrate', extractJobImage);
  const bootstrap = pick('jobs', 'maps-prod-bootstrap', extractJobImage);
  if (migrate !== bootstrap) {
    throw new Error('maps-prod-migrate y maps-prod-bootstrap sirven imágenes distintas.');
  }
  return {
    frontend_image: pick('services', 'maps-prod-frontend', extractServiceImage),
    backend_image: pick('services', 'maps-prod-backend', extractServiceImage),
    jobs_image: migrate,
  };
}

function runCli(argv) {
  const args = parseArgs(argv);
  const hasRegistry = args.registry || args.bucket;
  const hasImages = args.images || args['live-images'];
  if (!hasRegistry || !hasImages) {
    process.stderr.write(
      'Uso: node scripts/release/retention-report.mjs (--registry=registry.json | --bucket=BUCKET) '
      + '(--images=images.json | --live-images) [--running=running.json | --live-running] '
      + '[--print-tag-commands] [--json=informe.json] [--simulation-only]\n'
      + '  Solo lectura. --bucket, --live-images y --live-running usan gsutil/gcloud con tus credenciales.\n',
    );
    process.exit(2);
  }

  let registryRecords;
  if (args.registry) {
    registryRecords = readJson(args.registry);
  } else {
    const fetched = fetchDeploymentRegistryFromGcs(args.bucket);
    if (!fetched.ok) {
      process.stderr.write(`error: ${(fetched.errors ?? []).join(' ')}\n`);
      process.exit(1);
    }
    registryRecords = fetched.records;
  }

  let report;
  try {
    report = buildRetentionReport({
      registryRecords,
      arImages: args.images ? readJson(args.images) : liveImages(),
      running: args.running ? readJson(args.running) : (args['live-running'] ? liveRunning() : null),
      policy: loadRetentionPolicy(process.cwd()),
      now: args.now ? new Date(args.now) : new Date(),
    });
  } catch (err) {
    process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  process.stdout.write(`${report.scope}\n`);
  process.stdout.write(`Protegidos: ${report.protected.length} | candidatos a borrado (simulación local): ${report.candidate_count ?? 0}\n`);
  process.stdout.write(
    `Simulación local: ${report.simulation_ok ? 'OK' : 'CON ERRORES'} | `
    + `Protecciones obligatorias: ${report.protection_ready ? 'LISTAS' : 'NO LISTAS'}\n`,
  );
  for (const w of report.warnings) process.stdout.write(`aviso: ${w}\n`);
  for (const g of report.protection_gaps ?? []) process.stderr.write(`protección pendiente: ${g}\n`);
  for (const e of report.errors) process.stderr.write(`error: ${e}\n`);
  if (args['print-tag-commands'] && report.tagCommands.length > 0) {
    process.stdout.write('\nComandos de etiquetado (NO ejecutados; revisar y ejecutar con autorización):\n');
    for (const cmd of report.tagCommands) process.stdout.write(`  ${cmd}\n`);
  }
  if (args.json) {
    writeFileSync(args.json, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (!report.protection_ready) {
    process.stderr.write(
      'Las protecciones obligatorias NO están listas: no activar la limpieza real ni dar por revisado el dry-run.\n',
    );
  }
  // Por defecto el código de salida exige también las protecciones; --simulation-only deja
  // pasar la simulación sola (útil antes de etiquetar), pero el aviso de arriba se mantiene.
  process.exit((args['simulation-only'] ? report.simulation_ok : report.ok) ? 0 : 1);
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
