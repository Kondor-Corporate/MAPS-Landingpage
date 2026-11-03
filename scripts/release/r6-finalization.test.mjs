import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { validateDeploymentRecord } from './deployment-registry-contract.mjs';
import { buildDeploymentRecord } from './record-deployment-outcome.mjs';
import {
  buildPostDeploymentVerifyReport,
  runPostDeploymentVerification,
} from './post-deployment-verify.mjs';
import { extractJobImage, extractServiceImage, verifyCloudRunDigests } from './post-promotion-verify.mjs';
import { buildPlanBinding, planTargets, uploadCommands } from './prepare-promotion-plan.mjs';
import { normalizeRunId } from './promotion-plan-contract.mjs';
import {
  validateApplyInputsMatchReport,
  validatePlanBinding,
  validateReportImagesMatchManifest,
} from './promotion-phase-guard.mjs';
import { validateRollbackTargetSelection } from './rollback-selection.mjs';
import { validatePromotionApplyGate } from './validate-promotion-apply-gate.mjs';
import { validatePromotionPlanJson, collectContainerImages } from './validate-terraform-plan.mjs';
import { validateWorkflowInputs } from './validate-workflow-inputs.mjs';
import { assertPromotionVerifyRun } from './verify-promotion-run.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const FIXTURES = join(__dirname, 'fixtures');

// Los archivos del árbol de trabajo pueden estar en CRLF (autocrlf en Windows).
const readText = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const loadFixture = (rel) => JSON.parse(readFileSync(join(FIXTURES, rel), 'utf8'));

const SHA = 'a'.repeat(40);
const AUTOMATION_SHA = 'e'.repeat(40);
const CHECKOUT = { head: AUTOMATION_SHA, dirtyPaths: [] };
const DIGEST = (c) => `southamerica-east1-docker.pkg.dev/maps-prod-landing-page/maps-prod/x@sha256:${c.repeat(64)}`;

/** Imágenes esperadas tomadas del propio plan fixture. */
function imagesOfFixturePlan() {
  const plan = loadFixture('promotion/plan-full-ok.json');
  const byAddress = {};
  for (const rc of plan.resource_changes) {
    byAddress[rc.address] = collectContainerImages(rc.change.after)[0];
  }
  return {
    plan,
    images: {
      frontend_image: byAddress['module.runtime_services.google_cloud_run_v2_service.frontend'],
      backend_image: byAddress['module.runtime_services.google_cloud_run_v2_service.backend'],
      jobs_image: byAddress['module.runtime_jobs.google_cloud_run_v2_job.migrate'],
    },
  };
}

// --- Inputs del workflow -----------------------------------------------------

const GOOD_APPLY = {
  GIT_SHA: SHA,
  RELEASE_BUILD_RUN_ID: '123',
  PHASE: 'apply',
  OPERATION: 'promote',
  PLAN_MODE: 'full',
  VERIFY_RUN_ID: '456',
  PLAN_SHA256: 'b'.repeat(64),
  TARGET_DEPLOYMENT_ID: '',
  STATE_BUCKET: 'maps-state-bucket',
};

test('inputs: apply válido pasa', () => {
  assert.equal(validateWorkflowInputs(GOOD_APPLY).ok, true);
});

test('inputs: cualquier carga de shell es rechazada en cada campo', () => {
  const payloads = ['$(id)', '`id`', 'x; rm -rf /', 'a"b', "a'b", 'a\nb', '1 && curl evil', '../../etc'];
  for (const payload of payloads) {
    for (const field of ['GIT_SHA', 'RELEASE_BUILD_RUN_ID', 'VERIFY_RUN_ID', 'PLAN_SHA256', 'PLAN_MODE']) {
      const res = validateWorkflowInputs({ ...GOOD_APPLY, [field]: payload });
      assert.equal(res.ok, false, `${field}=${JSON.stringify(payload)} debió rechazarse`);
    }
    const rollback = validateWorkflowInputs({
      ...GOOD_APPLY, OPERATION: 'rollback', TARGET_DEPLOYMENT_ID: payload,
    });
    assert.equal(rollback.ok, false, `target=${JSON.stringify(payload)} debió rechazarse`);
  }
});

