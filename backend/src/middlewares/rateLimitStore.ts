import type { Request, Response } from 'express';
import type {
  IncrementResponse,
  Options,
  RateLimitInfo,
  Store,
} from 'express-rate-limit';
import { MemoryStore } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { RedisReply } from 'rate-limit-redis';
import { getRedisClient, isRedisHealthy } from '../lib/redis.js';

/**
 * Handler 429 compartido por los limiters: responde con el envelope estándar de la
 * API y añade `Retry-After` (hint de reintento razonable) **sin** exponer los
 * encabezados `RateLimit-*`/`X-RateLimit-*`, para no revelar umbral ni ventana de
 * la regla. Usar junto con `standardHeaders: false` y `legacyHeaders: false`.
 */
export function rateLimitJsonHandler(message: string) {
  return (req: Request, res: Response): void => {
    const info = (req as unknown as { rateLimit?: RateLimitInfo }).rateLimit;
    const resetTime = info?.resetTime;
    if (resetTime instanceof Date) {
      const seconds = Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
      res.setHeader('Retry-After', String(seconds));
    }
    res.status(429).json({ data: null, message, error: null });
  };
}

/**
 * Store resiliente para express-rate-limit: usa Redis mientras esté sano
 * (rate limiting distribuido entre instancias) y degrada automáticamente a un
 * `MemoryStore` local por instancia si Redis no responde, sin devolver 429/503
 * por la caída. La salud de Redis se evalúa en cada operación, así que al
 * recuperarse Redis el store vuelve solo al comportamiento distribuido.
 */
export class ResilientRateLimitStore implements Store {
  localKeys = false;

  private readonly memoryStore = new MemoryStore();
  private readonly redisStore: RedisStore | null;

  constructor(prefix: string) {
    const client = getRedisClient();
    this.redisStore = client
      ? new RedisStore({
          prefix,
          sendCommand: (...args: [string, ...string[]]) =>
            client.call(...args) as Promise<RedisReply>,
        })
      : null;
  }

  init(options: Options): void {
    this.memoryStore.init(options);
    this.redisStore?.init?.(options);
  }

  async increment(key: string): Promise<IncrementResponse> {
    if (this.redisStore && isRedisHealthy()) {
      try {
        return await this.redisStore.increment(key);
      } catch (error) {
        console.error('[rateLimit] Redis increment falló, degradando a MemoryStore local:', error);
      }
    }
    return this.memoryStore.increment(key);
  }

  async decrement(key: string): Promise<void> {
    if (this.redisStore && isRedisHealthy()) {
      try {
        await this.redisStore.decrement(key);
        return;
      } catch (error) {
        console.error('[rateLimit] Redis decrement falló, degradando a MemoryStore local:', error);
      }
    }
    await this.memoryStore.decrement(key);
  }

  async resetKey(key: string): Promise<void> {
    if (this.redisStore && isRedisHealthy()) {
      try {
        await this.redisStore.resetKey(key);
        return;
      } catch (error) {
        console.error('[rateLimit] Redis resetKey falló, degradando a MemoryStore local:', error);
      }
    }
    await this.memoryStore.resetKey(key);
  }
}

/** Factory de conveniencia: una instancia de store por limiter, con prefijo propio. */
export function createRateLimitStore(prefix: string): ResilientRateLimitStore {
  return new ResilientRateLimitStore(prefix);
}
