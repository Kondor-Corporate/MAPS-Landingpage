import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';

const BASE = '/api/v1/producers';
const AUTH = '/api/v1/auth';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
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

describe('producers API (integración)', () => {
  const app = createApp();

  beforeAll(() => {
    loadEnv();
  });

  it('GET / — sin token → 401', async () => {
    const res = await request(app).get(BASE).expect(401);
    expect(res.body.message).toBe('Token de acceso requerido');
  });

  it('GET / — con PRODUCTOR → 403', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const email = uniqueEmail('prod-forbidden');
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Forbidden',
        apellido: 'List',
        email,
      })
      .expect(201);

    const env = loadEnv();
    const producerToken = await loginUsuarioPassword(app, email, env.DEFAULT_PRODUCER_PASSWORD);

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${producerToken}`)
      .expect(403);

    expect(res.body.message).toBe('Acceso denegado');
  });

  it('GET / — con ADMIN → 200', async () => {
    const token = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`).expect(200);

    expect(res.body.message).toBe('OK');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET / — con SUPERADMIN → 200', async () => {
    const token = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`).expect(200);

    expect(res.body.message).toBe('OK');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST / — válido → 201', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const email = uniqueEmail('create-ok');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Nuevo',
        apellido: 'Productor',
        email,
        telefono: '555-0000',
      })
      .expect(201);

    expect(res.body.data).toMatchObject({
      nombre: 'Nuevo',
      apellido: 'Productor',
      usuario: { usuario: email.toLowerCase(), rol: 'PRODUCTOR' },
    });
  });

  it('POST / — email duplicado → 409', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const email = uniqueEmail('dup-email');
    const body = { nombre: 'A', apellido: 'B', email };

    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(409);

    expect(res.body.message).toBe('El email ya está registrado');
  });

  it('POST / — campo no permitido (whatsapp) → 422', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'X',
        apellido: 'Y',
        email: uniqueEmail('strict'),
        whatsapp: '+5491112345678',
      })
      .expect(422);

    expect(res.body.message).toBe('Datos de entrada inválidos');
  });

  it('PATCH /:id — actualiza datos básicos', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const email = uniqueEmail('patch-basic');
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Antes',
        apellido: 'Nombre',
        email,
      })
      .expect(201);

    const id = createRes.body.data.id as number;
    const patchRes = await request(app)
      .patch(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Después' })
      .expect(200);

    expect(patchRes.body.data).toMatchObject({
      id,
      nombre: 'Después',
      apellido: 'Nombre',
    });
  });

  it('PATCH /:id/activo false — desactiva cuenta y revoca sesiones', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const email = uniqueEmail('deactivate');
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Sesión',
        apellido: 'Revocada',
        email,
      })
      .expect(201);

    const id = createRes.body.data.id as number;
    const env = loadEnv();

    const agent = request.agent(app);
    await agent
      .post(`${AUTH}/login`)
      .send({ usuario: email, password: env.DEFAULT_PRODUCER_PASSWORD })
      .expect(200);

    await request(app)
      .patch(`${BASE}/${id}/activo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ activo: false })
      .expect(200);

    await agent.post(`${AUTH}/refresh`).expect(401);
  });

  it('GET /?activo=false — incluye productores inactivos', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const email = uniqueEmail('inactive-list');
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Inactivo',
        apellido: 'Lista',
        email,
        activo: false,
      })
      .expect(201);

    const res = await request(app)
      .get(BASE)
      .query({ activo: 'false' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const emails = (res.body.data as { usuario: { usuario: string } }[]).map((r) =>
      r.usuario.usuario.toLowerCase(),
    );
    expect(emails).toContain(email.toLowerCase());
  });
});
