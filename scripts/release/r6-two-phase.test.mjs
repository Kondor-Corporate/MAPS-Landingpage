/**
 * Promoción en dos fases con migraciones, de punta a punta y encadenando los módulos reales:
 *
 *   A (registrada, servicios y jobs) → jobs-only (jobs a B) → maps-prod-migrate con evidencia
 *   → services-only (frontend/backend a B) → verificación y registro de B.
 *
 * Es una simulación local: Cloud Run es un objeto en memoria y no hay GitHub, GCS ni Terraform.
 * Demuestra que `verify-starting-point` acepta únicamente el estado intermedio esperado y que
 * las piezas se entienden entre sí; no demuestra el comportamiento contra GCP.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { getCurrentDeployment, parseDeploymentRegistry } from './deployment-registry.mjs';
import { runPostDeploymentVerification } from './post-deployment-verify.mjs';
import { productionImagesFromManifest } from './promotion-images.mjs';
import { buildDeploymentRecord } from './record-deployment-outcome.mjs';
import { buildMigrateEvidenceRecord } from './record-migrate-evidence.mjs';
import { validatePromotionApplyGate } from './validate-promotion-apply-gate.mjs';
import { assertStartingPoint, readLiveImages } from './verify-starting-point.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(join(__dirname, 'fixtures', rel), 'utf8'));

const B_SHA = 'c'.repeat(40);
const BUILD_RUN = '5550001';
const VERIFY_RUN = '7001';
const MAIN_SHA = 'e'.repeat(40);
const SERVICES = ['maps-prod-frontend', 'maps-prod-backend'];
const JOBS = ['maps-prod-migrate', 'maps-prod-bootstrap'];
const DIGEST = (c) => `southamerica-east1-docker.pkg.dev/maps-prod-landing-page/maps-prod/x@sha256:${c.repeat(64)}`;

const registry = load('rollback/registry-valid.json');
const A = getCurrentDeployment(parseDeploymentRegistry(registry).records); // último succeeded
const manifestB = {
  ...load('promotion/valid-manifest-minimal.json'),
  git_sha: B_SHA,
  build_run_url: `https://github.com/Kondor-Corporate/MAPS-Landingpage/actions/runs/${BUILD_RUN}`,
};
const IMAGES_B = productionImagesFromManifest(manifestB).images;

/** Informe del verify de A → B con migraciones nuevas. */
const REPORT = {
  operation: 'forward',
  automation_sha: MAIN_SHA,
  git_sha: B_SHA,
  release_build_run_id: BUILD_RUN,
  images: IMAGES_B,
  migration: {
    requires_jobs_first_apply: true,
    automatic_migration_comparison: true,
    baseline_git_sha: A.git_sha,
    new_migration_folders: ['20261031000000_nueva'],
  },
};

/** Cloud Run en memoria. `apply` imita lo que cambia cada plan_mode. */
function makeCloudRun() {
  const state = {
    'maps-prod-frontend': A.images.frontend_image,
    'maps-prod-backend': A.images.backend_image,
    'maps-prod-migrate': A.images.jobs_image,
    'maps-prod-bootstrap': A.images.jobs_image,
  };
  const describe = (kind, name) => ({
    ok: true,
    json: kind === 'jobs'
      ? { spec: { template: { spec: { template: { spec: { containers: [{ image: state[name] }] } } } } } }
      : {
        spec: { template: { spec: { containers: [{ image: state[name] }] } } },
        status: {
          conditions: [{ type: 'Ready', status: 'True' }],
          latestCreatedRevisionName: 'r', latestReadyRevisionName: 'r',
          traffic: [{ latestRevision: true, percent: 100 }],
        },
      },
  });
  return {
    state,
    describe,
    live: () => readLiveImages(describe).live,
    apply(mode) {
      if (mode !== 'services-only') for (const job of JOBS) state[job] = IMAGES_B.jobs_image;
      if (mode !== 'jobs-only') {
        state['maps-prod-frontend'] = IMAGES_B.frontend_image;
        state['maps-prod-backend'] = IMAGES_B.backend_image;
      }
    },
  };
}

const start = (cr, planMode, extra = {}) => assertStartingPoint({
  registryRecords: extra.registry ?? registry,
  report: extra.report ?? REPORT,
  planMode,
  live: extra.live ?? cr.live(),
  isAncestor: () => true,
});

const evidence = (overrides = {}) => ({
  ...buildMigrateEvidenceRecord({
    verifyRunId: VERIFY_RUN, gitSha: B_SHA, releaseBuildRunId: BUILD_RUN,
    executionName: 'maps-prod-migrate-abcde', automationSha: MAIN_SHA,
  }),
  ...overrides,
});

