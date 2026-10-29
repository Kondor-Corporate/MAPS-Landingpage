/**
 * Tests de integración del módulo Noticias (MAPS-014).
 * Cubre RBAC, CRUD admin, validaciones, slug, lectura pública e intranet contra la app real.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

const BASE = '/api/v1/news';
const AUTH = '/api/v1/auth';

const VALID_CONTENIDO = 'Contenido de prueba con mas de veinte caracteres.';

type NewsBody = {
  titulo: string;
  contenido: string;
  categoria: string;
  visibilidad: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  publicada?: boolean;
};

const createdNewsIds: number[] = [];

function uniqueTitulo(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validNewsBody(overrides: Partial<NewsBody> = {}): NewsBody {
  return {
    titulo: uniqueTitulo('Titulo test minimo'),
    contenido: VALID_CONTENIDO,
    categoria: 'NOVEDAD',
    visibilidad: 'PUBLICA',
    ...overrides,
  };
}

async function loginUsuarioPassword(
  app: ReturnType<typeof createApp>,
  usuario: string,
  password: string,
): Promise<{ accessToken: string; userId: number }> {
  const res = await request(app)
    .post(`${AUTH}/login`)
    .send({ usuario, password })
    .expect(200);
  return {
    accessToken: res.body.data.accessToken as string,
    userId: res.body.data.user.id as number,
  };
}

async function createNewsAsAdmin(
  app: ReturnType<typeof createApp>,
  token: string,
  body: NewsBody,
) {
  const res = await request(app)
    .post(BASE)
    .set('Authorization', `Bearer ${token}`)
    .send(body)
    .expect(201);

  const data = res.body.data as { id: number; slug: string };
  createdNewsIds.push(data.id);
  return res.body.data as Record<string, unknown> & { id: number; slug: string };
}

function expectPublicDtoShape(item: Record<string, unknown>): void {
  // El DTO público no debe filtrar metadatos internos hacia surfaces anónimas.
  expect(item).toHaveProperty('slug');
  expect(item).toHaveProperty('titulo');
  expect(item).toHaveProperty('contenido');
  expect(item).toHaveProperty('categoria');
  expect(item).not.toHaveProperty('id');
  expect(item).not.toHaveProperty('autorId');
  expect(item).not.toHaveProperty('publicada');
  expect(item).not.toHaveProperty('visibilidad');
}

describe('news API (integración MAPS-014 Fase D)', () => {
  const app = createApp();

  beforeAll(() => {
    loadEnv();
  });

  afterAll(async () => {
    if (createdNewsIds.length > 0) {
      await prisma.noticia.deleteMany({
        where: { id: { in: createdNewsIds } },
      });
    }
    await prisma.$disconnect();
  });

  // ─── 1. Auth / RBAC ───────────────────────────────────────────────────────

  describe('Auth / RBAC', () => {
    it('GET /public — sin token → 200', async () => {
      await request(app).get(`${BASE}/public`).expect(200);
    });

    it('GET /public/:slug — sin token → 200 si existe publicada PUBLICA', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const titulo = uniqueTitulo('Publica slug test');
      const created = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ titulo, visibilidad: 'PUBLICA' }),
        publicada: true,
      });

      const res = await request(app).get(`${BASE}/public/${created.slug}`).expect(200);
      expect(res.body.data).toMatchObject({ slug: created.slug, titulo });
    });

    it('GET / — sin token → 401', async () => {
      const res = await request(app).get(BASE).expect(401);
      expect(res.body.message).toBe('Token de acceso requerido');
    });

    it('GET / — con PRODUCTOR → 403', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'user', 'User1234!');
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
      expect(res.body.message).toBe('Acceso denegado');
    });

    it('GET / — con ADMIN → 200', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.message).toBe('OK');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST / — sin token → 401', async () => {
      await request(app).post(BASE).send(validNewsBody()).expect(401);
    });

    it('POST / — con PRODUCTOR → 403', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'user', 'User1234!');
      await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validNewsBody())
        .expect(403);
    });

    it('POST / — con ADMIN → 201', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validNewsBody())
        .expect(201);
    });

    it('POST / — con SUPERADMIN → 201', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
      await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validNewsBody())
        .expect(201);
    });

    it('PATCH /:id — con PRODUCTOR → 403', async () => {
      const { accessToken: adminToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, adminToken, validNewsBody());
      const { accessToken: producerToken } = await loginUsuarioPassword(app, 'user', 'User1234!');

      await request(app)
        .patch(`${BASE}/${created.id}`)
        .set('Authorization', `Bearer ${producerToken}`)
        .send({ titulo: 'Titulo editado por productor' })
        .expect(403);
    });

    it('DELETE /:id — con PRODUCTOR → 403', async () => {
      const { accessToken: adminToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, adminToken, validNewsBody());
      const { accessToken: producerToken } = await loginUsuarioPassword(app, 'user', 'User1234!');

      await request(app)
        .delete(`${BASE}/${created.id}`)
        .set('Authorization', `Bearer ${producerToken}`)
        .expect(403);
    });
  });

  // ─── 2. CRUD admin ──────────────────────────────────────────────────────────

  describe('CRUD admin', () => {
    it('ADMIN crea noticia borrador con autorId desde JWT', async () => {
      const { accessToken, userId } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const body = validNewsBody({ categoria: 'EVENTO', visibilidad: 'INTERNA', publicada: false });

      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(body)
        .expect(201);

      createdNewsIds.push(res.body.data.id);
      expect(res.body.data).toMatchObject({
        publicada: false,
        publicadaEn: null,
        categoria: 'EVENTO',
        visibilidad: 'INTERNA',
        autorId: userId,
      });
    });

    it('ADMIN crea noticia publicada con publicadaEn seteado', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validNewsBody({ publicada: true }))
        .expect(201);

      createdNewsIds.push(res.body.data.id);
      expect(res.body.data.publicada).toBe(true);
      expect(res.body.data.publicadaEn).not.toBeNull();
    });

    it('ADMIN obtiene noticia por id → 200', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, accessToken, validNewsBody());

      const res = await request(app)
        .get(`${BASE}/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toMatchObject({ id: created.id, slug: created.slug });
    });

    it('ADMIN edita noticia sin regenerar slug al cambiar título', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, accessToken, validNewsBody());
      const originalSlug = created.slug;

      const patchRes = await request(app)
        .patch(`${BASE}/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          titulo: uniqueTitulo('Titulo editado sin slug'),
          contenido: 'Contenido actualizado con mas de veinte caracteres.',
          categoria: 'CIRCULAR',
          visibilidad: 'INTERNA',
        })
        .expect(200);

      expect(patchRes.body.data).toMatchObject({
        id: created.id,
        slug: originalSlug,
        categoria: 'CIRCULAR',
        visibilidad: 'INTERNA',
      });
    });

    it('ADMIN publica noticia existente y setea publicadaEn si era null', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(
        app,
        accessToken,
        validNewsBody({ publicada: false }),
      );

      const patchRes = await request(app)
        .patch(`${BASE}/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ publicada: true })
        .expect(200);

      expect(patchRes.body.data.publicada).toBe(true);
      expect(patchRes.body.data.publicadaEn).not.toBeNull();
    });

    it('ADMIN despublica noticia conservando publicadaEn', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(
        app,
        accessToken,
        validNewsBody({ publicada: true }),
      );
      const publicadaEnBefore = created.publicadaEn as string;

      const patchRes = await request(app)
        .patch(`${BASE}/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ publicada: false })
        .expect(200);

      expect(patchRes.body.data.publicada).toBe(false);
      expect(patchRes.body.data.publicadaEn).toBe(publicadaEnBefore);
    });

    it('ADMIN elimina noticia → 204 y GET posterior → 404', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, accessToken, validNewsBody());
      const id = created.id;

      await request(app)
        .delete(`${BASE}/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const idx = createdNewsIds.indexOf(id);
      if (idx >= 0) createdNewsIds.splice(idx, 1);

      await request(app)
        .get(`${BASE}/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('GET /:id inexistente → 404', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .get(`${BASE}/999999999`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ─── 3. Validaciones Zod ──────────────────────────────────────────────────

  describe('Validaciones Zod', () => {
    it('titulo demasiado corto → 422', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validNewsBody({ titulo: 'abc' }))
        .expect(422);
      expect(res.body.message).toBe('Datos de entrada inválidos');
    });

    it('contenido demasiado corto → 422', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validNewsBody({ contenido: 'corto' }))
        .expect(422);
    });

    it('categoria inválida → 422', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...validNewsBody(), categoria: 'INVALIDA' })
        .expect(422);
    });

    it('visibilidad inválida → 422', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...validNewsBody(), visibilidad: 'EXTERNA' })
        .expect(422);
    });

    it('imagenUrl en el body ya no se acepta (portada por upload) → 422', async () => {
      // La portada dejó de enviarse por URL en el body; ahora se sube por
      // `POST /news/:id/portada`. Al ser `.strict()`, incluirla es campo extra → 422.
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ...validNewsBody(),
          imagenUrl: 'https://example.com/imagen.png',
        })
        .expect(422);
    });

    it('body con campos extra → 422', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...validNewsBody(), slug: 'forzado' })
        .expect(422);
    });

    it('PATCH body vacío → 422', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, accessToken, validNewsBody());

      await request(app)
        .patch(`${BASE}/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(422);
    });

    it('id inválido en path → 422', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .get(`${BASE}/no-es-id`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(422);
    });

    it('slug inválido en path público → 422', async () => {
      await request(app).get(`${BASE}/public/Slug_Invalido`).expect(422);
    });
  });

  // ─── 4. Slug ──────────────────────────────────────────────────────────────

  describe('Slug', () => {
    it('genera slug desde título: minúsculas, sin acentos, guiones', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const suffix = Date.now();
      const titulo = `Capacitación Especial ${suffix}`;
      const created = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody(),
        titulo,
      });

      expect(created.slug).toBe(`capacitacion-especial-${suffix}`);
    });

    it('agrega suffix -2, -3 si el slug ya existe', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const titulo = 'Capacitación Especial MAPS';

      await prisma.noticia.deleteMany({
        where: {
          slug: {
            in: [
              'capacitacion-especial-maps',
              'capacitacion-especial-maps-2',
              'capacitacion-especial-maps-3',
            ],
          },
        },
      });

      const first = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody(),
        titulo,
      });
      const second = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody(),
        titulo,
      });

      expect(first.slug).toBe('capacitacion-especial-maps');
      expect(second.slug).toBe('capacitacion-especial-maps-2');
    });
  });

  // ─── 5. Lectura pública ───────────────────────────────────────────────────

  describe('Lectura pública', () => {
    it('GET /public devuelve solo publicadas PUBLICA sin campos admin', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const marker = uniqueTitulo('Marker publica visible');

      const visible = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ titulo: marker, visibilidad: 'PUBLICA' }),
        publicada: true,
      });
      await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ visibilidad: 'PUBLICA' }),
        publicada: false,
      });
      await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ visibilidad: 'INTERNA' }),
        publicada: true,
      });

      const res = await request(app).get(`${BASE}/public`).expect(200);
      const items = res.body.data as Record<string, unknown>[];
      const slugs = items.map((i) => i.slug);

      expect(slugs).toContain(visible.slug);
      for (const item of items) {
        expectPublicDtoShape(item);
        expect(item).not.toHaveProperty('publicada', false);
      }
    });

    it('GET /public/:slug → 200 publicada PUBLICA', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ visibilidad: 'PUBLICA' }),
        publicada: true,
      });

      const res = await request(app).get(`${BASE}/public/${created.slug}`).expect(200);
      expectPublicDtoShape(res.body.data);
      expect(res.body.data.slug).toBe(created.slug);
    });

    it('GET /public/:slug → 404 borrador PUBLICA', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ visibilidad: 'PUBLICA' }),
        publicada: false,
      });

      await request(app).get(`${BASE}/public/${created.slug}`).expect(404);
    });

    it('GET /public/:slug → 404 noticia INTERNA publicada', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ visibilidad: 'INTERNA' }),
        publicada: true,
      });

      await request(app).get(`${BASE}/public/${created.slug}`).expect(404);
    });

    it('GET /public/:slug → 404 slug inexistente', async () => {
      await request(app).get(`${BASE}/public/slug-que-no-existe-xyz`).expect(404);
    });

    it('GET /public incluye publicadas AMBAS', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ visibilidad: 'AMBAS' }),
        publicada: true,
      });

      const res = await request(app).get(`${BASE}/public`).expect(200);
      const slugs = (res.body.data as { slug: string }[]).map((i) => i.slug);
      expect(slugs).toContain(created.slug);

      const bySlug = await request(app).get(`${BASE}/public/${created.slug}`).expect(200);
      expect(bySlug.body.data.slug).toBe(created.slug);
    });
  });

  // ─── 6. Lectura intranet ────────────────────────────────────────────────────

  describe('Lectura intranet', () => {
    it('GET /intranet sin token → 401', async () => {
      await request(app).get(`${BASE}/intranet`).expect(401);
    });

    it('GET /intranet con PRODUCTOR → 200', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'user', 'User1234!');
      await request(app)
        .get(`${BASE}/intranet`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('GET /intranet con ADMIN → 200', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .get(`${BASE}/intranet`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('GET /intranet con SUPERADMIN → 200', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'superadmin', 'Super1234!');
      await request(app)
        .get(`${BASE}/intranet`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('GET /intranet solo devuelve publicadas INTERNAS sin campos admin', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const marker = uniqueTitulo('Marker intranet visible');

      const visible = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ titulo: marker, visibilidad: 'INTERNA' }),
        publicada: true,
      });
      await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ visibilidad: 'INTERNA' }),
        publicada: false,
      });
      await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ visibilidad: 'PUBLICA' }),
        publicada: true,
      });

      const { accessToken: producerToken } = await loginUsuarioPassword(app, 'user', 'User1234!');
      const res = await request(app)
        .get(`${BASE}/intranet`)
        .set('Authorization', `Bearer ${producerToken}`)
        .expect(200);

      const items = res.body.data as Record<string, unknown>[];
      const slugs = items.map((i) => i.slug);

      expect(slugs).toContain(visible.slug);
      for (const item of items) {
        expectPublicDtoShape(item);
      }
    });

    it('GET /intranet incluye publicadas AMBAS', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ visibilidad: 'AMBAS' }),
        publicada: true,
      });

      const { accessToken: producerToken } = await loginUsuarioPassword(app, 'user', 'User1234!');
      const res = await request(app)
        .get(`${BASE}/intranet`)
        .set('Authorization', `Bearer ${producerToken}`)
        .expect(200);

      const slugs = (res.body.data as { slug: string }[]).map((i) => i.slug);
      expect(slugs).toContain(created.slug);
    });
  });

  // ─── 7bis. Cambio dinámico de audiencia ─────────────────────────────────────

  describe('Cambio de audiencia (visibilidad)', () => {
    it('PRODUCTORES(INTERNA) → AMBAS: empieza a aparecer también en público', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ visibilidad: 'INTERNA' }),
        publicada: true,
      });

      let publicSlugs = (
        await request(app).get(`${BASE}/public`).expect(200)
      ).body.data.map((i: { slug: string }) => i.slug) as string[];
      expect(publicSlugs).not.toContain(created.slug);

      await request(app)
        .patch(`${BASE}/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ visibilidad: 'AMBAS' })
        .expect(200);

      publicSlugs = (
        await request(app).get(`${BASE}/public`).expect(200)
      ).body.data.map((i: { slug: string }) => i.slug) as string[];
      expect(publicSlugs).toContain(created.slug);
    });

    it('AMBAS → PUBLICO: deja de aparecer en intranet', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const created = await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ visibilidad: 'AMBAS' }),
        publicada: true,
      });

      const { accessToken: producerToken } = await loginUsuarioPassword(app, 'user', 'User1234!');
      let intranetSlugs = (
        await request(app)
          .get(`${BASE}/intranet`)
          .set('Authorization', `Bearer ${producerToken}`)
          .expect(200)
      ).body.data.map((i: { slug: string }) => i.slug) as string[];
      expect(intranetSlugs).toContain(created.slug);

      await request(app)
        .patch(`${BASE}/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ visibilidad: 'PUBLICA' })
        .expect(200);

      intranetSlugs = (
        await request(app)
          .get(`${BASE}/intranet`)
          .set('Authorization', `Bearer ${producerToken}`)
          .expect(200)
      ).body.data.map((i: { slug: string }) => i.slug) as string[];
      expect(intranetSlugs).not.toContain(created.slug);
    });
  });

  // ─── 7. Query params / filtros ──────────────────────────────────────────────

  describe('Query params / filtros', () => {
    it('admin filtra por categoria, visibilidad, publicada y q', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const qMarker = `filtro-q-${Date.now()}`;

      await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({
          titulo: `${qMarker} titulo evento`,
          categoria: 'EVENTO',
          visibilidad: 'PUBLICA',
        }),
        publicada: true,
      });
      await createNewsAsAdmin(app, accessToken, {
        ...validNewsBody({ categoria: 'PRODUCTO', visibilidad: 'INTERNA' }),
        publicada: false,
      });

      const byCategoria = await request(app)
        .get(BASE)
        .query({ categoria: 'EVENTO' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(
        (byCategoria.body.data as { categoria: string }[]).every((n) => n.categoria === 'EVENTO'),
      ).toBe(true);

      const byVisibilidad = await request(app)
        .get(BASE)
        .query({ visibilidad: 'INTERNA' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(
        (byVisibilidad.body.data as { visibilidad: string }[]).every(
          (n) => n.visibilidad === 'INTERNA',
        ),
      ).toBe(true);

      const byPublicada = await request(app)
        .get(BASE)
        .query({ publicada: 'false' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(
        (byPublicada.body.data as { publicada: boolean }[]).every((n) => n.publicada === false),
      ).toBe(true);

      const byQ = await request(app)
        .get(BASE)
        .query({ q: qMarker })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const qTitulos = (byQ.body.data as { titulo: string }[]).map((n) => n.titulo);
      expect(qTitulos.some((t) => t.includes(qMarker))).toBe(true);
    });

    it('admin pagina con limit y page', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const prefix = `pag-${Date.now()}`;

      for (let i = 0; i < 3; i += 1) {
        await createNewsAsAdmin(app, accessToken, {
          ...validNewsBody({ titulo: `${prefix} item ${i}` }),
        });
      }

      const page1 = await request(app)
        .get(BASE)
        .query({ q: prefix, limit: 2, page: 1 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const page2 = await request(app)
        .get(BASE)
        .query({ q: prefix, limit: 2, page: 2 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(page1.body.data).toHaveLength(2);
      expect(page2.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /public respeta limit', async () => {
      const res = await request(app).get(`${BASE}/public`).query({ limit: 1 }).expect(200);
      expect((res.body.data as unknown[]).length).toBeLessThanOrEqual(1);
    });

    it('GET /intranet respeta limit', async () => {
      const { accessToken } = await loginUsuarioPassword(app, 'user', 'User1234!');
      const res = await request(app)
        .get(`${BASE}/intranet`)
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect((res.body.data as unknown[]).length).toBeLessThanOrEqual(1);
    });
  });
});
