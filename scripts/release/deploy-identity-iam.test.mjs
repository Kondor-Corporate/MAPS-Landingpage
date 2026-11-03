/**
 * Contrato IAM del bucket de state para la cuenta de deploy (módulo deploy-identity).
 *
 * Lee el Terraform como texto y evalúa de forma declarativa qué puede hacer la cuenta sobre cada
 * objeto. No ejecuta Terraform ni toca GCP. Los permisos de los roles predefinidos son los
 * documentados por Google y se confirman en el ensayo real (`gcloud iam roles describe`).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const read = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

const MODULE = read('infra/terraform/modules/deploy-identity/main.tf');
const BUCKET = 'demo-state-bucket';
const OBJECTS = `projects/_/buckets/${BUCKET}/objects/`;

/** Permisos de los roles predefinidos que usa la política (documentación de Cloud Storage). */
const PREDEFINED = {
  'roles/storage.legacyBucketReader': ['storage.buckets.get', 'storage.objects.list'],
  'roles/storage.objectViewer': ['storage.objects.get', 'storage.objects.list'],
  'roles/storage.objectCreator': ['storage.objects.create'],
};
const BROAD_ROLES = [
  'roles/storage.admin', 'roles/storage.objectAdmin', 'roles/storage.objectUser',
  'roles/storage.legacyBucketOwner', 'roles/storage.legacyBucketWriter',
  'roles/storage.legacyObjectOwner', 'roles/storage.legacyObjectReader',
  'roles/owner', 'roles/editor',
];

function blocks(type) {
  const re = new RegExp(`resource "${type}" "(\\w+)" \\{\\n([\\s\\S]*?)\\n\\}\\n`, 'g');
  return [...MODULE.matchAll(re)].map((m) => ({ name: m[1], body: m[2] }));
}

const localString = (name) => MODULE.match(new RegExp(`^\\s*${name}\\s*=\\s*"([^"\\n]*)"`, 'm'))?.[1];

/** Los tres locals con la expresión CEL, tal como están escritos (si cambian, este test avisa). */
const EXPRESSION_LOCALS = {
  state_condition_expression:
    'resource.name.startsWith(\\"${local.state_bucket_objects}${local.terraform_state_object_prefix}\\")',
  promotion_read_expression:
    'resource.name.startsWith(\\"${local.state_bucket_objects}${local.promotion_object_prefix}\\")',
};