const gate = (planMode, migrateEvidence) => validatePromotionApplyGate({
  planMode, operation: 'forward', migration: REPORT.migration,
  verifyRunId: VERIFY_RUN, gitSha: B_SHA, releaseBuildRunId: BUILD_RUN, automationSha: MAIN_SHA,
  migrateEvidence, report: REPORT, inputOperation: 'promote', inputTargetDeploymentId: '',
});

test('dos fases: la secuencia completa A → jobs B → migrate → servicios B → registro de B', () => {
  const cr = makeCloudRun();

  // 0. Producción es A y A es el último despliegue registrado.
  assert.equal(A.deployment_id, '900002');

  // 1. jobs-only: parte de A en todo.
  const first = start(cr, 'jobs-only');
  assert.equal(first.ok, true, first.errors.join(' '));
  assert.equal(gate('jobs-only').ok, true);
  assert.equal(gate('services-only').ok, false, 'services-only sin evidencia de migrate está bloqueado');
  assert.equal(gate('full').ok, false, 'con migraciones, full está prohibido');

  // 2. Se aplica jobs-only: los jobs pasan a B, los servicios siguen en A.
  cr.apply('jobs-only');
  const jobsPost = runPostDeploymentVerification(IMAGES_B, { planMode: 'jobs-only', describe: cr.describe });
  assert.equal(jobsPost.ok, true);
  // jobs-only no puede fabricar un despliegue exitoso: su verificación no cubre los servicios.
  const fake = buildDeploymentRecord({
    deploymentId: '7002', operation: 'promote', gitSha: B_SHA, releaseBuildRunId: BUILD_RUN, images: IMAGES_B,
    promotionVerifyRunId: VERIFY_RUN, applyRunId: '7002', outcome: 'succeeded', postVerify: jobsPost,
    verifiedManifest: manifestB,
  });
  assert.equal(fake.ok, false, 'un succeeded no se construye con la verificación de jobs-only');
  // El registro no cambió: el despliegue actual sigue siendo A.
  assert.equal(getCurrentDeployment(parseDeploymentRegistry(registry).records).deployment_id, A.deployment_id);

  // 3. maps-prod-migrate termina bien y deja evidencia ligada a este verify y a este commit de main.
  const ev = evidence();
  assert.equal(ev.automation_sha, MAIN_SHA);

  // 4. services-only: el estado intermedio (jobs en B, servicios en A) es el esperado.
  const second = start(cr, 'services-only');
  assert.equal(second.ok, true, second.errors.join(' '));
  assert.equal(gate('services-only', ev).ok, true, gate('services-only', ev).errors?.join(' '));

  // 5. Se aplica services-only; la verificación completa da éxito y se registra B.
  cr.apply('services-only');
  const post = runPostDeploymentVerification(IMAGES_B, { planMode: 'services-only', describe: cr.describe });
  assert.equal(post.ok, true);
  const record = buildDeploymentRecord({
    deploymentId: '7003', operation: 'promote', gitSha: B_SHA, releaseBuildRunId: BUILD_RUN, images: IMAGES_B,
    promotionVerifyRunId: VERIFY_RUN, applyRunId: '7003', outcome: 'succeeded', postVerify: post,
    verifiedManifest: manifestB, migrationsExecuted: true,
    replacedDeploymentId: A.deployment_id, previousGitSha: A.git_sha,
  });
  assert.equal(record.ok, true, record.errors?.join(' '));
  assert.equal(record.record.migrations_executed, true);

  // 6. Con B registrada, B es el nuevo punto de partida y A deja de serlo.
  const next = [...registry, record.record];
  assert.equal(getCurrentDeployment(parseDeploymentRegistry(next).records).deployment_id, '7003');
  const nextReport = { ...REPORT, migration: { ...REPORT.migration, baseline_git_sha: B_SHA, requires_jobs_first_apply: false } };
  assert.equal(start(cr, 'full', { registry: next, report: nextReport }).ok, true);
  const backToA = makeCloudRun();
  assert.equal(start(backToA, 'full', { registry: next, report: nextReport }).ok, false, 'Cloud Run en A ya no coincide con el registro');
});

