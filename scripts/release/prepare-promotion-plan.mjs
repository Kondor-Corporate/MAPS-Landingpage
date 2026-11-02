#!/usr/bin/env node
/**
 * Ayuda local del operador para la revisión del plan (R6-C3). No toca GCP ni Terraform.
 *
 *   targets --mode=<full|jobs-only|services-only> [--shell=powershell|bash]
 *       Imprime los `-target=` que acotan el plan a los recursos Cloud Run del modo.
 *       Un plan completo incluiría cambios pendientes ajenos a R6 (p. ej. los uptime
 *       checks sin crear) y el validador lo rechazaría.
 *
 *   bind --plan=plan.tfplan --plan-json=plan.json --report=promotion-report.json
 *        --mode=<modo> --verify-run-id=<id> [--expect-terraform-version=X.Y.Z]
 *        [--out-dir=.] [--shell=powershell|bash]
 *       Valida plan.json contra el informe aprobado, comprueba que el checkout local sea el
 *       commit de main del verify (`automation_sha`) y esté limpio, calcula el SHA-256 del
 *       plan, escribe <modo>.binding.json e imprime los comandos de subida (create-only).
 *       No sube nada. Sin --expect-terraform-version usa infra/.../production/.terraform-version.
 *
 * --shell elige la sintaxis de los comandos impresos. Por defecto PowerShell en Windows y
 * Bash en el resto. Solo cambia el texto impreso: ninguna validación depende de ello.
 */

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  ALLOWED_CHANGES_BY_MODE,
  PLAN_MODES,
  gcsPlanBindingPath,
  gcsPlanObjectPath,
} from './promotion-plan-contract.mjs';
import { readJsonFile } from './json-file.mjs';
import { validatePromotionPlanJson } from './validate-terraform-plan.mjs';

const COMMIT_SHA_RE = /^[0-9a-f]{40}$/;
const TERRAFORM_VERSION_FILE = 'infra/terraform/environments/production/.terraform-version';
/** Rutas cuyo contenido define qué se planifica y cómo se valida: deben ser las del commit. */
const AUTOMATION_PATHS = ['infra/terraform', 'scripts/release', 'config/release'];

/** @returns {'powershell' | 'bash'} */
export function detectShell() {
  return process.platform === 'win32' ? 'powershell' : 'bash';
}

/** @param {'full' | 'jobs-only' | 'services-only'} mode */
export function planTargets(mode) {
  return (ALLOWED_CHANGES_BY_MODE[mode] ?? []).map((address) => `-target=${address}`);
}

/**
 * Los `-target` listos para pegar en `terraform plan`. En PowerShell cada uno va entre comillas
 * simples para que el intérprete no reparta el argumento.
 * @param {'full' | 'jobs-only' | 'services-only'} mode
 * @param {'powershell' | 'bash'} shell
 */
export function formatTargets(mode, shell) {
  const targets = planTargets(mode);
  return (shell === 'powershell' ? targets.map((t) => `'${t}'`) : targets).join(' ');
}

/**
 * El plan y el apply deben correr los mismos scripts y el mismo Terraform. El apply usa el
 * commit de main que lo dispara; el operador tiene que haber planificado ese mismo commit.
 *
 * @param {object} input
 * @param {string} input.automationSha commit de main del verify (promotion-report.json)
 * @param {{ head: string, dirtyPaths: string[] } | undefined} input.localCheckout HEAD del checkout y rutas con cambios
 */
export function checkLocalCheckout(input) {
  const errors = [];
  if (!COMMIT_SHA_RE.test(String(input.automationSha ?? ''))) {
    errors.push('promotion-report.json no declara automation_sha: el bundle no es de un verify válido.');
    return errors;
  }
  if (!input.localCheckout) {
    errors.push('No se pudo leer el checkout local (git); no se puede comprobar que sea el commit del verify.');
    return errors;
  }
  if (input.localCheckout.head !== input.automationSha) {
    errors.push(
      `El checkout local está en ${input.localCheckout.head} y el verify corrió en ${input.automationSha}. `
      + 'Hacer checkout de ese commit de main antes de planificar.',
    );
  }
  if (input.localCheckout.dirtyPaths.length > 0) {
    errors.push(
      `Hay cambios locales en ${input.localCheckout.dirtyPaths.join(', ')}: el plan no sería reproducible por el apply.`,
    );
  }
  return errors;
}

/**
 * @param {string} cwd
 * @returns {{ root: string, head: string, dirtyPaths: string[] } | null}
 */
function readLocalCheckout(cwd) {
  const git = (args) => spawnSync('git', args, { cwd, encoding: 'utf8' });
  const top = git(['rev-parse', '--show-toplevel']);
  const head = git(['rev-parse', 'HEAD']);
  if (top.status !== 0 || head.status !== 0) {
    return null;
  }
  const root = top.stdout.trim();
  const status = spawnSync(
    'git',
    ['-C', root, 'status', '--porcelain', '--untracked-files=no', '--', ...AUTOMATION_PATHS],
    { encoding: 'utf8' },
  );
  if (status.status !== 0) {
    return null;
  }
  const dirtyPaths = status.stdout
    .split(/\r?\n/)
    .map((l) => l.slice(3).trim())
    .filter(Boolean);
  return { root, head: head.stdout.trim(), dirtyPaths };
}

/**
 * @param {object} input
 * @param {Buffer} input.planBytes
 * @param {unknown} input.planJson
 * @param {Record<string, unknown>} input.report
 * @param {'full' | 'jobs-only' | 'services-only'} input.mode
 * @param {string} input.verifyRunId
 * @param {string} [input.expectTerraformVersion]
 * @param {{ head: string, dirtyPaths: string[] }} [input.localCheckout]
 */
