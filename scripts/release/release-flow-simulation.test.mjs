/**
 * Flujo simulado promoción → registro → rollback, encadenando los módulos reales.
 *
 * Es una simulación local: no hay GitHub, GCP ni Terraform. Demuestra que las piezas de
 * R6-C se entienden entre sí (mismos formatos, mismas rutas, mismos contratos). No
 * demuestra que el pipeline funcione contra GCP: eso exige el ensayo del checklist.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { getCurrentDeployment, parseDeploymentRegistry } from './deployment-registry.mjs';
import { runPostDeploymentVerification } from './post-deployment-verify.mjs';
import { buildPlanBinding } from './prepare-promotion-plan.mjs';
import { formatPromotionTfvarsHcl, productionImagesFromManifest } from './promotion-images.mjs';
import { IMAGE_KEY_BY_ADDRESS } from './promotion-plan-contract.mjs';
import { buildDeploymentRecord } from './record-deployment-outcome.mjs';
import { resolveRollbackManifest } from './rollback-manifest.mjs';
import { validateRollbackTargetSelection } from './rollback-selection.mjs';
import { validatePromotionApplyGate } from './validate-promotion-apply-gate.mjs';
import { validateWorkflowInputs } from './validate-workflow-inputs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(join(__dirname, 'fixtures', rel), 'utf8'));

const NEW_SHA = 'c'.repeat(40);
const BUILD_RUN = '5550001';
const AUTOMATION_SHA = 'e'.repeat(40);
const CHECKOUT = { head: AUTOMATION_SHA, dirtyPaths: [] };

/** Plan Terraform sintético con la imagen de cada recurso reemplazada. */
function planWithImages(images) {
  const plan = load('promotion/plan-full-ok.json');
  for (const rc of plan.resource_changes) {
    const want = images[IMAGE_KEY_BY_ADDRESS[rc.address]];
    const walk = (node) => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === 'object') {
        if (Array.isArray(node.containers)) node.containers.forEach((c) => { c.image = want; });
        Object.values(node).forEach(walk);
      }
    };
    walk(rc.change.after);
  }
  return plan;
}

/** describe de gcloud que refleja el estado tras aplicar `images`. */
function cloudRunAfterApply(images) {
  const byName = {
    'maps-prod-frontend': images.frontend_image,
    'maps-prod-backend': images.backend_image,
    'maps-prod-migrate': images.jobs_image,
    'maps-prod-bootstrap': images.jobs_image,
  };
  return (kind, name) => ({
    ok: true,
    json: kind === 'jobs'
      ? { spec: { template: { spec: { template: { spec: { containers: [{ image: byName[name] }] } } } } } }
      : {
        spec: { template: { spec: { containers: [{ image: byName[name] }] } } },
        status: {
          conditions: [{ type: 'Ready', status: 'True' }],
          latestCreatedRevisionName: 'r', latestReadyRevisionName: 'r',
          traffic: [{ latestRevision: true, percent: 100 }],
        },
      },
  });
}

