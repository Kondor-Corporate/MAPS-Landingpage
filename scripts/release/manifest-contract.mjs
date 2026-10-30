/** Contrato alineado con `.github/workflows/release-build.yml` (job manifest). */

export const SCHEMA_VERSION = 1;

export const GIT_SHA_RE = /^[0-9a-f]{40}$/;
export const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
export const CLOUD_BUILD_ID_RE = /^[0-9a-f-]{36}$/;

export const SOURCE_BRANCH_REQUIRED = 'development';
export const DEFAULT_BRANCH = 'main';
export const CI_WORKFLOW = '.github/workflows/ci.yml';

export const REGISTRY = {
  project: 'maps-prod-landing-page',
  location: 'southamerica-east1',
  repository: 'maps-prod',
};

export const PUBLISH_TO = 'maps-prod';
export const SHARING_BETWEEN_PROJECTS = 'not_configured';

export const IMAGE_IDS = ['backend', 'backend-jobs', 'frontend', 'frontend-staging'];

export const GITHUB_REPOSITORY = 'Kondor-Corporate/MAPS-Landingpage';

export function expectedImageUri(imageId) {
  return `${REGISTRY.location}-docker.pkg.dev/${REGISTRY.project}/${REGISTRY.repository}/${imageId}`;
}

export function isGithubActionsRunUrl(url, repository = GITHUB_REPOSITORY) {
  if (typeof url !== 'string' || url.length === 0) {
    return false;
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
    return false;
  }
  const prefix = `/${repository}/actions/runs/`;
  if (!parsed.pathname.startsWith(prefix)) {
    return false;
  }
  const runId = parsed.pathname.slice(prefix.length);
  return /^[0-9]+$/.test(runId) && runId.length > 0;
}