function parseModel() {
  const statePrefix = localString('terraform_state_object_prefix');
  const readPrefix = localString('promotion_object_prefix');
  const createPrefixes = [...MODULE.match(/promotion_create_prefixes = \[([\s\S]*?)\]/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const customPermissions = [...blocks('google_project_iam_custom_role')
    .find((b) => b.name === 'terraform_state').body.match(/permissions = \[([\s\S]*?)\]/)[1].matchAll(/"([^"]+)"/g)]
    .map((m) => m[1]);

  const prefixesFor = {
    state_condition_expression: [OBJECTS + statePrefix],
    promotion_read_expression: [OBJECTS + readPrefix],
    promotion_create_expression: createPrefixes.map((p) => OBJECTS + p),
  };
  const bindings = blocks('google_storage_bucket_iam_member').map((b) => {
    const role = b.body.match(/role\s*=\s*"?([^"\n]+?)"?\s*$/m)[1];
    const exprLocal = b.body.match(/expression\s*=\s*local\.(\w+)/)?.[1] ?? null;
    return {
      name: b.name,
      role,
      permissions: role === 'google_project_iam_custom_role.terraform_state.id' ? customPermissions : PREDEFINED[role],
      conditionPrefixes: exprLocal ? prefixesFor[exprLocal] : null,
      hasCondition: /\n\s*condition \{/.test(`\n${b.body}`),
      body: b.body,
    };
  });
  return { statePrefix, readPrefix, createPrefixes, customPermissions, bindings };
}

const model = parseModel();

/** ¿Tiene la cuenta `permission` sobre `resourceName`? Una condición vale solo para objetos. */
function allowed(permission, resourceName) {
  return model.bindings.some((b) =>
    b.permissions?.includes(permission)
    && (b.conditionPrefixes === null || b.conditionPrefixes.some((p) => resourceName.startsWith(p))));
}
const object = (name) => `${OBJECTS}${name}`;
const can = (permission, name) => allowed(permission, object(name));
const canOverwrite = (name) => can('storage.objects.create', name) && can('storage.objects.delete', name);

test('IAM: exactamente cuatro bindings de bucket y ninguno amplio', () => {
  assert.deepEqual(
    model.bindings.map((b) => b.name).sort(),
    ['deploy_bucket_list', 'deploy_promotion_create', 'deploy_promotion_read', 'deploy_state'],
  );
  const roles = model.bindings.map((b) => b.role);
  for (const broad of BROAD_ROLES) {
    assert.ok(!MODULE.includes(broad), `${broad} no puede aparecer en el módulo`);
  }
  assert.deepEqual(roles.sort(), [
    'google_project_iam_custom_role.terraform_state.id',
    'roles/storage.legacyBucketReader',
    'roles/storage.objectCreator',
    'roles/storage.objectViewer',
  ]);
  // Sin otra forma de conceder acceso al bucket que pueda anular las condiciones.
  assert.doesNotMatch(MODULE, /google_storage_bucket_iam_(binding|policy)/);
  assert.doesNotMatch(MODULE, /google_storage_bucket_access_control|google_storage_default_object_acl|google_storage_object_acl/);
  assert.doesNotMatch(MODULE, /allUsers|allAuthenticatedUsers/);
  // Ningún rol de almacenamiento a nivel de proyecto para la cuenta de deploy.
  for (const b of blocks('google_project_iam_member')) {
    assert.doesNotMatch(b.body, /roles\/storage|storage\.objects|storage\.buckets/, b.name);
  }
  // Fuera del módulo, nadie más le concede nada a la cuenta de deploy.
  const outputs = read('infra/terraform/environments/production/outputs.tf');
  const main = read('infra/terraform/environments/production/main.tf');
  assert.doesNotMatch(main, /module\.deploy_identity\.deploy_service_account_email/);
  assert.match(outputs, /module\.deploy_identity\.deploy_service_account_email/); // solo informativo
});

test('IAM: solo el listado es incondicional; el resto lleva condición de prefijo por nombre', () => {
  const byName = Object.fromEntries(model.bindings.map((b) => [b.name, b]));
  assert.equal(byName.deploy_bucket_list.hasCondition, false);
  assert.equal(byName.deploy_bucket_list.role, 'roles/storage.legacyBucketReader');
  for (const name of ['deploy_promotion_read', 'deploy_promotion_create', 'deploy_state']) {
    assert.equal(byName[name].hasCondition, true, name);
    assert.ok(byName[name].conditionPrefixes.length > 0, name);
  }
  // Expresiones CEL: nombre de recurso de objeto de Cloud Storage y prefijos con barra final.
  for (const [name, expected] of Object.entries(EXPRESSION_LOCALS)) {
    const escaped = expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(MODULE, new RegExp(`${name}\\s*=\\s*"${escaped}"`), `${name}: expresión inesperada`);
  }
  assert.match(MODULE, /state_bucket_objects = "projects\/_\/buckets\/\$\{var\.terraform_state_bucket_name\}\/objects\/"/);
  assert.ok(MODULE.includes('"resource.name.startsWith(\\"${local.state_bucket_objects}${prefix}\\")"'));
  assert.ok(MODULE.includes('join(" || ", ['));
  for (const prefix of [model.statePrefix, model.readPrefix, ...model.createPrefixes]) {
    assert.match(prefix, /^[a-z0-9\-/]+\/$/, `${prefix} debe terminar en barra`);
  }
  // `list` no se puede acotar por prefijo en un binding: no se usa el atributo de Credential Access Boundaries
  // ni se pone una condición de nombre sobre un permiso de listado en un binding condicional.
  const code = MODULE.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
  assert.doesNotMatch(code, /objectListPrefix|api\.getAttribute/);
  assert.ok(!model.customPermissions.includes('storage.objects.list'), 'el rol de state no lista');
});

test('IAM: rol de state sin list, con create/get/update/delete y prefijo igual al del backend', () => {
  assert.deepEqual([...model.customPermissions].sort(), [
    'storage.objects.create', 'storage.objects.delete', 'storage.objects.get', 'storage.objects.update',
  ]);
  const backend = read('infra/terraform/environments/production/backend.tf');
  const backendPrefix = backend.match(/prefix\s*=\s*"([^"]+)"/)[1];
  assert.equal(model.statePrefix, `${backendPrefix}/`);
  // Los permisos de Cloud Run quedan como estaban (dependen del ensayo real).
  const perms = (body) => [...body.match(/permissions = \[([\s\S]*?)\]/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const draft = blocks('google_project_iam_custom_role').find((b) => b.name === 'cloudrun_promotion_placeholder').body;
  assert.deepEqual(perms(draft), ['run.services.get', 'run.jobs.get', 'run.operations.get']);
  const serviceUpdate = blocks('google_project_iam_custom_role').find((b) => b.name === 'service_update').body;
  assert.deepEqual(perms(serviceUpdate), ['run.services.update']);
  assert.match(blocks('google_cloud_run_v2_service_iam_member').find((b) => b.name === 'deploy_update_service').body, /for_each = toset\(\["frontend", "backend"\]\)/);
  const jobUpdate = blocks('google_project_iam_custom_role').find((b) => b.name === 'job_update').body;
  assert.deepEqual(perms(jobUpdate), ['run.jobs.update']);
  assert.match(blocks('google_cloud_run_v2_job_iam_member').find((b) => b.name === 'deploy_update_migrate').body, /name\s+= "\$\{var\.prefix\}-migrate"/);
  const bootstrapUpdate = blocks('google_project_iam_custom_role').find((b) => b.name === 'bootstrap_update').body;
  assert.deepEqual(perms(bootstrapUpdate), ['run.jobs.update']);
  const forbidden = ['run.jobs.run', 'run.jobs.runWithOverrides', 'run.jobs.delete', 'run.executions.cancel'];
  const rolePerms = Object.fromEntries(blocks('google_project_iam_custom_role').map((b) => [b.name, perms(b.body)]));
  const bootstrapBindings = [
    ...blocks('google_cloud_run_v2_job_iam_member'),
    ...blocks('google_cloud_run_v2_service_iam_member'),
    ...blocks('google_project_iam_member'),
  ].filter((b) => /name\s+= "\$\{var\.prefix\}-bootstrap"/.test(b.body) || /for_each[^\n]*"bootstrap"/.test(b.body));
  assert.deepEqual(bootstrapBindings.map((b) => b.name), ['deploy_update_bootstrap']);
  const bootstrapRole = bootstrapBindings[0].body.match(/google_project_iam_custom_role\.(\w+)\.id/)[1];
  assert.equal(bootstrapRole, 'bootstrap_update');
  for (const permission of forbidden) {
    assert.equal(rolePerms[bootstrapRole].includes(permission), false, permission);
  }
  assert.doesNotMatch(MODULE, /role\s+=\s+"roles\/run\.developer"/);
  const execute = blocks('google_project_iam_custom_role').find((b) => b.name === 'migrate_execute').body;
  assert.deepEqual(perms(execute), ['run.jobs.run', 'run.executions.get']);
  const runMigrate = blocks('google_cloud_run_v2_job_iam_member').find((b) => b.name === 'deploy_run_migrate').body;
  assert.match(runMigrate, /name\s+= "\$\{var\.prefix\}-migrate"/);
  assert.doesNotMatch(runMigrate, /for_each/);
  assert.doesNotMatch(runMigrate, /\n\s+condition \{/);
  const artifact = blocks('google_project_iam_custom_role').find((b) => b.name === 'artifact_digest_reader').body;
  assert.match(artifact, /artifactregistry\.repositories\.downloadArtifacts/);
  assert.doesNotMatch(artifact, /uploadArtifacts|deleteArtifacts/);
  const actAs = blocks('google_project_iam_custom_role').find((b) => b.name === 'runtime_act_as').body;
  assert.deepEqual(perms(actAs), ['iam.serviceAccounts.actAs']);
  assert.match(MODULE, /google_service_account_iam_member" "deploy_runtime_act_as"/);
  assert.doesNotMatch(MODULE, /promotion_update_condition|migrate_execute_condition/);
  assert.doesNotMatch(MODULE, /role\s+=\s+"roles\/(owner|editor|run\.admin|run\.developer|iam\.serviceAccountTokenCreator|artifactregistry\.reader)"/);
});

test('IAM: matriz de permisos efectivos de la cuenta de deploy', () => {
  // Listar: bucket completo (limitación de IAM), sin contenido; y metadatos del bucket.
  assert.equal(allowed('storage.objects.list', `projects/_/buckets/${BUCKET}`), true);
  assert.equal(allowed('storage.buckets.get', `projects/_/buckets/${BUCKET}`), true);
  assert.equal(can('storage.objects.get', 'otro/objeto.json'), false, 'fuera de los prefijos no lee contenido');
  assert.equal(can('storage.objects.create', 'otro/objeto.json'), false);

  // State y locks de Terraform: leer, crear, reescribir (create + delete) y borrar el lock.
  for (const name of ['terraform/production/default.tfstate', 'terraform/production/default.tflock']) {
    for (const perm of ['get', 'create', 'update', 'delete']) {
      assert.equal(can(`storage.objects.${perm}`, name), true, `${name} ${perm}`);
    }
    assert.equal(canOverwrite(name), true, `${name}: el state se reescribe`);
  }
  // Otro prefijo parecido al del state no queda cubierto.
  assert.equal(can('storage.objects.get', 'terraform/production-old/default.tfstate'), false);
  assert.equal(can('storage.objects.get', 'terraform/staging/default.tfstate'), false);

  // Registros y evidencia de migrate: leer y crear; nunca sobrescribir, actualizar ni borrar.
  for (const name of ['promotion/deployments/900002.json', 'promotion/deployments/r5-baseline.json', 'promotion/migrate-done/7001.json']) {
    assert.equal(can('storage.objects.get', name), true, `${name} get`);
    assert.equal(can('storage.objects.create', name), true, `${name} create`);
    assert.equal(can('storage.objects.delete', name), false, `${name} delete`);
    assert.equal(can('storage.objects.update', name), false, `${name} update`);
    assert.equal(canOverwrite(name), false, `${name}: sobrescribir exige create y delete`);
  }

  // Planes y bindings: solo lectura. Aprobaciones de esquema de rollback: solo lectura.
  for (const name of ['promotion/plans/7001/full.tfplan', 'promotion/plans/7001/full.binding.json', 'promotion/rollback-schema-approvals/7001.json']) {
    assert.equal(can('storage.objects.get', name), true, `${name} get`);
    assert.equal(can('storage.objects.create', name), false, `${name} create`);
    assert.equal(can('storage.objects.delete', name), false, `${name} delete`);
    assert.equal(can('storage.objects.update', name), false, `${name} update`);
  }
  // Un prefijo que solo se parece a promotion/ no hereda nada.
  assert.equal(can('storage.objects.get', 'promotion-old/x.json'), false);
  assert.equal(can('storage.objects.create', 'promotion/deployments-old/x.json'), false);
});

test('IAM: las rutas que escriben los scripts caen dentro de lo permitido', () => {
  // Rutas reales de los scripts del workflow, no copias a mano.
  return Promise.all([
    import('./deployment-registry-contract.mjs'),
    import('./promotion-plan-contract.mjs'),
  ]).then(([registry, plan]) => {
    // Escribe la cuenta de deploy (workflow de apply): create-only.
    for (const path of [registry.gcsDeploymentRecordPath('7003'), plan.gcsMigrateEvidencePath('7001')]) {
      assert.equal(can('storage.objects.create', path), true, path);
      assert.equal(can('storage.objects.get', path), true, path);
      assert.equal(canOverwrite(path), false, path);
    }
    // Lee la cuenta de deploy; escribe el operador con sus credenciales.
    for (const path of [
      plan.gcsPlanObjectPath('7001', 'full'), plan.gcsPlanBindingPath('7001', 'services-only'),
      registry.gcsRollbackSchemaApprovalPath('7001'),
    ]) {
      assert.equal(can('storage.objects.get', path), true, path);
      assert.equal(can('storage.objects.create', path), false, `${path}: lo sube el operador`);
    }
    // El listado del registro (`gsutil ls promotion/deployments/*.json`) usa objects.list del bucket.
    assert.equal(allowed('storage.objects.list', `projects/_/buckets/${BUCKET}`), true);
  });
});

test('IAM: compatibilidad con Uniform Bucket-Level Access verificada en el plan', () => {
  assert.match(MODULE, /data "google_storage_bucket" "state" \{\s*name = var\.terraform_state_bucket_name\s*\}/);
  for (const b of blocks('google_storage_bucket_iam_member')) {
    assert.match(
      b.body,
      /precondition \{\s*condition\s*=\s*data\.google_storage_bucket\.state\.uniform_bucket_level_access/,
      `${b.name}: precondición de UBLA`,
    );
  }
  // El binding nuevo de state se crea antes de destruir el incondicional anterior.
  const state = model.bindings.find((b) => b.name === 'deploy_state');
  assert.match(state.body, /create_before_destroy\s*=\s*true/);
  // El nombre del bucket se interpola en una expresión CEL: solo caracteres válidos de bucket.
  const vars = read('infra/terraform/modules/deploy-identity/variables.tf');
  assert.match(vars, /\^\[a-z0-9\]\[a-z0-9\._-\]\{1,61\}\[a-z0-9\]\$/);
});

test('IAM: runbook y Terraform describen los mismos permisos', () => {
  const doc = read('docs/GCP_PRODUCTION_RUNBOOK.md');
  const table = doc.slice(doc.indexOf('**Política IAM — implementada'), doc.indexOf('Requisitos: las IAM Conditions'));
  assert.ok(table.length > 200, 'tabla de la política no encontrada');
  const rows = table.split('\n').filter((l) => /^\| [1-4] \|/.test(l));
  assert.equal(rows.length, 4);

  const [list, read_, create, state] = rows;
  assert.ok(list.includes('roles/storage.legacyBucketReader') && /ninguna/.test(list));
  assert.ok(read_.includes('roles/storage.objectViewer') && read_.includes('/objects/promotion/"'));
  assert.ok(create.includes('roles/storage.objectCreator'));
  for (const prefix of model.createPrefixes) {
    assert.ok(create.includes(`/objects/${prefix}"`), `la fila 3 debe nombrar ${prefix}`);
  }
  const createCondition = create.match(/`resource\.name[^`]*`/)[0];
  assert.ok(!createCondition.includes('promotion/plans'), 'deploy no crea en promotion/plans/');
  assert.match(create, /No escribe en `promotion\/plans\/`/);
  assert.ok(state.includes('mapsTerraformStateRW') && state.includes(`/objects/${model.statePrefix}"`));
  // Permisos del rol de state en la fila 4 = los del Terraform, y sin list.
  const docPerms = [...state.matchAll(/`(create|get|update|delete)`/g)].map((m) => `storage.objects.${m[1]}`).sort();
  assert.deepEqual(docPerms, [...model.customPermissions].sort());
  assert.match(state, /sin\*\* `storage\.objects\.list`/);

  // El texto ya no habla de la política como pendiente de implementar en el módulo.
  assert.doesNotMatch(doc, /implementación en `deploy-identity` es trabajo posterior/);
  assert.doesNotMatch(doc, /Política IAM propuesta|Control mínimo propuesto/);
  assert.match(doc, /implementada en `infra\/terraform\/modules\/deploy-identity\/main\.tf`/);
  // El README del módulo cita los mismos roles y prefijos.
  const readme = read('infra/terraform/modules/deploy-identity/README.md');
  for (const needle of [
    'roles/storage.legacyBucketReader', 'roles/storage.objectViewer', 'roles/storage.objectCreator',
    'mapsTerraformStateRW', 'terraform/production/', 'promotion/deployments/', 'promotion/migrate-done/',
  ]) {
    assert.ok(readme.includes(needle), `README del módulo: falta ${needle}`);
  }
});
