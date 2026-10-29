import { getRedisClient, isRedisHealthy } from './redis.js';

const MIN_INTERVAL_MS = 1000;
const LOCK_KEY = 'nominatim:global:lock';
const LOCK_POLL_MS = 50;
const LOCK_MAX_WAIT_MS = 5000;

let localChain: Promise<void> = Promise.resolve();
let lastLocalCallAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Espaciado mínimo de 1s entre llamadas salientes dentro de este proceso. */
async function waitLocalSlot(): Promise<void> {
  const elapsed = Date.now() - lastLocalCallAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }
  lastLocalCallAt = Date.now();
}

/**
 * Coordina el cupo global entre instancias con un lock de 1s en Redis.
 * Si Redis no está sano, no bloquea: cada instancia respeta igual su propio
 * espaciado local (fail-open, documentado como limitación en multi-instancia).
 */
async function acquireDistributedSlot(): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const deadline = Date.now() + LOCK_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    if (!isRedisHealthy()) return;
    try {
      const acquired = await client.set(LOCK_KEY, '1', 'PX', MIN_INTERVAL_MS, 'NX');
      if (acquired === 'OK') return;
    } catch (error) {
      console.error('[nominatimLimiter] error adquiriendo lock distribuido, se continúa (fail-open):', error);
      return;
    }
    await sleep(LOCK_POLL_MS);
  }
  console.error('[nominatimLimiter] timeout esperando cupo distribuido, se continúa igual (fail-open)');
}

/**
 * Serializa las llamadas salientes reales a Nominatim para cumplir su
 * política de máx. 1 req/s para toda la aplicación. Se invoca solo en
 * cache-miss: los cache-hits nunca pasan por acá y no consumen cupo.
 */
export async function runWithNominatimSlot<T>(task: () => Promise<T>): Promise<T> {
  const previous = localChain;
  let release = (): void => {};
  localChain = new Promise((resolve) => {
    release = resolve;
  });
  await previous;

  try {
    await waitLocalSlot();
    await acquireDistributedSlot();
    return await task();
  } finally {
    release();
  }
}
