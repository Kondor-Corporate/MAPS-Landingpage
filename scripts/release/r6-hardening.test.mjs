/**
 * Endurecimiento posterior a la revisión independiente de R6-C/R6-D:
 *   1. verify, plan y apply ligados al mismo commit de main (automation_sha);
 *   2. el punto de partida del apply se contrasta con el registro y Cloud Run;
 *   5. los comandos impresos distinguen PowerShell de Bash.
 * (El informe de retención tiene sus pruebas en r6d-retention.test.mjs.)
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { baselineUploadCommand } from './build-baseline-record.mjs';
import { buildMigrationPromotionReport } from './detect-prisma-migrations.mjs';
import { readJsonFile } from './json-file.mjs';
import { buildPlanBinding, checkLocalCheckout, formatTargets, uploadCommands } from './prepare-promotion-plan.mjs';
import { validateApplyInputsMatchReport, validateMigrateEvidence, validatePlanBinding } from './promotion-phase-guard.mjs';
import { buildMigrateEvidenceRecord } from './record-migrate-evidence.mjs';
import { validatePromotionApplyGate } from './validate-promotion-apply-gate.mjs';
import { assertStartingPoint, gitIsAncestor, readLiveImages } from './verify-starting-point.mjs';
import { assertPromotionVerifyRun } from './verify-promotion-run.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const read = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const registryFixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/rollback/registry-valid.json'), 'utf8'));

const MAIN_AT_VERIFY = 'e'.repeat(40);
const MAIN_AT_APPLY = 'f'.repeat(40); // main avanzó entre verify y apply
const APP_SHA = 'a'.repeat(40);
const DIGEST = (c) => `southamerica-east1-docker.pkg.dev/maps-prod-landing-page/maps-prod/x@sha256:${c.repeat(64)}`;
const IMAGES = { frontend_image: DIGEST('1'), backend_image: DIGEST('2'), jobs_image: DIGEST('3') };

// --- 1. Un solo commit de automatización de punta a punta ------------------------

const RUN = {
  id: 456, status: 'completed', conclusion: 'success', event: 'workflow_dispatch',
  path: '.github/workflows/release-promote.yml@refs/heads/main', head_branch: 'main', head_sha: MAIN_AT_VERIFY,
  repository: { full_name: 'Kondor-Corporate/MAPS-Landingpage' },
};
const ARTIFACTS = [{ name: 'promotion-bundle', workflow_run_id: 456, expired: false }];
const REPORT = {
  operation: 'forward', automation_sha: MAIN_AT_VERIFY, git_sha: APP_SHA, release_build_run_id: '123', images: IMAGES,
};

test('automation_sha: la corrida de verify debe haber usado el commit de main del apply', () => {
  assert.deepEqual(assertPromotionVerifyRun(RUN, ARTIFACTS, '456', { automationSha: MAIN_AT_VERIFY }), []);

  const changed = assertPromotionVerifyRun(RUN, ARTIFACTS, '456', { automationSha: MAIN_AT_APPLY });
  assert.equal(changed.length, 1);
  assert.match(changed[0], /Main cambió desde el verify/);

  // Fail-closed: sin el SHA del apply no hay comparación posible.
  for (const options of [{}, { automationSha: '' }, { automationSha: 'main' }]) {
    assert.ok(assertPromotionVerifyRun(RUN, ARTIFACTS, '456', options).length > 0, JSON.stringify(options));
  }
  // Una corrida sin head_sha tampoco se acepta.
  const { head_sha: _omit, ...noSha } = RUN;
  assert.ok(assertPromotionVerifyRun(noSha, ARTIFACTS, '456', { automationSha: MAIN_AT_VERIFY }).length > 0);
});

test('automation_sha: el informe del bundle debe declararlo y coincidir con el apply', () => {
  const base = {
    inputOperation: 'promote', inputGitSha: APP_SHA, inputReleaseBuildRunId: '123', inputTargetDeploymentId: '',
    inputAutomationSha: MAIN_AT_VERIFY, report: REPORT,
  };
  assert.deepEqual(validateApplyInputsMatchReport(base), []);
  assert.match(validateApplyInputsMatchReport({ ...base, inputAutomationSha: MAIN_AT_APPLY }).join(' '), /Main cambió/);
  const { automation_sha: _a, ...legacy } = REPORT;
  assert.match(validateApplyInputsMatchReport({ ...base, report: legacy }).join(' '), /no declara automation_sha/);
  assert.match(validateApplyInputsMatchReport({ ...base, inputAutomationSha: undefined }).join(' '), /Falta el commit de main/);
});

test('automation_sha: el binding del plan y la evidencia de migrate quedan ligados al commit', () => {
  const binding = {
    schema_version: 1, verify_run_id: '456', automation_sha: MAIN_AT_VERIFY, git_sha: APP_SHA,
    release_build_run_id: '123', plan_mode: 'full', plan_sha256: 'c'.repeat(64),
  };
  const expected = {
    verifyRunId: '456', gitSha: APP_SHA, releaseBuildRunId: '123', planMode: 'full', planSha256: binding.plan_sha256,
    automationSha: MAIN_AT_VERIFY,
  };
  assert.deepEqual(validatePlanBinding(binding, expected), []);
  assert.match(validatePlanBinding(binding, { ...expected, automationSha: MAIN_AT_APPLY }).join(' '), /otro commit de main/);
  const { automation_sha: _b, ...old } = binding;
  assert.match(validatePlanBinding(old, expected).join(' '), /falta automation_sha/);
  assert.ok(validatePlanBinding(binding, { ...expected, automationSha: undefined }).length > 0, 'sin SHA esperado, falla');

  const evidence = buildMigrateEvidenceRecord({
    verifyRunId: '456', gitSha: APP_SHA, releaseBuildRunId: '123', executionName: 'exec-1', automationSha: MAIN_AT_VERIFY,
  });
  assert.deepEqual(validateMigrateEvidence(evidence, expected), []);
  assert.match(validateMigrateEvidence(evidence, { ...expected, automationSha: MAIN_AT_APPLY }).join(' '), /automation_sha/);
});

test('automation_sha: el gate completo rechaza un apply bajo otro commit de main', () => {
  const binding = {
    schema_version: 1, verify_run_id: '456', automation_sha: MAIN_AT_VERIFY, git_sha: APP_SHA,
    release_build_run_id: '123', plan_mode: 'full', plan_sha256: 'c'.repeat(64),
  };
  const options = {
    planMode: 'full', operation: 'forward', migration: { requires_jobs_first_apply: false },
    verifyRunId: '456', gitSha: APP_SHA, releaseBuildRunId: '123',
    planBinding: binding, requirePlanBinding: true, planSha256: binding.plan_sha256,
    report: REPORT, inputOperation: 'promote', inputTargetDeploymentId: '',
  };
  // Caso positivo: apply en el mismo commit de main que el verify.
  assert.equal(validatePromotionApplyGate({ ...options, automationSha: MAIN_AT_VERIFY }).ok, true);
  // Main cambió entre verify y apply: binding e informe quedan atados al commit anterior.
  const moved = validatePromotionApplyGate({ ...options, automationSha: MAIN_AT_APPLY });
  assert.equal(moved.ok, false);
  assert.ok(moved.errors.length >= 2, moved.errors.join(' | '));
  // Sin dato de automatización no se puede ligar la evidencia: bloqueo.
  const none = validatePromotionApplyGate({ ...options });
  assert.equal(none.ok, false);
  assert.match(none.errors.join(' '), /Falta automationSha/);
});

test('automation_sha: el operador solo puede ligar un plan hecho sobre ese commit y sin cambios locales', () => {
  const ok = { automationSha: MAIN_AT_VERIFY, localCheckout: { head: MAIN_AT_VERIFY, dirtyPaths: [] } };
  assert.deepEqual(checkLocalCheckout(ok), []);
  assert.match(
    checkLocalCheckout({ ...ok, localCheckout: { head: MAIN_AT_APPLY, dirtyPaths: [] } }).join(' '),
    /checkout local está en/,
  );
  assert.match(
    checkLocalCheckout({ ...ok, localCheckout: { head: MAIN_AT_VERIFY, dirtyPaths: ['scripts/release/x.mjs'] } }).join(' '),
    /cambios locales/,
  );
  assert.match(checkLocalCheckout({ ...ok, localCheckout: undefined }).join(' '), /No se pudo leer el checkout/);
  assert.match(checkLocalCheckout({ automationSha: undefined, localCheckout: ok.localCheckout }).join(' '), /no declara automation_sha/);

  // buildPlanBinding aplica la misma regla antes de validar el plan y deja el SHA en el binding.
  const planBytes = Buffer.from('plan');
  const refused = buildPlanBinding({
    planBytes, planJson: {}, report: REPORT, mode: 'full', verifyRunId: '456',
    localCheckout: { head: MAIN_AT_APPLY, dirtyPaths: [] },
  });
  assert.equal(refused.ok, false);
  assert.match(refused.errors.join(' '), /checkout local está en/);
  const noCheckout = buildPlanBinding({ planBytes, planJson: {}, report: REPORT, mode: 'full', verifyRunId: '456' });
  assert.equal(noCheckout.ok, false);
});

test('automation_sha: el workflow lo pasa a todos los controles del apply y los preflights lo emiten', () => {
  const yml = read('.github/workflows/release-promote.yml');
  // verify-promotion-run, gate, gate previo al migrate y evidencia de migrate.
  assert.match(yml, /verify-promotion-run\.mjs --verify-run-id="\$VERIFY_RUN_ID" --automation-sha="\$GITHUB_SHA"/);
  assert.equal((yml.match(/--automation-sha="\$\{GITHUB_SHA\}"/g) ?? []).length, 3);
  for (const file of ['run-promotion-preflight.mjs', 'run-rollback-preflight.mjs']) {
    const src = read(`scripts/release/${file}`);
    assert.match(src, /automation_sha: options\.automationSha/, file);
    assert.match(src, /process\.env\.GITHUB_SHA/, file);
  }
  // El checkout del apply es el commit que lo dispara, no una rama móvil.
  assert.match(yml, /ref: \$\{\{ github\.sha \}\}/);
});

// --- 2. Punto de partida del apply ----------------------------------------------

/** Repo git con A (desplegado), B (agrega una migración) y C (objetivo). */
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'maps-start-'));
  const git = (...args) => {
    const res = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(res.status, 0, `${args.join(' ')}: ${res.stderr}`);
    return res.stdout.trim();
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  git('config', 'commit.gpgsign', 'false');
  const migrations = join(dir, 'backend/prisma/migrations');
  mkdirSync(join(migrations, '0001_init'), { recursive: true });
  writeFileSync(join(migrations, '0001_init/migration.sql'), '-- init\n');
  git('add', '-A'); git('commit', '-q', '-m', 'A');
  const a = git('rev-parse', 'HEAD');
  mkdirSync(join(migrations, '0002_nueva'), { recursive: true });
  writeFileSync(join(migrations, '0002_nueva/migration.sql'), '-- nueva\n');
  git('add', '-A'); git('commit', '-q', '-m', 'B');
  const b = git('rev-parse', 'HEAD');
  writeFileSync(join(dir, 'app.txt'), 'c\n');
  git('add', '-A'); git('commit', '-q', '-m', 'C');
  const c = git('rev-parse', 'HEAD');
  return { dir, a, b, c };
}

