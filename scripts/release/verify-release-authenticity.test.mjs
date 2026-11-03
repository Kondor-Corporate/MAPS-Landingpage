import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { verifyManifestImagesInRegistry } from './gcp-artifact-verify.mjs';
import {
  assertCiRunForSha,
  assertReleaseBuildRun,
  assertReleaseManifestArtifact,
  createGithubReleaseClient,
} from './github-release-api.mjs';
import { RELEASE_BUILD_WORKFLOW_PATH } from './release-workflow-contract.mjs';
import {
  verifyGithubAuthenticity,
  verifyLocalAuthenticity,
  verifyReleaseAuthenticity,
  verifyShaOnDevelopmentViaGithub,
} from './verify-release-authenticity.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VALID_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const FIXTURE = join(__dirname, 'fixtures', 'valid-manifest.json');

function loadValid() {
  return JSON.parse(readFileSync(FIXTURE, 'utf8'));
}

function mockGithubClient(overrides = {}) {
  return {
    owner: 'Kondor-Corporate',
    repo: 'MAPS-Landingpage',
    getWorkflowRun: async () => ({
      id: 40992146277,
      status: 'completed',
      conclusion: 'success',
      event: 'workflow_dispatch',
      path: RELEASE_BUILD_WORKFLOW_PATH,
      html_url: 'https://github.com/Kondor-Corporate/MAPS-Landingpage/actions/runs/40992146277',
      ...overrides.run,
    }),
    listRunArtifacts: async () => overrides.artifacts ?? [
      {
        name: `release-manifest-${VALID_SHA}`,
        id: 77,
        workflow_run: { id: 40992146277, head_sha: VALID_SHA },
        expired: false,
      },
    ],
    findSuccessfulCiRun: async () => overrides.ciRun ?? {
      head_sha: VALID_SHA,
      conclusion: 'success',
      path: '.github/workflows/ci.yml',
    },
    commitIsAncestorOfRef: async () => overrides.onDevelopment ?? true,
  };
}

test('local: manifiesto válido y URL de build parseable', () => {
  const manifest = loadValid();
  manifest.build_run_url =
    'https://github.com/Kondor-Corporate/MAPS-Landingpage/actions/runs/40992146277';
  const result = verifyLocalAuthenticity(manifest, VALID_SHA);
  assert.equal(result.ok, true);
  assert.equal(result.runId, '40992146277');
});

test('local: rechaza manifiesto estructuralmente inválido', () => {
  const manifest = loadValid();
  manifest.schema_version = 99;
  const result = verifyLocalAuthenticity(manifest, VALID_SHA);
  assert.equal(result.ok, false);
});

test('github: acepta ejecución release-build exitosa y artifact ligado', async () => {
  const manifest = loadValid();
  manifest.build_run_url =
    'https://github.com/Kondor-Corporate/MAPS-Landingpage/actions/runs/40992146277';
  const client = mockGithubClient();
  const result = await verifyGithubAuthenticity(manifest, VALID_SHA, '40992146277', client);
  assert.equal(result.ok, true);
});

test('github: rechaza ejecución fallida', async () => {
  const manifest = loadValid();
  const client = mockGithubClient({ run: { conclusion: 'failure' } });
  const result = await verifyGithubAuthenticity(manifest, VALID_SHA, '40992146277', client);
  assert.equal(result.ok, false);
});

test('github: rechaza workflow distinto', async () => {
  const manifest = loadValid();
  const client = mockGithubClient({ run: { path: '.github/workflows/ci.yml' } });
  const result = await verifyGithubAuthenticity(manifest, VALID_SHA, '40992146277', client);
  assert.equal(result.ok, false);
});

test('github: rechaza artifact ausente en la ejecución', async () => {
  const errors = assertReleaseManifestArtifact([], VALID_SHA, '40992146277');
  assert.ok(errors.some((e) => e.includes('No existe el artifact')));
});

test('github: acepta artifact con workflow_run.id de la misma ejecución', () => {
  const errors = assertReleaseManifestArtifact(
    [{
      name: `release-manifest-${VALID_SHA}`,
      id: 77,
      workflow_run: { id: 40992146277, head_sha: VALID_SHA },
      expired: false,
    }],
    VALID_SHA,
    '40992146277',
  );
  assert.deepEqual(errors, []);
});

test('github: rechaza artifact con workflow_run.id de otra ejecución', () => {
  const errors = assertReleaseManifestArtifact(
    [{
      name: `release-manifest-${VALID_SHA}`,
      workflow_run: { id: 1 },
      expired: false,
    }],
    VALID_SHA,
    '40992146277',
  );
  assert.ok(errors.some((e) => e.includes('no está ligado')));
});

test('github: rechaza artifact sin workflow_run aunque traiga workflow_run_id plano', () => {
  const errors = assertReleaseManifestArtifact(
    [{
      name: `release-manifest-${VALID_SHA}`,
      workflow_run_id: 40992146277,
      expired: false,
    }],
    VALID_SHA,
    '40992146277',
  );
  assert.ok(errors.some((e) => e.includes('no está ligado')));
});

test('github: rechaza artifact vencido de la ejecución correcta', () => {
  const errors = assertReleaseManifestArtifact(
    [{
      name: `release-manifest-${VALID_SHA}`,
      workflow_run: { id: 40992146277 },
      expired: true,
    }],
    VALID_SHA,
    '40992146277',
  );
  assert.ok(errors.some((e) => e.includes('expiró')));
});

