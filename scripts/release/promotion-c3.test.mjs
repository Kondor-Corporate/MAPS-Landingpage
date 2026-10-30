import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { buildMigrationPromotionReport } from './detect-prisma-migrations.mjs';
import {
  assertManifestMatchesReleaseRun,
  productionImagesFromManifest,
} from './promotion-images.mjs';
import {
  validateMigrateEvidence,
  validatePlanBinding,
  validatePromotionPhaseGate,
} from './promotion-phase-guard.mjs';
import {
  gcsMigrateEvidencePath,
  gcsPlanBindingPath,
  gcsPlanObjectPath,
} from './promotion-plan-contract.mjs';
import { validateProductionBaseline } from './validate-production-baseline.mjs';
import { validatePromotionApplyGate } from './validate-promotion-apply-gate.mjs';
import {
  assertCommandDoesNotRunBootstrap,
  validatePromotionPlanJson,
} from './validate-terraform-plan.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, 'fixtures', 'promotion');

function loadJson(name) {
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
}

test('productionImagesFromManifest exige digests inmutables', () => {
  const manifest = loadJson('valid-manifest-minimal.json');
  const result = productionImagesFromManifest(manifest);
  assert.equal(result.ok, true);
  assert.match(result.tfvars.frontend_image, /@sha256:[0-9a-f]{64}$/);
});

test('productionImagesFromManifest rechaza tag mutable', () => {
  const manifest = loadJson('valid-manifest-minimal.json');
  manifest.images[0].immutable_ref = manifest.images[0].image + ':latest';
  const result = productionImagesFromManifest(manifest);
  assert.equal(result.ok, false);
});

test('assertManifestMatchesReleaseRun detecta run id incoherente', () => {
  const manifest = { build_run_url: 'https://github.com/Kondor-Corporate/MAPS-Landingpage/actions/runs/1' };
  const errors = assertManifestMatchesReleaseRun('40992146277', manifest);
  assert.ok(errors.length > 0);
});

test('validatePromotionPlanJson acepta plan full válido', () => {
  const plan = loadJson('plan-full-ok.json');
  const result = validatePromotionPlanJson(plan, 'full');
  assert.equal(result.ok, true);
});

test('validatePromotionPlanJson rechaza cambio en Cloud SQL', () => {
  const plan = loadJson('plan-sql-change.json');
  const result = validatePromotionPlanJson(plan, 'full');
  assert.equal(result.ok, false);
});

test('validatePromotionPlanJson rechaza destroy', () => {
  const plan = loadJson('plan-destructive.json');
  const result = validatePromotionPlanJson(plan, 'full');
  assert.equal(result.ok, false);
});

test('validatePromotionPlanJson jobs-only rechaza cambio de frontend', () => {
  const plan = loadJson('plan-full-ok.json');
  const result = validatePromotionPlanJson(plan, 'jobs-only');
  assert.equal(result.ok, false);
});

test('assertCommandDoesNotRunBootstrap bloquea bootstrap', () => {
  const errors = assertCommandDoesNotRunBootstrap('gcloud run jobs execute maps-prod-bootstrap');
  assert.ok(errors.length > 0);
});

test('baseline ausente impide informe de migraciones', () => {
  const result = buildMigrationPromotionReport({ git_sha: null }, 'a'.repeat(40), process.cwd());
  assert.equal(result.ok, false);
});

test('concurrencia maps-prod-release declarada en workflow', () => {
  const wf = readFileSync(
    join(__dirname, '..', '..', '.github', 'workflows', 'release-promote.yml'),
    'utf8',
  );
  assert.match(wf, /group:\s*maps-prod-release/);
  assert.match(wf, /release_build_run_id/);
  assert.doesNotMatch(wf, /GCP_BUILD_SERVICE_ACCOUNT/);
});

test('apply job exige environment production y no simula aprobación del plan', () => {
  const wf = readFileSync(
    join(__dirname, '..', '..', '.github', 'workflows', 'release-promote.yml'),
    'utf8',
  );
  assert.match(wf, /environment:\s*production/);
  assert.match(wf, /plan_sha256/);
  assert.match(wf, /verify_run_id/);
});

test('validatePromotionPlanJson rechaza cambio de env aunque la dirección sea permitida', () => {
  const plan = loadJson('plan-env-change.json');
  const result = validatePromotionPlanJson(plan, 'full');
  assert.equal(result.ok, false);
});

test('validatePromotionPlanJson rechaza acción replace y create', () => {
  assert.equal(validatePromotionPlanJson(loadJson('plan-replace-action.json'), 'full').ok, false);
  assert.equal(validatePromotionPlanJson(loadJson('plan-create-action.json'), 'full').ok, false);
});

