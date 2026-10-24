import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import type { Rol } from '@prisma/client';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import * as envModule from '../src/config/env.js';
import { REFRESH_COOKIE_NAME } from '../src/config/authCookies.js';
import { prisma } from '../src/lib/prisma.js';

const BASE = '/api/v1/auth';
const PRODUCERS_BASE = '/api/v1/producers';

function decodeAccessToken(token: string): jwt.JwtPayload & { ver?: unknown } {
  return jwt.decode(token) as jwt.JwtPayload & { ver?: unknown };
}

describe('auth API (integración)', () => {
  const app = createApp();

  beforeAll(() => {
    loadEnv();
  });

  // ─── Login ───────────────────────────────────────────────────────────────────

  it('POST /login — credenciales válidas: accessToken en JSON y refresh en cookie', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ usuario: 'admin', password: 'Admin1234!' })
      .expect(200);

    expect(res.body.data).toMatchObject({
      user: { usuario: 'admin', rol: 'ADMIN' },
    });
    expect(res.body.data.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(decodeAccessToken(res.body.data.accessToken as string).ver).toEqual(expect.any(Number));
    expect(res.body.data).not.toHaveProperty('refreshToken');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.user).not.toHaveProperty('tokenVersion');

    const cookies = res.headers['set-cookie'] as string[] | string;
    const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
    expect(cookieArr.some((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`))).toBe(true);
    expect(cookieArr.some((c) => c.toLowerCase().includes('httponly'))).toBe(true);
  });

  it('POST /login — contraseña incorrecta → 401 genérico', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ usuario: 'admin', password: 'wrong-password' })
      .expect(401);

    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('POST /login — usuario inexistente → 401 genérico', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ usuario: 'no_existe_xyz', password: 'cualquiera' })
      .expect(401);

    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('POST /login — body inválido → 400', async () => {
    const res = await request(app).post(`${BASE}/login`).send({}).expect(400);

    expect(res.body.message).toBe('Datos de entrada inválidos');
  });

  it('access token con ver=0 es aceptado', async () => {
    const env = loadEnv();
    const admin = await prisma.usuario.findUniqueOrThrow({
      where: { usuario: 'admin' },
      select: { id: true, tokenVersion: true },
    });

    await prisma.usuario.update({
      where: { id: admin.id },
      data: { tokenVersion: 0 },
    });

    try {
      const token = jwt.sign(
        { sub: String(admin.id), role: 'ADMIN', ver: 0 },
        env.JWT_SECRET,
        { expiresIn: '15m' },
      );

      await request(app)
        .get(PRODUCERS_BASE)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    } finally {
      await prisma.usuario.update({
        where: { id: admin.id },
        data: { tokenVersion: admin.tokenVersion },
      });
    }
  });

  it('access token legacy sin ver es rechazado', async () => {
    const env = loadEnv();
    const admin = await prisma.usuario.findUniqueOrThrow({
      where: { usuario: 'admin' },
      select: { id: true },
    });
    const token = jwt.sign(
      { sub: String(admin.id), role: 'ADMIN' },
      env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    const res = await request(app)
      .get(PRODUCERS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(res.body.message).toBe('Token inválido');
  });

  it('access token cuyo rol no coincide con la BD es rechazado', async () => {
    const env = loadEnv();
    const admin = await prisma.usuario.findUniqueOrThrow({
      where: { usuario: 'admin' },
      select: { id: true, tokenVersion: true },
    });
    const token = jwt.sign(
      { sub: String(admin.id), role: 'SUPERADMIN', ver: admin.tokenVersion },
      env.JWT_SECRET,
      { expiresIn: '15m' },
    );

    const res = await request(app)
      .get(PRODUCERS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(res.body.message).toBe('La sesión debe renovarse');
  });

  // ─── Refresh vía cookie (camino principal) ────────────────────────────────

  it('POST /refresh — un refresh legacy válido emite accessToken con ver actual', async () => {
    const agent = request.agent(app);

    await agent
      .post(`${BASE}/login`)
      .send({ usuario: 'admin', password: 'Admin1234!' })
      .expect(200);

    const res = await agent.post(`${BASE}/refresh`).expect(200);

    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(decodeAccessToken(res.body.data.accessToken as string).ver).toEqual(expect.any(Number));
    expect(res.body.data.user).toMatchObject({ usuario: 'admin', rol: 'ADMIN' });
    expect(res.body.data).not.toHaveProperty('refreshToken');
  });

  it('POST /refresh — sin cookie ni body → 401', async () => {
    const res = await request(app).post(`${BASE}/refresh`).expect(401);

    expect(res.body.message).toBeDefined();
  });

  // ─── Refresh vía body (camino alternativo: clientes sin cookies, Postman) ──

  it('POST /refresh — token válido en body devuelve nuevo accessToken', async () => {
    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ usuario: 'superadmin', password: 'Super1234!' })
      .expect(200);

    const cookies = loginRes.headers['set-cookie'] as string[] | string;
    const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
    const cookieHeader = cookieArr.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`))!;
    const refreshToken = cookieHeader.split('=')[1].split(';')[0];

    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken }).expect(200);

    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('POST /refresh — token inválido en body → 401', async () => {
    const res = await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken: 'not.a.jwt' })
      .expect(401);

    expect(res.body.message).toContain('Refresh');
    const cookies = res.headers['set-cookie'] as string[] | string | undefined;
    const cookieArr = cookies ? (Array.isArray(cookies) ? cookies : [cookies]) : [];
    expect(cookieArr.some((cookie) => cookie.startsWith(`${REFRESH_COOKIE_NAME}=`))).toBe(true);
  });

  it('POST /refresh — usar accessToken como refresh → 401', async () => {
    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ usuario: 'admin', password: 'Admin1234!' })
      .expect(200);

    const accessToken = loginRes.body.data.accessToken as string;

    const res = await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken: accessToken })
      .expect(401);

    expect(res.body.message).toBeDefined();
  });

  // ─── R4-C: rotación de refresh ────────────────────────────────────────────

  describe('POST /refresh — rotación', () => {
    const TEST_PASSWORD = 'Temporal123';

    function hashRefresh(token: string): string {
      return createHash('sha256').update(token).digest('hex');
    }

    function setCookieList(res: request.Response): string[] {
      const cookies = res.headers['set-cookie'] as string[] | string | undefined;
      if (!cookies) return [];
      return Array.isArray(cookies) ? cookies : [cookies];
    }

    function refreshCookieHeader(res: request.Response): string {
      const header = setCookieList(res).find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      expect(header).toBeDefined();
      return header!;
    }

    function refreshFromSetCookie(res: request.Response): string {
      return refreshCookieHeader(res).split('=')[1].split(';')[0];
    }

    function cookieAttributes(header: string): string {
      const semi = header.indexOf(';');
      return semi === -1 ? '' : header.slice(semi + 1);
    }

    function maxAgeSeconds(res: request.Response): number {
      const match = /max-age=(\d+)/i.exec(cookieAttributes(refreshCookieHeader(res)));
      expect(match).not.toBeNull();
      return Number(match![1]);
    }

    function refreshExp(token: string): number {
      const exp = (jwt.decode(token) as jwt.JwtPayload).exp;
      expect(exp).toEqual(expect.any(Number));
      return exp!;
    }

    function uniqueUsuario(prefix: string): string {
      return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    }

    async function createTempUser(): Promise<{ id: number; usuario: string }> {
      const usuario = uniqueUsuario('r4c');
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
      const row = await prisma.usuario.create({
        data: { usuario, passwordHash, rol: 'ADMIN', activo: true },
      });
      return { id: row.id, usuario };
    }

    async function deleteTempUser(id: number): Promise<void> {
      await prisma.sesionToken.deleteMany({ where: { usuarioId: id } });
      await prisma.usuario.delete({ where: { id } }).catch(() => undefined);
    }

    function expectRefreshJson(res: request.Response, usuario: string): void {
      expect(res.body).toEqual({
        data: {
          accessToken: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
          user: expect.objectContaining({ usuario, rol: 'ADMIN' }),
        },
        message: 'OK',
        error: null,
      });
      expect(res.body.data).not.toHaveProperty('refreshToken');
    }

    function expectSessionCookie(res: request.Response, secure: boolean): void {
      const attrs = cookieAttributes(refreshCookieHeader(res)).toLowerCase();
      expect(attrs).toContain('httponly');
      expect(attrs).toContain('path=/');
      expect(attrs).toContain('samesite=lax');
      expect(attrs.includes('secure')).toBe(secure);
    }

    it('rota R1→R2→R3, invalida el anterior y conserva la misma fila', async () => {
      const temp = await createTempUser();
      try {
        const agent = request.agent(app);
        const loginRes = await agent
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const r1 = refreshFromSetCookie(loginRes);
        const before = await prisma.sesionToken.findUniqueOrThrow({
          where: { tokenHash: hashRefresh(r1) },
        });
        const absoluteExp = Math.floor(before.expiresAt.getTime() / 1000);

        const first = await agent.post(`${BASE}/refresh`).expect(200);
        expectRefreshJson(first, temp.usuario);
        const r2 = refreshFromSetCookie(first);
        expect(r2).not.toBe(r1);
        expect(JSON.stringify(first.body)).not.toContain(r2);
        expect(refreshExp(r2)).toBe(absoluteExp);
        expect(refreshExp(r2)).toBe(refreshExp(r1));
        expectSessionCookie(first, loadEnv().NODE_ENV === 'production');
        const remaining = absoluteExp - Math.floor(Date.now() / 1000);
        expect(maxAgeSeconds(first)).toBeLessThanOrEqual(remaining + 2);
        expect(maxAgeSeconds(first)).toBeGreaterThan(remaining - 5);

        const afterFirst = await prisma.sesionToken.findUniqueOrThrow({ where: { id: before.id } });
        expect(afterFirst.tokenHash).toBe(hashRefresh(r2));
        expect(afterFirst.createdAt.getTime()).toBe(before.createdAt.getTime());
        expect(afterFirst.expiresAt.getTime()).toBe(before.expiresAt.getTime());
        expect(await prisma.sesionToken.count({ where: { usuarioId: temp.id } })).toBe(1);
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(r1) } })).toBeNull();

        const reused = await request(app).post(`${BASE}/refresh`).send({ refreshToken: r1 }).expect(401);
        expect(reused.body.message).toBe('Sesión no encontrada o revocada');
        expect(cookieAttributes(refreshCookieHeader(reused)).toLowerCase()).toMatch(/max-age=0|expires=/);

        const second = await agent.post(`${BASE}/refresh`).expect(200);
        expectRefreshJson(second, temp.usuario);
        const r3 = refreshFromSetCookie(second);
        expect(r3).not.toBe(r2);
        expect(JSON.stringify(second.body)).not.toContain(r3);
        expect(refreshExp(r3)).toBe(absoluteExp);
        expect(maxAgeSeconds(second)).toBeLessThanOrEqual(maxAgeSeconds(first) + 1);

        const afterSecond = await prisma.sesionToken.findUniqueOrThrow({ where: { id: before.id } });
        expect(afterSecond.tokenHash).toBe(hashRefresh(r3));
        expect(afterSecond.createdAt.getTime()).toBe(before.createdAt.getTime());
        expect(afterSecond.expiresAt.getTime()).toBe(before.expiresAt.getTime());
        expect(await prisma.sesionToken.count({ where: { usuarioId: temp.id } })).toBe(1);
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(r2) } })).toBeNull();

        await request(app).post(`${BASE}/refresh`).send({ refreshToken: r2 }).expect(401);
        await request(app).post(`${BASE}/refresh`).send({ refreshToken: r3 }).expect(200);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('no extiende la sesión: el exp rotado sigue el expiresAt persistido, no un nuevo plazo de 30 días', async () => {
      const temp = await createTempUser();
      try {
        const agent = request.agent(app);
        const loginRes = await agent
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const r1 = refreshFromSetCookie(loginRes);
        const created = await prisma.sesionToken.findUniqueOrThrow({
          where: { tokenHash: hashRefresh(r1) },
        });
        const shortened = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        await prisma.sesionToken.update({
          where: { id: created.id },
          data: { expiresAt: shortened },
        });
        const anchored = await prisma.sesionToken.findUniqueOrThrow({ where: { id: created.id } });

        const rotated = await agent.post(`${BASE}/refresh`).expect(200);
        const r2 = refreshFromSetCookie(rotated);
        const absoluteExp = Math.floor(anchored.expiresAt.getTime() / 1000);
        expect(refreshExp(r2)).toBe(absoluteExp);
        expect(refreshExp(r2)).toBeLessThan(refreshExp(r1));
        const maxAge = maxAgeSeconds(rotated);
        expect(maxAge).toBeLessThanOrEqual(2 * 24 * 60 * 60);
        expect(maxAge).toBeGreaterThan(2 * 24 * 60 * 60 - 30);

        const again = await agent.post(`${BASE}/refresh`).expect(200);
        expect(refreshExp(refreshFromSetCookie(again))).toBe(absoluteExp);
        const after = await prisma.sesionToken.findUniqueOrThrow({ where: { id: created.id } });
        expect(after.expiresAt.getTime()).toBe(anchored.expiresAt.getTime());
        expect(after.createdAt.getTime()).toBe(created.createdAt.getTime());
        expect(await prisma.sesionToken.count({ where: { usuarioId: temp.id } })).toBe(1);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('refresh por body rota la sesión y entrega el nuevo refresh solo por cookie', async () => {
      const temp = await createTempUser();
      try {
        const loginRes = await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const r1 = refreshFromSetCookie(loginRes);
        const before = await prisma.sesionToken.findUniqueOrThrow({
          where: { tokenHash: hashRefresh(r1) },
        });

        const rotated = await request(app).post(`${BASE}/refresh`).send({ refreshToken: r1 }).expect(200);
        expectRefreshJson(rotated, temp.usuario);
        const r2 = refreshFromSetCookie(rotated);
        expect(r2).not.toBe(r1);
        expect(JSON.stringify(rotated.body)).not.toContain(r2);
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(r1) } })).toBeNull();
        expect(
          await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(r2) } }),
        ).toMatchObject({ id: before.id });

        await request(app).post(`${BASE}/refresh`).send({ refreshToken: r1 }).expect(401);
        const third = await request(app).post(`${BASE}/refresh`).send({ refreshToken: r2 }).expect(200);
        expect(third.body.data).not.toHaveProperty('refreshToken');
        expect(refreshFromSetCookie(third)).not.toBe(r2);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('en production la cookie rotada incluye Secure', async () => {
      const temp = await createTempUser();
      const realEnv = loadEnv();
      try {
        const agent = request.agent(app);
        await agent.post(`${BASE}/login`).send({ usuario: temp.usuario, password: TEST_PASSWORD }).expect(200);

        const envSpy = vi.spyOn(envModule, 'loadEnv').mockReturnValue({
          ...realEnv,
          NODE_ENV: 'production',
        });
        try {
          const rotated = await agent.post(`${BASE}/refresh`).expect(200);
          expectSessionCookie(rotated, true);
          const remaining = refreshExp(refreshFromSetCookie(rotated)) - Math.floor(Date.now() / 1000);
          expect(maxAgeSeconds(rotated)).toBeLessThanOrEqual(remaining + 2);
        } finally {
          envSpy.mockRestore();
        }
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('dos refresh concurrentes con el mismo token producen una sola rotación y un 409', async () => {
      const temp = await createTempUser();
      try {
        const loginRes = await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const r1 = refreshFromSetCookie(loginRes);
        const before = await prisma.sesionToken.findUniqueOrThrow({
          where: { tokenHash: hashRefresh(r1) },
        });

        let waiting = 0;
        let releaseBoth!: () => void;
        const bothEntered = new Promise<void>((resolve) => {
          releaseBoth = resolve;
        });
        const timeout = setTimeout(() => releaseBoth(), 8_000);
        const originalUpdateMany = prisma.sesionToken.updateMany.bind(prisma.sesionToken);
        const spy = vi.spyOn(prisma.sesionToken, 'updateMany').mockImplementation(async (args) => {
          waiting += 1;
          if (waiting >= 2) releaseBoth();
          await bothEntered;
          return originalUpdateMany(args);
        });

        let winner: request.Response;
        let loser: request.Response;
        try {
          const [a, b] = await Promise.all([
            request(app).post(`${BASE}/refresh`).send({ refreshToken: r1 }),
            request(app).post(`${BASE}/refresh`).send({ refreshToken: r1 }),
          ]);
          expect(waiting).toBe(2);
          const ok = [a, b].filter((res) => res.status === 200);
          const conflict = [a, b].filter((res) => res.status === 409);
          expect(ok).toHaveLength(1);
          expect(conflict).toHaveLength(1);
          winner = ok[0];
          loser = conflict[0];
        } finally {
          clearTimeout(timeout);
          spy.mockRestore();
        }

        expect(loser.body).toEqual({
          data: null,
          message: 'Conflicto al renovar la sesión',
          error: null,
        });
        expect(setCookieList(loser).some((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`))).toBe(false);
        expectRefreshJson(winner, temp.usuario);
        const r2 = refreshFromSetCookie(winner);
        expect(r2).not.toBe(r1);
        expect(JSON.stringify(winner.body)).not.toContain(r2);

        const sessions = await prisma.sesionToken.findMany({ where: { usuarioId: temp.id } });
        expect(sessions).toHaveLength(1);
        expect(sessions[0]).toMatchObject({
          id: before.id,
          tokenHash: hashRefresh(r2),
        });
        expect(sessions[0].createdAt.getTime()).toBe(before.createdAt.getTime());
        expect(sessions[0].expiresAt.getTime()).toBe(before.expiresAt.getTime());
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(r1) } })).toBeNull();

        await request(app).post(`${BASE}/refresh`).send({ refreshToken: r1 }).expect(401);
        await request(app).post(`${BASE}/refresh`).send({ refreshToken: r2 }).expect(200);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('logout con el refresh vigente revoca solo esa sesión', async () => {
      const temp = await createTempUser();
      try {
        const agent1 = request.agent(app);
        const agent2 = request.agent(app);
        const login1 = await agent1
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const login2 = await agent2
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const r1 = refreshFromSetCookie(login1);
        const other = refreshFromSetCookie(login2);

        const rotated = await agent1.post(`${BASE}/refresh`).expect(200);
        const r2 = refreshFromSetCookie(rotated);

        const staleLogout = await request(app).post(`${BASE}/logout`).send({ refreshToken: r1 }).expect(200);
        expect(staleLogout.body.message).toBe('Sesión cerrada');
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(r2) } })).not.toBeNull();
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(other) } })).not.toBeNull();

        const logoutRes = await agent1.post(`${BASE}/logout`).expect(200);
        expect(logoutRes.body.message).toBe('Sesión cerrada');
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(r2) } })).toBeNull();
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(other) } })).not.toBeNull();
        expect(await prisma.sesionToken.count({ where: { usuarioId: temp.id } })).toBe(1);

        await agent1.post(`${BASE}/refresh`).expect(401);
        await agent2.post(`${BASE}/refresh`).expect(200);
      } finally {
        await deleteTempUser(temp.id);
      }
    });
  });

  // ─── Logout (D2A) ─────────────────────────────────────────────────────────

  describe('POST /logout', () => {
    const TEST_PASSWORD = 'Temporal123';

    function hashRefresh(token: string): string {
      return createHash('sha256').update(token).digest('hex');
    }

    function setCookieList(res: request.Response): string[] {
      const cookies = res.headers['set-cookie'] as string[] | string | undefined;
      if (!cookies) return [];
      return Array.isArray(cookies) ? cookies : [cookies];
    }

    function refreshFromSetCookie(res: request.Response): string {
      const header = setCookieList(res).find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      expect(header).toBeDefined();
      return header!.split('=')[1].split(';')[0];
    }

    function expectLogoutOk(res: request.Response): void {
      expect(res.body).toEqual({
        data: null,
        message: 'Sesión cerrada',
        error: null,
      });
      const clearHeader = setCookieList(res).find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      expect(clearHeader).toBeDefined();
      expect(clearHeader!.startsWith(`${REFRESH_COOKIE_NAME}=;`)).toBe(true);
      const lower = clearHeader!.toLowerCase();
      expect(lower.includes('expires=') || lower.includes('max-age=0')).toBe(true);
    }

    function uniqueUsuario(prefix: string): string {
      return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    }

    async function createTempUser(rol: Rol = 'ADMIN'): Promise<{ id: number; usuario: string }> {
      const usuario = uniqueUsuario(`d2a-${rol.toLowerCase()}`);
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
      const row = await prisma.usuario.create({
        data: {
          usuario,
          passwordHash,
          rol,
          activo: true,
          ...(rol === 'PRODUCTOR'
            ? {
                productor: {
                  create: {
                    slug: `d2a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    nombre: 'Temp',
                    apellido: 'User',
                  },
                },
              }
            : {}),
        },
      });
      return { id: row.id, usuario };
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

    async function sessionCount(usuarioId: number): Promise<number> {
      return prisma.sesionToken.count({ where: { usuarioId } });
    }

    it('refresh válido + sin Authorization → 200 y revoca solo esa sesión', async () => {
      const temp = await createTempUser();
      try {
        const agent = request.agent(app);
        await agent.post(`${BASE}/login`).send({ usuario: temp.usuario, password: TEST_PASSWORD }).expect(200);

        const logoutRes = await agent.post(`${BASE}/logout`).expect(200);
        expectLogoutOk(logoutRes);

        await agent.post(`${BASE}/refresh`).expect(401);
        expect(await sessionCount(temp.id)).toBe(0);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('Authorization basura + refresh válido → 200', async () => {
      const temp = await createTempUser();
      try {
        const agent = request.agent(app);
        await agent.post(`${BASE}/login`).send({ usuario: temp.usuario, password: TEST_PASSWORD }).expect(200);

        const logoutRes = await agent
          .post(`${BASE}/logout`)
          .set('Authorization', 'Bearer not.a.jwt')
          .expect(200);
        expectLogoutOk(logoutRes);
        await agent.post(`${BASE}/refresh`).expect(401);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('access expirado + refresh válido → 200', async () => {
      const temp = await createTempUser();
      try {
        const env = loadEnv();
        const agent = request.agent(app);
        const loginRes = await agent
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const user = loginRes.body.data.user as { rol: Rol };
        const expiredAccess = jwt.sign(
          {
            sub: String(temp.id),
            role: user.rol,
            ver: await tokenVersionOf(temp.id),
            exp: Math.floor(Date.now() / 1000) - 60,
          },
          env.JWT_SECRET,
        );

        const logoutRes = await agent
          .post(`${BASE}/logout`)
          .set('Authorization', `Bearer ${expiredAccess}`)
          .expect(200);
        expectLogoutOk(logoutRes);
        await agent.post(`${BASE}/refresh`).expect(401);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('elimina exactamente el SesionToken del refresh; la otra sesión permanece', async () => {
      const temp = await createTempUser();
      try {
        const agent1 = request.agent(app);
        const agent2 = request.agent(app);
        const login1 = await agent1
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        await agent2.post(`${BASE}/login`).send({ usuario: temp.usuario, password: TEST_PASSWORD }).expect(200);

        const refresh1 = refreshFromSetCookie(login1);
        expect(await sessionCount(temp.id)).toBe(2);

        const logoutRes = await agent1.post(`${BASE}/logout`).expect(200);
        expectLogoutOk(logoutRes);

        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(refresh1) } })).toBeNull();
        expect(await sessionCount(temp.id)).toBe(1);
        await agent1.post(`${BASE}/refresh`).expect(401);
        await agent2.post(`${BASE}/refresh`).expect(200);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('logout repetido y refresh ya revocado → 200', async () => {
      const temp = await createTempUser();
      try {
        const agent = request.agent(app);
        await agent.post(`${BASE}/login`).send({ usuario: temp.usuario, password: TEST_PASSWORD }).expect(200);

        expectLogoutOk(await agent.post(`${BASE}/logout`).expect(200));
        expectLogoutOk(await agent.post(`${BASE}/logout`).expect(200));
        expect(await sessionCount(temp.id)).toBe(0);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('refresh JWT expirado con hash persistido: jwt.verify fallaría y aun así se borra la fila', async () => {
      const temp = await createTempUser();
      try {
        const env = loadEnv();
        const expiredRefresh = jwt.sign(
          {
            sub: String(temp.id),
            role: 'ADMIN',
            typ: 'refresh',
            jti: randomUUID(),
            exp: Math.floor(Date.now() / 1000) - 60,
          },
          env.REFRESH_SECRET,
        );
        expect(() => jwt.verify(expiredRefresh, env.REFRESH_SECRET)).toThrow();

        const tokenHash = hashRefresh(expiredRefresh);
        await prisma.sesionToken.create({
          data: {
            usuarioId: temp.id,
            tokenHash,
            expiresAt: new Date(Date.now() - 60_000),
          },
        });
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash } })).not.toBeNull();

        const logoutRes = await request(app)
          .post(`${BASE}/logout`)
          .send({ refreshToken: expiredRefresh })
          .expect(200);
        expectLogoutOk(logoutRes);
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash } })).toBeNull();
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('refresh corrupto → 200 y no borra otras sesiones', async () => {
      const temp = await createTempUser();
      try {
        const agent = request.agent(app);
        await agent.post(`${BASE}/login`).send({ usuario: temp.usuario, password: TEST_PASSWORD }).expect(200);
        expect(await sessionCount(temp.id)).toBe(1);

        const deleteManySpy = vi.spyOn(prisma.sesionToken, 'deleteMany');

        const logoutRes = await request(app)
          .post(`${BASE}/logout`)
          .send({ refreshToken: 'not.a.jwt' })
          .expect(200);
        expectLogoutOk(logoutRes);
        expect(deleteManySpy).not.toHaveBeenCalled();
        deleteManySpy.mockRestore();

        expect(await sessionCount(temp.id)).toBe(1);
        await agent.post(`${BASE}/refresh`).expect(200);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('sin cookie/body → 200; no elimina sesiones de otro usuario', async () => {
      const temp = await createTempUser();
      try {
        await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        expect(await sessionCount(temp.id)).toBe(1);

        const logoutRes = await request(app).post(`${BASE}/logout`).expect(200);
        expectLogoutOk(logoutRes);
        expect(await sessionCount(temp.id)).toBe(1);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('{ refreshToken: "" } no es 400 y no bloquea la cookie válida', async () => {
      const temp = await createTempUser();
      try {
        const agent = request.agent(app);
        await agent.post(`${BASE}/login`).send({ usuario: temp.usuario, password: TEST_PASSWORD }).expect(200);

        const logoutRes = await agent.post(`${BASE}/logout`).send({ refreshToken: '' }).expect(200);
        expectLogoutOk(logoutRes);
        await agent.post(`${BASE}/refresh`).expect(401);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('body fallback: un refresh en body revoca solo esa sesión', async () => {
      const temp = await createTempUser();
      try {
        const loginA = await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const loginB = await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const refreshA = refreshFromSetCookie(loginA);
        const refreshB = refreshFromSetCookie(loginB);

        const logoutRes = await request(app).post(`${BASE}/logout`).send({ refreshToken: refreshA }).expect(200);
        expectLogoutOk(logoutRes);

        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(refreshA) } })).toBeNull();
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(refreshB) } })).not.toBeNull();
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('cookie válida + body con otro refresh: revoca solo la cookie (A), B permanece', async () => {
      const temp = await createTempUser();
      try {
        const agent = request.agent(app);
        const loginA = await agent
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const loginB = await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const refreshA = refreshFromSetCookie(loginA);
        const refreshB = refreshFromSetCookie(loginB);

        const logoutRes = await agent.post(`${BASE}/logout`).send({ refreshToken: refreshB }).expect(200);
        expectLogoutOk(logoutRes);

        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(refreshA) } })).toBeNull();
        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(refreshB) } })).not.toBeNull();
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('cookie válida + body refreshToken de tipo inválido → 200 y revoca la cookie', async () => {
      const temp = await createTempUser();
      try {
        const agent = request.agent(app);
        const loginRes = await agent
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const refreshA = refreshFromSetCookie(loginRes);

        const logoutRes = await agent.post(`${BASE}/logout`).send({ refreshToken: 123 }).expect(200);
        expectLogoutOk(logoutRes);

        expect(await prisma.sesionToken.findUnique({ where: { tokenHash: hashRefresh(refreshA) } })).toBeNull();
        await agent.post(`${BASE}/refresh`).expect(401);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('allowRefreshBody=false + body inválido sin cookie → body ignorado, 200 idempotente', async () => {
      const temp = await createTempUser();
      const envSpy = vi.spyOn(envModule, 'loadEnv').mockReturnValue({
        ...loadEnv(),
        allowRefreshBody: false,
        NODE_ENV: 'production',
      });
      try {
        await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        expect(await sessionCount(temp.id)).toBe(1);

        const logoutRes = await request(app)
          .post(`${BASE}/logout`)
          .send({ refreshToken: 123 })
          .expect(200);
        expectLogoutOk(logoutRes);
        expect(await sessionCount(temp.id)).toBe(1);
      } finally {
        envSpy.mockRestore();
        await deleteTempUser(temp.id);
      }
    });

    it('Prisma deleteMany falla → 500 y clearCookie de maps_refresh', async () => {
      const temp = await createTempUser();
      try {
        const agent = request.agent(app);
        await agent.post(`${BASE}/login`).send({ usuario: temp.usuario, password: TEST_PASSWORD }).expect(200);

        const deleteManySpy = vi
          .spyOn(prisma.sesionToken, 'deleteMany')
          .mockRejectedValueOnce(new Error('DB down'));

        const logoutRes = await agent.post(`${BASE}/logout`).expect(500);
        expect(logoutRes.body.message).toBeDefined();
        const clearHeader = setCookieList(logoutRes).find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
        expect(clearHeader).toBeDefined();
        expect(clearHeader!.startsWith(`${REFRESH_COOKIE_NAME}=;`)).toBe(true);

        deleteManySpy.mockRestore();
        expect(await sessionCount(temp.id)).toBe(1);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('tokenVersion no cambia; el access previo sigue autorizado', async () => {
      const temp = await createTempUser();
      try {
        const agent = request.agent(app);
        const loginRes = await agent
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const accessToken = loginRes.body.data.accessToken as string;
        const versionBefore = await tokenVersionOf(temp.id);

        await request(app)
          .get(PRODUCERS_BASE)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expectLogoutOk(await agent.post(`${BASE}/logout`).expect(200));

        expect(await tokenVersionOf(temp.id)).toBe(versionBefore);
        await request(app)
          .get(PRODUCERS_BASE)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
        await agent.post(`${BASE}/refresh`).expect(401);
      } finally {
        await deleteTempUser(temp.id);
      }
    });
  });

  // ─── Cambio self-service (PATCH /auth/me/password) ─────────────────────────

  describe('PATCH /me/password', () => {
    const TEST_PASSWORD = 'Temporal123';
    const NEW_PASSWORD = 'NuevaClave456';

    function uniqueUsuario(prefix: string): string {
      return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    }

    async function createTempUser(rol: Rol): Promise<{ id: number; usuario: string }> {
      const usuario = uniqueUsuario(`d1a-${rol.toLowerCase()}`);
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
      const row = await prisma.usuario.create({
        data: {
          usuario,
          passwordHash,
          rol,
          activo: true,
          ...(rol === 'PRODUCTOR'
            ? {
                productor: {
                  create: {
                    slug: `d1a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    nombre: 'Temp',
                    apellido: 'User',
                  },
                },
              }
            : {}),
        },
      });
      return { id: row.id, usuario };
    }

    async function deleteTempUser(id: number): Promise<void> {
      await prisma.sesionToken.deleteMany({ where: { usuarioId: id } });
      await prisma.productor.deleteMany({ where: { usuarioId: id } });
      await prisma.usuario.delete({ where: { id } }).catch(() => undefined);
    }

    function changePasswordBody(
      overrides: Partial<{
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
      }> = {},
    ) {
      return {
        currentPassword: TEST_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
        ...overrides,
      };
    }

    it('sin token → 401', async () => {
      await request(app).patch(`${BASE}/me/password`).send(changePasswordBody()).expect(401);
    });

    it('PRODUCTOR cambia su contraseña, revoca sesión y puede volver a entrar', async () => {
      const temp = await createTempUser('PRODUCTOR');
      try {
        const agent = request.agent(app);
        const loginRes = await agent
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const accessToken = loginRes.body.data.accessToken as string;

        const res = await agent
          .patch(`${BASE}/me/password`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(changePasswordBody())
          .expect(200);

        expect(res.body).toEqual({
          data: null,
          message: 'Contraseña actualizada',
          error: null,
        });
        expect(JSON.stringify(res.body)).not.toContain('passwordHash');
        expect(JSON.stringify(res.body)).not.toContain(accessToken);

        const clearCookies = res.headers['set-cookie'] as string[] | string | undefined;
        if (clearCookies) {
          const clearArr = Array.isArray(clearCookies) ? clearCookies : [clearCookies];
          const cleared = clearArr.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
          expect(cleared).toBeDefined();
        }

        await request(app)
          .get(`${PRODUCERS_BASE}/me`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(401);

        await agent.post(`${BASE}/refresh`).expect(401);

        await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(401);

        await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: NEW_PASSWORD })
          .expect(200);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('ADMIN temporal puede cambiar su contraseña', async () => {
      const temp = await createTempUser('ADMIN');
      try {
        const loginRes = await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const accessToken = loginRes.body.data.accessToken as string;

        await request(app)
          .patch(`${BASE}/me/password`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(changePasswordBody())
          .expect(200);

        await request(app)
          .get(PRODUCERS_BASE)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(401);

        await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: NEW_PASSWORD })
          .expect(200);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('SUPERADMIN temporal puede cambiar su contraseña', async () => {
      const temp = await createTempUser('SUPERADMIN');
      try {
        const loginRes = await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const accessToken = loginRes.body.data.accessToken as string;

        await request(app)
          .patch(`${BASE}/me/password`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(changePasswordBody())
          .expect(200);

        await request(app)
          .get(PRODUCERS_BASE)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(401);

        await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: NEW_PASSWORD })
          .expect(200);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('contraseña actual incorrecta → 400', async () => {
      const temp = await createTempUser('ADMIN');
      try {
        const loginRes = await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const accessToken = loginRes.body.data.accessToken as string;

        const res = await request(app)
          .patch(`${BASE}/me/password`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(changePasswordBody({ currentPassword: 'Incorrecta123' }))
          .expect(400);

        expect(res.body.message).toBe('Contraseña actual incorrecta');
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('nueva contraseña igual a la actual → 400', async () => {
      const temp = await createTempUser('ADMIN');
      try {
        const loginRes = await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const accessToken = loginRes.body.data.accessToken as string;

        const res = await request(app)
          .patch(`${BASE}/me/password`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(
            changePasswordBody({
              newPassword: TEST_PASSWORD,
              confirmPassword: TEST_PASSWORD,
            }),
          )
          .expect(400);

        expect(res.body.message).toBe('La nueva contraseña debe ser distinta de la actual');
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('password débil → 422', async () => {
      const temp = await createTempUser('ADMIN');
      try {
        const loginRes = await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const accessToken = loginRes.body.data.accessToken as string;

        await request(app)
          .patch(`${BASE}/me/password`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(
            changePasswordBody({
              newPassword: 'debil',
              confirmPassword: 'debil',
            }),
          )
          .expect(422);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('confirmación distinta → 422', async () => {
      const temp = await createTempUser('ADMIN');
      try {
        const loginRes = await request(app)
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const accessToken = loginRes.body.data.accessToken as string;

        await request(app)
          .patch(`${BASE}/me/password`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(changePasswordBody({ confirmPassword: 'OtraClave789' }))
          .expect(422);
      } finally {
        await deleteTempUser(temp.id);
      }
    });

    it('múltiples sesiones previas del mismo usuario quedan revocadas', async () => {
      const temp = await createTempUser('ADMIN');
      try {
        const agent1 = request.agent(app);
        const agent2 = request.agent(app);

        const login1 = await agent1
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);
        const login2 = await agent2
          .post(`${BASE}/login`)
          .send({ usuario: temp.usuario, password: TEST_PASSWORD })
          .expect(200);

        const token1 = login1.body.data.accessToken as string;
        const token2 = login2.body.data.accessToken as string;

        await agent1
          .patch(`${BASE}/me/password`)
          .set('Authorization', `Bearer ${token1}`)
          .send(changePasswordBody())
          .expect(200);

        await agent1.post(`${BASE}/refresh`).expect(401);
        await agent2.post(`${BASE}/refresh`).expect(401);

        await request(app)
          .get(PRODUCERS_BASE)
          .set('Authorization', `Bearer ${token1}`)
          .expect(401);
        await request(app)
          .get(PRODUCERS_BASE)
          .set('Authorization', `Bearer ${token2}`)
          .expect(401);
      } finally {
        await deleteTempUser(temp.id);
      }
    });
  });
});
