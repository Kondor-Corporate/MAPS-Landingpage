import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';

vi.mock('../src/lib/geocode.js', () => ({
  geocodeAddress: vi.fn(async (query: string) => {
    if (query.includes('INVALID_ADDRESS_XYZ')) return null;
    return { latitud: -34.9214, longitud: -57.9545 };
  }),
}));

const BASE = '/api/v1';
const AUTH = `${BASE}/auth`;
const PRODUCERS = `${BASE}/producers`;

async function loginAdmin(agent: ReturnType<typeof request.agent>) {
  const res = await agent
    .post(`${AUTH}/login`)
    .send({ usuario: 'admin', password: 'Admin1234!' })
    .expect(200);
  return res.body.data.accessToken as string;
}

describe('producers map API', () => {
  const app = createApp();

  beforeAll(() => {
    loadEnv();
  });

  it('GET /producers/map — público sin token', async () => {
    const res = await request(app).get(`${PRODUCERS}/map`).expect(200);

    expect(res.body.error).toBeNull();
    expect(Array.isArray(res.body.data.producers)).toBe(true);

    const carlos = res.body.data.producers.find(
      (p: { slug: string }) => p.slug === 'carlos-rodriguez',
    );
    expect(carlos).toBeTruthy();
    expect(carlos).toMatchObject({
      slug: 'carlos-rodriguez',
      latitud: expect.any(Number),
      longitud: expect.any(Number),
    });
    expect(carlos).not.toHaveProperty('email');
    expect(carlos).not.toHaveProperty('id');
    expect(carlos).not.toHaveProperty('dni');
  });

  it('POST /producers — geocodifica dirección al crear', async () => {
    const agent = request.agent(app);
    const adminToken = await loginAdmin(agent);
    const unique = Date.now();

    const res = await agent
      .post(`${PRODUCERS}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Test',
        apellido: 'Mapa',
        email: `test-mapa-${unique}@example.com`,
        ciudad: 'Calle 7 776, La Plata, Buenos Aires, Argentina',
      })
      .expect(201);

    expect(res.body.data).toMatchObject({
      latitud: -34.9214,
      longitud: -57.9545,
      ciudad: 'Calle 7 776, La Plata, Buenos Aires, Argentina',
    });

    const mapRes = await request(app).get(`${PRODUCERS}/map`).expect(200);
    const created = mapRes.body.data.producers.find(
      (p: { slug: string }) => p.slug === res.body.data.slug,
    );
    expect(created).toBeTruthy();
  });

  it('POST /producers — dirección inválida → 400', async () => {
    const agent = request.agent(app);
    const adminToken = await loginAdmin(agent);
    const unique = Date.now();

    await agent
      .post(`${PRODUCERS}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Fail',
        apellido: 'Geocode',
        email: `fail-geocode-${unique}@example.com`,
        ciudad: 'INVALID_ADDRESS_XYZ',
      })
      .expect(400);
  });

  it('POST /producers — sin dirección → 422', async () => {
    const agent = request.agent(app);
    const adminToken = await loginAdmin(agent);
    const unique = Date.now();

    await agent
      .post(`${PRODUCERS}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Sin',
        apellido: 'Direccion',
        email: `sin-dir-${unique}@example.com`,
      })
      .expect(422);
  });
});
