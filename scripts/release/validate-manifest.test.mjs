import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  validateReleaseManifest,
  validateReleaseManifestFile,
} from './validate-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, 'fixtures');
const VALID_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function loadValid() {
  return JSON.parse(readFileSync(join(FIXTURES, 'valid-manifest.json'), 'utf8'));
}

function cloneValid() {
  return structuredClone(loadValid());
}

function assertFails(result, substring) {
  assert.equal(result.ok, false);
  if (!result.ok) {
    const joined = result.errors.join('\n');
    assert.match(joined, substring);
  }
}

test('acepta un manifiesto válido (fixture)', () => {
  const manifest = loadValid();
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assert.equal(result.ok, true);
});

test('acepta un manifiesto válido vía archivo', () => {
  const result = validateReleaseManifestFile(
    join(FIXTURES, 'valid-manifest.json'),
    VALID_SHA,
  );
  assert.equal(result.ok, true);
});

test('rechaza JSON mal formado', () => {
  const badPath = join(FIXTURES, 'invalid-json.txt');
  const result = validateReleaseManifestFile(badPath, VALID_SHA);
  assertFails(result, /JSON mal formado/);
});

test('rechaza SHA esperado incorrecto', () => {
  const manifest = loadValid();
  const result = validateReleaseManifest(manifest, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
  assertFails(result, /no coincide con el SHA esperado/);
});

test('rechaza imagen faltante', () => {
  const manifest = cloneValid();
  manifest.images = manifest.images.filter((img) => img.id !== 'frontend-staging');
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /exactamente cuatro/);
});

test('rechaza id duplicado', () => {
  const manifest = cloneValid();
  manifest.images.push(structuredClone(manifest.images[0]));
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /duplicado/);
});

test('rechaza digest mal formado', () => {
  const manifest = cloneValid();
  manifest.images[0].digest = 'sha256:abc';
  manifest.images[0].immutable_ref = `${manifest.images[0].image}@sha256:abc`;
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /digest tiene formato inválido/);
});

test('rechaza referencia mutable o inconsistente', () => {
  const manifest = cloneValid();
  manifest.images[0].immutable_ref = `${manifest.images[0].image}:${VALID_SHA}`;
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /tag mutable|image@digest/);
});

test('rechaza imagen en otro proyecto o repositorio', () => {
  const manifest = cloneValid();
  manifest.images[0].image =
    'us-central1-docker.pkg.dev/otro-proyecto/otro-repo/backend';
  manifest.images[0].immutable_ref = `${manifest.images[0].image}@${manifest.images[0].digest}`;
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /images\[backend\]\.image/);
});

test('rechaza oci_revision distinta al SHA', () => {
  const manifest = cloneValid();
  manifest.images[1].oci_revision = 'cccccccccccccccccccccccccccccccccccccccc';
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /oci_revision/);
});

test('rechaza frontend de producción con noindex', () => {
  const manifest = cloneValid();
  const front = manifest.images.find((i) => i.id === 'frontend');
  front.vite.VITE_PUBLIC_INDEXING = 'false';
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /indexación habilitada/);
});

test('rechaza frontend-staging con indexación habilitada', () => {
  const manifest = cloneValid();
  const staging = manifest.images.find((i) => i.id === 'frontend-staging');
  staging.vite.VITE_PUBLIC_INDEXING = 'true';
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /sin indexación/);
});

test('rechaza frontend-staging con canónico de producción', () => {
  const manifest = cloneValid();
  const staging = manifest.images.find((i) => i.id === 'frontend-staging');
  staging.vite.VITE_PUBLIC_SITE_URL = 'https://mapsasesores.com.ar';
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /sin canónico de producción/);
});

test('rechaza datos obligatorios faltantes', () => {
  const manifest = cloneValid();
  delete manifest.ci_run_url;
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /ci_run_url/);
});

test('rechaza schema_version no admitida', () => {
  const manifest = cloneValid();
  manifest.schema_version = 2;
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /schema_version/);
});

test('rechaza origen distinto de development', () => {
  const manifest = cloneValid();
  manifest.source_branch_required = 'main';
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /source_branch_required/);
});

test('rechaza URL de CI incoherente', () => {
  const manifest = cloneValid();
  manifest.ci_run_url = 'https://example.com/not-github';
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /ci_run_url/);
});

test('rechaza tag distinto del SHA (referencia mutable)', () => {
  const manifest = cloneValid();
  manifest.images[0].tag = 'latest';
  const result = validateReleaseManifest(manifest, VALID_SHA);
  assertFails(result, /tag tiene que ser el SHA completo/);
});