test('validateProductionBaseline rechaza git_sha e imágenes nulas', () => {
  const result = validateProductionBaseline({
    schema_version: 1,
    git_sha: null,
    images: { frontend_image: null, backend_image: null, jobs_image: null },
  });
  assert.equal(result.ok, false);
  assert.equal(result.automatic_migration_comparison, false);
});

test('validatePromotionPhaseGate exige jobs-only antes de services-only con migraciones', () => {
  const migration = {
    requires_jobs_first_apply: true,
    automatic_migration_comparison: true,
  };
  assert.equal(
    validatePromotionPhaseGate({
      planMode: 'full',
      migration,
      migrateEvidence: null,
      verifyRunId: '1',
      gitSha: 'b'.repeat(40),
      releaseBuildRunId: '2',
    }).ok,
    false,
  );
  assert.equal(
    validatePromotionPhaseGate({
      planMode: 'services-only',
      migration,
      migrateEvidence: null,
      verifyRunId: '1',
      gitSha: 'b'.repeat(40),
      releaseBuildRunId: '2',
    }).ok,
    false,
  );
  const evidence = {
    schema_version: 1,
    verify_run_id: '1',
    git_sha: 'b'.repeat(40),
    release_build_run_id: '2',
    job_name: 'maps-prod-migrate',
    succeeded: true,
    execution_name: 'exec-1',
  };
  assert.equal(
    validatePromotionPhaseGate({
      planMode: 'services-only',
      migration,
      migrateEvidence: evidence,
      verifyRunId: '1',
      gitSha: 'b'.repeat(40),
      releaseBuildRunId: '2',
    }).ok,
    true,
  );
});

test('validateMigrateEvidence y validatePlanBinding enlazan release y plan', () => {
  const expected = {
    verifyRunId: '99',
    gitSha: 'c'.repeat(40),
    releaseBuildRunId: '40992146277',
    planMode: 'full',
    planSha256: 'd'.repeat(64),
  };
  assert.deepEqual(validateMigrateEvidence({
    schema_version: 1,
    verify_run_id: '99',
    git_sha: expected.gitSha,
    release_build_run_id: expected.releaseBuildRunId,
    job_name: 'maps-prod-migrate',
    succeeded: true,
    execution_name: 'x',
  }, expected), []);
  assert.deepEqual(validatePlanBinding({
    schema_version: 1,
    verify_run_id: '99',
    git_sha: expected.gitSha,
    release_build_run_id: expected.releaseBuildRunId,
    plan_mode: 'full',
    plan_sha256: expected.planSha256,
  }, expected), []);
});

test('validatePromotionApplyGate rechaza bootstrap en comandos shell', () => {
  const result = validatePromotionApplyGate({
    planMode: 'jobs-only',
    migration: { requires_jobs_first_apply: true, automatic_migration_comparison: true },
    verifyRunId: '1',
    gitSha: 'a'.repeat(40),
    releaseBuildRunId: '2',
    shellCommand: 'gcloud run jobs execute maps-prod-bootstrap',
  });
  assert.equal(result.ok, false);
});

test('rutas GCS del plan incluyen verify_run_id y plan_mode', () => {
  assert.equal(
    gcsPlanObjectPath('123', 'services-only'),
    'promotion/plans/123/services-only.tfplan',
  );
  assert.equal(
    gcsPlanBindingPath('123', 'jobs-only'),
    'promotion/plans/123/jobs-only.binding.json',
  );
  assert.equal(gcsMigrateEvidencePath('123'), 'promotion/migrate-done/123.json');
});

test('workflow promote usa rutas GCS por fase y generation-match al subir', () => {
  const wf = readFileSync(
    join(__dirname, '..', '..', '.github', 'workflows', 'release-promote.yml'),
    'utf8',
  );
  assert.match(wf, /promotion\/plans\/\$\{VERIFY_RUN_ID\}\/\$\{PLAN_MODE\}\.tfplan/);
  assert.match(wf, /validate-promotion-apply-gate\.mjs/);
  assert.match(wf, /x-goog-if-generation-match:0/);
  assert.doesNotMatch(wf, /promotion\/plans\/\$\{VERIFY_RUN_ID\}\.tfplan/);
});

test('release-build.yml no fue modificado en R6-C3 (smoke)', () => {
  const wf = readFileSync(
    join(__dirname, '..', '..', '.github', 'workflows', 'release-build.yml'),
    'utf8',
  );
  assert.match(wf, /name:\s*Release build/);
  assert.doesNotMatch(wf, /release-promote/);
});
