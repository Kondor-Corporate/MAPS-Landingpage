import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { geocodeAddress } from '../src/lib/geocode.js';

vi.mock('../src/lib/geocode.js', () => ({
  geocodeAddress: vi.fn(async (query: string) => {
    if (query.includes('INVALID_ADDRESS_XYZ')) return null;
    return { latitud: -34.9214, longitud: -57.9545 };
  }),
}));

const BASE = '/api/v1';
const AUTH = `${BASE}/auth`;
const PRODUCERS = `${BASE}/producers`;
const TEST_PASSWORD = 'Temporal123';

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
        password: TEST_PASSWORD,
        ciudad: 'Calle 7 776, La Plata, Buenos Aires, Argentina',
      })
      .expect(201);

    expect(res.body.data).toMatchObject({
      latitud: -34.9214,
      longitud: -57.9545,
      ciudad: 'Calle 7 776, La Plata, Buenos Aires, Argentina',
      direccion: 'Calle 7 776, La Plata, Buenos Aires, Argentina',
    });

    const mapRes = await request(app).get(`${PRODUCERS}/map`).expect(200);
    const created = mapRes.body.data.producers.find(
      (p: { slug: string }) => p.slug === res.body.data.slug,
    );
    expect(created).toBeTruthy();
    expect(created).not.toHaveProperty('email');
    expect(created).not.toHaveProperty('id');
    expect(created).not.toHaveProperty('dni');
  });

  it('POST /producers — coordenadas manuales tienen prioridad sobre geocoder', async () => {
    const agent = request.agent(app);
    const adminToken = await loginAdmin(agent);
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const geocodeMock = vi.mocked(geocodeAddress);
    geocodeMock.mockClear();

    const res = await agent
      .post(`${PRODUCERS}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Manual',
        apellido: 'Mapa',
        email: `manual-mapa-${unique}@example.com`,
        password: TEST_PASSWORD,
        direccion: 'Diagonal 75 172, La Plata, Buenos Aires, Argentina',
        latitud: -34.91234,
        longitud: -57.98765,
      })
      .expect(201);

    expect(geocodeMock).not.toHaveBeenCalled();
    expect(res.body.data).toMatchObject({
      direccion: 'Diagonal 75 172, La Plata, Buenos Aires, Argentina',
      ciudad: 'Diagonal 75 172, La Plata, Buenos Aires, Argentina',
      latitud: -34.91234,
      longitud: -57.98765,
    });

    const mapRes = await request(app).get(`${PRODUCERS}/map`).expect(200);
    const created = mapRes.body.data.producers.find(
      (p: { slug: string }) => p.slug === res.body.data.slug,
    );
    expect(created).toMatchObject({
      direccion: 'Diagonal 75 172, La Plata, Buenos Aires, Argentina',
      latitud: -34.91234,
      longitud: -57.98765,
    });
  });

  it('PATCH /producers/:id — reemplaza dirección y coordenadas anteriores', async () => {
    const agent = request.agent(app);
    const adminToken = await loginAdmin(agent);
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const created = await agent
      .post(`${PRODUCERS}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Update',
        apellido: 'Mapa',
        email: `update-mapa-${unique}@example.com`,
        password: TEST_PASSWORD,
        direccion: 'Calle 7 776, La Plata, Buenos Aires, Argentina',
        latitud: -34.9214,
        longitud: -57.9545,
      })
      .expect(201);

    const updated = await agent
      .patch(`${PRODUCERS}/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        direccion: 'Av. 13 900, La Plata, Buenos Aires, Argentina',
        latitud: -34.93001,
        longitud: -57.96002,
      })
      .expect(200);

    expect(updated.body.data).toMatchObject({
      direccion: 'Av. 13 900, La Plata, Buenos Aires, Argentina',
      ciudad: 'Av. 13 900, La Plata, Buenos Aires, Argentina',
      latitud: -34.93001,
      longitud: -57.96002,
    });
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
        password: TEST_PASSWORD,
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
        password: TEST_PASSWORD,
      })
      .expect(422);
  });
});
