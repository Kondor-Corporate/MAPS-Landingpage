import { Redis } from 'ioredis';
import { loadEnv } from '../config/env.js';

let client: Redis | null | undefined;

/**
 * Cliente Redis único y compartido (rate limiting distribuido + caché de geocoding).
 * Devuelve `null` si no hay `REDIS_URL` (dev/test): habilita la degradación a
 * MemoryStore local / caché deshabilitada sin que el resto del código deba saberlo.
 */
export function getRedisClient(): Redis | null {
  if (client !== undefined) {
    return client;
  }

  const env = loadEnv();
  if (!env.REDIS_URL) {
    client = null;
    return client;
  }

  const instance = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => Math.min(times * 200, 2000),
  });

  instance.on('error', (error: Error) => {
    console.error('[redis] connection error:', error.message);
  });

  instance.connect().catch((error: Error) => {
    console.error('[redis] initial connect failed:', error.message);
  });

  client = instance;
  return client;
}

/** `true` solo si hay cliente configurado y la conexión está lista para operar. */
export function isRedisHealthy(): boolean {
  const instance = getRedisClient();
  return instance !== null && instance.status === 'ready';
}

/** Solo para tests: resetea el singleton para permitir reconfigurar `REDIS_URL`. */
export function __resetRedisClientForTests(): void {
  client = undefined;
}
