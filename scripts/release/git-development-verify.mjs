/**
 * Comprueba que un SHA sea ancestro de origin/development usando git local.
 */

import { spawnSync } from 'node:child_process';

/**
 * @param {string} gitSha
 * @param {{ cwd?: string, remoteRef?: string, gitPath?: string }} [options]
 */
export function verifyShaOnDevelopmentBranch(gitSha, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const remoteRef = options.remoteRef ?? 'origin/development';
  const git = options.gitPath ?? 'git';
  const errors = [];

  const fetch = spawnSync(git, ['fetch', 'origin', 'development', '--quiet'], {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (fetch.status !== 0) {
    errors.push(
      `git fetch falló: ${(fetch.stderr || fetch.stdout || '').trim() || 'sin salida'}`,
    );
    return { ok: false, errors };
  }

  const ancestor = spawnSync(
    git,
    ['merge-base', '--is-ancestor', gitSha, remoteRef],
    { cwd, encoding: 'utf8', shell: process.platform === 'win32' },
  );

  if (ancestor.status !== 0) {
    errors.push(`El SHA ${gitSha} no pertenece a ${remoteRef}.`);
    return { ok: false, errors };
  }

  return { ok: true };
}
