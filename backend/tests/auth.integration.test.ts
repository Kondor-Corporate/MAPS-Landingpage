import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { REFRESH_COOKIE_NAME } from '../src/config/authCookies.js';

const BASE = '/api/v1/auth';

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
    expect(res.body.data).not.toHaveProperty('refreshToken');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

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

  // ─── Refresh vía cookie (camino principal) ────────────────────────────────

  it('POST /refresh — con cookie válida devuelve nuevo accessToken', async () => {
    const agent = request.agent(app);

    await agent
      .post(`${BASE}/login`)
      .send({ usuario: 'admin', password: 'Admin1234!' })
      .expect(200);

    const res = await agent.post(`${BASE}/refresh`).expect(200);

    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
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

  // ─── Logout ───────────────────────────────────────────────────────────────

  it('POST /logout — revoca sesión y limpia cookie', async () => {
    const agent = request.agent(app);

    const loginRes = await agent
      .post(`${BASE}/login`)
      .send({ usuario: 'admin', password: 'Admin1234!' })
      .expect(200);

    const accessToken = loginRes.body.data.accessToken as string;

    const logoutRes = await agent
      .post(`${BASE}/logout`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(logoutRes.body.message).toBe('Sesión cerrada');

    const clearCookies = logoutRes.headers['set-cookie'] as string[] | string | undefined;
    if (clearCookies) {
      const clearArr = Array.isArray(clearCookies) ? clearCookies : [clearCookies];
      const cleared = clearArr.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      expect(cleared).toBeDefined();
    }

    await agent.post(`${BASE}/refresh`).expect(401);
  });

  it('POST /logout — sin Authorization → 401', async () => {
    const agent = request.agent(app);

    await agent
      .post(`${BASE}/login`)
      .send({ usuario: 'admin', password: 'Admin1234!' })
      .expect(200);

    await agent.post(`${BASE}/logout`).expect(401);
  });
});
