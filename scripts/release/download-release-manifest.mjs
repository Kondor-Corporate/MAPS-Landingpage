/**
 * Extrae release-manifest.json del ZIP de GitHub Actions (sin dependencias).
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
