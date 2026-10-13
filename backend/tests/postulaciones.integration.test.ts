import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

const BASE = '/api/v1/postulaciones';
const AUTH = '/api/v1/auth';

/** Marcador de matrícula para aislar y limpiar las filas creadas por esta suite. */
const MARKER = 'TESTPOST-';

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    nombreCompleto: 'Juan Pérez',
    dni: '30111222',
    telefono: '+54 11 5555-5555',
    matricula: `${MARKER}${Math.random().toString(36).slice(2, 10)}`,
    localidad: 'La Plata',
    situacion: 'PRODUCTOR_NUEVO',
    ...overrides,
  };
}

async function cleanup() {
  await prisma.postulacion.deleteMany({ where: { matricula: { startsWith: MARKER } } });
}

describe('postulaciones API (integración)', () => {
  const app = createApp();

  beforeAll(async () => {
    loadEnv();
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  // ─── Alta pública ──────────────────────────────────────────────────────────

  it('POST / — payload válido → 201 sin exponer datos y persiste una fila', async () => {
    const payload = validPayload();
    const res = await request(app).post(BASE).send(payload).expect(201);

    expect(res.body).toEqual({ data: null, message: 'Postulación recibida', error: null });

    const rows = await prisma.postulacion.findMany({ where: { matricula: payload.matricula } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.dni).toBe(payload.dni);
  });

  it('POST / — honeypot completado → 201 pero NO persiste (descarte silencioso)', async () => {
    const payload = validPayload({ website: 'http://spam.example' });
    const res = await request(app).post(BASE).send(payload).expect(201);

    expect(res.body).toEqual({ data: null, message: 'Postulación recibida', error: null });

    const rows = await prisma.postulacion.findMany({ where: { matricula: payload.matricula } });
    expect(rows).toHaveLength(0);
  });

  it('POST / — honeypot vacío → se trata como legítimo y persiste', async () => {
    const payload = validPayload({ website: '' });
    await request(app).post(BASE).send(payload).expect(201);

    const rows = await prisma.postulacion.findMany({ where: { matricula: payload.matricula } });
    expect(rows).toHaveLength(1);
  });

  it('POST / — reenvío duplicado (mismo DNI + matrícula) → 201 pero una sola fila', async () => {
    const payload = validPayload({ dni: '27888999' });

    await request(app).post(BASE).send(payload).expect(201);
    const res2 = await request(app).post(BASE).send(payload).expect(201);
    expect(res2.body.message).toBe('Postulación recibida');

    const rows = await prisma.postulacion.findMany({ where: { matricula: payload.matricula } });
    expect(rows).toHaveLength(1);
  });

  // ─── Validación / anti-abuso de entrada ──────────────────────────────────────

  it('POST / — propiedad desconocida → 422 (schema estricto, anti mass-assignment)', async () => {
    const res = await request(app)
      .post(BASE)
      .send(validPayload({ rol: 'ADMIN', id: 1 }))
      .expect(422);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toBeTruthy();
  });

  it('POST / — JSON con clave __proto__ → 422 y sin contaminar el prototipo', async () => {
    // Clave literal en el JSON crudo: JSON.parse la vuelve propiedad propia,
    // por lo que el schema estricto debe rechazarla (y nunca llega a Prisma).
    const raw = JSON.stringify(validPayload()).replace(
      /^\{/,
      '{"__proto__":{"polluted":true},',
    );
    const res = await request(app)
      .post(BASE)
      .set('Content-Type', 'application/json')
      .send(raw)
      .expect(422);
    expect(res.body.data).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(({} as any).polluted).toBeUndefined();
  });

  it('POST / — DNI inválido → 422', async () => {
    const res = await request(app).post(BASE).send(validPayload({ dni: 'abc' })).expect(422);
    expect(res.body.error).toBeTruthy();
  });

  it('POST / — campo obligatorio faltante → 422', async () => {
    const { localidad, ...rest } = validPayload();
    void localidad;
    const res = await request(app).post(BASE).send(rest).expect(422);
    expect(res.body.error).toBeTruthy();
  });

  it('POST / — JSON malformado → 400', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Content-Type', 'application/json')
      .send('{"nombreCompleto":')
      .expect(400);
    expect(res.body.message).toBe('JSON inválido');
  });

  it('POST / — no expone encabezados RateLimit-* (no revela la regla)', async () => {
    const res = await request(app).post(BASE).send(validPayload()).expect(201);
    expect(res.headers['ratelimit-limit']).toBeUndefined();
    expect(res.headers['ratelimit-remaining']).toBeUndefined();
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });

  // ─── Lectura administrativa (restringida) ────────────────────────────────────

  it('GET / — sin token → 401', async () => {
    const res = await request(app).get(BASE).expect(401);
    expect(res.body.data).toBeNull();
  });

  it('GET / — con token admin → 200 y array de postulaciones', async () => {
    const login = await request(app)
      .post(`${AUTH}/login`)
      .send({ usuario: 'admin', password: 'Admin1234!' })
      .expect(200);
    const token = login.body.data.accessToken as string;

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.error).toBeNull();
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
