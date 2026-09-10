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
import { normalizeGeocodeQuery } from '../src/lib/geocodeNormalize.js';

function mockFetchOk() {
  return vi.fn(async () => ({
    ok: true,
    json: async () => [{ lat: '-34.9', lon: '-57.9' }],
  }));
}

function cacheKeyFor(query: string) {
  return `geocode:search:${normalizeGeocodeQuery(query)}`;
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

describe('geocodeAddress — D3B cache integrity', () => {
  beforeEach(() => {
    state.healthy = true;
    state.store.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('negative cache hit — no reconsulta Nominatim', async () => {
    const query = 'Dirección inexistente D3B negative cache xyz';
    const cacheKey = cacheKeyFor(query);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [],
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(geocodeAddress(query)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.store.has(cacheKey)).toBe(true);

    fetchMock.mockClear();
    fetchMock.mockImplementation(async () => {
      throw new Error('Nominatim no debe llamarse en negative cache hit');
    });

    await expect(geocodeAddress(query)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('positive cache out-of-range — ignora cache, consulta provider y reemplaza store', async () => {
    const query = 'Diagonal 75 172, La Plata D3B lat invalid cache';
    const cacheKey = cacheKeyFor(query);
    state.store.set(cacheKey, JSON.stringify({ latitud: 120, longitud: -58 }));

    const fetchMock = mockFetchOk();
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress(query);

    expect(result).toEqual({ latitud: -34.9, longitud: -57.9 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.store.get(cacheKey)).toBe(
      JSON.stringify({ latitud: -34.9, longitud: -57.9 }),
    );
  });

  it('positive cache longitud inválida — consulta provider', async () => {
    const query = 'Diagonal 75 172, La Plata D3B lng invalid cache';
    const cacheKey = cacheKeyFor(query);
    state.store.set(cacheKey, JSON.stringify({ latitud: -34, longitud: 200 }));

    const fetchMock = mockFetchOk();
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress(query);

    expect(result).toEqual({ latitud: -34.9, longitud: -57.9 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.store.get(cacheKey)).toBe(
      JSON.stringify({ latitud: -34.9, longitud: -57.9 }),
    );
  });

  it.each([
    {
      label: 'strings en lugar de números',
      raw: JSON.stringify({ latitud: '-34.9', longitud: '-57.9' }),
    },
    {
      label: 'objeto malformado',
      raw: JSON.stringify({ foo: 'bar' }),
    },
  ])('positive cache malformado ($label) — no lanza y consulta provider', async ({ raw }) => {
    const query = `Diagonal 75 172, La Plata D3B malformed ${raw.slice(0, 12)}`;
    const cacheKey = cacheKeyFor(query);
    state.store.set(cacheKey, raw);

    const fetchMock = mockFetchOk();
    vi.stubGlobal('fetch', fetchMock);

    await expect(geocodeAddress(query)).resolves.toEqual({
      latitud: -34.9,
      longitud: -57.9,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cache inválido + provider inválido — negative cache evita re-fetch', async () => {
    const query = 'Diagonal 75 172, La Plata D3B invalid cache and provider';
    const cacheKey = cacheKeyFor(query);
    state.store.set(cacheKey, JSON.stringify({ latitud: 120, longitud: -58 }));

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ lat: '91', lon: '-57.9' }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(geocodeAddress(query)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    fetchMock.mockImplementation(async () => {
      throw new Error('Nominatim no debe llamarse tras negative cache');
    });

    await expect(geocodeAddress(query)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('provider inválido — negative cache y no positive cache reutilizable', async () => {
    const query = 'Diagonal 75 172, La Plata D3B invalid provider only';
    const cacheKey = cacheKeyFor(query);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ lat: '91', lon: '-57.9' }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(geocodeAddress(query)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.store.has(cacheKey)).toBe(true);

    fetchMock.mockClear();
    fetchMock.mockImplementation(async () => {
      throw new Error('Nominatim no debe llamarse tras provider inválido cacheado');
    });

    await expect(geocodeAddress(query)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
