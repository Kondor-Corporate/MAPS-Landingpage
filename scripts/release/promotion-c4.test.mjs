import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  validateDeploymentRecord,
  validateRollbackSchemaApproval,
} from './deployment-registry-contract.mjs';
import { parseDeploymentRegistry, getCurrentDeployment } from './deployment-registry.mjs';
import { validateRollbackTargetSelection } from './rollback-selection.mjs';
import { verifyImmutableImageRef } from './gcp-artifact-verify.mjs';
import { resolveRollbackManifest } from './rollback-manifest.mjs';
import { evaluateRollbackSchemaRisk } from './rollback-schema-guard.mjs';
import { validatePromotionApplyGate } from './validate-promotion-apply-gate.mjs';
import { validatePromotionPlanJson } from './validate-terraform-plan.mjs';
import { summarizeDeploymentOutcome, buildPostDeploymentVerifyReport } from './post-deployment-verify.mjs';
import { PROMOTION_CONCURRENCY_GROUP } from './promotion-plan-contract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIX = join(__dirname, 'fixtures', 'rollback');
const PROMO_FIX = join(__dirname, 'fixtures', 'promotion');

function loadJson(name) {
  return JSON.parse(readFileSync(join(FIX, name), 'utf8'));
}

test('validateDeploymentRecord rechaza digest mutable', () => {
  const result = validateDeploymentRecord({
    schema_version: 1,
    deployment_id: 'x',
    operation: 'forward',
    git_sha: 'a'.repeat(40),
    release_build_run_id: '1',
    images: {
      frontend_image: 'gcr.io/x/front:latest',
      backend_image: `b@sha256:${'b'.repeat(64)}`,
      jobs_image: `j@sha256:${'c'.repeat(64)}`,
    },
    promotion_verify_run_id: 'v',
    apply_run_id: 'a',
    applied_at: '2026-01-01T00:00:00Z',
    outcome: 'succeeded',
  });
  assert.equal(result.ok, false);
});

test('parseDeploymentRegistry detecta registro duplicado o manipulado', () => {
  const base = loadJson('registry-valid.json');
  const dup = [...base, { ...base[0], deployment_id: 'r5-baseline' }];
  assert.equal(parseDeploymentRegistry(dup).ok, false);
  const tampered = JSON.parse(JSON.stringify(base));
  tampered[1].git_sha = 'f'.repeat(40);
  assert.equal(
    validateDeploymentRecord(tampered[1], { expectedDeploymentId: '900001' }).ok,
    true,
  );
});

test('validateRollbackTargetSelection rechaza target inexistente o no desplegado', () => {
  const registry = loadJson('registry-valid.json');
  assert.equal(
    validateRollbackTargetSelection({
      registryRecords: registry,
      targetDeploymentId: 'missing',
    }).ok,
    false,
  );
  const failed = JSON.parse(JSON.stringify(registry));
  failed[2].outcome = 'failed';
  assert.equal(
    validateRollbackTargetSelection({
      registryRecords: failed,
      targetDeploymentId: '900002',
    }).ok,
    false,
  );
});

test('validateRollbackTargetSelection rechaza mismo despliegue actual', () => {
  const registry = loadJson('registry-valid.json');
  const current = getCurrentDeployment(registry);
  assert.ok(current);
  const result = validateRollbackTargetSelection({
    registryRecords: registry,
    targetDeploymentId: String(current.deployment_id),
  });
  assert.equal(result.ok, false);
});

test('validateRollbackTargetSelection rechaza git_sha arbitrario vs registro', () => {
  const registry = loadJson('registry-valid.json');
  const result = validateRollbackTargetSelection({
    registryRecords: registry,
    targetDeploymentId: '900001',
    assertGitSha: 'f'.repeat(40),
    assertReleaseBuildRunId: '100',
  });
  assert.equal(result.ok, false);
});

test('evaluateRollbackSchemaRisk bloquea sin aprobación si git diff de migraciones falla o hay carpetas nuevas', () => {
  const risk = evaluateRollbackSchemaRisk({
    repoRoot: process.cwd(),
    targetGitSha: 'a'.repeat(40),
    currentGitSha: 'b'.repeat(40),
    schemaApproval: null,
  });
  assert.equal(risk.ok, false);
});

