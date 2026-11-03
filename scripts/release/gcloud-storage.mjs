/**
 * Acceso a GCS con la misma autenticación que gcloud.
 * google-github-actions/auth@v2 deja credenciales de Workload Identity que
 * `gcloud storage` usa y `gsutil` no.
 * Las escrituras de la cuenta de deploy siguen siendo create-only.
 */

import { spawnSync } from 'node:child_process';

/**
 * @param {string[]} args
 * @param {{ runCommandFn?: Function }} [options]
 */
function runGcloudStorage(args, options = {}) {
  const run = options.runCommandFn ?? ((command, commandArgs) => {
    const result = spawnSync(command, commandArgs, {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    return {
      status: result.status ?? 1,
      stdout: (result.stdout ?? '').trim(),
      stderr: (result.stderr ?? '').trim(),
    };
  });
  return run('gcloud', args);
}

/**
 * @param {string} localPath
 * @param {string} gsUrl
 * @param {{ runCommandFn?: Function }} [options]
 */
export function gcloudStorageCreateOnlyCopy(localPath, gsUrl, options = {}) {
  const result = runGcloudStorage(
    ['storage', 'cp', '--if-generation-match=0', localPath, gsUrl],
    options,
  );
  if (result.status !== 0) {
    return { ok: false, errors: [(result.stderr || result.stdout || 'gcloud storage cp falló').trim()] };
  }
  return { ok: true, gcsPath: gsUrl };
}

/**
 * @param {string} gsUrl
 * @param {string} localPath
 * @param {{ runCommandFn?: Function }} [options]
 */
export function gcloudStorageDownload(gsUrl, localPath, options = {}) {
  const result = runGcloudStorage(['storage', 'cp', gsUrl, localPath], options);
  if (result.status !== 0) {
    return { ok: false, errors: [(result.stderr || result.stdout || 'gcloud storage cp falló').trim()] };
  }
  return { ok: true };
}

/**
 * @param {string} gsUrl
 * @param {{ runCommandFn?: Function }} [options]
 */
export function gcloudStorageCat(gsUrl, options = {}) {
  const result = runGcloudStorage(['storage', 'cat', gsUrl], options);
  if (result.status !== 0) {
    return { ok: false, errors: [`No se pudo leer ${gsUrl}`] };
  }
  return { ok: true, stdout: result.stdout };
}

/**
 * @param {string} pattern
 * @param {{ runCommandFn?: Function }} [options]
 */
export function gcloudStorageLs(pattern, options = {}) {
  const result = runGcloudStorage(['storage', 'ls', pattern], options);
  if (result.status !== 0) {
    return { ok: false, errors: [(result.stderr || result.stdout || 'gcloud storage ls falló').trim()] };
  }
  const objectUrls = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.endsWith('.json'));
  return { ok: true, objectUrls };
}