/** Registro con el despliegue actual en `deployedSha` (las imágenes salen del fixture). */
function registryDeployedAt(deployedSha) {
  const records = structuredClone(registryFixture);
  const current = records.find((r) => r.deployment_id === '900002');
  current.git_sha = deployedSha;
  if (current.verified_manifest) current.verified_manifest.git_sha = deployedSha;
  return { records, current };
}

const liveOf = (images) => ({
  'maps-prod-frontend': images.frontend_image,
  'maps-prod-backend': images.backend_image,
  'maps-prod-migrate': images.jobs_image,
  'maps-prod-bootstrap': images.jobs_image,
});

test('punto de partida: una variable baseline adelantada se detecta, aunque el diff diga «sin migraciones»', () => {
  const repo = makeRepo();
  try {
    const { records, current } = registryDeployedAt(repo.a); // producción sirve A (sin la migración 0002)
    const isAncestor = gitIsAncestor(repo.dir);

    // El defecto: alguien adelantó la variable a B. El diff B→C no ve la migración de A→B...
    const aheadBaseline = {
      schema_version: 1, git_sha: repo.b, recorded_at: '2026-01-01T00:00:00Z', images: current.images,
    };
    const migration = buildMigrationPromotionReport(aheadBaseline, repo.c, repo.dir);
    if (!migration.ok) {
      // validateProductionBaseline puede exigir más campos: se completa con el fixture real.
      assert.fail(`baseline de prueba inválido: ${migration.errors?.join(' ')}`);
    }
    assert.equal(migration.requires_jobs_first_apply, false, 'sin el control, la migración 0002 pasaría inadvertida');

    // ...y el punto de partida lo frena porque B no es el despliegue ni un antecesor suyo.
    const report = { operation: 'forward', images: IMAGES, migration };
    const result = assertStartingPoint({
      registryRecords: records, report, planMode: 'full', live: liveOf(current.images), isAncestor,
    });
    assert.equal(result.ok, false);
    assert.match(result.errors.join(' '), /baseline adelantado o ajeno oculta migraciones pendientes/);

    // Baseline correcto (= desplegado): el diff sí ve la migración... o no la hay, y pasa.
    const exact = buildMigrationPromotionReport({ ...aheadBaseline, git_sha: repo.a }, repo.c, repo.dir);
    assert.equal(exact.requires_jobs_first_apply, true, 'con el baseline real la migración 0002 aparece');
    const okResult = assertStartingPoint({
      registryRecords: records, report: { operation: 'forward', images: IMAGES, migration: exact },
      planMode: 'jobs-only', live: liveOf(current.images), isAncestor,
    });
    assert.equal(okResult.ok, true, okResult.errors.join(' '));
    assert.deepEqual(okResult.warnings, []);

    // Baseline atrasado (A cuando producción sirve B): conservador, pasa con aviso.
    const behind = registryDeployedAt(repo.b);
    const stale = assertStartingPoint({
      registryRecords: behind.records,
      report: { operation: 'forward', images: IMAGES, migration: { baseline_git_sha: repo.a } },
      planMode: 'full', live: liveOf(behind.current.images), isAncestor,
    });
    assert.equal(stale.ok, true, stale.errors.join(' '));
    assert.match(stale.warnings.join(' '), /por detrás del despliegue actual/);

    // Un SHA que el checkout no conoce no se puede ordenar: bloqueo, no suposición.
    const unknown = assertStartingPoint({
      registryRecords: records,
      report: { operation: 'forward', images: IMAGES, migration: { baseline_git_sha: '9'.repeat(40) } },
      planMode: 'full', live: liveOf(current.images), isAncestor,
    });
    assert.equal(unknown.ok, false);
    assert.match(unknown.errors.join(' '), /No se pudo establecer la relación/);
  } finally {
    rmSync(repo.dir, { recursive: true, force: true });
  }
});

