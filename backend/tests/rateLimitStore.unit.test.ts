import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Options } from 'express-rate-limit';

const state = vi.hoisted(() => ({
  healthy: false,
  client: null as unknown,
}));

vi.mock('../src/lib/redis.js', () => ({
  getRedisClient: () => state.client,
  isRedisHealthy: () => state.healthy,
}));

vi.mock('rate-limit-redis', () => {
  return {
    RedisStore: vi.fn().mockImplementation(function RedisStoreMock() {
      return {
        init: vi.fn(),
        increment: vi.fn(async () => ({ totalHits: 999, resetTime: undefined })),
        decrement: vi.fn(async () => {}),
        resetKey: vi.fn(async () => {}),
      };
    }),
  };
});

import { createRateLimitStore } from '../src/middlewares/rateLimitStore.js';

const fakeOptions = { windowMs: 60_000 } as Options;

describe('ResilientRateLimitStore', () => {
  beforeEach(() => {
    state.healthy = false;
    state.client = null;
  });

  it('sin REDIS_URL configurada: usa MemoryStore local y cuenta correctamente', async () => {
    const store = createRateLimitStore('test:no-redis:');
    store.init(fakeOptions);

    const first = await store.increment('k1');
    expect(first.totalHits).toBe(1);
    const second = await store.increment('k1');
    expect(second.totalHits).toBe(2);
  });

  it('Redis caído (configurado pero no sano): usa el fallback local, la request sigue funcionando', async () => {
    state.client = { call: vi.fn() };
    state.healthy = false;

    const store = createRateLimitStore('test:down:');
    store.init(fakeOptions);

    const result = await store.increment('k2');
    // Si usara el RedisStore mockeado, totalHits sería 999.
    expect(result.totalHits).toBe(1);
  });

  it('Redis sano: delega en el RedisStore distribuido', async () => {
    state.client = { call: vi.fn() };
    state.healthy = true;

    const store = createRateLimitStore('test:up:');
    store.init(fakeOptions);

    const result = await store.increment('k3');
    expect(result.totalHits).toBe(999);
  });

  it('recuperación de Redis: vuelve sola al comportamiento distribuido normal', async () => {
    state.client = { call: vi.fn() };
    state.healthy = false;

    const store = createRateLimitStore('test:recover:');
    store.init(fakeOptions);

    const whileDown = await store.increment('k4');
    expect(whileDown.totalHits).toBe(1);

    state.healthy = true;
    const afterRecovery = await store.increment('k4');
    expect(afterRecovery.totalHits).toBe(999);
  });
});