test('dos fases: el estado intermedio solo se acepta en services-only y exactamente así', () => {
  const afterJobs = () => {
    const cr = makeCloudRun();
    cr.apply('jobs-only');
    return cr;
  };

  // Control: lo esperado pasa.
  assert.equal(start(afterJobs(), 'services-only').ok, true);

  // Mismo estado intermedio en otro modo: jobs-only repetido y full no parten de A.
  for (const mode of ['jobs-only', 'full']) {
    const r = start(afterJobs(), mode);
    assert.equal(r.ok, false, mode);
    assert.match(r.errors.join(' '), /maps-prod-(migrate|bootstrap): Cloud Run sirve/);
  }

  // Jobs divididos (un apply de jobs-only a medias o un cambio manual en uno solo).
  for (const job of JOBS) {
    const cr = afterJobs();
    cr.state[job] = A.images.jobs_image;
    const r = start(cr, 'services-only');
    assert.equal(r.ok, false, job);
    assert.match(r.errors.join(' '), new RegExp(`${job}: Cloud Run sirve`));
  }

  // Jobs en una tercera versión (ni A ni B).
  const third = afterJobs();
  third.state['maps-prod-migrate'] = DIGEST('9');
  third.state['maps-prod-bootstrap'] = DIGEST('9');
  assert.equal(start(third, 'services-only').ok, false);

  // Jobs todavía en A: no hubo jobs-only (o se revirtió a mano), así que no hay migrate que valer.
  assert.equal(start(makeCloudRun(), 'services-only').ok, false);

  // Servicios movidos (apply a medias de services-only, o cambio manual): ni uno ni los dos.
  for (const svc of SERVICES) {
    const cr = afterJobs();
    cr.state[svc] = svc.endsWith('frontend') ? IMAGES_B.frontend_image : IMAGES_B.backend_image;
    const r = start(cr, 'services-only');
    assert.equal(r.ok, false, svc);
    assert.match(r.errors.join(' '), new RegExp(`${svc}: Cloud Run sirve`));
  }
  const manual = afterJobs();
  manual.state['maps-prod-backend'] = DIGEST('8');
  assert.equal(start(manual, 'services-only').ok, false, 'un cambio manual en un servicio');

  // Un servicio que Cloud Run no deja leer no se asume.
  const live = afterJobs().live();
  delete live['maps-prod-frontend'];
  assert.equal(start(afterJobs(), 'services-only', { live }).ok, false);
});

test('dos fases: sin migraciones el estado intermedio no existe', () => {
  const noMigrations = { ...REPORT, migration: { ...REPORT.migration, requires_jobs_first_apply: false, new_migration_folders: [] } };
  // Jobs ya en B sin que haya habido jobs-only (prohibido sin migraciones): cambio manual.
  const manual = makeCloudRun();
  manual.apply('jobs-only');
  assert.equal(start(manual, 'services-only', { report: noMigrations }).ok, false);

  // services-only sin migraciones dejaría los jobs en A y el post-verify daría partial: se frena antes.
  const cr = makeCloudRun();
  const r = start(cr, 'services-only', { report: noMigrations });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /Usar plan_mode=full/);
  // El camino correcto sin migraciones es un solo plan full desde A.
  assert.equal(start(cr, 'full', { report: noMigrations }).ok, true);
  // Si la imagen de jobs no cambia, services-only no deja nada atrás.
  const sameJobs = { ...noMigrations, images: { ...IMAGES_B, jobs_image: A.images.jobs_image } };
  assert.equal(start(cr, 'services-only', { report: sameJobs }).ok, true);
});

test('dos fases: la evidencia de migrate falsa o ajena bloquea services-only', () => {
  const good = evidence();
  assert.equal(gate('services-only', good).ok, true);
  const cases = {
    'otro verify_run_id': { verify_run_id: '9999' },
    'otro commit de la app': { git_sha: 'd'.repeat(40) },
    'otro commit de main': { automation_sha: 'f'.repeat(40) },
    'otra corrida de release-build': { release_build_run_id: '1' },
    'otro job': { job_name: 'maps-prod-bootstrap' },
    'migrate no exitoso': { succeeded: false },
    'sin ejecución': { execution_name: '' },
    'esquema desconocido': { schema_version: 2 },
  };
  for (const [name, override] of Object.entries(cases)) {
    assert.equal(gate('services-only', evidence(override)).ok, false, name);
  }
  assert.equal(gate('services-only', null).ok, false, 'sin evidencia');
  // La evidencia que menciona bootstrap en cualquier campo también se rechaza.
  assert.equal(gate('services-only', evidence({ execution_name: 'maps-prod-bootstrap-x' })).ok, false);
});

test('dos fases: el workflow conecta cada fase con su control y el registro no se escribe en jobs-only', () => {
  const yml = readFileSync(join(__dirname, '..', '..', '.github/workflows/release-promote.yml'), 'utf8').replace(/\r\n/g, '\n');
  // El punto de partida corre con el plan_mode del propio apply (no uno fijo).
  assert.match(yml, /verify-starting-point\.mjs[\s\S]{0,200}--plan-mode="\$\{PLAN_MODE\}"/);
  // La evidencia de migrate solo se descarga para services-only con migraciones y sin rollback.
  assert.match(yml, /\$needs" = "true" \] && \[ "\$PLAN_MODE" = "services-only" \]/);
  // jobs-only no registra despliegue.
  assert.match(yml, /jobs-only es una fase intermedia: no se registra un despliegue/);
});
