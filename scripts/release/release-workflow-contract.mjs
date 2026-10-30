/** Contrato del workflow Release build (R6-B), no del futuro promote. */

import { GITHUB_REPOSITORY } from './manifest-contract.mjs';

export const RELEASE_BUILD_WORKFLOW_PATH = '.github/workflows/release-build.yml';

export const RELEASE_BUILD_REPOSITORY = GITHUB_REPOSITORY;

/** @param {string} gitSha 40 hex */
export function releaseManifestArtifactName(gitSha) {
  return `release-manifest-${gitSha}`;
}

/** @param {string} gitSha 40 hex */
export function releaseImageArtifactPrefix(gitSha) {
  return `release-image-`;
}

/**
 * @param {string} url
 * @param {string} [repository]
 * @returns {{ runId: string } | null}
 */
export function parseGithubActionsRunUrl(url, repository = RELEASE_BUILD_REPOSITORY) {
  if (typeof url !== 'string' || url.length === 0) {
    return null;
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
    return null;
  }
  const prefix = `/${repository}/actions/runs/`;
  if (!parsed.pathname.startsWith(prefix)) {
    return null;
  }
  const runId = parsed.pathname.slice(prefix.length).replace(/\/$/, '');
  if (!/^[0-9]+$/.test(runId)) {
    return null;
  }
  return { runId };
}
