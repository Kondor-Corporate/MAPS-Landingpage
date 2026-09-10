/**
 * Tests de integración del módulo Biblioteca Digital (Ramos).
 * Verifica que el productor consuma la misma fuente de verdad que administra el admin:
 * mismo endpoint, mismo gdriveUrl, sin duplicar datos ni depender de listas hardcodeadas.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

const BASE = '/api/v1/library/ramos';
const AUTH = '/api/v1/auth';

const createdRamoIds: number[] = [];

function uniqueNombre(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type RamoBody = {
  nombre: string;
  descripcion: string;
  icono: string;
  gdriveUrl: string;
  tipo: 'PRINCIPAL' | 'SECUNDARIO';
  orden: number;
  activo: boolean;
};

function validRamoBody(overrides: Partial<RamoBody> = {}): RamoBody {
  return {
    nombre: uniqueNombre('Ramo test'),
    descripcion: 'Descripción de prueba',
    icono: 'car',
    gdriveUrl: 'https://drive.google.com/drive/folders/TEST123',
    tipo: 'PRINCIPAL',
    orden: 1,
    activo: true,
    ...overrides,
  };
}

async function loginUsuarioPassword(
  app: ReturnType<typeof createApp>,
  usuario: string,
  password: string,
): Promise<string> {
  const res = await request(app)
    .post(`${AUTH}/login`)
    .send({ usuario, password })
    .expect(200);
  return res.body.data.accessToken as string;
}

async function createRamoAsAdmin(
  app: ReturnType<typeof createApp>,
  token: string,
  body: RamoBody,
) {
  const res = await request(app)
    .post(BASE)
    .set('Authorization', `Bearer ${token}`)
    .send(body)
    .expect(201);

  createdRamoIds.push(res.body.data.id as number);
  return res.body.data as Record<string, unknown> & { id: number; gdriveUrl: string };
}

describe('library ramos API (Biblioteca Digital)', () => {
  const app = createApp();

  beforeAll(() => {
    loadEnv();
  });

  afterAll(async () => {
    if (createdRamoIds.length > 0) {
      await prisma.ramo.deleteMany({ where: { id: { in: createdRamoIds } } });
    }
    await prisma.$disconnect();
  });

  it('el productor ve el mismo gdriveUrl configurado por el admin (misma fuente de verdad)', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const created = await createRamoAsAdmin(
      app,
      adminToken,
      validRamoBody({ gdriveUrl: 'https://drive.google.com/drive/folders/SYNC_TEST' }),
    );

    const producerToken = await loginUsuarioPassword(app, 'user', 'User1234!');
    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${producerToken}`)
      .expect(200);

    const rows = res.body.data as { id: number; gdriveUrl: string }[];
    const match = rows.find((r) => r.id === created.id);
    expect(match).toBeDefined();
    expect(match?.gdriveUrl).toBe('https://drive.google.com/drive/folders/SYNC_TEST');
  });

  it('un ramo nuevo creado por el admin aparece automáticamente para el productor', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const nombre = uniqueNombre('Responsabilidad Civil');
    const created = await createRamoAsAdmin(app, adminToken, validRamoBody({ nombre }));

    const producerToken = await loginUsuarioPassword(app, 'user', 'User1234!');
    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${producerToken}`)
      .expect(200);

    const ids = (res.body.data as { id: number }[]).map((r) => r.id);
    expect(ids).toContain(created.id);
  });

  it('el productor no ve ramos inactivos', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const created = await createRamoAsAdmin(app, adminToken, validRamoBody({ activo: false }));

    const producerToken = await loginUsuarioPassword(app, 'user', 'User1234!');
    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${producerToken}`)
      .expect(200);

    const ids = (res.body.data as { id: number }[]).map((r) => r.id);
    expect(ids).not.toContain(created.id);
  });

  it('al modificar el link desde el admin, el productor obtiene el nuevo valor', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const created = await createRamoAsAdmin(app, adminToken, validRamoBody());

    await request(app)
      .patch(`${BASE}/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ gdriveUrl: 'https://drive.google.com/drive/folders/UPDATED_LINK' })
      .expect(200);

    const producerToken = await loginUsuarioPassword(app, 'user', 'User1234!');
    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${producerToken}`)
      .expect(200);

    const rows = res.body.data as { id: number; gdriveUrl: string }[];
    const match = rows.find((r) => r.id === created.id);
    expect(match?.gdriveUrl).toBe('https://drive.google.com/drive/folders/UPDATED_LINK');
  });
});
