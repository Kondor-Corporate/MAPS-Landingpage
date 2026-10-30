import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf8');
}

test('build-identity: pool maps-github y binding por repository_id', () => {
  const tf = read('infra/terraform/modules/build-identity/main.tf');
  assert.match(tf, /workload_identity_pool_id\s*=\s*"maps-github"/);
  assert.match(tf, /attribute\.repository_id\/\$\{local\.github_repository_id\}/);
  assert.doesNotMatch(tf, /maps-github-deploy/);
});

test('deploy-identity: pool maps-github-deploy aislado del pool de builds', () => {
  const tf = read('infra/terraform/modules/deploy-identity/main.tf');
  assert.match(tf, /deploy_workflow_pool_id\s*=\s*"maps-github-deploy"/);
  assert.match(tf, /google_iam_workload_identity_pool\.github_deploy/);
  assert.doesNotMatch(tf, /workload_identity_pool_id\s*=\s*"maps-github"/);
  assert.doesNotMatch(tf, /workload_identity_pool_id\s*=\s*var\./);
});

test('deploy-identity: workloadIdentityUser solo en pool deploy', () => {
  const tf = read('infra/terraform/modules/deploy-identity/main.tf');
  assert.match(tf, /deploy_principal_set/);
  assert.match(tf, /maps-github-deploy/);
  assert.match(tf, /attribute\.workflow_ref/);
  assert.doesNotMatch(
    tf,
    /principalSet.*maps-github\/attribute\.repository_id/,
  );
});

test('deploy-identity: OIDC exige IDs numéricos, workflow promote y environment production', () => {
  const tf = read('infra/terraform/modules/deploy-identity/main.tf');
  assert.match(tf, /assertion\.repository_owner_id ==/);
  assert.match(tf, /assertion\.repository_id ==/);
  assert.match(tf, /release-promote\.yml/);
  assert.match(tf, /assertion\.environment == 'production'/);
  assert.match(tf, /assertion\.event_name == 'workflow_dispatch'/);
  assert.match(tf, /promote_workflow_file/);
  assert.match(tf, /!strcontains\(local\.promote_attribute_condition, "release-build.yml"\)/);
});

test('producción: deploy_identity sin count condicional', () => {
  const main = read('infra/terraform/environments/production/main.tf');
  const vars = read('infra/terraform/environments/production/variables.tf');
  assert.doesNotMatch(main, /module "deploy_identity"[\s\S]*count\s*=/);
  assert.doesNotMatch(vars, /terraform_state_bucket_name[\s\S]*default\s*=\s*""/);
  assert.match(vars, /must not be blank/);
});

test('release-build.yml no referencia deploy pool ni cuenta deploy', () => {
  const wf = read('.github/workflows/release-build.yml');
  assert.doesNotMatch(wf, /maps-github-deploy/);
  assert.doesNotMatch(wf, /GCP_DEPLOY/);
  assert.doesNotMatch(wf, /maps-prod-deploy/);
});