test('validatePromotionApplyGate rollback exige plan full y bloquea bootstrap', () => {
  const gate = validatePromotionApplyGate({
    operation: 'rollback',
    planMode: 'jobs-only',
    migration: { requires_human_schema_review: false },
    verifyRunId: '1',
    gitSha: 'a'.repeat(40),
    releaseBuildRunId: '2',
    shellCommand: 'gcloud run jobs execute maps-prod-bootstrap',
  });
  assert.equal(gate.ok, false);
});

test('validatePromotionApplyGate no acepta auto-aprobación de esquema', () => {
  const gate = validatePromotionApplyGate({
    operation: 'rollback',
    planMode: 'full',
    migration: {
      requires_human_schema_review: true,
      target_deployment_id: '900001',
      current_git_sha: '3333333333333333333333333333333333333333',
    },
    schemaApproval: loadJson('schema-approval-ok.json'),
    verifyRunId: '810000',
    gitSha: '2222222222222222222222222222222222222222',
    releaseBuildRunId: '100',
    targetDeploymentId: '900001',
    currentGitSha: '3333333333333333333333333333333333333333',
  });
  assert.equal(gate.ok, false);
});

test('artifact expirado se recupera solo con verified_manifest del registro', () => {
  const registry = loadJson('registry-valid.json');
  const target = registry.find((r) => r.deployment_id === '900001');
  const expired = resolveRollbackManifest({
    target,
    github: { ok: false, errors: ['El artifact "release-manifest" expiró en GitHub.'] },
  });
  assert.equal(expired.ok, true);
  assert.equal(expired.manifest_source, 'registry');
  const missing = { ...target, verified_manifest: undefined };
  const blocked = resolveRollbackManifest({
    target: missing,
    github: { ok: false, errors: ['expiró'] },
  });
  assert.equal(blocked.ok, false);
});

test('digest ausente en Artifact Registry se rechaza', () => {
  const result = verifyImmutableImageRef(`repo/app@sha256:${'a'.repeat(64)}`, {
    runGcloudFn: () => ({ status: 1, stdout: '', stderr: 'NOT_FOUND' }),
  });
  assert.equal(result.ok, false);
});

test('baseline R5 no exige release_build_run_id ni artifact', () => {
  const registry = loadJson('registry-valid.json');
  const target = registry.find((r) => r.deployment_id === 'r5-baseline');
  const resolved = resolveRollbackManifest({ target, github: null });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.manifest_source, 'baseline');
  assert.equal(resolved.release_build_run_id, null);
  const invented = { ...target, release_build_run_id: '999' };
  assert.equal(resolveRollbackManifest({ target: invented, github: null }).ok, false);
});

test('plan con SQL sigue prohibido en rollback (reutiliza C3)', () => {
  const plan = JSON.parse(readFileSync(join(PROMO_FIX, 'plan-sql-change.json'), 'utf8'));
  assert.equal(validatePromotionPlanJson(plan, 'full').ok, false);
});

test('post verify fallido no declara éxito', () => {
  const post = buildPostDeploymentVerifyReport({
    expectedImages: {
      frontend_image: 'x',
      backend_image: 'y',
      jobs_image: 'z',
    },
    cloudRunVerify: { ok: false, errors: ['maps-prod-frontend: no Ready.'] },
  });
  const summary = summarizeDeploymentOutcome(post, { operation: 'rollback', git_sha: 'a'.repeat(40) });
  assert.equal(summary.declare_success, false);
  assert.equal(summary.outcome, 'partial');
});

test('workflow promote comparte concurrencia y soporta rollback', () => {
  const wf = readFileSync(
    join(__dirname, '..', '..', '.github', 'workflows', 'release-promote.yml'),
    'utf8',
  );
  assert.match(wf, new RegExp(`group:\\s*${PROMOTION_CONCURRENCY_GROUP}`));
  assert.match(wf, /operation/);
  assert.match(wf, /target_deployment_id/);
  assert.match(wf, /run-rollback-preflight/);
  assert.match(wf, /record-deployment-outcome/);
  assert.match(wf, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(wf, /environment:\s*production/);
  assert.doesNotMatch(wf, /ref: \$\{\{ inputs\.git_sha \}\}/);
});

test('validateRollbackSchemaApproval rechaza approval manipulada', () => {
  const approval = loadJson('schema-approval-ok.json');
  approval.target_git_sha = 'f'.repeat(40);
  const errors = validateRollbackSchemaApproval(approval, {
    verifyRunId: '810000',
    targetDeploymentId: '900001',
    targetGitSha: '2222222222222222222222222222222222222222',
    currentGitSha: '3333333333333333333333333333333333333333',
  });
  assert.ok(errors.length > 0);
});
