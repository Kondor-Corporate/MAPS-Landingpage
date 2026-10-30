/**
 * Cliente mínimo de GitHub Actions API para autenticidad de release (R6-C2).
 * Requiere GH_TOKEN o GITHUB_TOKEN con scope actions:read (y contents:read para git vía API opcional).
 */

import {
  CI_WORKFLOW,
  GITHUB_REPOSITORY,
} from './manifest-contract.mjs';
import {
  RELEASE_BUILD_WORKFLOW_PATH,
  RELEASE_BUILD_REPOSITORY,
  releaseManifestArtifactName,
} from './release-workflow-contract.mjs';

const DEFAULT_API = 'https://api.github.com';

/**
 * @param {{ fetchFn?: typeof fetch, token?: string, owner?: string, repo?: string, apiBase?: string }} [options]
 */
export function createGithubReleaseClient(options = {}) {
  const fetchFn = options.fetchFn ?? fetch;
  const token = options.token ?? process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? '';
  const [defaultOwner, defaultRepo] = GITHUB_REPOSITORY.split('/');
  const owner = options.owner ?? defaultOwner;
  const repo = options.repo ?? defaultRepo;
  const apiBase = options.apiBase ?? DEFAULT_API;

  async function githubGet(path) {
    if (!token) {
      throw new Error('Falta GH_TOKEN o GITHUB_TOKEN para consultar GitHub.');
    }
    const url = path.startsWith('http') ? path : `${apiBase}${path}`;
    const response = await fetchFn(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API ${response.status} en ${path}: ${body.slice(0, 200)}`);
    }
    return response.json();
  }

  return {
    owner,
    repo,

    /** @param {string} runId */
    async getWorkflowRun(runId) {
      return githubGet(`/repos/${owner}/${repo}/actions/runs/${runId}`);
    },

    /** @param {string} runId */
    async listRunArtifacts(runId) {
      const artifacts = [];
      let page = 1;
      for (;;) {
        const data = await githubGet(
          `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts?per_page=100&page=${page}`,
        );
        if (Array.isArray(data.artifacts)) {
          artifacts.push(...data.artifacts);
        }
        if (!data.total_count || artifacts.length >= data.total_count) {
          break;
        }
        page += 1;
        if (page > 10) {
          break;
        }
      }
      return artifacts;
    },

    /** @param {string} headSha */
    async findSuccessfulCiRun(headSha) {
      const data = await githubGet(
        `/repos/${owner}/${repo}/actions/runs?head_sha=${headSha}&status=completed&per_page=30`,
      );
      const runs = Array.isArray(data.workflow_runs) ? data.workflow_runs : [];
      return runs.find(
        (run) =>
          run.conclusion === 'success'
          && typeof run.path === 'string'
          && (run.path === CI_WORKFLOW || run.path.endsWith('/ci.yml')),
      );
    },

    /** @param {string} commitSha */
    async commitIsAncestorOfRef(commitSha, ref = 'heads/development') {
      const branch = ref.replace(/^refs\//, '').replace(/^heads\//, '');
      const comparison = await githubGet(
        `/repos/${owner}/${repo}/compare/${commitSha}...${branch}`,
      );
      return comparison.status === 'ahead' || comparison.status === 'identical';
    },
  };
}

/**
 * @param {Record<string, unknown>} run
 * @param {string} gitSha from validated manifest
 */
export function assertReleaseBuildRun(run, gitSha) {
  const errors = [];
  if (run.status !== 'completed') {
    errors.push('La ejecución de release build no está completed.');
  }
  if (run.conclusion !== 'success') {
    errors.push('La ejecución de release build no terminó en success.');
  }
  if (run.event !== 'workflow_dispatch') {
    errors.push('La ejecución de release build no es workflow_dispatch.');
  }
  if (run.path !== RELEASE_BUILD_WORKFLOW_PATH) {
    errors.push(
      `La ejecución no corresponde a ${RELEASE_BUILD_WORKFLOW_PATH} (path=${String(run.path)}).`,
    );
  }
  if (typeof run.html_url === 'string' && !run.html_url.includes(`/${RELEASE_BUILD_REPOSITORY}/`)) {
    errors.push('La ejecución no pertenece al repositorio esperado.');
  }
  if (typeof run.id === 'number' || typeof run.id === 'string') {
    /* ok */
  } else {
    errors.push('La respuesta de GitHub no incluye id de ejecución.');
  }
  if (gitSha && typeof run.name === 'string') {
    /* name is workflow title, not sha — no check */
  }
  return errors;
}

/**
 * @param {Array<Record<string, unknown>>} artifacts
 * @param {string} gitSha
 * @param {string} runId
 */
export function assertReleaseManifestArtifact(artifacts, gitSha, runId) {
  const errors = [];
  const expectedName = releaseManifestArtifactName(gitSha);
  const match = artifacts.find(
    (a) =>
      a.name === expectedName
      && String(a.workflow_run_id ?? '') === String(runId),
  );
  if (!match) {
    const onRun = artifacts.filter((a) => a.name === expectedName);
    if (onRun.length === 0) {
      errors.push(
        `No existe el artifact "${expectedName}" en la ejecución ${runId}.`,
      );
    } else {
      errors.push(
        `El artifact "${expectedName}" no está ligado a la ejecución ${runId}.`,
      );
    }
    return errors;
  }
  if (match.expired) {
    errors.push(`El artifact "${expectedName}" expiró en GitHub.`);
  }
  return errors;
}

/**
 * @param {Record<string, unknown>} ciRun
 * @param {string} gitSha
 */
export function assertCiRunForSha(ciRun, gitSha) {
  const errors = [];
  if (!ciRun) {
    errors.push(`No hay CI exitoso (${CI_WORKFLOW}) para el SHA ${gitSha}.`);
    return errors;
  }
  if (ciRun.head_sha !== gitSha) {
    errors.push('La corrida de CI no corresponde al SHA del manifiesto.');
  }
  if (ciRun.conclusion !== 'success') {
    errors.push('La corrida de CI no terminó en success.');
  }
  return errors;
}
