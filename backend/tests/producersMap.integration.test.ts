import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { geocodeAddress } from '../src/lib/geocode.js';
import { prisma } from '../src/lib/prisma.js';
import { producersService } from '../src/services/producers.service.js';

vi.mock('../src/lib/geocode.js', () => ({
  geocodeAddress: vi.fn(async (query: string) => {
    if (query.includes('INVALID_ADDRESS_XYZ')) return null;
    return { latitud: -34.9214, longitud: -57.9545 };
  }),
  reverseGeocodeCoordinates: vi.fn(async () => null),
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

describe('D3B — coordinate integrity (Fase 3A)', () => {
  const app = createApp();

  beforeAll(() => {
    loadEnv();
  });

  it('producersService.update — rechaza coords fuera de rango (bypass Zod)', async () => {
    const agent = request.agent(app);
    const adminToken = await loginAdmin(agent);
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const created = await agent
      .post(`${PRODUCERS}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Bypass',
        apellido: 'Schema',
        email: `bypass-schema-${unique}@example.com`,
        password: TEST_PASSWORD,
        direccion: 'Calle 7 776, La Plata, Buenos Aires, Argentina',
        latitud: -34.9214,
        longitud: -57.9545,
      })
      .expect(201);

    const id = created.body.data.id as number;
    const before = await prisma.productor.findUnique({
      where: { id },
      select: { latitud: true, longitud: true },
    });

    await expect(
      producersService.update(id, { latitud: 91, longitud: -58 }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Las coordenadas están fuera de rango',
    });

    const after = await prisma.productor.findUnique({
      where: { id },
      select: { latitud: true, longitud: true },
    });
    expect(after).toEqual(before);
  });

  it('POST /producers — acepta coordenadas (0,0) y aparece en el mapa', async () => {
    const agent = request.agent(app);
    const adminToken = await loginAdmin(agent);
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const geocodeMock = vi.mocked(geocodeAddress);
    geocodeMock.mockClear();

    const res = await agent
      .post(`${PRODUCERS}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Zero',
        apellido: 'Coords',
        email: `zero-coords-${unique}@example.com`,
        password: TEST_PASSWORD,
        direccion: 'Calle cualquiera 123, La Plata, Argentina',
        latitud: 0,
        longitud: 0,
      })
      .expect(201);

    expect(geocodeMock).not.toHaveBeenCalled();
    expect(res.body.data).toMatchObject({
      latitud: 0,
      longitud: 0,
    });

    const mapRes = await request(app).get(`${PRODUCERS}/map`).expect(200);
    const onMap = mapRes.body.data.producers.find(
      (p: { slug: string }) => p.slug === res.body.data.slug,
    );
    expect(onMap).toBeTruthy();
    expect(onMap).toMatchObject({ latitud: 0, longitud: 0 });
  });

  describe('legacy coords defensivos en DTOs y mapa', () => {
    let producerId: number;
    let producerSlug: string;

    beforeAll(async () => {
      const agent = request.agent(app);
      const adminToken = await loginAdmin(agent);
      const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const created = await agent
        .post(`${PRODUCERS}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Legacy',
          apellido: 'Coords',
          email: `legacy-coords-${unique}@example.com`,
          password: TEST_PASSWORD,
          direccion: 'Calle 7 776, La Plata, Buenos Aires, Argentina',
          latitud: -34.9214,
          longitud: -57.9545,
        })
        .expect(201);

      producerId = created.body.data.id as number;
      producerSlug = created.body.data.slug as string;
    });

    async function fetchAdminCoords(agent: ReturnType<typeof request.agent>, adminToken: string) {
      const res = await agent
        .get(`${PRODUCERS}/${producerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      return {
        latitud: res.body.data.latitud as number | null,
        longitud: res.body.data.longitud as number | null,
      };
    }

    async function fetchPublicCoords() {
      const res = await request(app)
        .get(`${PRODUCERS}/by-slug/${producerSlug}`)
        .expect(200);
      return {
        latitud: res.body.data.profile.latitud as number | null,
        longitud: res.body.data.profile.longitud as number | null,
      };
    }

    it('latitud fuera de rango — DTOs null/null y excluido del mapa', async () => {
      await prisma.productor.update({
        where: { id: producerId },
        data: { latitud: 120, longitud: -58 },
      });

      const agent = request.agent(app);
      const adminToken = await loginAdmin(agent);

      expect(await fetchAdminCoords(agent, adminToken)).toEqual({
        latitud: null,
        longitud: null,
      });
      expect(await fetchPublicCoords()).toEqual({
        latitud: null,
        longitud: null,
      });

      const mapRes = await request(app).get(`${PRODUCERS}/map`).expect(200);
      const onMap = mapRes.body.data.producers.find(
        (p: { slug: string }) => p.slug === producerSlug,
      );
      expect(onMap).toBeFalsy();
    });

    it('coordenada faltante — DTOs null/null y excluido del mapa', async () => {
      await prisma.productor.update({
        where: { id: producerId },
        data: { latitud: -34, longitud: null },
      });

      const agent = request.agent(app);
      const adminToken = await loginAdmin(agent);

      const adminCoords = await fetchAdminCoords(agent, adminToken);
      const publicCoords = await fetchPublicCoords();
      expect(adminCoords).toEqual({ latitud: null, longitud: null });
      expect(publicCoords).toEqual({ latitud: null, longitud: null });

      const mapRes = await request(app).get(`${PRODUCERS}/map`).expect(200);
      const onMap = mapRes.body.data.producers.find(
        (p: { slug: string }) => p.slug === producerSlug,
      );
      expect(onMap).toBeFalsy();
    });

    it('boundaries ±90/±180 — DTOs preservan valores e incluido en mapa', async () => {
      await prisma.productor.update({
        where: { id: producerId },
        data: { latitud: 90, longitud: 180 },
      });

      const agent = request.agent(app);
      const adminToken = await loginAdmin(agent);

      expect(await fetchAdminCoords(agent, adminToken)).toEqual({
        latitud: 90,
        longitud: 180,
      });
      expect(await fetchPublicCoords()).toEqual({
        latitud: 90,
        longitud: 180,
      });

      const mapRes = await request(app).get(`${PRODUCERS}/map`).expect(200);
      const onMap = mapRes.body.data.producers.find(
        (p: { slug: string }) => p.slug === producerSlug,
      );
      expect(onMap).toMatchObject({ latitud: 90, longitud: 180 });
    });

    it('longitud fuera de rango — excluido del mapa', async () => {
      await prisma.productor.update({
        where: { id: producerId },
        data: { latitud: -34, longitud: 200 },
      });

      const mapRes = await request(app).get(`${PRODUCERS}/map`).expect(200);
      const onMap = mapRes.body.data.producers.find(
        (p: { slug: string }) => p.slug === producerSlug,
      );
      expect(onMap).toBeFalsy();
    });
  });
});
