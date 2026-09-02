import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  healthy: false,
  client: null as null | {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  },
}));

vi.mock('../src/lib/redis.js', () => ({
  getRedisClient: () => state.client,
  isRedisHealthy: () => state.healthy,
}));

import { getCachedGeocode, setCachedGeocode } from '../src/lib/geocodeCache.js';

describe('geocodeCache', () => {
  beforeEach(() => {
    state.healthy = false;
    state.client = { get: vi.fn(), set: vi.fn() };
  });

  it('sin Redis sano: get devuelve cache miss y set no hace nada', async () => {
    const result = await getCachedGeocode('geocode:search:x');
    expect(result).toEqual({ hit: false });

    await setCachedGeocode('geocode:search:x', { latitud: 1, longitud: 2 });
    expect(state.client!.set).not.toHaveBeenCalled();
  });

  it('Redis sano: guarda resultados positivos con TTL de 24h', async () => {
    state.healthy = true;
    await setCachedGeocode('geocode:search:x', { latitud: -34.9, longitud: -57.9 });

    expect(state.client!.set).toHaveBeenCalledWith(
      'geocode:search:x',
      JSON.stringify({ latitud: -34.9, longitud: -57.9 }),
      'EX',
      24 * 60 * 60,
    );
  });

  it('Redis sano: guarda "no encontrado" con TTL de 5min usando un centinela', async () => {
    state.healthy = true;
    await setCachedGeocode('geocode:search:x', null);

    expect(state.client!.set).toHaveBeenCalledWith(
      'geocode:search:x',
      expect.any(String),
      'EX',
      5 * 60,
    );
  });

  it('Redis sano: un hit positivo se deserializa desde JSON', async () => {
    state.healthy = true;
    state.client!.get.mockResolvedValue(JSON.stringify({ latitud: 1, longitud: 2 }));

    const result = await getCachedGeocode('geocode:search:x');
    expect(result).toEqual({ hit: true, value: { latitud: 1, longitud: 2 } });
  });

  it('Redis sano: un hit "no encontrado" (centinela) devuelve value null', async () => {
    state.healthy = true;
    await setCachedGeocode('geocode:search:x', null);
    const savedSentinel = state.client!.set.mock.calls[0][1] as string;
    state.client!.get.mockResolvedValue(savedSentinel);

    const result = await getCachedGeocode('geocode:search:x');
    expect(result).toEqual({ hit: true, value: null });
  });

  it('Redis sano pero el GET falla: se trata como cache miss (fail-open)', async () => {
    state.healthy = true;
    state.client!.get.mockRejectedValue(new Error('ECONNRESET'));

    const result = await getCachedGeocode('geocode:search:x');
    expect(result).toEqual({ hit: false });
  });

  it('Redis sano pero el SET falla: no lanza (fail-open)', async () => {
    state.healthy = true;
    state.client!.set.mockRejectedValue(new Error('ECONNRESET'));

    await expect(
      setCachedGeocode('geocode:search:x', { latitud: 1, longitud: 2 }),
    ).resolves.toBeUndefined();
  });
});
