/**
 * Autenticidad de un release: combina validación estructural (C1) con
 * comprobaciones externas opcionales (GitHub, git, Artifact Registry).
 *
 * Un manifiesto JSON local no demuestra procedencia hasta las fases remotas.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { verifyManifestImagesInRegistry } from './gcp-artifact-verify.mjs';
import { verifyShaOnDevelopmentBranch } from './git-development-verify.mjs';
import {
  assertCiRunForSha,
  assertReleaseBuildRun,
  assertReleaseManifestArtifact,
  createGithubReleaseClient,
} from './github-release-api.mjs';
import { parseGithubActionsRunUrl } from './release-workflow-contract.mjs';
import { validateReleaseManifest } from './validate-manifest.mjs';

/**
 * @typedef {'local' | 'github' | 'git' | 'gcp'} VerifyLayer
 */

/**
 * @param {Record<string, unknown>} manifest
 * @param {string} expectedGitSha
 */
export function verifyLocalAuthenticity(manifest, expectedGitSha) {
  const errors = [];
  const structural = validateReleaseManifest(manifest, expectedGitSha);
  if (!structural.ok) {
    errors.push(...structural.errors);
    return { ok: false, errors };
  }

  const buildUrl = manifest.build_run_url;
  if (typeof buildUrl !== 'string') {
    errors.push('build_run_url ausente tras validación estructural.');
    return { ok: false, errors };
  }

  const parsed = parseGithubActionsRunUrl(buildUrl);
  if (!parsed) {
    errors.push('build_run_url no referencia una ejecución de Actions del repositorio.');
    return { ok: false, errors };
  }

  if (manifest.git_sha !== expectedGitSha) {
    errors.push('Inconsistencia interna: git_sha del manifiesto y argumento esperado.');
  }

  return { ok: true, runId: parsed.runId };
}

/**
 * @param {Record<string, unknown>} manifest
 * @param {string} expectedGitSha
 * @param {string} runId
 * @param {ReturnType<typeof createGithubReleaseClient>} github
 */
export async function verifyGithubAuthenticity(manifest, expectedGitSha, runId, github) {
  const errors = [];
  const run = await github.getWorkflowRun(runId);
  errors.push(...assertReleaseBuildRun(run, expectedGitSha));

  const urlParsed = parseGithubActionsRunUrl(String(manifest.build_run_url ?? ''));
  if (urlParsed && String(run.id) !== urlParsed.runId) {
    errors.push('build_run_url no coincide con el id devuelto por la API de GitHub.');
  }

  const artifacts = await github.listRunArtifacts(runId);
  errors.push(...assertReleaseManifestArtifact(artifacts, expectedGitSha, runId));

  const ciRun = await github.findSuccessfulCiRun(expectedGitSha);
  errors.push(...assertCiRunForSha(ciRun, expectedGitSha));

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

/**
 * @param {ReturnType<typeof createGithubReleaseClient>} github
 * @param {string} gitSha
 */
export async function verifyShaOnDevelopmentViaGithub(github, gitSha) {
  const errors = [];
  try {
    const comparison = await github.commitIsAncestorOfRef(gitSha, 'heads/development');
    if (!comparison) {
      errors.push(`El SHA ${gitSha} no está en la rama development (API compare).`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`GitHub compare: ${message}`);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

/**
 * @param {object} options
 * @param {string} options.manifestPath
 * @param {string} options.expectedGitSha
 * @param {boolean} [options.github]
 * @param {boolean} [options.git]
 * @param {boolean} [options.gcp]
 * @param {string} [options.repoRoot]
 * @param {ReturnType<typeof createGithubReleaseClient>} [options.githubClient]
 * @param {{ gcloudPath?: string, project?: string }} [options.gcpOptions]
 */
export async function verifyReleaseAuthenticity(options) {
  const errors = [];
  const skipped = /** @type {VerifyLayer[]} */ ([]);

  let raw;
  try {
    raw = readFileSync(options.manifestPath, 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: [`No se pudo leer el manifiesto: ${message}`], skipped };
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ['JSON mal formado.'], skipped };
  }

  const local = verifyLocalAuthenticity(
    /** @type {Record<string, unknown>} */ (manifest),
    options.expectedGitSha,
  );
  if (!local.ok) {
    return { ok: false, errors: local.errors, skipped };
  }

  const runId = local.runId;

  if (options.github) {
    try {
      const client = options.githubClient ?? createGithubReleaseClient();
      const gh = await verifyGithubAuthenticity(
        /** @type {Record<string, unknown>} */ (manifest),
        options.expectedGitSha,
        runId,
        client,
      );
      if (!gh.ok) {
        errors.push(...gh.errors);
      }
      if (!options.git) {
        const dev = await verifyShaOnDevelopmentViaGithub(client, options.expectedGitSha);
        if (!dev.ok) {
          errors.push(...dev.errors);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`GitHub: ${message}`);
    }
  } else {
    skipped.push('github');
  }

  if (options.git) {
    const gitRoot = options.repoRoot ?? process.cwd();
    const gitResult = verifyShaOnDevelopmentBranch(options.expectedGitSha, { cwd: gitRoot });
    if (!gitResult.ok) {
      errors.push(...gitResult.errors);
    }
  } else {
    skipped.push('git');
  }

  if (options.gcp) {
    const gcpResult = verifyManifestImagesInRegistry(
      /** @type {Record<string, unknown>} */ (manifest),
      options.gcpOptions ?? {},
    );
    if (!gcpResult.ok) {
      errors.push(...gcpResult.errors);
    }
  } else {
    skipped.push('gcp');
  }

  if (errors.length > 0) {
    return { ok: false, errors, skipped };
  }
  return { ok: true, skipped };
}

function printUsage() {
  process.stderr.write(
    'Uso: node scripts/release/verify-release-authenticity.mjs '
      + '<manifiesto.json> <git-sha-40-hex> [--github] [--git] [--gcp] [--all-remote]\n'
      + '\n'
      + '  Sin flags: solo comprobaciones locales (C1 + coherencia de URLs).\n'
      + '  --github  Requiere GH_TOKEN o GITHUB_TOKEN (actions:read).\n'
      + '  --git     git fetch + ancestro en origin/development.\n'
      + '  --gcp     gcloud artifacts (digests y etiqueta OCI revision).\n'
      + '  --all-remote  Equivalente a --github --git --gcp.\n',
  );
}

function parseFlags(argv) {
  const flags = { github: false, git: false, gcp: false };
  const positional = [];
  for (const arg of argv) {
    if (arg === '--github') {
      flags.github = true;
    } else if (arg === '--git') {
      flags.git = true;
    } else if (arg === '--gcp') {
      flags.gcp = true;
    } else if (arg === '--all-remote') {
      flags.github = true;
      flags.git = true;
      flags.gcp = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

async function runCli(argv) {
  const { flags, positional } = parseFlags(argv);
  if (positional.length !== 2) {
    printUsage();
    process.exit(2);
  }
  const [manifestPath, expectedGitSha] = positional;
  const result = await verifyReleaseAuthenticity({
    manifestPath,
    expectedGitSha,
    github: flags.github,
    git: flags.git,
    gcp: flags.gcp,
  });

  if (result.ok) {
    const skipped = result.skipped?.length ? ` (omitido: ${result.skipped.join(', ')})` : '';
    process.stdout.write(`Autenticidad verificada en las capas solicitadas${skipped}.\n`);
    process.exit(0);
  }

  for (const err of result.errors) {
    process.stderr.write(`error: ${err}\n`);
  }
  process.exit(1);
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
