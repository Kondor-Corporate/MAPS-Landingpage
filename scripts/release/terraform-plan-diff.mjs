/**
 * Diff de paths en el JSON de plan de Terraform (before/after).
 */

/** @param {unknown} before @param {unknown} after @param {string} [prefix] */
export function collectDiffPaths(before, after, prefix = '') {
  if (Object.is(before, after)) {
    return [];
  }
  const beforeObj = before !== null && typeof before === 'object';
  const afterObj = after !== null && typeof after === 'object';
  if (!beforeObj || !afterObj) {
    return JSON.stringify(before) === JSON.stringify(after) ? [] : [prefix || '$'];
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const paths = [];
    const len = Math.max(before.length, after.length);
    for (let i = 0; i < len; i += 1) {
      const seg = prefix ? `${prefix}.${i}` : String(i);
      paths.push(...collectDiffPaths(before[i], after[i], seg));
    }
    return paths;
  }
  if (Array.isArray(before) !== Array.isArray(after)) {
    return [prefix || '$'];
  }
  /** @type {Record<string, unknown>} */
  const b = /** @type {Record<string, unknown>} */ (before);
  /** @type {Record<string, unknown>} */
  const a = /** @type {Record<string, unknown>} */ (after);
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const paths = [];
  for (const key of keys) {
    const seg = prefix ? `${prefix}.${key}` : key;
    paths.push(...collectDiffPaths(b[key], a[key], seg));
  }
  return paths;
}

const IMAGE_PATH =
  /^template(\.\d+)?(\.template(\.\d+)?)?\.containers(\.\d+)?\.image$/;

/**
 * Atributos de solo salida de Cloud Run v2 (estado observado, no configuración).
 * Se aceptan en cualquier profundidad: `conditions.0.last_transition_time` cuelga de
 * `conditions`. Un cambio ahí no puede alterar lo que el apply configura.
 */
const COMPUTED_ROOT_PATHS = new Set([
  'generation',
  'observed_generation',
  'latest_ready_revision',
  'latest_created_revision',
  'latest_created_execution',
  'execution_count',
  'uri',
  'urls',
  'delete_time',
  'expire_time',
  'update_time',
  'create_time',
  'uid',
  'etag',
  'reconciling',
  'client',
  'client_version',
  'conditions',
  'terminal_condition',
  'traffic_statuses',
  'id',
  'name',
  'location',
  'project',
  'creator',
  'last_modifier',
  'launch_stage',
  'observed_generation',
  'terminal_condition',
]);

const FORBIDDEN_PATH_CHECKS = [
  (path) => /\.env(\.|$)/.test(path),
  (path) => path.includes('secret'),
  (path) => path.includes('service_account'),
  (path) => path.includes('vpc_access'),
  (path) => path.includes('network_interfaces'),
  (path) => path.includes('ingress'),
  (path) => path.includes('encryption'),
  (path) => path.includes('binary_authorization'),
  (path) => path.includes('scaling'),
  (path) => path.includes('timeout'),
  (path) => path.includes('resources'),
  (path) => path.includes('ports'),
  (path) => path.includes('command'),
  (path) => path.includes('args'),
  (path) => path.includes('volume'),
  (path) => path.includes('connector'),
  (path) => path.includes('labels'),
  (path) => path.includes('deletion_protection'),
  (path) => path.includes('execution_environment'),
  (path) => path.includes('max_retries'),
  (path) => path.includes('parallelism'),
  (path) => path.includes('task_count'),
  (path) => path.includes('invoker'),
  (path) => path.includes('iam'),
];

/**
 * @param {string} path
 */
export function isAllowedPromotionAttributePath(path) {
  if (IMAGE_PATH.test(path)) {
    return true;
  }
  return isComputedOutputPath(path);
}

/** @param {string} path */
export function isComputedOutputPath(path) {
  return COMPUTED_ROOT_PATHS.has(path.split('.')[0]);
}

/**
 * @param {string} path
 */
export function classifyAttributePath(path) {
  if (IMAGE_PATH.test(path)) {
    return 'allowed-image';
  }
  if (isComputedOutputPath(path)) {
    return 'allowed-computed';
  }
  for (const check of FORBIDDEN_PATH_CHECKS) {
    if (check(path)) {
      return 'forbidden';
    }
  }
  return 'unexpected';
}
