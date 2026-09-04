import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  healthy: false,
  store: new Map<string, string>(),
}));

vi.mock('../src/lib/redis.js', () => ({
  getRedisClient: () => ({
    get: vi.fn(async (key: string) => state.store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      state.store.set(key, value);
      return 'OK';
    }),
  }),
  isRedisHealthy: () => state.healthy,
}));

import { geocodeAddress } from '../src/lib/geocode.js';

function mockFetchOk() {
  return vi.fn(async () => ({
    ok: true,
    json: async () => [{ lat: '-34.9', lon: '-57.9' }],
  }));
}

const CACHE_KEY = 'geocode:search:diagonal 75 172, la plata';

describe('geocodeAddress — caché y degradación de Redis', () => {
  beforeEach(() => {
    state.healthy = false;
    state.store.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Redis disponible: cache-miss consulta Nominatim y guarda el resultado', async () => {
    state.healthy = true;
    const fetchMock = mockFetchOk();
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress('Diagonal 75 172, La Plata');

    expect(result).toEqual({ latitud: -34.9, longitud: -57.9 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.store.get(CACHE_KEY)).toBe(
      JSON.stringify({ latitud: -34.9, longitud: -57.9 }),
    );
  });

  it('Redis disponible: un cache-hit no vuelve a llamar a Nominatim', async () => {
    state.healthy = true;
    state.store.set(CACHE_KEY, JSON.stringify({ latitud: -34.9, longitud: -57.9 }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress('Diagonal 75 172, La Plata');

    expect(result).toEqual({ latitud: -34.9, longitud: -57.9 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Redis caído: la request sigue funcionando (no hay 429/503 por la caída)', async () => {
    state.healthy = false;
    const fetchMock = mockFetchOk();
    vi.stubGlobal('fetch', fetchMock);

    await expect(geocodeAddress('Diagonal 75 172, La Plata')).resolves.toEqual({
      latitud: -34.9,
      longitud: -57.9,
    });
  });

  it('Redis caído: el cache-miss consulta Nominatim directamente (caché deshabilitada)', async () => {
    state.healthy = false;
    const fetchMock = mockFetchOk();
    vi.stubGlobal('fetch', fetchMock);

    await geocodeAddress('Diagonal 75 172, La Plata');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.store.has(CACHE_KEY)).toBe(false);
  });

  it('recuperación de Redis: vuelve a cachear resultados normalmente', async () => {
    state.healthy = false;
    const fetchMock = mockFetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await geocodeAddress('Diagonal 75 172, La Plata');
    expect(state.store.has(CACHE_KEY)).toBe(false);

    state.healthy = true;
    await geocodeAddress('Diagonal 75 172, La Plata');
    expect(state.store.get(CACHE_KEY)).toBe(
      JSON.stringify({ latitud: -34.9, longitud: -57.9 }),
    );
  });
});
