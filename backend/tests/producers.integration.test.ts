import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';

vi.mock('../src/lib/geocode.js', () => ({
  geocodeAddress: vi.fn(async () => ({ latitud: -34.9214, longitud: -57.9545 })),
  reverseGeocodeCoordinates: vi.fn(async () => null),
}));

const BASE = '/api/v1/producers';
const AUTH = '/api/v1/auth';
const TEST_CIUDAD = 'Calle 7 776, La Plata, Buenos Aires, Argentina';
/** Password individual usada para altas de test (MAPS-016: ya no hay password global). */
const TEST_PASSWORD = 'Temporal123';

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

function createProducer(
  app: ReturnType<typeof createApp>,
  adminToken: string,
  overrides: Record<string, unknown> = {},
) {
  return request(app)
    .post(BASE)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      nombre: 'Nuevo',
      apellido: 'Productor',
      email: uniqueEmail('create'),
      password: TEST_PASSWORD,
      ciudad: TEST_CIUDAD,
      ...overrides,
    });
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
    await createProducer(app, adminToken, { nombre: 'Forbidden', apellido: 'List', email }).expect(
      201,
    );

    const producerToken = await loginUsuarioPassword(app, email, TEST_PASSWORD);

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
    const res = await createProducer(app, adminToken, {
      nombre: 'Nuevo',
      apellido: 'Productor',
      email,
      telefono: '555-0000',
    }).expect(201);

    expect(res.body.data).toMatchObject({
      nombre: 'Nuevo',
      apellido: 'Productor',
      usuario: { usuario: email.toLowerCase(), rol: 'PRODUCTOR' },
    });
  });

  it('POST / — la respuesta no expone passwordHash', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const res = await createProducer(app, adminToken).expect(201);

    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('POST / — el productor creado puede loguearse con la password inicial', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const email = uniqueEmail('login-inicial');
    await createProducer(app, adminToken, { email }).expect(201);

    const res = await request(app)
      .post(`${AUTH}/login`)
      .send({ usuario: email, password: TEST_PASSWORD })
      .expect(200);

    expect(res.body.data.user).toMatchObject({ usuario: email.toLowerCase() });
  });

  it('POST / — sin password → 422', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Sin',
        apellido: 'Password',
        email: uniqueEmail('no-password'),
        ciudad: TEST_CIUDAD,
      })
      .expect(422);

    expect(res.body.message).toBe('Datos de entrada inválidos');
  });

  it('POST / — password débil → 422', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const res = await createProducer(app, adminToken, {
      email: uniqueEmail('weak-password'),
      password: 'debil',
    }).expect(422);

    expect(res.body.message).toBe('Datos de entrada inválidos');
  });

  it('POST / — usuario no admin no puede crear productor', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const email = uniqueEmail('no-admin-create');
    await createProducer(app, adminToken, { email }).expect(201);
    const producerToken = await loginUsuarioPassword(app, email, TEST_PASSWORD);

    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${producerToken}`)
      .send({
        nombre: 'Otro',
        apellido: 'Productor',
        email: uniqueEmail('blocked'),
        password: TEST_PASSWORD,
        ciudad: TEST_CIUDAD,
      })
      .expect(403);
  });

  it('POST / — email duplicado → 409', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const email = uniqueEmail('dup-email');

    await createProducer(app, adminToken, { nombre: 'A', apellido: 'B', email }).expect(201);

    const res = await createProducer(app, adminToken, { nombre: 'A', apellido: 'B', email }).expect(
      409,
    );

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
        password: TEST_PASSWORD,
        whatsapp: '+5491112345678',
      })
      .expect(422);

    expect(res.body.message).toBe('Datos de entrada inválidos');
  });

  it('PATCH /:id — actualiza datos básicos', async () => {
    const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const createRes = await createProducer(app, adminToken, {
      nombre: 'Antes',
      apellido: 'Nombre',
    }).expect(201);

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
    const createRes = await createProducer(app, adminToken, {
      nombre: 'Sesión',
      apellido: 'Revocada',
      email,
    }).expect(201);

    const id = createRes.body.data.id as number;

    const agent = request.agent(app);
    await agent
      .post(`${AUTH}/login`)
      .send({ usuario: email, password: TEST_PASSWORD })
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
    await createProducer(app, adminToken, {
      nombre: 'Inactivo',
      apellido: 'Lista',
      email,
      activo: false,
    }).expect(201);

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

  // ─── Cambio de contraseña self-service (PATCH /producers/me/password) ─────────

  describe('PATCH /me/password', () => {
    it('productor autenticado cambia su contraseña correctamente', async () => {
      const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const email = uniqueEmail('self-change-ok');
      await createProducer(app, adminToken, { email }).expect(201);
      const producerToken = await loginUsuarioPassword(app, email, TEST_PASSWORD);

      const res = await request(app)
        .patch(`${BASE}/me/password`)
        .set('Authorization', `Bearer ${producerToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: 'NuevaClave456',
          confirmPassword: 'NuevaClave456',
        })
        .expect(200);

      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('login con la nueva contraseña funciona; con la anterior falla', async () => {
      const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const email = uniqueEmail('self-change-login');
      await createProducer(app, adminToken, { email }).expect(201);
      const producerToken = await loginUsuarioPassword(app, email, TEST_PASSWORD);

      await request(app)
        .patch(`${BASE}/me/password`)
        .set('Authorization', `Bearer ${producerToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: 'NuevaClave456',
          confirmPassword: 'NuevaClave456',
        })
        .expect(200);

      await request(app)
        .post(`${AUTH}/login`)
        .send({ usuario: email, password: 'NuevaClave456' })
        .expect(200);

      await request(app)
        .post(`${AUTH}/login`)
        .send({ usuario: email, password: TEST_PASSWORD })
        .expect(401);
    });

    it('contraseña actual incorrecta → 400', async () => {
      const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const email = uniqueEmail('self-change-wrong-current');
      await createProducer(app, adminToken, { email }).expect(201);
      const producerToken = await loginUsuarioPassword(app, email, TEST_PASSWORD);

      const res = await request(app)
        .patch(`${BASE}/me/password`)
        .set('Authorization', `Bearer ${producerToken}`)
        .send({
          currentPassword: 'Incorrecta123',
          newPassword: 'NuevaClave456',
          confirmPassword: 'NuevaClave456',
        })
        .expect(400);

      expect(res.body.message).toBe('Contraseña actual incorrecta');
    });

    it('nueva contraseña y confirmación no coinciden → 422', async () => {
      const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const email = uniqueEmail('self-change-mismatch');
      await createProducer(app, adminToken, { email }).expect(201);
      const producerToken = await loginUsuarioPassword(app, email, TEST_PASSWORD);

      await request(app)
        .patch(`${BASE}/me/password`)
        .set('Authorization', `Bearer ${producerToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: 'NuevaClave456',
          confirmPassword: 'OtraClave789',
        })
        .expect(422);
    });

    it('sin token → 401', async () => {
      await request(app)
        .patch(`${BASE}/me/password`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: 'NuevaClave456',
          confirmPassword: 'NuevaClave456',
        })
        .expect(401);
    });

    it('un ADMIN no puede usar el endpoint self-service de productor', async () => {
      const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .patch(`${BASE}/me/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'Admin1234!',
          newPassword: 'NuevaClave456',
          confirmPassword: 'NuevaClave456',
        })
        .expect(403);
    });
  });

  // ─── Restablecimiento administrativo (PATCH /producers/:id/password) ──────────

  describe('PATCH /:id/password', () => {
    it('admin restablece la contraseña sin conocer la actual', async () => {
      const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const email = uniqueEmail('reset-ok');
      const createRes = await createProducer(app, adminToken, { email }).expect(201);
      const id = createRes.body.data.id as number;

      const res = await request(app)
        .patch(`${BASE}/${id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'Reseteada789', confirmPassword: 'Reseteada789' })
        .expect(200);

      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('login con la contraseña reseteada funciona; con la anterior falla (sesión revocada)', async () => {
      const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const email = uniqueEmail('reset-login');
      const createRes = await createProducer(app, adminToken, { email }).expect(201);
      const id = createRes.body.data.id as number;

      const agent = request.agent(app);
      await agent
        .post(`${AUTH}/login`)
        .send({ usuario: email, password: TEST_PASSWORD })
        .expect(200);

      await request(app)
        .patch(`${BASE}/${id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'Reseteada789', confirmPassword: 'Reseteada789' })
        .expect(200);

      // La sesión (refresh token) previa queda revocada.
      await agent.post(`${AUTH}/refresh`).expect(401);

      await request(app)
        .post(`${AUTH}/login`)
        .send({ usuario: email, password: 'Reseteada789' })
        .expect(200);

      await request(app)
        .post(`${AUTH}/login`)
        .send({ usuario: email, password: TEST_PASSWORD })
        .expect(401);
    });

    it('usuario PRODUCTOR no puede usar el endpoint admin de reset → 403', async () => {
      const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const email = uniqueEmail('reset-forbidden');
      const createRes = await createProducer(app, adminToken, { email }).expect(201);
      const id = createRes.body.data.id as number;
      const producerToken = await loginUsuarioPassword(app, email, TEST_PASSWORD);

      await request(app)
        .patch(`${BASE}/${id}/password`)
        .set('Authorization', `Bearer ${producerToken}`)
        .send({ newPassword: 'Reseteada789', confirmPassword: 'Reseteada789' })
        .expect(403);
    });

    it('sin token → 401', async () => {
      await request(app)
        .patch(`${BASE}/1/password`)
        .send({ newPassword: 'Reseteada789', confirmPassword: 'Reseteada789' })
        .expect(401);
    });

    it('productor inexistente → 404', async () => {
      const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .patch(`${BASE}/999999999/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'Reseteada789', confirmPassword: 'Reseteada789' })
        .expect(404);
    });

    it('password débil o sin coincidencia → 422', async () => {
      const adminToken = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const email = uniqueEmail('reset-weak');
      const createRes = await createProducer(app, adminToken, { email }).expect(201);
      const id = createRes.body.data.id as number;

      await request(app)
        .patch(`${BASE}/${id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'debil', confirmPassword: 'debil' })
        .expect(422);

      await request(app)
        .patch(`${BASE}/${id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'Reseteada789', confirmPassword: 'Distinta123' })
        .expect(422);
    });
  });
});
