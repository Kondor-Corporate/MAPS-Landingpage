import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';

vi.mock('../src/lib/geocode.js', () => ({
  geocodeAddress: vi.fn(async (query: string) => {
    if (query.toLowerCase().includes('inexistente')) return null;
    return { latitud: -34.9214, longitud: -57.9545 };
  }),
}));

const BASE = '/api/v1/geocode';

describe('geocode API', () => {
  const app = createApp();

  beforeAll(() => {
    loadEnv();
  });

  // G-01 — q ausente
  it('GET /geocode — sin q → 422', async () => {
    const res = await request(app).get(BASE).expect(422);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toBeTruthy();
  });

  // G-02 — q demasiado corta
  it('GET /geocode?q=ab — q de 2 chars → 422', async () => {
    const res = await request(app).get(`${BASE}?q=ab`).expect(422);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toBeTruthy();
  });

  // G-02b — q de espacios en blanco (trim → vacío)
  it('GET /geocode?q=   — q solo espacios → 422', async () => {
    const res = await request(app).get(`${BASE}?q=   `).expect(422);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toBeTruthy();
  });

  // G-03 — q válida con resultado
  it('GET /geocode?q=La+Plata — q válida → 200 con coordenadas', async () => {
    const res = await request(app).get(`${BASE}?q=La+Plata`).expect(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toMatchObject({
      latitud: expect.any(Number),
      longitud: expect.any(Number),
    });
  });

  // G-04 — q válida sin resultado (mock devuelve null)
  it('GET /geocode?q=ciudad+inexistente — sin resultado → 200 data null', async () => {
    const res = await request(app).get(`${BASE}?q=ciudad+inexistente`).expect(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toBeNull();
  });

  // G-05 — no requiere autenticación
  it('GET /geocode?q=Buenos+Aires — accesible sin token → 200', async () => {
    const res = await request(app).get(`${BASE}?q=Buenos+Aires`).expect(200);
    expect(res.body.error).toBeNull();
  });
});