export function buildPlanBinding(input) {
  if (!PLAN_MODES.includes(input.mode)) {
    return { ok: false, errors: [`plan_mode inválido: ${input.mode}.`] };
  }
  if (!/^[0-9]+$/.test(String(input.verifyRunId))) {
    return { ok: false, errors: ['verify_run_id debe ser numérico.'] };
  }
  const checkoutErrors = checkLocalCheckout({
    automationSha: /** @type {string} */ (input.report.automation_sha),
    localCheckout: input.localCheckout,
  });
  if (checkoutErrors.length > 0) {
    return { ok: false, errors: checkoutErrors };
  }
  const validation = validatePromotionPlanJson(input.planJson, input.mode, {
    expectedImages: /** @type {Record<string, string>} */ (input.report.images),
    expectedTerraformVersion: input.expectTerraformVersion,
  });
  if (!validation.ok) {
    return { ok: false, errors: validation.errors ?? ['Plan inválido.'] };
  }
  const planSha256 = createHash('sha256').update(input.planBytes).digest('hex');
  const binding = {
    schema_version: 1,
    verify_run_id: String(input.verifyRunId),
    automation_sha: input.report.automation_sha,
    git_sha: input.report.git_sha,
    release_build_run_id: input.report.release_build_run_id ?? null,
    plan_mode: input.mode,
    plan_sha256: planSha256,
  };
  return { ok: true, binding, planSha256, touched: validation.touched };
}

/**
 * @param {string} verifyRunId
 * @param {'full' | 'jobs-only' | 'services-only'} mode
 * @param {string} planPath
 * @param {string} bindingPath
 * @param {'powershell' | 'bash'} [shell]
 */
export function uploadCommands(verifyRunId, mode, planPath, bindingPath, shell = 'bash') {
  const flag = '-h "x-goog-if-generation-match:0"';
  const dest = (objectPath) => (shell === 'powershell'
    ? `"gs://\${env:TF_STATE_BUCKET}/${objectPath}"`
    : `gs://$TF_STATE_BUCKET/${objectPath}`);
  const src = (path) => (shell === 'powershell' ? `"${path}"` : path);
  return [
    `gsutil ${flag} cp ${src(planPath)} ${dest(gcsPlanObjectPath(verifyRunId, mode))}`,
    `gsutil ${flag} cp ${src(bindingPath)} ${dest(gcsPlanBindingPath(verifyRunId, mode))}`,
  ];
}

function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (const a of argv.slice(1)) {
    if (!a.startsWith('--')) {
      continue;
    }
    const idx = a.indexOf('=');
    args[idx === -1 ? a.slice(2) : a.slice(2, idx)] = idx === -1 ? 'true' : a.slice(idx + 1);
  }
  return args;
}

function runCli(argv) {
  const command = argv[0];
  const args = parseArgs(argv);
  const mode = /** @type {'full' | 'jobs-only' | 'services-only'} */ (args.mode);
  const shell = args.shell ?? detectShell();
  if (shell !== 'powershell' && shell !== 'bash') {
    process.stderr.write('error: --shell debe ser powershell o bash.\n');
    process.exit(2);
  }

  if (command === 'targets' && PLAN_MODES.includes(mode)) {
    process.stdout.write(`${formatTargets(mode, shell)}\n`);
    return;
  }

  if (
    command === 'bind'
    && PLAN_MODES.includes(mode)
    && args.plan && args['plan-json'] && args.report && args['verify-run-id']
  ) {
    const localCheckout = readLocalCheckout(process.cwd());
    const expectedVersion = args['expect-terraform-version']
      ?? (localCheckout
        ? readFileSync(join(localCheckout.root, TERRAFORM_VERSION_FILE), 'utf8').trim()
        : undefined);
    const result = buildPlanBinding({
      planBytes: readFileSync(args.plan),
      planJson: readJsonFile(args['plan-json']),
      report: readJsonFile(args.report),
      mode,
      verifyRunId: args['verify-run-id'],
      expectTerraformVersion: expectedVersion,
      localCheckout: localCheckout ?? undefined,
    });
    if (!result.ok) {
      for (const e of result.errors ?? []) {
        process.stderr.write(`error: ${e}\n`);
      }
      process.exit(1);
    }
    const bindingPath = join(args['out-dir'] ?? '.', `${mode}.binding.json`);
    writeFileSync(bindingPath, `${JSON.stringify(result.binding, null, 2)}\n`);
    process.stdout.write(`Plan válido (${mode}). Recursos: ${result.touched?.join(', ')}\n`);
    process.stdout.write(`plan_sha256: ${result.planSha256}\n`);
    process.stdout.write(`Binding escrito en ${bindingPath}\n`);
    process.stdout.write(`Subir (create-only; no ejecutado por este script; sintaxis ${shell}):\n`);
    for (const line of uploadCommands(args['verify-run-id'], mode, args.plan, bindingPath, shell)) {
      process.stdout.write(`  ${line}\n`);
    }
    return;
  }

  process.stderr.write(
    'Uso:\n'
    + '  node scripts/release/prepare-promotion-plan.mjs targets --mode=full|jobs-only|services-only [--shell=powershell|bash]\n'
    + '  node scripts/release/prepare-promotion-plan.mjs bind --plan=plan.tfplan --plan-json=plan.json '
    + '--report=promotion-report.json --mode=<modo> --verify-run-id=<id> '
    + '[--expect-terraform-version=X.Y.Z] [--out-dir=.] [--shell=powershell|bash]\n',
  );
  process.exit(2);
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