test('inputs: reglas por operación y fase', () => {
  const verifyPromote = { ...GOOD_APPLY, PHASE: 'verify', VERIFY_RUN_ID: '', PLAN_SHA256: '' };
  assert.equal(validateWorkflowInputs(verifyPromote).ok, true);
  assert.equal(validateWorkflowInputs({ ...verifyPromote, RELEASE_BUILD_RUN_ID: '' }).ok, false);
  assert.equal(validateWorkflowInputs({ ...verifyPromote, TARGET_DEPLOYMENT_ID: '900001' }).ok, false);

  const rollback = { ...verifyPromote, OPERATION: 'rollback', RELEASE_BUILD_RUN_ID: '', TARGET_DEPLOYMENT_ID: 'r5-baseline' };
  assert.equal(validateWorkflowInputs(rollback).ok, true, 'baseline R5: run id vacío');
  assert.equal(validateWorkflowInputs({ ...rollback, TARGET_DEPLOYMENT_ID: '' }).ok, false);
  assert.equal(
    validateWorkflowInputs({ ...GOOD_APPLY, OPERATION: 'rollback', TARGET_DEPLOYMENT_ID: '900001', PLAN_MODE: 'services-only' }).ok,
    false,
    'rollback solo con plan full',
  );
  assert.equal(validateWorkflowInputs({ ...GOOD_APPLY, VERIFY_RUN_ID: '' }).ok, false);
  assert.equal(validateWorkflowInputs({ ...GOOD_APPLY, STATE_BUCKET: '' }).ok, false);
  assert.equal(validateWorkflowInputs({ ...GOOD_APPLY, GIT_SHA: 'A'.repeat(40) }).ok, false);
});

// --- Contrato del workflow ---------------------------------------------------

/** Texto de cada bloque `run:` (multilínea o en una línea). */
function runBlocks(yaml) {
  const lines = yaml.split(/\r?\n/);
  const blocks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^(\s*)(?:- )?run:\s*(.*)$/);
    if (!m) continue;
    const indent = m[1].length;
    if (m[2] && !/^[|>][+-]?$/.test(m[2])) {
      blocks.push({ line: i + 1, text: m[2] });
      continue;
    }
    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const lead = lines[j].match(/^(\s*)/)[1].length;
      if (lines[j].trim() !== '' && lead <= indent) break;
      body.push(lines[j]);
    }
    blocks.push({ line: i + 1, text: body.join('\n') });
  }
  return blocks;
}