test('promoción simulada: de manifiesto verificado a registro succeeded', () => {
  // 1. verify: manifiesto → imágenes → tfvars + informe
  const manifest = {
    ...load('promotion/valid-manifest-minimal.json'),
    git_sha: NEW_SHA,
    build_run_url: `https://github.com/Kondor-Corporate/MAPS-Landingpage/actions/runs/${BUILD_RUN}`,
  };
  const extracted = productionImagesFromManifest(manifest);
  assert.equal(extracted.ok, true);
  assert.match(formatPromotionTfvarsHcl(extracted.tfvars), /^frontend_image = "/m);
  const report = {
    operation: 'forward', automation_sha: AUTOMATION_SHA, git_sha: NEW_SHA, release_build_run_id: BUILD_RUN,
    images: extracted.images, migration: { requires_jobs_first_apply: false },
  };

  // 2. plan del operador → binding
  const plan = planWithImages(report.images);
  const bound = buildPlanBinding({
    planBytes: Buffer.from('tfplan-binario'), planJson: plan, report, mode: 'full', verifyRunId: '7001', localCheckout: CHECKOUT,
  });
  assert.equal(bound.ok, true, bound.errors?.join(' '));

  // 3. apply: inputs → gate (todo coherente)
  const inputs = {
    GIT_SHA: NEW_SHA, RELEASE_BUILD_RUN_ID: BUILD_RUN, PHASE: 'apply', OPERATION: 'promote',
    PLAN_MODE: 'full', VERIFY_RUN_ID: '7001', PLAN_SHA256: bound.planSha256, TARGET_DEPLOYMENT_ID: '',
    STATE_BUCKET: 'bucket-de-prueba',
  };
  assert.equal(validateWorkflowInputs(inputs).ok, true);
  const gate = validatePromotionApplyGate({
    planMode: 'full', operation: 'forward', migration: report.migration,
    verifyRunId: '7001', gitSha: NEW_SHA, releaseBuildRunId: BUILD_RUN, automationSha: AUTOMATION_SHA,
    planBinding: bound.binding, requirePlanBinding: true, planSha256: bound.planSha256,
    report, inputOperation: 'promote', inputTargetDeploymentId: '', bundleManifest: manifest,
  });
  assert.equal(gate.ok, true, gate.errors?.join(' '));

  // 4. post-verify con Cloud Run en el estado nuevo → registro succeeded
  const post = runPostDeploymentVerification(report.images, {
    planMode: 'full', describe: cloudRunAfterApply(report.images),
  });
  assert.equal(post.ok, true);
  const record = buildDeploymentRecord({
    deploymentId: '7002', operation: 'promote', gitSha: NEW_SHA, releaseBuildRunId: BUILD_RUN,
    images: report.images, promotionVerifyRunId: '7001', applyRunId: '7002',
    outcome: 'succeeded', postVerify: post, verifiedManifest: manifest,
  });
  assert.equal(record.ok, true, record.errors?.join(' '));
});

test('promoción simulada: un fallo en cualquier eslabón impide el éxito registrado', () => {
  const images = {
    frontend_image: productionImagesFromManifest(load('promotion/valid-manifest-minimal.json')).images.frontend_image,
    backend_image: productionImagesFromManifest(load('promotion/valid-manifest-minimal.json')).images.backend_image,
    jobs_image: productionImagesFromManifest(load('promotion/valid-manifest-minimal.json')).images.jobs_image,
  };
  // Cloud Run quedó con otra imagen en el backend: no hay éxito.
  const drifted = { ...images, backend_image: images.backend_image.replace(/1$/, '9') };
  const post = runPostDeploymentVerification(images, { planMode: 'full', describe: cloudRunAfterApply(drifted) });
  assert.equal(post.ok, false);
  const record = buildDeploymentRecord({
    deploymentId: '7003', operation: 'promote', gitSha: NEW_SHA, releaseBuildRunId: BUILD_RUN,
    images, promotionVerifyRunId: '7001', applyRunId: '7003', outcome: 'succeeded',
    postVerify: post, verifiedManifest: { git_sha: NEW_SHA },
  });
  assert.equal(record.ok, false, 'un succeeded con post-verify fallido no se puede construir');
  const partial = buildDeploymentRecord({
    deploymentId: '7003', operation: 'promote', gitSha: NEW_SHA, releaseBuildRunId: BUILD_RUN,
    images, promotionVerifyRunId: '7001', applyRunId: '7003', outcome: 'partial', postVerify: post,
  });
  assert.equal(partial.ok, true, 'partial sí queda registrado, sin ser target de rollback');
});

test('rollback simulado al baseline R5 y el registro resultante', () => {
  const registry = load('rollback/registry-valid.json');
  const baseline = registry.find((r) => r.operation === 'baseline');
  const current = getCurrentDeployment(parseDeploymentRegistry(registry).records);
  assert.equal(current.deployment_id, '900002');

  // verify rollback: selección desde el registro
  const selection = validateRollbackTargetSelection({
    registryRecords: registry, targetDeploymentId: 'r5-baseline', assertGitSha: baseline.git_sha, assertReleaseBuildRunId: undefined,
  });
  assert.equal(selection.ok, true, selection.errors?.join(' '));
  const resolved = resolveRollbackManifest({ target: selection.target, github: null });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.manifest_source, 'baseline');

  const report = {
    operation: 'rollback', automation_sha: AUTOMATION_SHA, git_sha: baseline.git_sha, release_build_run_id: null,
    target_deployment_id: 'r5-baseline', manifest_source: 'baseline', rollback_from: selection.rollback_from,
    images: resolved.images, migration: { requires_jobs_first_apply: false, requires_human_schema_review: false },
  };
  const manifest = {
    git_sha: baseline.git_sha,
    images: [
      { id: 'frontend', immutable_ref: report.images.frontend_image },
      { id: 'backend', immutable_ref: report.images.backend_image },
      { id: 'backend-jobs', immutable_ref: report.images.jobs_image },
    ],
  };

  // plan → binding → gate con release_build_run_id vacío (baseline)
  const bound = buildPlanBinding({
    planBytes: Buffer.from('plan-rollback'), planJson: planWithImages(report.images), report, mode: 'full', verifyRunId: '7100', localCheckout: CHECKOUT,
  });
  assert.equal(bound.ok, true, bound.errors?.join(' '));
  const gate = validatePromotionApplyGate({
    planMode: 'full', operation: 'rollback', migration: report.migration,
    verifyRunId: '7100', gitSha: baseline.git_sha, releaseBuildRunId: '', automationSha: AUTOMATION_SHA,
    planBinding: bound.binding, requirePlanBinding: true, planSha256: bound.planSha256,
    report, inputOperation: 'rollback', inputTargetDeploymentId: 'r5-baseline', bundleManifest: manifest,
  });
  assert.equal(gate.ok, true, gate.errors?.join(' '));

  // Un bundle de promoción no se puede aplicar como rollback.
  const asRollback = validatePromotionApplyGate({
    planMode: 'full', operation: 'forward', migration: {}, verifyRunId: '7100', gitSha: baseline.git_sha, releaseBuildRunId: '', automationSha: AUTOMATION_SHA,
    report: { ...report, operation: 'forward' }, inputOperation: 'rollback', inputTargetDeploymentId: 'r5-baseline',
  });
  assert.equal(asRollback.ok, false);

  // post-verify + registro: el rollback al baseline queda registrado como éxito...
  const post = runPostDeploymentVerification(report.images, { planMode: 'full', describe: cloudRunAfterApply(report.images) });
  const rec = buildDeploymentRecord({
    deploymentId: '7101', operation: 'rollback', gitSha: baseline.git_sha, releaseBuildRunId: null,
    restoredBaseline: true, images: report.images, promotionVerifyRunId: '7100', applyRunId: '7101',
    outcome: 'succeeded', postVerify: post, verifiedManifest: manifest,
    replacedDeploymentId: current.deployment_id, previousGitSha: current.git_sha,
  });
  assert.equal(rec.ok, true, rec.errors?.join(' '));

  // ...pasa a ser el despliegue actual, y repetir el mismo rollback es innecesario.
  const after = [...registry, { ...rec.record, applied_at: '2026-10-31T12:00:00Z' }];
  assert.equal(getCurrentDeployment(parseDeploymentRegistry(after).records).deployment_id, '7101');
  const again = validateRollbackTargetSelection({ registryRecords: after, targetDeploymentId: 'r5-baseline' });
  assert.equal(again.ok, false);
});
