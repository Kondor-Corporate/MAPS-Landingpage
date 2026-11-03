/**
 * Extrae release-manifest.json del ZIP de GitHub Actions (sin dependencias).
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * @param {Buffer} zipBuffer
 * @returns {Record<string, unknown>}
 */
export function parseManifestFromArtifactZip(zipBuffer) {
  const dir = mkdtempSync(join(tmpdir(), 'maps-manifest-'));
  const zipPath = join(dir, 'artifact.zip');
  try {
    writeFileSync(zipPath, zipBuffer);
    const unzip = spawnSync('unzip', ['-l', zipPath], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    if (unzip.status !== 0) {
      throw new Error('No se pudo listar el ZIP del artifact.');
    }
    const jsonLine = unzip.stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.endsWith('.json') && !l.includes('/'));
    const jsonName = jsonLine?.split(/\s+/).pop();
    if (!jsonName || !jsonName.endsWith('.json')) {
      throw new Error('El ZIP no contiene un manifiesto JSON en la raíz.');
    }
    const extract = spawnSync('unzip', ['-p', zipPath, jsonName], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    if (extract.status !== 0) {
      throw new Error('No se pudo extraer el manifiesto del ZIP.');
    }
    return JSON.parse(extract.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * @param {Buffer} zipBuffer
 * @param {string} destPath
 */
export function writeManifestFromArtifactZip(zipBuffer, destPath) {
  const manifest = parseManifestFromArtifactZip(zipBuffer);
  writeFileSync(destPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

/**
 * @param {import('./github-release-api.mjs').ReturnType<import('./github-release-api.mjs').createGithubReleaseClient>} client
 * @param {string} runId
 * @param {string} gitSha
 */
export async function fetchReleaseManifestFromGithub(client, runId, gitSha) {
  const zip = await client.downloadReleaseManifestZip(runId, gitSha);
  return parseManifestFromArtifactZip(zip);
}

const RUN_ID_RE = /^[0-9]{1,20}$/;
const GIT_SHA_RE = /^[0-9a-f]{40}$/;

async function runCli(argv) {
  if (argv.length !== 3) {
    process.stderr.write(
      'Uso: node scripts/release/download-release-manifest.mjs <release-build-run-id> <git-sha> <dest.json>\n',
    );
    process.exit(2);
  }
  const [runId, gitSha, dest] = argv;
  if (!RUN_ID_RE.test(runId) || !GIT_SHA_RE.test(gitSha) || dest.includes('..') || dest.includes('gs:')) {
    process.stderr.write('error: run id, SHA o destino inválidos.\n');
    process.exit(2);
  }
  const { createGithubReleaseClient } = await import('./github-release-api.mjs');
  const manifest = await fetchReleaseManifestFromGithub(createGithubReleaseClient(), runId, gitSha);
  writeFileSync(dest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(`Manifiesto del release-build ${runId} escrito en ${dest}\n`);
}

const isDownloadMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDownloadMain) {
  runCli(process.argv.slice(2)).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error: ${message}\n`);
    process.exit(1);
  });
}
