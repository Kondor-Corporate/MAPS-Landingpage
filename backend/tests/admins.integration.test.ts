import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Rol } from '@prisma/client';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

const BASE = '/api/v1/admins';
const AUTH = '/api/v1/auth';
const PRODUCERS = '/api/v1/producers';
const TEST_PASSWORD = 'Temporal123';
const NEW_PASSWORD = 'NuevaClave456';
const RESET_PASSWORD = 'Reseteada789';
const ADMIN_DTO_KEYS = ['activo', 'createdAt', 'id', 'lastLoginAt', 'usuario'];

function uniqueUsuario(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function expectAdminDto(data: Record<string, unknown>): void {
  expect(Object.keys(data).sort()).toEqual(ADMIN_DTO_KEYS);
  expect(typeof data.id).toBe('number');
  expect(typeof data.usuario).toBe('string');
  expect(typeof data.activo).toBe('boolean');
  expect(data.lastLoginAt === null || typeof data.lastLoginAt === 'string').toBe(true);
  expect(typeof data.createdAt).toBe('string');
}

function expectNoSensitive(body: unknown): void {
  const raw = JSON.stringify(body);
  expect(raw).not.toContain('passwordHash');
  expect(raw).not.toContain('tokenVersion');
  expect(raw).not.toContain('creadoPor');
  expect(raw).not.toMatch(/"rol"/);
  expect(raw).not.toMatch(/"updatedAt"/);
}

async function loginUsuarioPassword(
  app: ReturnType<typeof createApp>,
  usuario: string,
  password: string,
): Promise<string> {
  const res = await request(app).post(`${AUTH}/login`).send({ usuario, password }).expect(200);
  return res.body.data.accessToken as string;
}

async function deleteTempUser(id: number): Promise<void> {
  await prisma.sesionToken.deleteMany({ where: { usuarioId: id } });
  await prisma.productor.deleteMany({ where: { usuarioId: id } });
  await prisma.usuario.delete({ where: { id } }).catch(() => undefined);
}

async function tokenVersionOf(id: number): Promise<number> {
  const row = await prisma.usuario.findUniqueOrThrow({
    where: { id },
    select: { tokenVersion: true },
  });
  return row.tokenVersion;
}

describe('admins API (integración)', () => {
  const app = createApp();

  beforeAll(() => {
    loadEnv();
  });

  // ─── RBAC ──────────────────────────────────────────────────────────────────

  it('GET / — sin token → 401', async () => {
    const res = await request(app).get(BASE).expect(401);
    expect(res.body.message).toBe('Token de acceso requerido');
  });

  it('GET / — con PRODUCTOR → 403', async () => {
    const token = await loginUsuarioPassword(app, 'user', 'User1234!');
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`).expect(403);
    expect(res.body.message).toBe('Acceso denegado');
  });

  it('GET / — con ADMIN → 403', async () => {
    const token = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`).expect(403);
    expect(res.body.message).toBe('Acceso denegado');
  });

  it('GET / — con SUPERADMIN → 200', async () => {
    const token = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`).expect(200);

    expect(res.body.message).toBe('OK');
    expect(Array.isArray(res.body.data)).toBe(true);
    expectNoSensitive(res.body);

    const usuarios = (res.body.data as { usuario: string }[]).map((a) => a.usuario);
    expect(usuarios).toContain('admin');
    expect(usuarios).not.toContain('superadmin');
    expect(usuarios).not.toContain('user');

    for (const row of res.body.data as Record<string, unknown>[]) {
      expectAdminDto(row);
    }
  });

  it('POST / — con ADMIN → 403', async () => {
    const token = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuario: uniqueUsuario('d1b-forbidden'),
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
      })
      .expect(403);
  });

  it('PATCH /:id/activo — con PRODUCTOR → 403', async () => {
    const token = await loginUsuarioPassword(app, 'user', 'User1234!');
    const admin = await prisma.usuario.findUniqueOrThrow({
      where: { usuario: 'admin' },
      select: { id: true },
    });
    await request(app)
      .patch(`${BASE}/${admin.id}/activo`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activo: true })
      .expect(403);
  });

  // ─── Listado y filtros ─────────────────────────────────────────────────────

  it('GET / — ?activo=true/false filtra por Usuario.activo', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const usuario = uniqueUsuario('d1b-filter');
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ usuario, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD })
      .expect(201);
    const id = createRes.body.data.id as number;

    try {
      await request(app)
        .patch(`${BASE}/${id}/activo`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ activo: false })
        .expect(200);

      const inactive = await request(app)
        .get(`${BASE}?activo=false`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
      expect((inactive.body.data as { id: number }[]).some((a) => a.id === id)).toBe(true);

      const active = await request(app)
        .get(`${BASE}?activo=true`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
      expect((active.body.data as { id: number }[]).some((a) => a.id === id)).toBe(false);
    } finally {
      await deleteTempUser(id);
    }
  });

  // ─── Alta ──────────────────────────────────────────────────────────────────

  it('POST / — crea Usuario ADMIN activo, sin Productor, con creadoPorId', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const superadmin = await prisma.usuario.findUniqueOrThrow({
      where: { usuario: 'superadmin' },
      select: { id: true },
    });
    const usuario = uniqueUsuario('d1b-create');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        usuario: `  ${usuario.toUpperCase()}  `,
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
      })
      .expect(201);

    const id = res.body.data.id as number;
    try {
      expect(res.body.message).toBe('Administrador creado');
      expectAdminDto(res.body.data);
      expect(res.body.data.usuario).toBe(usuario.toLowerCase());
      expect(res.body.data.activo).toBe(true);
      expect(res.body.data.lastLoginAt).toBeNull();
      expectNoSensitive(res.body);

      const row = await prisma.usuario.findUniqueOrThrow({
        where: { id },
        select: { rol: true, activo: true, creadoPorId: true, usuario: true },
      });
      expect(row.rol).toBe(Rol.ADMIN);
      expect(row.activo).toBe(true);
      expect(row.creadoPorId).toBe(superadmin.id);
      expect(row.usuario).toBe(usuario.toLowerCase());

      const productor = await prisma.productor.findUnique({ where: { usuarioId: id } });
      expect(productor).toBeNull();

      await request(app)
        .post(`${AUTH}/login`)
        .send({ usuario: usuario.toLowerCase(), password: TEST_PASSWORD })
        .expect(200);
    } finally {
      await deleteTempUser(id);
    }
  });

  it('POST / — password débil → 422', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        usuario: uniqueUsuario('d1b-weak'),
        password: 'weak',
        confirmPassword: 'weak',
      })
      .expect(422);
    expect(res.body.message).toBe('Datos de entrada inválidos');
  });

  it('POST / — confirmación distinta → 422', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        usuario: uniqueUsuario('d1b-confirm'),
        password: TEST_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      })
      .expect(422);
  });

  it('POST / — body con rol o activo extra → 422', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        usuario: uniqueUsuario('d1b-strict'),
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
        rol: 'SUPERADMIN',
        activo: false,
      })
      .expect(422);
  });

  it('POST / — usuario duplicado exacto (ADMIN / PRODUCTOR / SUPERADMIN) → 409', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const usuario = uniqueUsuario('d1b-dup');
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ usuario, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD })
      .expect(201);
    const id = createRes.body.data.id as number;

    try {
      const dupAdmin = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ usuario, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD })
        .expect(409);
      expect(dupAdmin.body.message).toBe('El usuario ya está registrado');

      const dupProducer = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ usuario: 'user', password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD })
        .expect(409);
      expect(dupProducer.body.message).toBe('El usuario ya está registrado');

      const dupSuper = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ usuario: 'superadmin', password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD })
        .expect(409);
      expect(dupSuper.body.message).toBe('El usuario ya está registrado');
    } finally {
      await deleteTempUser(id);
    }
  });

  it('POST / — colisión histórica por distinto casing → 409', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const historical = `D1bHistAdmin-${suffix}`;
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
    const row = await prisma.usuario.create({
      data: {
        usuario: historical,
        passwordHash,
        rol: Rol.ADMIN,
        activo: true,
      },
    });

    try {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          usuario: historical.toLowerCase(),
          password: TEST_PASSWORD,
          confirmPassword: TEST_PASSWORD,
        })
        .expect(409);
      expect(res.body.message).toBe('El usuario ya está registrado');
    } finally {
      await deleteTempUser(row.id);
    }
  });

  // ─── Params inválidos / targets no administrables ──────────────────────────

  it('PATCH /:id — id no numérico → 422', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const res = await request(app)
      .patch(`${BASE}/abc`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ usuario: uniqueUsuario('d1b-id') })
      .expect(422);
    expect(res.body.message).toBe('Datos de entrada inválidos');
  });

  it('PATCH /:id — id inexistente → 404', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const res = await request(app)
      .patch(`${BASE}/999999999`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ usuario: uniqueUsuario('d1b-missing') })
      .expect(404);
    expect(res.body.message).toBe('Administrador no encontrado');
  });

  it.each([
    {
      name: 'activo',
      path: (id: number) => `${BASE}/${id}/activo`,
      body: { activo: false },
    },
    {
      name: 'password',
      path: (id: number) => `${BASE}/${id}/password`,
      body: { newPassword: RESET_PASSWORD, confirmPassword: RESET_PASSWORD },
    },
    {
      name: 'usuario',
      path: (id: number) => `${BASE}/${id}`,
      body: { usuario: uniqueUsuario('d1b-not-admin') },
    },
  ])('PATCH $name — id de PRODUCTOR → 404', async ({ path, body }) => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const producer = await prisma.usuario.findUniqueOrThrow({
      where: { usuario: 'user' },
      select: { id: true },
    });
    const res = await request(app)
      .patch(path(producer.id))
      .set('Authorization', `Bearer ${superToken}`)
      .send(body)
      .expect(404);
    expect(res.body.message).toBe('Administrador no encontrado');
  });

  it.each([
    {
      name: 'activo',
      path: (id: number) => `${BASE}/${id}/activo`,
      body: { activo: false },
    },
    {
      name: 'password',
      path: (id: number) => `${BASE}/${id}/password`,
      body: { newPassword: RESET_PASSWORD, confirmPassword: RESET_PASSWORD },
    },
    {
      name: 'usuario',
      path: (id: number) => `${BASE}/${id}`,
      body: { usuario: uniqueUsuario('d1b-not-super') },
    },
  ])('PATCH $name — id de SUPERADMIN → 404', async ({ path, body }) => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const superadmin = await prisma.usuario.findUniqueOrThrow({
      where: { usuario: 'superadmin' },
      select: { id: true },
    });
    const res = await request(app)
      .patch(path(superadmin.id))
      .set('Authorization', `Bearer ${superToken}`)
      .send(body)
      .expect(404);
    expect(res.body.message).toBe('Administrador no encontrado');
  });

  // ─── Edición de usuario ────────────────────────────────────────────────────

  it('PATCH /:id — normaliza usuario; mismo valor es no-op; cambio real revoca sesiones', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const usuario = uniqueUsuario('d1b-edit');
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ usuario, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD })
      .expect(201);
    const id = createRes.body.data.id as number;

    try {
      const agent = request.agent(app);
      const loginRes = await agent
        .post(`${AUTH}/login`)
        .send({ usuario, password: TEST_PASSWORD })
        .expect(200);
      const accessToken = loginRes.body.data.accessToken as string;
      await request(app)
        .get(PRODUCERS)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const versionBeforeNoop = await tokenVersionOf(id);
      const noop = await request(app)
        .patch(`${BASE}/${id}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ usuario: usuario.toUpperCase() })
        .expect(200);
      expect(noop.body.data.usuario).toBe(usuario);
      expect(await tokenVersionOf(id)).toBe(versionBeforeNoop);
      await request(app)
        .get(PRODUCERS)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      await agent.post(`${AUTH}/refresh`).expect(200);

      const nuevo = uniqueUsuario('d1b-edit-new');
      const changed = await request(app)
        .patch(`${BASE}/${id}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ usuario: `  ${nuevo.toUpperCase()}  ` })
        .expect(200);
      expect(changed.body.message).toBe('Administrador actualizado');
      expect(changed.body.data.usuario).toBe(nuevo.toLowerCase());
      expectNoSensitive(changed.body);
      expect(await tokenVersionOf(id)).toBe(versionBeforeNoop + 1);

      await request(app)
        .get(PRODUCERS)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
      await agent.post(`${AUTH}/refresh`).expect(401);

      await request(app)
        .post(`${AUTH}/login`)
        .send({ usuario, password: TEST_PASSWORD })
        .expect(401);
      await request(app)
        .post(`${AUTH}/login`)
        .send({ usuario: nuevo.toLowerCase(), password: TEST_PASSWORD })
        .expect(200);
    } finally {
      await deleteTempUser(id);
    }
  });

  // ─── Activo: revocación e idempotencia ─────────────────────────────────────

  it('PATCH /:id/activo — desactivar revoca; no-op no incrementa; reactivar no revive tokens', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const usuario = uniqueUsuario('d1b-activo');
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ usuario, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD })
      .expect(201);
    const id = createRes.body.data.id as number;

    try {
      const agent = request.agent(app);
      const loginRes = await agent
        .post(`${AUTH}/login`)
        .send({ usuario, password: TEST_PASSWORD })
        .expect(200);
      const accessToken = loginRes.body.data.accessToken as string;
      const versionAfterLogin = await tokenVersionOf(id);

      const deactivate = await request(app)
        .patch(`${BASE}/${id}/activo`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ activo: false })
        .expect(200);
      expect(deactivate.body.message).toBe('Administrador desactivado');
      expect(deactivate.body.data.activo).toBe(false);
      expectNoSensitive(deactivate.body);
      const versionAfterDeactivate = await tokenVersionOf(id);
      expect(versionAfterDeactivate).toBe(versionAfterLogin + 1);

      await request(app)
        .get(PRODUCERS)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
      await agent.post(`${AUTH}/refresh`).expect(401);
      await request(app)
        .post(`${AUTH}/login`)
        .send({ usuario, password: TEST_PASSWORD })
        .expect(403);

      const deactivateNoop = await request(app)
        .patch(`${BASE}/${id}/activo`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ activo: false })
        .expect(200);
      expect(deactivateNoop.body.message).toBe('Administrador desactivado');
      expect(await tokenVersionOf(id)).toBe(versionAfterDeactivate);

      const reactivate = await request(app)
        .patch(`${BASE}/${id}/activo`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ activo: true })
        .expect(200);
      expect(reactivate.body.message).toBe('Administrador reactivado');
      expect(reactivate.body.data.activo).toBe(true);
      expect(await tokenVersionOf(id)).toBe(versionAfterDeactivate);

      await agent.post(`${AUTH}/refresh`).expect(401);
      await request(app)
        .get(PRODUCERS)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      const relogin = request.agent(app);
      const newLogin = await relogin
        .post(`${AUTH}/login`)
        .send({ usuario, password: TEST_PASSWORD })
        .expect(200);
      const newAccess = newLogin.body.data.accessToken as string;

      const reactivateNoop = await request(app)
        .patch(`${BASE}/${id}/activo`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ activo: true })
        .expect(200);
      expect(reactivateNoop.body.message).toBe('Administrador reactivado');
      expect(await tokenVersionOf(id)).toBe(versionAfterDeactivate);

      await request(app).get(PRODUCERS).set('Authorization', `Bearer ${newAccess}`).expect(200);
      await relogin.post(`${AUTH}/refresh`).expect(200);
    } finally {
      await deleteTempUser(id);
    }
  });

  // ─── Reset password ────────────────────────────────────────────────────────

  it('PATCH /:id/password — revoca sesiones; la anterior falla; la nueva funciona', async () => {
    const superToken = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
    const usuario = uniqueUsuario('d1b-reset');
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ usuario, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD })
      .expect(201);
    const id = createRes.body.data.id as number;

    try {
      const agent = request.agent(app);
      const loginRes = await agent
        .post(`${AUTH}/login`)
        .send({ usuario, password: TEST_PASSWORD })
        .expect(200);
      const accessToken = loginRes.body.data.accessToken as string;
      const versionBefore = await tokenVersionOf(id);

      const res = await request(app)
        .patch(`${BASE}/${id}/password`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ newPassword: RESET_PASSWORD, confirmPassword: RESET_PASSWORD })
        .expect(200);

      expect(res.body).toEqual({
        data: null,
        message: 'Contraseña restablecida',
        error: null,
      });
      expectNoSensitive(res.body);
      expect(await tokenVersionOf(id)).toBe(versionBefore + 1);

      await request(app)
        .get(PRODUCERS)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
      await agent.post(`${AUTH}/refresh`).expect(401);

      await request(app)
        .post(`${AUTH}/login`)
        .send({ usuario, password: TEST_PASSWORD })
        .expect(401);
      await request(app)
        .post(`${AUTH}/login`)
        .send({ usuario, password: RESET_PASSWORD })
        .expect(200);
    } finally {
      await deleteTempUser(id);
    }
  });

  it('PATCH /:id/password — no limpia la cookie del SUPERADMIN caller', async () => {
    const superAgent = request.agent(app);
    const superLogin = await superAgent
      .post(`${AUTH}/login`)
      .send({ usuario: 'superadmin', password: 'Super1234!' })
      .expect(200);
    const superToken = superLogin.body.data.accessToken as string;

    const usuario = uniqueUsuario('d1b-reset-cookie');
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ usuario, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD })
      .expect(201);
    const id = createRes.body.data.id as number;

    try {
      const resetRes = await superAgent
        .patch(`${BASE}/${id}/password`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ newPassword: RESET_PASSWORD, confirmPassword: RESET_PASSWORD })
        .expect(200);

      const setCookie = resetRes.headers['set-cookie'] as string[] | string | undefined;
      if (setCookie) {
        const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
        expect(arr.some((c) => c.startsWith('maps_refresh=;') || c.includes('maps_refresh=;'))).toBe(
          false,
        );
      }

      await superAgent.post(`${AUTH}/refresh`).expect(200);
    } finally {
      await deleteTempUser(id);
    }
  });
});
