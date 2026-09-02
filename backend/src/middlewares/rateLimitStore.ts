import type {
  IncrementResponse,
  Options,
  Store,
} from 'express-rate-limit';
import { MemoryStore } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { RedisReply } from 'rate-limit-redis';
import { getRedisClient, isRedisHealthy } from '../lib/redis.js';

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