test('workflows: ningún run interpola inputs ni datos controlados por el usuario', () => {
  for (const file of ['release-promote.yml', 'release-build.yml', 'ci.yml']) {
    const yaml = readText(`.github/workflows/${file}`);
    for (const block of runBlocks(yaml)) {
      assert.doesNotMatch(
        block.text,
        /\$\{\{\s*(inputs|github\.event|github\.head_ref|vars|secrets)\b/,
        `${file}:${block.line} interpola un contexto no confiable dentro de run:`,
      );
    }
  }
});

test('release-promote: inputs solo por entorno y validados en cada job', () => {
  const yaml = readText('.github/workflows/release-promote.yml');
  assert.equal((yaml.match(/run: node scripts\/release\/validate-workflow-inputs\.mjs/g) ?? []).length, 3, 'un validador por job');
  for (const name of ['GIT_SHA', 'RELEASE_BUILD_RUN_ID', 'PHASE', 'OPERATION', 'PLAN_MODE', 'VERIFY_RUN_ID', 'PLAN_SHA256', 'TARGET_DEPLOYMENT_ID']) {
    assert.match(yaml, new RegExp(`^  ${name}: \\$\\{\\{ inputs\\.`, 'm'), `${name} falta en el env del workflow`);
  }
});

test('release-promote: permisos mínimos por job; OIDC solo donde hay environment production', () => {
  const yaml = readText('.github/workflows/release-promote.yml');
  const topPermissions = yaml.match(/^permissions:\n((?:  .+\n)+)/m)[1];
  assert.doesNotMatch(topPermissions, /id-token/);
  const jobs = yaml.split(/^  (?=verify-promote:|verify-rollback:|apply-approved-plan:)/m).slice(1);
  assert.equal(jobs.length, 3);
  for (const job of jobs) {
    const hasOidc = /id-token:\s*write/.test(job);
    const hasEnv = /environment:\s*production/.test(job);
    assert.equal(hasOidc, hasEnv, 'id-token: write exactamente en los jobs con environment production');
  }
  assert.equal((yaml.match(/uses: actions\/checkout@/g) ?? []).length, (yaml.match(/persist-credentials: false/g) ?? []).length);
});

test('release-promote: Terraform fijado, backend explícito, show/apply sobre el plan guardado', () => {
  const yaml = readText('.github/workflows/release-promote.yml');
  const pinned = readText('infra/terraform/environments/production/.terraform-version').trim();
  assert.match(pinned, /^1\.16\.\d+$/, '.terraform-version debe cumplir ~> 1.16.0 de versions.tf');
  assert.match(readText('infra/terraform/environments/production/versions.tf'), /required_version\s*=\s*"~> 1\.16\.0"/);
  assert.doesNotMatch(yaml, /terraform_version:\s*[0-9]/, 'la versión sale de .terraform-version');
  assert.match(yaml, /terraform_version: \$\{\{ steps\.tfversion\.outputs\.version \}\}/);

  const initAt = yaml.indexOf('terraform -chdir="$TF_DIR" init -input=false -lockfile=readonly');
  const showAt = yaml.indexOf('terraform -chdir="$TF_DIR" show -json');
  const applyAt = yaml.indexOf('terraform -chdir="$TF_DIR" apply -input=false');
  assert.ok(initAt > 0 && showAt > initAt && applyAt > showAt, 'orden init → show → apply');
  assert.match(yaml, /-backend-config="bucket=\$\{STATE_BUCKET\}"/);
  assert.match(yaml, /terraform -chdir="\$TF_DIR" show -json/);
  assert.match(yaml, /terraform -chdir="\$TF_DIR" apply .*"\$\{GITHUB_WORKSPACE\}\/plan\.tfplan"/);
  assert.doesNotMatch(yaml, /-auto-approve/);
});

test('release-promote: apply verifica la corrida de verify y nunca ejecuta bootstrap', () => {
  const yaml = readText('.github/workflows/release-promote.yml');
  assert.match(yaml, /verify-promotion-run\.mjs/);
  assert.doesNotMatch(yaml, /jobs execute maps-prod-bootstrap/);
  const gateAt = yaml.indexOf('--shell-command=');
  const executeAt = yaml.indexOf('gcloud run jobs execute maps-prod-migrate \\');
  assert.ok(gateAt > 0 && executeAt > gateAt, 'la guarda de bootstrap corre antes de ejecutar migrate');
});

// --- Validación del plan -----------------------------------------------------

test('plan: la imagen del plan debe ser la aprobada', () => {
  const { plan, images } = imagesOfFixturePlan();
  assert.equal(validatePromotionPlanJson(plan, 'full', { expectedImages: images }).ok, true);

  const wrong = { ...images, backend_image: DIGEST('9') };
  const res = validatePromotionPlanJson(plan, 'full', { expectedImages: wrong });
  assert.equal(res.ok, false);
  assert.match(res.errors.join(' '), /backend_image/);

  const missing = { frontend_image: images.frontend_image, backend_image: images.backend_image };
  assert.equal(validatePromotionPlanJson(plan, 'full', { expectedImages: missing }).ok, false);
});

test('plan: versión de Terraform distinta o plan errado se rechazan', () => {
  const { plan, images } = imagesOfFixturePlan();
  const versioned = { ...plan, terraform_version: '1.16.7' };
  assert.equal(validatePromotionPlanJson(versioned, 'full', { expectedImages: images, expectedTerraformVersion: '1.16.7' }).ok, true);
  assert.equal(validatePromotionPlanJson(versioned, 'full', { expectedImages: images, expectedTerraformVersion: '1.16.8' }).ok, false);
  assert.equal(validatePromotionPlanJson({ ...plan, errored: true }, 'full').ok, false);
});

test('plan: atributos observados anidados se aceptan, la configuración no', () => {
  const { plan, images } = imagesOfFixturePlan();
  const clone = structuredClone(plan);
  const svc = clone.resource_changes[0].change;
  svc.before.latest_created_revision = 'maps-prod-frontend-00001-aaa';
  svc.before.conditions = [{ type: 'Ready', last_transition_time: 'a', state: 'CONDITION_SUCCEEDED' }];
  svc.after.conditions = [{ type: 'Ready', state: 'CONDITION_SUCCEEDED' }];
  assert.equal(validatePromotionPlanJson(clone, 'full', { expectedImages: images }).ok, true);

  svc.after.template[0].service_account = 'otra@x.iam.gserviceaccount.com';
  svc.before.template[0].service_account = 'maps@x.iam.gserviceaccount.com';
  assert.equal(validatePromotionPlanJson(clone, 'full', { expectedImages: images }).ok, false);
});

test('plan: contrato del operador (targets y binding)', () => {
  const { plan, images } = imagesOfFixturePlan();
  assert.deepEqual(planTargets('services-only'), [
    '-target=module.runtime_services.google_cloud_run_v2_service.frontend',
    '-target=module.runtime_services.google_cloud_run_v2_service.backend',
  ]);
  const report = { git_sha: SHA, automation_sha: AUTOMATION_SHA, release_build_run_id: '123', images };
  const ok = buildPlanBinding({
    planBytes: Buffer.from('plan-bytes'), planJson: plan, report, mode: 'full', verifyRunId: '456', localCheckout: CHECKOUT,
  });
  assert.equal(ok.ok, true);
  assert.match(ok.binding.plan_sha256, /^[0-9a-f]{64}$/);
  // El binding generado es exactamente lo que el apply gate espera.
  assert.deepEqual(
    validatePlanBinding(ok.binding, {
      verifyRunId: '456', gitSha: SHA, releaseBuildRunId: '123', planMode: 'full', planSha256: ok.planSha256, automationSha: AUTOMATION_SHA,
    }),
    [],
  );
  const bad = buildPlanBinding({
    planBytes: Buffer.from('x'), planJson: plan, report: { ...report, images: { ...images, jobs_image: DIGEST('8') } },
    mode: 'full', verifyRunId: '456', localCheckout: CHECKOUT,
  });
  assert.equal(bad.ok, false);
  const cmds = uploadCommands('456', 'full', 'plan.tfplan', 'full.binding.json');
  assert.ok(cmds.every((c) => c.includes('x-goog-if-generation-match:0')));
  assert.match(cmds[0], /promotion\/plans\/456\/full\.tfplan$/);
});

// --- Apply gate --------------------------------------------------------------

const REPORT = {
  operation: 'forward',
  automation_sha: AUTOMATION_SHA,
  git_sha: SHA,
  release_build_run_id: '123',
  images: { frontend_image: DIGEST('1'), backend_image: DIGEST('2'), jobs_image: DIGEST('3') },
};

test('gate: inputs del apply deben describir el mismo bundle', () => {
  const base = { inputOperation: 'promote', inputGitSha: SHA, inputReleaseBuildRunId: '123', inputTargetDeploymentId: '', inputAutomationSha: AUTOMATION_SHA, report: REPORT };
  assert.deepEqual(validateApplyInputsMatchReport(base), []);
  assert.ok(validateApplyInputsMatchReport({ ...base, inputOperation: 'rollback' }).length > 0, 'promote vs rollback');
  assert.ok(validateApplyInputsMatchReport({ ...base, inputGitSha: 'b'.repeat(40) }).length > 0);
  assert.ok(validateApplyInputsMatchReport({ ...base, inputReleaseBuildRunId: '124' }).length > 0);
  assert.ok(validateApplyInputsMatchReport({ ...base, inputTargetDeploymentId: '900001' }).length > 0);

  const rollbackReport = { ...REPORT, operation: 'rollback', target_deployment_id: '900001' };
  const rb = { ...base, inputOperation: 'rollback', inputTargetDeploymentId: '900001', report: rollbackReport };
  assert.deepEqual(validateApplyInputsMatchReport(rb), []);
  assert.ok(validateApplyInputsMatchReport({ ...rb, inputTargetDeploymentId: '900002' }).length > 0);
});

test('gate: baseline R5 sin run id es coherente en binding y bundle', () => {
  assert.equal(normalizeRunId(null), '');
  assert.equal(normalizeRunId('null'), '');
  assert.equal(normalizeRunId(undefined), '');
  const binding = {
    schema_version: 1, verify_run_id: '9', automation_sha: AUTOMATION_SHA, git_sha: SHA, release_build_run_id: null,
    plan_mode: 'full', plan_sha256: 'c'.repeat(64),
  };
  assert.deepEqual(
    validatePlanBinding(binding, { verifyRunId: '9', gitSha: SHA, releaseBuildRunId: '', planMode: 'full', planSha256: binding.plan_sha256, automationSha: AUTOMATION_SHA }),
    [],
  );
});

test('gate: imágenes del informe deben ser las del manifiesto del bundle', () => {
  const tfvars = { frontend_image: DIGEST('1'), backend_image: DIGEST('2'), jobs_image: DIGEST('3') };
  assert.deepEqual(validateReportImagesMatchManifest(REPORT.images, tfvars), []);
  assert.equal(validateReportImagesMatchManifest(REPORT.images, { ...tfvars, jobs_image: DIGEST('4') }).length, 1);
});

test('gate: integra manifiesto, run id y operación', () => {
  const manifest = {
    build_run_url: 'https://github.com/Kondor-Corporate/MAPS-Landingpage/actions/runs/123',
    images: [
      { id: 'frontend', immutable_ref: REPORT.images.frontend_image },
      { id: 'backend', immutable_ref: REPORT.images.backend_image },
      { id: 'backend-jobs', immutable_ref: REPORT.images.jobs_image },
    ],
  };
  const options = {
    planMode: 'full', operation: 'forward', migration: { requires_jobs_first_apply: false },
    verifyRunId: '456', gitSha: SHA, releaseBuildRunId: '123', automationSha: AUTOMATION_SHA,
    report: REPORT, inputOperation: 'promote', inputTargetDeploymentId: '', bundleManifest: manifest,
  };
  assert.equal(validatePromotionApplyGate(options).ok, true);
  assert.equal(validatePromotionApplyGate({ ...options, releaseBuildRunId: '999', report: { ...REPORT, release_build_run_id: '999' } }).ok, false, 'run id del manifiesto');
  const swapped = { ...manifest, images: manifest.images.map((i) => (i.id === 'backend' ? { ...i, immutable_ref: DIGEST('7') } : i)) };
  assert.equal(validatePromotionApplyGate({ ...options, bundleManifest: swapped }).ok, false, 'imagen distinta');
});

// --- Autenticidad de la corrida de verify -------------------------------------

const GOOD_RUN = {
  id: 456, status: 'completed', conclusion: 'success', event: 'workflow_dispatch',
  path: '.github/workflows/release-promote.yml', head_branch: 'main',
  repository: { full_name: 'Kondor-Corporate/MAPS-Landingpage' },
  head_sha: AUTOMATION_SHA,
};
const AUTO = { automationSha: AUTOMATION_SHA };
const GOOD_ARTIFACTS = [{ name: 'promotion-bundle', workflow_run: { id: 456 }, expired: false }];

test('verify run: acepta corrida válida (con o sin sufijo @ref en path)', () => {
  assert.deepEqual(assertPromotionVerifyRun(GOOD_RUN, GOOD_ARTIFACTS, '456', AUTO), []);
  assert.deepEqual(
    assertPromotionVerifyRun({ ...GOOD_RUN, path: '.github/workflows/release-promote.yml@refs/heads/main' }, GOOD_ARTIFACTS, '456', AUTO),
    [],
  );
});

test('verify run: rechaza otro workflow, otra rama, fallo, artifact ajeno o vencido', () => {
  const cases = [
    { ...GOOD_RUN, path: '.github/workflows/evil.yml' },
    { ...GOOD_RUN, head_branch: 'development' },
    { ...GOOD_RUN, conclusion: 'failure' },
    { ...GOOD_RUN, status: 'in_progress' },
    { ...GOOD_RUN, event: 'push' },
    { ...GOOD_RUN, id: 457 },
    { ...GOOD_RUN, repository: { full_name: 'otro/repo' } },
  ];
  for (const run of cases) {
    assert.ok(assertPromotionVerifyRun(run, GOOD_ARTIFACTS, '456', AUTO).length > 0, JSON.stringify(run));
  }
  assert.ok(assertPromotionVerifyRun(GOOD_RUN, [], '456', AUTO).length > 0, 'sin artifact');
  assert.ok(assertPromotionVerifyRun(GOOD_RUN, [{ ...GOOD_ARTIFACTS[0], workflow_run: { id: 1 } }], '456', AUTO).length > 0, 'artifact de otra corrida');
  assert.ok(assertPromotionVerifyRun(GOOD_RUN, [{ name: 'promotion-bundle', expired: false }], '456', AUTO).length > 0, 'artifact sin workflow_run');
  assert.ok(assertPromotionVerifyRun(GOOD_RUN, [{ ...GOOD_ARTIFACTS[0], expired: true }], '456', AUTO).length > 0, 'artifact expirado');
});

// --- Verificación posterior ----------------------------------------------------

const IMAGES = REPORT.images;

/** describe falso que imita la forma v1 de gcloud. */
function fakeDescribe({ overrides = {}, calls = [] } = {}) {
  const images = {
    'maps-prod-frontend': IMAGES.frontend_image,
    'maps-prod-backend': IMAGES.backend_image,
    'maps-prod-migrate': IMAGES.jobs_image,
    'maps-prod-bootstrap': IMAGES.jobs_image,
    ...overrides.images,
  };
  return (kind, name) => {
    calls.push(`${kind}:${name}`);
    if (overrides.fail === name) return { ok: false, error: 'describe falló.' };
    if (kind === 'jobs') {
      return { ok: true, json: { spec: { template: { spec: { template: { spec: { containers: [{ image: images[name] }] } } } } } } };
    }
    return {
      ok: true,
      json: {
        spec: { template: { spec: { containers: [{ image: images[name] }] } } },
        status: {
          conditions: [{ type: 'Ready', status: overrides.ready ?? 'True' }],
          latestCreatedRevisionName: 'rev-2',
          latestReadyRevisionName: overrides.readyRevision ?? 'rev-2',
          traffic: overrides.traffic ?? [{ latestRevision: true, percent: 100 }],
        },
      },
    };
  };
}

test('post-verify: full comprueba servicios y jobs', () => {
  const calls = [];
  const res = verifyCloudRunDigests(IMAGES, { describe: fakeDescribe({ calls }) });
  assert.equal(res.ok, true);
  assert.deepEqual(calls.sort(), [
    'jobs:maps-prod-bootstrap', 'jobs:maps-prod-migrate', 'services:maps-prod-backend', 'services:maps-prod-frontend',
  ]);
});

test('post-verify: jobs-only no mide servicios (siguen con la imagen anterior)', () => {
  const calls = [];
  const describe = fakeDescribe({ calls, overrides: { images: { 'maps-prod-frontend': DIGEST('0') } } });
  const res = runPostDeploymentVerification(IMAGES, { planMode: 'jobs-only', describe });
  assert.equal(res.ok, true);
  assert.ok(calls.every((c) => c.startsWith('jobs:')));
  assert.deepEqual(res.cloud_run.components, ['jobs']);
});

test('post-verify: falla por imagen distinta, no Ready, tráfico partido, revisión pendiente o describe caído', () => {
  const bad = [
    { images: { 'maps-prod-backend': DIGEST('0') } },
    { images: { 'maps-prod-migrate': DIGEST('0') } },
    { ready: 'False' },
    { traffic: [{ latestRevision: true, percent: 60 }, { revisionName: 'rev-1', percent: 40 }] },
    { readyRevision: 'rev-1' },
    { fail: 'maps-prod-bootstrap' },
  ];
  for (const overrides of bad) {
    const res = verifyCloudRunDigests(IMAGES, { describe: fakeDescribe({ overrides }) });
    assert.equal(res.ok, false, JSON.stringify(overrides));
  }
});

test('post-verify: sin evidencia no hay éxito (offline, sin resultado, extractores v1/v2)', () => {
  assert.equal(runPostDeploymentVerification(IMAGES, { planMode: 'full', runVerify: false }).ok, false);
  assert.equal(buildPostDeploymentVerifyReport({ expectedImages: IMAGES }).ok, false);
  assert.equal(runPostDeploymentVerification(IMAGES, { planMode: 'otro' }).ok, false);
  assert.equal(extractServiceImage({ template: { containers: [{ image: 'v2' }] } }), 'v2');
  assert.equal(extractJobImage({ template: { template: { containers: [{ image: 'v2' }] } } }), 'v2');
  assert.equal(extractServiceImage({}), '');
});

// --- Registro de despliegues ---------------------------------------------------

function succeededRecord(overrides = {}) {
  return {
    schema_version: 1,
    deployment_id: '900010',
    operation: 'promote',
    git_sha: SHA,
    release_build_run_id: '123',
    images: IMAGES,
    promotion_verify_run_id: '456',
    apply_run_id: '900010',
    applied_at: '2026-10-31T12:00:00Z',
    outcome: 'succeeded',
    migrations_executed: false,
    post_verify: {
      ok: true, errors: [],
      cloud_run: { verified: true, components: ['services', 'jobs'], expected: IMAGES },
    },
    verified_manifest: { git_sha: SHA },
    ...overrides,
  };
}

test('registro: succeeded exige servicios y jobs verificados y las imágenes registradas', () => {
  assert.equal(validateDeploymentRecord(succeededRecord()).ok, true);

  const jobsOnly = succeededRecord({
    post_verify: { ok: true, cloud_run: { verified: true, components: ['jobs'], expected: IMAGES } },
  });
  assert.equal(validateDeploymentRecord(jobsOnly).ok, false, 'jobs-only no puede ser éxito');

  const otherImages = succeededRecord({
    post_verify: { ok: true, cloud_run: { verified: true, components: ['services', 'jobs'], expected: { ...IMAGES, backend_image: DIGEST('0') } } },
  });
  assert.equal(validateDeploymentRecord(otherImages).ok, false, 'verificó otra imagen');

  assert.equal(validateDeploymentRecord(succeededRecord({ post_verify: { ok: true } })).ok, false);
  assert.equal(validateDeploymentRecord(succeededRecord({ post_verify: { ok: true, cloud_run: { verified: false } } })).ok, false);
  assert.equal(validateDeploymentRecord(succeededRecord({ post_verify: null })).ok, false);
});

test('registro: rollback al baseline R5 se puede registrar y no sirve como target', () => {
  const rollback = succeededRecord({
    deployment_id: '900011', operation: 'rollback', release_build_run_id: null, restored_baseline: true,
  });
  assert.equal(validateDeploymentRecord(rollback).ok, true);
  assert.equal(validateDeploymentRecord({ ...rollback, release_build_run_id: '5' }).ok, false);
  assert.equal(validateDeploymentRecord({ ...rollback, operation: 'promote' }).ok, false);
  assert.equal(validateDeploymentRecord(succeededRecord({ release_build_run_id: null })).ok, false, 'sin marcador, run id obligatorio');

  const built = buildDeploymentRecord({
    deploymentId: '900011', operation: 'rollback', gitSha: SHA, releaseBuildRunId: null, restoredBaseline: true,
    images: IMAGES, promotionVerifyRunId: '456', applyRunId: '900011', outcome: 'succeeded',
    postVerify: rollback.post_verify, verifiedManifest: { git_sha: SHA },
  });
  assert.equal(built.ok, true, built.errors?.join(' '));
  assert.equal(built.record.restored_baseline, true);

  const registry = loadFixture('rollback/registry-valid.json');
  const base = registry.find((r) => r.operation === 'baseline');
  const current = registry.filter((r) => r.outcome === 'succeeded' && r.operation !== 'baseline').at(-1);
  const poisoned = [...registry, { ...rollback, git_sha: '4'.repeat(40), applied_at: '2099-01-01T00:00:00Z', images: base.images, post_verify: { ok: true, cloud_run: { verified: true, components: ['services', 'jobs'], expected: base.images } } }];
  const res = validateRollbackTargetSelection({ registryRecords: poisoned, targetDeploymentId: '900011' });
  assert.equal(res.ok, false);
  assert.ok(current);
});

test('record-deployment-outcome: jobs-only nunca se registra como despliegue', () => {
  const run = spawnSync(process.execPath, [
    join(__dirname, 'record-deployment-outcome.mjs'),
    '--bucket=b', '--deployment-id=1', '--promotion-verify-run-id=2', '--apply-run-id=1',
    '--promotion-report=no-importa.json', '--plan-mode=jobs-only',
  ], { encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /jobs-only no se registra/);

  const missingMode = spawnSync(process.execPath, [
    join(__dirname, 'record-deployment-outcome.mjs'),
    '--bucket=b', '--deployment-id=1', '--promotion-verify-run-id=2', '--promotion-report=x.json',
  ], { encoding: 'utf8' });
  assert.equal(missingMode.status, 2);
});

// --- Baseline R5 -----------------------------------------------------------------

test('baseline: el registro r5-baseline solo se arma con describes que coinciden', async () => {
  const { buildBaselineRecordFromDescribes } = await import('./build-baseline-record.mjs');
  const baseline = {
    schema_version: 1, recorded_at: '2026-10-27T12:00:00Z', git_sha: SHA,
    images: { frontend_image: DIGEST('1'), backend_image: DIGEST('2'), jobs_image: DIGEST('3') },
  };
  const service = (image) => ({ spec: { template: { spec: { containers: [{ image }] } } } });
  const job = (image) => ({ spec: { template: { spec: { template: { spec: { containers: [{ image }] } } } } } });
  const describes = {
    frontend: service(DIGEST('1')), backend: service(DIGEST('2')),
    'migrate-job': job(DIGEST('3')), 'bootstrap-job': job(DIGEST('3')),
  };
  const ok = buildBaselineRecordFromDescribes({ baseline, describes, verifiedAt: '2026-10-31T00:00:00Z' });
  assert.equal(ok.ok, true, ok.errors?.join(' '));
  assert.equal(ok.record.deployment_id, 'r5-baseline');
  assert.equal(ok.record.release_build_run_id, null);
  assert.equal(Object.keys(ok.record.cloud_run_digest_evidence.resources).length, 4);

  const drift = buildBaselineRecordFromDescribes({ baseline, describes: { ...describes, backend: service(DIGEST('9')) } });
  assert.equal(drift.ok, false);
  const missing = buildBaselineRecordFromDescribes({ baseline, describes: { ...describes, frontend: undefined } });
  assert.equal(missing.ok, false);
  const badBaseline = buildBaselineRecordFromDescribes({ baseline: { ...baseline, git_sha: null }, describes });
  assert.equal(badBaseline.ok, false);
});

// --- Compatibilidad release-build.yml ↔ promoción --------------------------------

test('compat: lo que publica release-build es lo que consume la promoción', async () => {
  const { releaseManifestArtifactName, parseGithubActionsRunUrl, RELEASE_BUILD_WORKFLOW_PATH } =
    await import('./release-workflow-contract.mjs');
  const { IMAGE_IDS, REGISTRY, GITHUB_REPOSITORY } = await import('./manifest-contract.mjs');
  const { productionImagesFromManifest } = await import('./promotion-images.mjs');
  const build = readText('.github/workflows/release-build.yml');
  const cloudbuild = readText('backend/cloudbuild.yaml');

  // El artifact se llama como lo busca github-release-api.
  assert.match(build, /name: release-manifest-\$\{\{ needs\.preflight\.outputs\.git_sha \}\}/);
  assert.equal(releaseManifestArtifactName(SHA), `release-manifest-${SHA}`);
  // La corrida tiene el path que exige assertReleaseBuildRun y es workflow_dispatch.
  assert.ok(existsFile(RELEASE_BUILD_WORKFLOW_PATH));
  assert.match(build, /^on:\r?\n  workflow_dispatch:/m);
  // build_run_url con el formato que parsea la promoción.
  assert.match(build, /\$\{GITHUB_SERVER\}\/\$\{GITHUB_REPOSITORY\}\/actions\/runs\/\$\{GITHUB_RUN_ID\}/);
  assert.deepEqual(
    parseGithubActionsRunUrl(`https://github.com/${GITHUB_REPOSITORY}/actions/runs/5550001`),
    { runId: '5550001' },
  );
  // Las cuatro imágenes del manifiesto, incluidas las tres que promueve producción.
  assert.match(build, /\["backend", "backend-jobs", "frontend", "frontend-staging"\]/);
  assert.deepEqual([...IMAGE_IDS].sort(), ['backend', 'backend-jobs', 'frontend', 'frontend-staging']);
  const manifest = {
    images: IMAGE_IDS.map((id) => ({ id, immutable_ref: `${REGISTRY.location}-docker.pkg.dev/${REGISTRY.project}/${REGISTRY.repository}/${id}@sha256:${'1'.repeat(64)}` })),
  };
  assert.equal(productionImagesFromManifest(manifest).ok, true);
  // Campos que el manifiesto escribe y la verificación --gcp lee.
  for (const field of ['tag: $git_sha', 'digest: $digest', 'immutable_ref: ($image + "@" + $digest)', 'oci_revision: $git_sha']) {
    assert.ok(build.includes(field), `release-build ya no escribe ${field}`);
  }
  // La imagen se publica con tag de SHA completo (base de la política de retención).
  assert.match(cloudbuild, /tag="\$\$image_uri:\$\$git_sha"/);
  assert.match(cloudbuild, /org\.opencontainers\.image\.revision/);
  // Retención de artifacts: el bundle de verify (30 días) vive menos que el manifiesto no.
  assert.match(build, /name: release-manifest-[\s\S]*?retention-days: 30/);
});

function existsFile(rel) {
  try {
    readFileSync(join(REPO_ROOT, rel));
    return true;
  } catch {
    return false;
  }
}

// --- Los scripts del pipeline se pueden cargar y ejecutar ---------------------------

test('todos los scripts de scripts/release/ pasan node --check', () => {
  const files = readdirSync(__dirname).filter((f) => f.endsWith('.mjs'));
  assert.ok(files.length > 30);
  for (const file of files) {
    const res = spawnSync(process.execPath, ['--check', join(__dirname, file)], { encoding: 'utf8' });
    assert.equal(res.status, 0, `${file} no compila: ${res.stderr.split('\n')[0]}`);
  }
});

test('los CLI que invoca el workflow arrancan y rechazan el uso incorrecto con código 2', () => {
  const yaml = readText('.github/workflows/release-promote.yml');
  const invoked = [...new Set([...yaml.matchAll(/scripts\/release\/([a-z0-9-]+\.mjs)/g)].map((m) => m[1]))]
    // Estos terminan con 1 sin argumentos porque validan entorno o hacen llamadas remotas.
    .filter((f) => !['validate-workflow-inputs.mjs', 'prepare-promotion-plan.mjs'].includes(f));
  assert.ok(invoked.includes('record-migrate-evidence.mjs') && invoked.includes('verify-promotion-run.mjs'));
  for (const file of invoked) {
    const res = spawnSync(process.execPath, [join(__dirname, file)], { encoding: 'utf8', env: { PATH: process.env.PATH } });
    assert.notEqual(res.status, null, `${file} no terminó`);
    assert.doesNotMatch(res.stderr, /SyntaxError|Cannot find module|ERR_MODULE_NOT_FOUND/, `${file}: ${res.stderr.slice(0, 200)}`);
  }
});

test('migrate-evidence: el registro es el que exige la guarda de fase', async () => {
  const { buildMigrateEvidenceRecord } = await import('./record-migrate-evidence.mjs');
  const { validateMigrateEvidence } = await import('./promotion-phase-guard.mjs');
  const record = buildMigrateEvidenceRecord({
    verifyRunId: '456', gitSha: SHA, releaseBuildRunId: '123',
    executionName: 'projects/p/locations/l/jobs/maps-prod-migrate/executions/e1',
  });
  assert.deepEqual(
    validateMigrateEvidence(record, { verifyRunId: '456', gitSha: SHA, releaseBuildRunId: '123' }),
    [],
  );
  assert.ok(validateMigrateEvidence({ ...record, job_name: 'maps-prod-bootstrap' }, { verifyRunId: '456', gitSha: SHA, releaseBuildRunId: '123' }).length > 0);
});


test('todos los módulos de scripts/release/ se importan (nombres y enlaces válidos)', async () => {
  const { pathToFileURL } = await import('node:url');
  const files = readdirSync(__dirname).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs'));
  for (const file of files) {
    await assert.doesNotReject(import(pathToFileURL(join(__dirname, file)).href), `${file} no se puede importar`);
  }
});
