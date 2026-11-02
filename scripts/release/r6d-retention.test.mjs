import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  buildRetentionReport,
  identifyDeployments,
  loadRetentionPolicy,
  normalizeArtifactImages,
  parseImageRef,
  simulateCleanup,
} from './retention-report.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const NOW = new Date('2026-10-31T12:00:00Z');
const policy = loadRetentionPolicy(REPO_ROOT);
const registry = JSON.parse(readFileSync(join(__dirname, 'fixtures/rollback/registry-valid.json'), 'utf8'));
const KEYS = ['frontend_image', 'backend_image', 'jobs_image'];

const byId = (id) => registry.find((r) => r.deployment_id === id);
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();

/** Item de `gcloud artifacts docker images list` para una referencia @sha256. */
function arItem(ref, { tags = [], createTime = daysAgo(2) } = {}) {
  const { image, digest } = parseImageRef(ref);
  return { package: image, version: digest, tags: tags.join(','), createTime };
}

/** AR con todos los digests del registro, etiquetados como pide la política. */
function healthyRegistry() {
  const items = [];
  const tagFor = { '900002': 'prod-current', '900001': 'prod-previous', 'r5-baseline': 'prod-baseline-r5' };
  for (const [id, tag] of Object.entries(tagFor)) {
    for (const key of KEYS) {
      items.push(arItem(byId(id).images[key], { tags: [tag, byId(id).git_sha], createTime: daysAgo(40) }));
    }
  }
  return items;
}

const running = () => ({ ...byId('900002').images });