test('github: rechaza artifact con otro nombre', () => {
  const errors = assertReleaseManifestArtifact(
    [{
      name: 'release-manifest-otro',
      workflow_run: { id: 40992146277 },
      expired: false,
    }],
    VALID_SHA,
    '40992146277',
  );
  assert.ok(errors.some((e) => e.includes('No existe el artifact')));
});

test('descarga el zip del artifact asociado por workflow_run.id', async () => {
  /** @type {string[]} */
  const urls = [];
  const fetchFn = async (url) => {
    urls.push(String(url));
    if (String(url).includes('/artifacts?')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          total_count: 1,
          artifacts: [{
            id: 77,
            name: `release-manifest-${VALID_SHA}`,
            expired: false,
            workflow_run: { id: 40992146277, head_sha: VALID_SHA },
          }],
        }),
        text: async () => '',
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    }
    if (String(url).includes('/artifacts/77/zip')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => '',
        arrayBuffer: async () => Uint8Array.from([0x50, 0x4b]).buffer,
      };
    }
    return { ok: false, status: 404, text: async () => 'no', json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
  const client = createGithubReleaseClient({
    fetchFn,
    token: 'test-token',
    owner: 'Kondor-Corporate',
    repo: 'MAPS-Landingpage',
  });
  const zip = await client.downloadReleaseManifestZip('40992146277', VALID_SHA);
  assert.ok(Buffer.isBuffer(zip));
  assert.equal(zip[0], 0x50);
  assert.ok(urls.some((url) => url.includes('/artifacts/77/zip')));
});

test('github: rechaza CI ausente para el SHA', () => {
  const errors = assertCiRunForSha(undefined, VALID_SHA);
  assert.ok(errors.length > 0);
});

test('github: rechaza SHA fuera de development vía compare', async () => {
  const client = mockGithubClient({ onDevelopment: false });
  const result = await verifyShaOnDevelopmentViaGithub(client, VALID_SHA);
  assert.equal(result.ok, false);
});

test('integración: verifyReleaseAuthenticity solo local', async () => {
  const manifest = loadValid();
  manifest.build_run_url =
    'https://github.com/Kondor-Corporate/MAPS-Landingpage/actions/runs/40992146277';
  const path = join(__dirname, 'fixtures', 'valid-manifest-tmp.json');
  const { writeFileSync, unlinkSync } = await import('node:fs');
  writeFileSync(path, JSON.stringify(manifest));
  try {
    const result = await verifyReleaseAuthenticity({
      manifestPath: path,
      expectedGitSha: VALID_SHA,
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.skipped, ['github', 'git', 'gcp']);
  } finally {
    unlinkSync(path);
  }
});

test('integración: capa GitHub con cliente simulado', async () => {
  const manifest = loadValid();
  manifest.build_run_url =
    'https://github.com/Kondor-Corporate/MAPS-Landingpage/actions/runs/40992146277';
  const path = join(__dirname, 'fixtures', 'valid-manifest-tmp.json');
  const { writeFileSync, unlinkSync } = await import('node:fs');
  writeFileSync(path, JSON.stringify(manifest));
  try {
    const result = await verifyReleaseAuthenticity({
      manifestPath: path,
      expectedGitSha: VALID_SHA,
      github: true,
      githubClient: mockGithubClient(),
    });
    assert.equal(result.ok, true);
  } finally {
    unlinkSync(path);
  }
});

test('gcp: digest y etiqueta OCI coherentes (simulado)', () => {
  const manifest = loadValid();
  const runGcloudFn = (cmd, args) => {
    if (cmd !== 'artifacts') {
      return { status: 1, stdout: '', stderr: 'unexpected' };
    }
    const target = args.find((a) => a.includes('docker.pkg.dev'));
    const fromManifest = manifest.images.find(
      (img) =>
        target === `${img.image}:${img.tag}`
        || target === `${img.image}@${img.digest}`,
    );
    if (args.includes('tags') && args.includes('describe')) {
      return { status: 0, stdout: JSON.stringify({ version: fromManifest?.digest }), stderr: '' };
    }
    if (args.includes('images') && args.includes('describe')) {
      return {
        status: 0,
        stdout: JSON.stringify({
          docker_version: {
            metadata: {
              labels: { 'org.opencontainers.image.revision': VALID_SHA },
            },
          },
        }),
        stderr: '',
      };
    }
    return { status: 1, stdout: '', stderr: 'unexpected' };
  };
  const result = verifyManifestImagesInRegistry(manifest, { runGcloudFn });
  assert.equal(result.ok, true);
});

test('gcp: rechaza digest distinto al registry', () => {
  const manifest = loadValid();
  const runGcloudFn = () => ({
    status: 0,
    stdout: JSON.stringify({ version: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' }),
    stderr: '',
  });
  const result = verifyManifestImagesInRegistry(manifest, { runGcloudFn });
  assert.equal(result.ok, false);
});

test('assertReleaseBuildRun detecta workflow_dispatch falso', () => {
  const errors = assertReleaseBuildRun(
    {
      status: 'completed',
      conclusion: 'success',
      event: 'push',
      path: RELEASE_BUILD_WORKFLOW_PATH,
      html_url: 'https://github.com/Kondor-Corporate/MAPS-Landingpage/actions/runs/1',
      id: 1,
    },
    VALID_SHA,
  );
  assert.ok(errors.some((e) => e.includes('workflow_dispatch')));
});
