/**
 * Valida un plan de Terraform (JSON) para promoción de imágenes.
 *
 * Reglas, en orden de severidad:
 *  - solo se permite `update`, nunca create, delete ni replace;
 *  - solo en los recursos Cloud Run que el modo de plan autoriza;
 *  - solo cambia la imagen (más atributos observados de solo salida);
 *  - con `expectedImages`, la imagen del plan es exactamente la del manifiesto aprobado;
 *  - con `expectedTerraformVersion`, el plan salió de la versión de Terraform que lo aplica.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  ALLOWED_CHANGES_BY_MODE,
  FORBIDDEN_PLAN_ACTIONS,
  IMAGE_KEY_BY_ADDRESS,
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
 * Imágenes de todos los contenedores del bloque `after` (servicio o job).
 * @param {unknown} node
 * @param {string[]} [found]
 * @returns {string[]}
 */
export function collectContainerImages(node, found = []) {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectContainerImages(item, found);
    }
    return found;
  }
  if (node === null || typeof node !== 'object') {
    return found;
  }
  const obj = /** @type {Record<string, unknown>} */ (node);
  if (Array.isArray(obj.containers)) {
    for (const container of obj.containers) {
      const image = container && typeof container === 'object'
        ? /** @type {Record<string, unknown>} */ (container).image
        : undefined;
      found.push(typeof image === 'string' ? image : '');
    }
  }
  for (const value of Object.values(obj)) {
    if (value !== null && typeof value === 'object') {
      collectContainerImages(value, found);
    }
  }
  return found;
}

/**
 * La imagen planificada debe ser la aprobada. Sin esto, un plan con otro digest
 * pasaría el filtro de atributos, porque cambiar la imagen siempre está permitido.
 *
 * @param {Record<string, unknown>} afterBlock
 * @param {string} address
 * @param {Record<string, string>} expectedImages frontend_image, backend_image, jobs_image
 * @param {string[]} errors
 */
function validatePlannedImages(afterBlock, address, expectedImages, errors) {
  const key = IMAGE_KEY_BY_ADDRESS[address];
  const want = key ? expectedImages[key] : undefined;
  if (typeof want !== 'string' || want.length === 0) {
    errors.push(`${address}: el informe de promoción no declara ${key ?? 'imagen'} esperada.`);
    return;
  }
  const images = collectContainerImages(afterBlock);
  if (images.length === 0) {
    errors.push(`${address}: el plan no expone la imagen resultante (after sin containers).`);
    return;
  }
  for (const image of images) {
    if (image !== want) {
      errors.push(`${address}: la imagen del plan no coincide con la aprobada (${key}).`);
      return;
    }
  }
}

/**
 * @param {unknown} planJson
 * @param {'full' | 'jobs-only' | 'services-only'} mode
 * @param {{ expectedImages?: Record<string, string>, expectedTerraformVersion?: string }} [options]
 */
export function validatePromotionPlanJson(planJson, mode = 'full', options = {}) {
  const errors = [];
  if (planJson === null || typeof planJson !== 'object') {
    return { ok: false, errors: ['Plan JSON inválido.'] };
  }

  const plan = /** @type {Record<string, unknown>} */ (planJson);
  const changes = plan.resource_changes;
  if (!Array.isArray(changes)) {
    return { ok: false, errors: ['Plan sin resource_changes.'] };
  }

  if (plan.errored === true) {
    errors.push('El plan terminó con errores (errored=true).');
  }
  if (options.expectedTerraformVersion) {
    if (plan.terraform_version !== options.expectedTerraformVersion) {
      errors.push(
        `El plan salió de Terraform ${String(plan.terraform_version)}; el apply usa ${options.expectedTerraformVersion}.`,
      );
    }
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
      const block = /** @type {Record<string, unknown>} */ (inner);
      validateResourceAttributeChanges(block, address, errors);
      if (options.expectedImages) {
        validatePlannedImages(
          /** @type {Record<string, unknown>} */ (block.after ?? {}),
          address,
          options.expectedImages,
          errors,
        );
      }
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

/**
 * @param {string[]} argv
 * @param {string} name sin guiones
 */
function optionValue(argv, name) {
  const flag = `--${name}`;
  const idx = argv.indexOf(flag);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) {
    return argv[idx + 1];
  }
  const prefixed = argv.find((a) => a.startsWith(`${flag}=`));
  return prefixed ? prefixed.slice(flag.length + 1) : undefined;
}

function runCli(argv) {
  const mode = /** @type {'full'|'jobs-only'|'services-only'} */ (optionValue(argv, 'mode') ?? 'full');
  const file = argv.find((a) => a.endsWith('.json') && !a.startsWith('--') && a !== optionValue(argv, 'promotion-report'));
  if (!file) {
    process.stderr.write(
      'Uso: node scripts/release/validate-terraform-plan.mjs plan.json [--mode full|jobs-only|services-only] [--promotion-report promotion-report.json] [--expect-terraform-version X.Y.Z]\n',
    );
    process.exit(2);
  }
  const reportPath = optionValue(argv, 'promotion-report');
  const expectedImages = reportPath
    ? JSON.parse(readFileSync(reportPath, 'utf8')).images
    : undefined;
  if (reportPath && (expectedImages === null || typeof expectedImages !== 'object')) {
    process.stderr.write('error: promotion-report.json no contiene images.\n');
    process.exit(1);
  }
  const planJson = JSON.parse(readFileSync(file, 'utf8'));
  const result = validatePromotionPlanJson(planJson, mode, {
    expectedImages,
    expectedTerraformVersion: optionValue(argv, 'expect-terraform-version'),
  });
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