test('política local: espejo exacto de la política Terraform', () => {
  const tf = readFileSync(join(REPO_ROOT, 'infra/terraform/modules/artifact-registry/main.tf'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(tf, new RegExp(`protected_tag_prefixes = \\[${policy.protected_tag_prefixes.map((p) => `"${p}"`).join(', ')}\\]`));
  assert.match(tf, new RegExp(`keep_recent_versions\\s+= ${policy.keep_recent_versions}\\b`));
  assert.match(tf, new RegExp(`untagged_delete_after\\s+= "${policy.untagged_delete_after_days * 86400}s"`));
  assert.match(tf, /action = "DELETE"[\s\S]*tag_state\s+= "UNTAGGED"/);
  // Ninguna regla de borrado alcanza imágenes con tag.
  const deleteBlocks = tf.match(/action = "DELETE"[\s\S]*?\n  }\n/g) ?? [];
  assert.equal(deleteBlocks.length, 1);
  assert.doesNotMatch(deleteBlocks[0], /tag_state\s+= "(TAGGED|ANY)"/);
});

test('simulación: Terraform conserva dry_run=true y bloquea false', () => {
  const vars = readFileSync(join(REPO_ROOT, 'infra/terraform/modules/artifact-registry/variables.tf'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(vars, /variable "cleanup_policy_dry_run"[\s\S]*default\s+= true/);
  assert.match(vars, /condition\s+= var\.cleanup_policy_dry_run == true/);
  const tf = readFileSync(join(REPO_ROOT, 'infra/terraform/modules/artifact-registry/main.tf'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(tf, /cleanup_policy_dry_run = var\.cleanup_policy_dry_run/);
  const root = readFileSync(join(REPO_ROOT, 'infra/terraform/environments/production/main.tf'), 'utf8').replace(/\r\n/g, '\n');
  assert.doesNotMatch(root, /cleanup_policy_dry_run/, 'el root no puede apagar la simulación');
});

test('identifica actual, anterior válida para rollback, baseline y ventana', () => {
  const found = identifyDeployments(registry, policy);
  assert.equal(found.ok, true);
  assert.equal(found.current.deployment_id, '900002');
  assert.equal(found.previous.deployment_id, '900001');
  assert.equal(found.baseline.deployment_id, 'r5-baseline');
  assert.equal(found.window.length, 3);
});

test('la anterior válida salta registros no elegibles (partial, rollback al baseline)', () => {
  const extra = [
    ...registry,
    { ...byId('900002'), deployment_id: '900003', outcome: 'partial', applied_at: '2026-03-01T00:00:00Z' },
  ];
  assert.equal(identifyDeployments(extra, policy).current.deployment_id, '900002', 'partial nunca es actual');
  assert.equal(identifyDeployments([], policy).ok, false);
});

test('informe sano: nada protegido es candidato, sin comandos de etiquetado', () => {
  const report = buildRetentionReport({
    registryRecords: registry, arImages: healthyRegistry(), running: running(), policy, now: NOW,
  });
  assert.equal(report.ok, true, report.errors.join(' '));
  assert.equal(report.protected.filter((p) => p.candidate).length, 0);
  assert.deepEqual(report.tagCommands, []);
  assert.equal(report.candidate_count, 0);
});

test('un digest desplegado sin tag y viejo sería candidato: el informe falla', () => {
  const items = healthyRegistry();
  const current = byId('900002').images.backend_image;
  const idx = items.findIndex((i) => `${i.package}@${i.version}` === current);
  items[idx] = arItem(current, { tags: [], createTime: daysAgo(90) });
  // Más de 5 versiones recientes de ese paquete empujan al desplegado fuera de "últimas N".
  const { image } = parseImageRef(current);
  for (let n = 0; n < 6; n += 1) {
    items.push({ package: image, version: `sha256:${'9'.repeat(63)}${n}`, tags: '', createTime: daysAgo(n + 1) });
  }
  const report = buildRetentionReport({ registryRecords: registry, arImages: items, running: running(), policy, now: NOW });
  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /current backend_image .*candidato/);
  assert.equal(report.tagCommands.length, 1);
  assert.match(report.tagCommands[0], /tags add .*@sha256:.* .*:prod-current/);
});

test('un digest protegido ausente del registry se informa, no se asume', () => {
  const items = healthyRegistry().filter((i) => `${i.package}@${i.version}` !== byId('900001').images.frontend_image);
  const report = buildRetentionReport({ registryRecords: registry, arImages: items, running: running(), policy, now: NOW });
  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /previous frontend_image .*NO está en Artifact Registry/);
});

test('deriva entre Cloud Run y el registro de despliegues', () => {
  const drift = { ...running(), backend_image: byId('900001').images.backend_image };
  const report = buildRetentionReport({ registryRecords: registry, arImages: healthyRegistry(), running: drift, policy, now: NOW });
  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /Deriva/);
  // Sin datos de Cloud Run no se inventa la comparación.
  const none = buildRetentionReport({ registryRecords: registry, arImages: healthyRegistry(), running: null, policy, now: NOW });
  assert.equal(none.ok, true);
});

test('faltan etiquetas prod-*: simulación OK pero protección NO lista, comandos solo impresos', () => {
  const items = healthyRegistry().map((i) => ({ ...i, tags: '' }));
  const report = buildRetentionReport({ registryRecords: registry, arImages: items, running: running(), policy, now: NOW });
  // Dos resultados distintos: lo recién creado lo cubre la regla de «últimas N» (la simulación
  // no ve candidatos), pero sin etiquetas la protección obligatoria no está en su sitio.
  assert.equal(report.simulation_ok, true, 'recientes: protegidos por la regla de últimas versiones');
  assert.equal(report.protection_ready, false);
  assert.equal(report.ok, false, 'ok exige también las protecciones');
  assert.equal(report.tagCommands.length, 9, '3 imágenes × (current, previous, baseline)');
  assert.equal(report.protection_gaps.length, 9);
  assert.ok(report.protection_gaps.some((w) => /falta la etiqueta prod-current/.test(w)));
  const source = readFileSync(join(__dirname, 'retention-report.mjs'), 'utf8');
  assert.doesNotMatch(source, /spawnSync|execSync|child_process/, 'el informe no ejecuta nada por su cuenta');
  assert.match(source, /runGcloud\('artifacts', \['docker', 'images', 'list'/);
});

test('protección: cada rol exige su etiqueta en cada una de sus tres imágenes', () => {
  const stripTag = (role) => healthyRegistry().map((i) => ({
    ...i,
    tags: i.tags.split(',').filter((t) => t !== role).join(','),
  }));
  for (const role of ['prod-current', 'prod-previous', 'prod-baseline-r5']) {
    const report = buildRetentionReport({ registryRecords: registry, arImages: stripTag(role), running: running(), policy, now: NOW });
    assert.equal(report.protection_ready, false, role);
    assert.equal(report.ok, false, role);
    assert.equal(report.simulation_ok, true, role);
    assert.equal(report.protection_gaps.length, 3, role);
    assert.ok(report.protection_gaps.every((g) => g.includes(role)), role);
  }
  // Una sola de las tres imágenes sin etiqueta basta para no estar listo.
  const items = healthyRegistry();
  const victim = byId('900002').images.frontend_image;
  const idx = items.findIndex((i) => `${i.package}@${i.version}` === victim);
  items[idx] = { ...items[idx], tags: byId('900002').git_sha };
  const one = buildRetentionReport({ registryRecords: registry, arImages: items, running: running(), policy, now: NOW });
  assert.equal(one.protection_ready, false);
  assert.equal(one.protection_gaps.length, 1);
  // Con todas las etiquetas, listo.
  const ready = buildRetentionReport({ registryRecords: registry, arImages: healthyRegistry(), running: running(), policy, now: NOW });
  assert.equal(ready.protection_ready, true);
  assert.deepEqual(ready.protection_gaps, []);
});

test('protección: solo se exige la etiqueta de los roles que existen en el registro', () => {
  // Un único despliegue (sin previous ni baseline): current es lo único que se puede proteger.
  const only = [byId('900002')];
  const items = healthyRegistry().filter((i) => i.tags.includes('prod-current'));
  const report = buildRetentionReport({ registryRecords: only, arImages: items, running: running(), policy, now: NOW });
  assert.equal(report.protection_ready, true, report.errors.concat(report.protection_gaps).join(' '));
  assert.ok(report.warnings.some((w) => /anterior válida/.test(w)));
  assert.ok(report.warnings.some((w) => /baseline/.test(w)));
});

test('CLI: sale con error si faltan etiquetas; --simulation-only solo evalúa la simulación', () => {
  const dir = mkdtempSync(join(tmpdir(), 'maps-retention-'));
  try {
    const registryFile = join(dir, 'registry.json');
    const runningFile = join(dir, 'running.json');
    writeFileSync(registryFile, JSON.stringify(registry));
    writeFileSync(runningFile, JSON.stringify(running()));
    const run = (items, extra = []) => {
      const imagesFile = join(dir, 'images.json');
      writeFileSync(imagesFile, JSON.stringify(items));
      return spawnSync(process.execPath, [
        join(__dirname, 'retention-report.mjs'),
        `--registry=${registryFile}`, `--images=${imagesFile}`, `--running=${runningFile}`,
        `--now=${NOW.toISOString()}`, ...extra,
      ], { cwd: REPO_ROOT, encoding: 'utf8' });
    };
    const untagged = healthyRegistry().map((i) => ({ ...i, tags: '' }));
    const strict = run(untagged);
    assert.equal(strict.status, 1);
    assert.match(strict.stdout, /Simulación local: OK \| Protecciones obligatorias: NO LISTAS/);
    assert.match(strict.stderr, /NO están listas/);
    const sim = run(untagged, ['--simulation-only']);
    assert.equal(sim.status, 0, 'la simulación sola pasa');
    assert.match(sim.stderr, /NO están listas/, 'pero el aviso de protección se mantiene');
    const ready = run(healthyRegistry());
    assert.equal(ready.status, 0, ready.stderr);
    assert.match(ready.stdout, /Protecciones obligatorias: LISTAS/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('simulación: criterio de candidata (untagged + vieja + fuera de últimas N)', () => {
  const img = 'southamerica-east1-docker.pkg.dev/p/r/backend';
  const mk = (n, tags, age) => ({ image: img, digest: `sha256:${String(n).repeat(64)}`, tags, createTime: new Date(NOW.getTime() - age * 86400000) });
  const items = [
    mk(1, [], 100), mk(2, [], 100), mk(3, [], 100), mk(4, [], 100), mk(5, [], 100), // las 5 más recientes entre sí…
    mk(6, [], 200), // sin tag, vieja, fuera de las últimas 5 → candidata
    mk(7, ['prod-current'], 300), // tag protegido
    mk(8, ['f'.repeat(40)], 300), // tag de SHA (build de release): nunca candidata
    mk(9, [], 1), // reciente
  ];
  const verdicts = simulateCleanup(items, policy, NOW);
  const v = (n) => verdicts.get(`${img}@sha256:${String(n).repeat(64)}`);
  assert.equal(v(6).candidate, true);
  assert.equal(v(7).candidate, false);
  assert.equal(v(8).candidate, false, 'una imagen con tag de SHA no es candidata');
  assert.equal(v(9).candidate, false);
  // Sin fecha fiable no se afirma que sea vieja.
  const noDate = simulateCleanup([{ image: img, digest: 'sha256:' + 'a'.repeat(64), tags: [], createTime: new Date('x') }], policy, NOW);
  assert.equal([...noDate.values()][0].candidate, false);
});

test('normaliza listas de gcloud con tags en cadena o arreglo', () => {
  const [a, b] = normalizeArtifactImages([
    { package: 'p', version: 'SHA256:AB', tags: 'x,y', createTime: '2026-01-01T00:00:00Z' },
    { package: 'p', version: 'sha256:cd', tags: ['z'], createTime: '2026-01-01T00:00:00Z' },
  ]);
  assert.deepEqual(a.tags, ['x', 'y']);
  assert.equal(a.digest, 'sha256:ab');
  assert.deepEqual(b.tags, ['z']);
});
