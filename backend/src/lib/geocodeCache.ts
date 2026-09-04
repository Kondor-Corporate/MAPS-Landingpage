import { getRedisClient, isRedisHealthy } from './redis.js';

const POSITIVE_TTL_SECONDS = 24 * 60 * 60;
const NEGATIVE_TTL_SECONDS = 5 * 60;
/** Distingue "no encontrado" cacheado de un cache miss real. */
const NOT_FOUND_SENTINEL = '__NOT_FOUND__';

export type CacheLookup<T> = { hit: true; value: T | null } | { hit: false };

/**
 * Caché de resultados de geocoding en Redis. Si Redis no está disponible,
 * se comporta como cache miss (fail-open): la request sigue funcionando y
 * consulta Nominatim directamente, sin devolver error por la caída.
 */
export async function getCachedGeocode<T>(key: string): Promise<CacheLookup<T>> {
  const client = getRedisClient();
  if (!client || !isRedisHealthy()) {
    return { hit: false };
  }

  try {
    const raw = await client.get(key);
    if (raw === null) return { hit: false };
    if (raw === NOT_FOUND_SENTINEL) return { hit: true, value: null };
    return { hit: true, value: JSON.parse(raw) as T };
  } catch (error) {
    console.error('[geocodeCache] error en GET, se trata como cache miss:', error);
    return { hit: false };
  }
}

/** TTL positivo (24h) o negativo (5min) según si `value` es un resultado o `null`. */
export async function setCachedGeocode(key: string, value: unknown): Promise<void> {
  const client = getRedisClient();
  if (!client || !isRedisHealthy()) {
    return;
  }

  try {
    if (value === null) {
      await client.set(key, NOT_FOUND_SENTINEL, 'EX', NEGATIVE_TTL_SECONDS);
    } else {
      await client.set(key, JSON.stringify(value), 'EX', POSITIVE_TTL_SECONDS);
    }
  } catch (error) {
    console.error('[geocodeCache] error en SET, se ignora (fail-open):', error);
  }
}
