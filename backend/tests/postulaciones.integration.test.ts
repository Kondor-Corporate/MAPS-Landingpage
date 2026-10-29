import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { POSTULACION_PRIVACY_VERSION } from '../src/constants/postulacionPrivacy.js';
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
    consentimiento: true,
    ...overrides,
  };
}

async function login(app: ReturnType<typeof createApp>, usuario: string, password: string) {
  const res = await request(app).post(`${AUTH}/login`).send({ usuario, password }).expect(200);
  return res.body.data.accessToken as string;
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
    expect(rows[0]?.consentedAt).toBeInstanceOf(Date);
    expect(rows[0]?.privacyVersion).toBe(POSTULACION_PRIVACY_VERSION);
    expect(res.body).not.toHaveProperty('consentedAt');
    expect(JSON.stringify(res.body)).not.toContain(payload.dni);
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

  it('POST / — payload idéntico dentro de 24h → 201 pero una sola fila', async () => {
    const payload = validPayload({ dni: '27888999' });

    await request(app).post(BASE).send(payload).expect(201);
    const before = await prisma.postulacion.findMany({ where: { matricula: payload.matricula } });
    expect(before).toHaveLength(1);

    const res2 = await request(app).post(BASE).send(payload).expect(201);
    expect(res2.body.message).toBe('Postulación recibida');

    const rows = await prisma.postulacion.findMany({ where: { matricula: payload.matricula } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(before[0]?.id);
    expect(rows[0]?.consentedAt?.getTime()).toBe(before[0]?.consentedAt?.getTime());
    expect(rows[0]?.privacyVersion).toBe(before[0]?.privacyVersion);
  });

  it('POST / — mismo DNI y matrícula con teléfono corregido → 201 y dos filas', async () => {
    const payload = validPayload({ dni: '27888998' });

    await request(app).post(BASE).send(payload).expect(201);

    const corrected = {
      ...payload,
      telefono: '+54 221 444-7788',
    };

    await request(app).post(BASE).send(corrected).expect(201);

    const rows = await prisma.postulacion.findMany({
      where: { matricula: payload.matricula },
      orderBy: { id: 'asc' },
    });

    expect(rows).toHaveLength(2);
    expect(rows[1]?.telefono).toBe(corrected.telefono);
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
    const token = await login(app, 'admin', 'Admin1234!');

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.error).toBeNull();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ─── Consentimiento ──────────────────────────────────────────────────────────

  it('POST / — sin consentimiento → 422 y no persiste', async () => {
    const { consentimiento, ...rest } = validPayload();
    void consentimiento;
    const res = await request(app).post(BASE).send(rest).expect(422);
    expect(res.body.data).toBeNull();

    const rows = await prisma.postulacion.findMany({ where: { matricula: rest.matricula } });
    expect(rows).toHaveLength(0);
  });

  it('POST / — consentimiento false → 422 y no persiste', async () => {
    const payload = validPayload({ consentimiento: false });
    const res = await request(app).post(BASE).send(payload).expect(422);
    expect(res.body.data).toBeNull();

    const rows = await prisma.postulacion.findMany({ where: { matricula: payload.matricula } });
    expect(rows).toHaveLength(0);
  });

  it('POST / — "true" y 1 no cuentan como consentimiento → 422 y no persiste', async () => {
    for (const consentimiento of ['true', 1]) {
      const payload = validPayload({ consentimiento });
      const res = await request(app).post(BASE).send(payload).expect(422);
      expect(res.body.data).toBeNull();

      const rows = await prisma.postulacion.findMany({ where: { matricula: payload.matricula } });
      expect(rows).toHaveLength(0);
    }
  });

  it('POST / — consentedAt y privacyVersion desde el cliente → 422 (mass assignment)', async () => {
    const payload = validPayload({
      consentedAt: '2000-01-01T00:00:00.000Z',
      privacyVersion: '99',
    });
    const res = await request(app).post(BASE).send(payload).expect(422);
    expect(res.body.data).toBeNull();

    const rows = await prisma.postulacion.findMany({ where: { matricula: payload.matricula } });
    expect(rows).toHaveLength(0);
  });

  it('una fila histórica acepta consentedAt y privacyVersion en null', async () => {
    const created = await prisma.postulacion.create({
      data: {
        nombreCompleto: 'Postulación histórica',
        dni: '20999888',
        telefono: '2215550101',
        matricula: `${MARKER}hist`,
        localidad: 'La Plata',
        situacion: 'PRODUCTOR_NUEVO',
      },
    });

    const stored = await prisma.postulacion.findUniqueOrThrow({ where: { id: created.id } });
    expect(stored.consentedAt).toBeNull();
    expect(stored.privacyVersion).toBeNull();

    const token = await login(app, 'admin', 'Admin1234!');
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`).expect(200);
    const listed = (res.body.data as Array<Record<string, unknown>>).find((row) => row.id === created.id);
    expect(listed?.nombreCompleto).toBe('Postulación histórica');
    expect(listed).not.toHaveProperty('consentedAt');
    expect(listed).not.toHaveProperty('privacyVersion');
  });

  // ─── Eliminación (solo SUPERADMIN) ───────────────────────────────────────────

  it('DELETE /:id — sin token → 401', async () => {
    const res = await request(app).delete(`${BASE}/2147483646`).expect(401);
    expect(res.body.data).toBeNull();
  });

  it('DELETE /:id — PRODUCTOR → 403', async () => {
    const token = await login(app, 'user', 'User1234!');
    const res = await request(app)
      .delete(`${BASE}/2147483646`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(res.body.message).toBe('Acceso denegado');
  });

  it('DELETE /:id — ADMIN → 403', async () => {
    const token = await login(app, 'admin', 'Admin1234!');
    const res = await request(app)
      .delete(`${BASE}/2147483646`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(res.body.message).toBe('Acceso denegado');
  });

  it('DELETE /:id — SUPERADMIN elimina sólo esa fila aunque compartan DNI', async () => {
    const sharedDni = '30111001';
    const keep = validPayload({ dni: sharedDni });
    const drop = validPayload({ dni: sharedDni });
    await request(app).post(BASE).send(keep).expect(201);
    await request(app).post(BASE).send(drop).expect(201);

    const keepRow = await prisma.postulacion.findFirstOrThrow({ where: { matricula: keep.matricula } });
    const dropRow = await prisma.postulacion.findFirstOrThrow({ where: { matricula: drop.matricula } });
    const token = await login(app, 'superadmin', 'Super1234!');

    const res = await request(app)
      .delete(`${BASE}/${dropRow.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual({ data: null, message: 'Postulación eliminada', error: null });

    expect(await prisma.postulacion.findUnique({ where: { id: dropRow.id } })).toBeNull();
    expect(await prisma.postulacion.findUnique({ where: { id: keepRow.id } })).not.toBeNull();
  });

  it('DELETE /:id — inexistente con SUPERADMIN → 404 y no 500', async () => {
    const payload = validPayload();
    await request(app).post(BASE).send(payload).expect(201);
    const row = await prisma.postulacion.findFirstOrThrow({ where: { matricula: payload.matricula } });
    const token = await login(app, 'superadmin', 'Super1234!');

    await request(app)
      .delete(`${BASE}/${row.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const res = await request(app)
      .delete(`${BASE}/${row.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    expect(res.body).toEqual({
      data: null,
      message: 'Postulación no encontrada',
      error: null,
    });
  });

  it('DELETE /:id — id inválido con SUPERADMIN → 422', async () => {
    const token = await login(app, 'superadmin', 'Super1234!');
    for (const id of ['abc', '0', '-1', '1.5']) {
      const res = await request(app)
        .delete(`${BASE}/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(422);
      expect(res.body.message).toBe('Datos de entrada inválidos');
    }
  });
});
