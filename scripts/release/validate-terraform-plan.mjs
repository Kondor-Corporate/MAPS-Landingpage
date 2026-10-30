/**
 * Valida un plan de Terraform (JSON) para promoción de imágenes.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  ALLOWED_CHANGES_BY_MODE,
  FORBIDDEN_PLAN_ACTIONS,
} from './promotion-plan-contract.mjs';
import {
  classifyAttributePath,
  collectDiffPaths,
  isAllowedPromotionAttributePath,
} from './terraform-plan-diff.mjs';

const ALLOWED_PLAN_ACTIONS = ['update'];

/**
 * @param {Record<string, unknown>} changeBlock
 * @param {string} address
 * @param {string[]} errors
 */
function validateResourceAttributeChanges(changeBlock, address, errors) {
  const before = changeBlock.before;
  const after = changeBlock.after;
  if (before === undefined && after === undefined) {
    errors.push(`${address}: falta before/after en el plan JSON.`);
    return;
  }
  const diffPaths = collectDiffPaths(before, after);
  for (const path of diffPaths) {
    if (isAllowedPromotionAttributePath(path)) {
      continue;
    }
    const kind = classifyAttributePath(path);
    if (kind === 'forbidden') {
      errors.push(`${address}: cambio prohibido en ${path}.`);
    } else {
      errors.push(`${address}: cambio inesperado en ${path} (solo imagen permitida).`);
    }
  }
}

/**
 * @param {unknown} planJson
 * @param {'full' | 'jobs-only' | 'services-only'} mode
 */
export function validatePromotionPlanJson(planJson, mode = 'full') {
  const errors = [];
  if (planJson === null || typeof planJson !== 'object') {
    return { ok: false, errors: ['Plan JSON inválido.'] };
  }

  const plan = /** @type {Record<string, unknown>} */ (planJson);
  const changes = plan.resource_changes;
  if (!Array.isArray(changes)) {
    return { ok: false, errors: ['Plan sin resource_changes.'] };
  }

  const allowed = new Set(ALLOWED_CHANGES_BY_MODE[mode] ?? []);
  /** @type {string[]} */
  const touched = [];

  for (const change of changes) {
    if (change === null || typeof change !== 'object') {
      continue;
    }
    const c = /** @type {Record<string, unknown>} */ (change);
    const address = c.address;
    if (typeof address !== 'string') {
      continue;
    }

    const inner = c.change;
    const actionList =
      inner && typeof inner === 'object' && !Array.isArray(inner) && Array.isArray(inner.actions)
        ? inner.actions
        : Array.isArray(c.actions)
          ? c.actions
          : [];
    const meaningful = actionList.filter((a) => a !== 'no-op' && a !== 'read');
    if (meaningful.length === 0) {
      continue;
    }

    for (const action of meaningful) {
      const act = String(action);
      if (FORBIDDEN_PLAN_ACTIONS.includes(act)) {
        errors.push(`Acción prohibida ${act} en ${address}.`);
      }
      if (!ALLOWED_PLAN_ACTIONS.includes(act)) {
        errors.push(`Acción no permitida ${act} en ${address} (solo update).`);
      }
    }

    if (!allowed.has(address)) {
      errors.push(`Cambio no permitido en ${address} (modo ${mode}).`);
      continue;
    }

    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      validateResourceAttributeChanges(
        /** @type {Record<string, unknown>} */ (inner),
        address,
        errors,
      );
    }

    touched.push(address);
  }

  if (touched.length === 0) {
    errors.push('El plan no modifica ningún recurso Cloud Run esperado.');
  }

  if (errors.length > 0) {
    return { ok: false, errors, touched };
  }
  return { ok: true, touched };
}

/**
 * @param {unknown} planJson
 */
export function planTargetsBootstrapExecution(planJson) {
  const plan = /** @type {Record<string, unknown>} */ (planJson);
  const changes = plan.resource_changes;
  if (!Array.isArray(changes)) {
    return false;
  }
  const blob = JSON.stringify(changes);
  return blob.includes('maps-prod-bootstrap') && /execute|run\s*:/.test(blob);
}

/**
 * @param {string} command
 */
export function assertCommandDoesNotRunBootstrap(command) {
  const errors = [];
  const lowered = command.toLowerCase();
  if (lowered.includes('maps-prod-bootstrap') || lowered.includes('bootstrap:admin')) {
    errors.push('Prohibido ejecutar maps-prod-bootstrap en promoción.');
  }
  if (/terraform\s+apply(?!.*\.tfplan)/.test(lowered) && lowered.includes('-auto-approve')) {
    errors.push('Apply suelto con -auto-approve no permitido; usar el plan aprobado.');
  }
  return errors;
}

function parseModeArg(argv) {
  const modeIdx = argv.indexOf('--mode');
  if (modeIdx >= 0 && argv[modeIdx + 1]) {
    return /** @type {'full'|'jobs-only'|'services-only'} */ (argv[modeIdx + 1]);
  }
  return 'full';
}

function runCli(argv) {
  const mode = parseModeArg(argv);
  const file = argv.find((a) => a.endsWith('.json') && !a.startsWith('--'));
  if (!file) {
    process.stderr.write(
      'Uso: node scripts/release/validate-terraform-plan.mjs plan.json [--mode full|jobs-only|services-only]\n',
    );
    process.exit(2);
  }
  const planJson = JSON.parse(readFileSync(file, 'utf8'));
  const result = validatePromotionPlanJson(planJson, mode);
  if (!result.ok) {
    for (const e of result.errors ?? []) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(`Plan válido (${mode}). Recursos: ${result.touched?.join(', ')}\n`);
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