test('punto de partida: Cloud Run y registro deben coincidir antes de modificar nada', () => {
  const { records, current } = registryDeployedAt(registryFixture.find((r) => r.deployment_id === '900002').git_sha);
  const migration = { baseline_git_sha: current.git_sha };
  const report = { operation: 'forward', images: IMAGES, migration };
  const start = (live, extra = {}) => assertStartingPoint({
    registryRecords: records, report, planMode: 'full', live, isAncestor: () => true, ...extra,
  });
  assert.equal(start(liveOf(current.images)).ok, true);

  // El backend sirve otra imagen que el registro (despliegue parcial, cambio manual...).
  const drift = { ...liveOf(current.images), 'maps-prod-backend': DIGEST('9') };
  const drifted = start(drift);
  assert.equal(drifted.ok, false);
  assert.match(drifted.errors.join(' '), /maps-prod-backend: Cloud Run sirve .* y se esperaba .* \(registro, despliegue/);

  // Un job con otra imagen también cuenta.
  assert.equal(start({ ...liveOf(current.images), 'maps-prod-migrate': DIGEST('9') }).ok, false);
  // Sin lectura de un recurso no se asume nada.
  const missing = liveOf(current.images);
  delete missing['maps-prod-bootstrap'];
  assert.equal(start(missing).ok, false);

  // services-only tras un jobs-only: los jobs pueden llevar ya la imagen nueva, los servicios no.
  const afterJobs = { ...liveOf(current.images), 'maps-prod-migrate': IMAGES.jobs_image, 'maps-prod-bootstrap': IMAGES.jobs_image };
  const twoPhase = { ...report, migration: { ...migration, requires_jobs_first_apply: true } };
  assert.equal(start(afterJobs, { planMode: 'services-only', report: twoPhase }).ok, true);
  assert.equal(start(afterJobs, { planMode: 'full', report: twoPhase }).ok, false, 'fuera de services-only, los jobs deben estar en la imagen registrada');
  const servicesMoved = { ...afterJobs, 'maps-prod-frontend': IMAGES.frontend_image };
  assert.equal(start(servicesMoved, { planMode: 'services-only', report: twoPhase }).ok, false);
});

test('punto de partida: sin registro, sin despliegue succeeded o con registro corrupto se bloquea', () => {
  const report = { operation: 'forward', images: IMAGES, migration: { baseline_git_sha: APP_SHA } };
  const base = { report, planMode: 'full', live: liveOf(IMAGES), isAncestor: () => true };
  const empty = assertStartingPoint({ ...base, registryRecords: [] });
  assert.equal(empty.ok, false);
  assert.match(empty.errors.join(' '), /falta r5-baseline/);

  const onlyPartial = structuredClone(registryFixture)
    .filter((r) => r.deployment_id === '900002')
    .map((r) => ({ ...r, outcome: 'partial' }));
  assert.equal(assertStartingPoint({ ...base, registryRecords: onlyPartial }).ok, false, 'partial no es despliegue actual');

  const corrupt = assertStartingPoint({ ...base, registryRecords: [{ deployment_id: 'x' }] });
  assert.equal(corrupt.ok, false);
  assert.match(corrupt.errors.join(' '), /corrupto/);

  const noBaselineInReport = assertStartingPoint({
    ...base, registryRecords: registryFixture, report: { operation: 'forward', images: IMAGES, migration: {} },
    live: liveOf(registryFixture.find((r) => r.deployment_id === '900002').images),
  });
  assert.equal(noBaselineInReport.ok, false);
  assert.match(noBaselineInReport.errors.join(' '), /no declara baseline_git_sha/);
});

test('punto de partida: el rollback exige que el verify haya partido del despliegue actual', () => {
  const current = registryFixture.find((r) => r.deployment_id === '900002');
  const run = (currentSha) => assertStartingPoint({
    registryRecords: registryFixture,
    report: { operation: 'rollback', images: IMAGES, migration: { current_git_sha: currentSha } },
    planMode: 'full', live: liveOf(current.images), isAncestor: () => true,
  });
  assert.equal(run(current.git_sha).ok, true);
  const stale = run(registryFixture.find((r) => r.deployment_id === '900001').git_sha);
  assert.equal(stale.ok, false);
  assert.match(stale.errors.join(' '), /Repetir verify/);
});

test('punto de partida: lectura de Cloud Run falla cerrado', () => {
  const describe = (kind, name) => (name === 'maps-prod-backend'
    ? { ok: false, error: 'describe falló.' }
    : {
      ok: true,
      json: kind === 'jobs'
        ? { spec: { template: { spec: { template: { spec: { containers: [{ image: IMAGES.jobs_image }] } } } } } }
        : { spec: { template: { spec: { containers: [{ image: IMAGES.frontend_image }] } } } },
    });
  const live = readLiveImages(describe);
  assert.equal(live.ok, false);
  assert.match(live.errors.join(' '), /maps-prod-backend: no se pudo leer/);
  assert.equal(readLiveImages(() => ({ ok: true, json: {} })).ok, false, 'sin imagen en la respuesta');
});

test('punto de partida: el workflow lo ejecuta antes de descargar el plan, de terraform y del migrate', () => {
  const yml = read('.github/workflows/release-promote.yml');
  const idx = (needle) => {
    const i = yml.indexOf(needle);
    assert.ok(i > 0, needle);
    return i;
  };
  const start = idx('verify-starting-point.mjs');
  assert.ok(start < idx('gsutil cp "gs://${STATE_BUCKET}/promotion/plans/${VERIFY_RUN_ID}/${PLAN_MODE}.tfplan"'));
  assert.ok(start < idx('terraform -chdir="$TF_DIR" init'));
  assert.ok(start < idx('gcloud run jobs execute maps-prod-migrate'));
  assert.ok(start > idx('Autenticar identidad de deploy'), 'necesita la identidad de deploy ya autenticada');
  // Solo lecturas: ni escribe en GCS ni cambia Cloud Run.
  const src = read('scripts/release/verify-starting-point.mjs');
  assert.doesNotMatch(src, /gsutil|writeFileSync|'execute'|'update'|'deploy'/);
});

// --- 5. Operación desde Windows ---------------------------------------------------

test('shell: -target y comandos de subida distinguen PowerShell de Bash', () => {
  const bash = formatTargets('services-only', 'bash');
  assert.equal(
    bash,
    '-target=module.runtime_services.google_cloud_run_v2_service.frontend -target=module.runtime_services.google_cloud_run_v2_service.backend',
  );
  const ps = formatTargets('services-only', 'powershell');
  assert.match(ps, /^'-target=module\.runtime_services\.google_cloud_run_v2_service\.frontend' '-target=/);

  const up = uploadCommands('456', 'full', 'plan.tfplan', 'full.binding.json', 'powershell');
  assert.ok(up.every((c) => c.includes('x-goog-if-generation-match:0')));
  assert.ok(up.every((c) => c.includes('${env:TF_STATE_BUCKET}') && !c.includes('$TF_STATE_BUCKET')), up.join('\n'));
  assert.match(up[0], /"gs:\/\/\$\{env:TF_STATE_BUCKET\}\/promotion\/plans\/456\/full\.tfplan"$/);
  const sh = uploadCommands('456', 'full', 'plan.tfplan', 'full.binding.json');
  assert.ok(sh.every((c) => c.includes('gs://$TF_STATE_BUCKET/') && !c.includes('env:')), sh.join('\n'));

  assert.match(baselineUploadCommand('r5-baseline.json', 'powershell'), /"gs:\/\/\$\{env:TF_STATE_BUCKET\}\/promotion\/deployments\/r5-baseline\.json"$/);
  assert.match(baselineUploadCommand('r5-baseline.json', 'bash'), / gs:\/\/\$TF_STATE_BUCKET\/promotion\/deployments\/r5-baseline\.json$/);
});

test('shell: la CLI imprime la sintaxis pedida', () => {
  const run = (shell) => spawnSync(process.execPath, [
    join(__dirname, 'prepare-promotion-plan.mjs'), 'targets', '--mode=jobs-only', `--shell=${shell}`,
  ], { encoding: 'utf8' });
  assert.match(run('powershell').stdout, /^'-target=.*' '-target=.*'\n$/);
  assert.match(run('bash').stdout, /^-target=\S+ -target=\S+\n$/);
  assert.equal(run('cmd').status, 2);
});

test('shell: los JSON que redirige Windows PowerShell 5.1 (UTF-16 o UTF-8 con BOM) se leen igual', () => {
  const dir = mkdtempSync(join(tmpdir(), 'maps-json-'));
  try {
    const value = { a: 'ñ', n: [1, 2] };
    const text = JSON.stringify(value);
    const files = {
      plain: Buffer.from(text, 'utf8'),
      utf8bom: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]),
      utf16le: Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]),
    };
    for (const [name, bytes] of Object.entries(files)) {
      const path = join(dir, `${name}.json`);
      writeFileSync(path, bytes);
      assert.deepEqual(readJsonFile(path), value, name);
    }
    const be = join(dir, 'be.json');
    writeFileSync(be, Buffer.from([0xfe, 0xff, 0x00, 0x7b]));
    assert.throws(() => readJsonFile(be), /big-endian/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('shell: el runbook ofrece PowerShell para cada paso con variables o sustituciones de Bash', () => {
  const doc = read('docs/GCP_PRODUCTION_RUNBOOK.md');
  assert.match(doc, /```powershell/);
  assert.match(doc, /\$env:TF_STATE_BUCKET/);
  // Todo bloque bash con $TF_STATE_BUCKET o $(...) tiene que ir acompañado de su versión PowerShell.
  const blocks = [...doc.matchAll(/```(bash|powershell)\n([\s\S]*?)```/g)].map((m) => ({ lang: m[1], body: m[2] }));
  const bashNeedingPs = blocks.filter((b) => b.lang === 'bash' && /\$TF_STATE_BUCKET|\$\(|for (svc|job) in/.test(b.body));
  const powershell = blocks.filter((b) => b.lang === 'powershell');
  assert.ok(bashNeedingPs.length > 0);
  assert.ok(powershell.length >= bashNeedingPs.length, `${powershell.length} bloques PowerShell para ${bashNeedingPs.length} de Bash`);
  // PowerShell no usa $(...) de Bash ni "export".
  for (const b of powershell) {
    assert.doesNotMatch(b.body, /\bexport \w+=|\$TF_STATE_BUCKET|\bcat \.terraform-version/, b.body.slice(0, 80));
  }
});
