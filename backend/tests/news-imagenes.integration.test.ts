/**
 * Tests de integración de imágenes de Noticias (MAPS-019).
 * Cubre upload de portada, galería (alta/baja, orden, tope), RBAC y limpieza en cascada.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

const BASE = '/api/v1/news';
const AUTH = '/api/v1/auth';

const VALID_CONTENIDO = 'Contenido de prueba con mas de veinte caracteres.';

// 1x1 PNG y 1x1 GIF mínimos para ejercitar el fileFilter de multer.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const GIF_1x1 = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

const createdNewsIds: number[] = [];

function uniqueTitulo(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function loginUsuarioPassword(
  app: ReturnType<typeof createApp>,
  usuario: string,
  password: string,
): Promise<string> {
  const res = await request(app).post(`${AUTH}/login`).send({ usuario, password }).expect(200);
  return res.body.data.accessToken as string;
}

async function createNews(
  app: ReturnType<typeof createApp>,
  token: string,
): Promise<{ id: number; slug: string }> {
  const res = await request(app)
    .post(BASE)
    .set('Authorization', `Bearer ${token}`)
    .send({
      titulo: uniqueTitulo('Noticia con imagenes'),
      contenido: VALID_CONTENIDO,
      categoria: 'NOVEDAD',
      visibilidad: 'PUBLICA',
      publicada: true,
    })
    .expect(201);
  const data = res.body.data as { id: number; slug: string };
  createdNewsIds.push(data.id);
  return data;
}

describe('news imágenes API (integración MAPS-019)', () => {
  const app = createApp();

  beforeAll(() => {
    loadEnv();
  });

  afterAll(async () => {
    if (createdNewsIds.length > 0) {
      await prisma.noticia.deleteMany({ where: { id: { in: createdNewsIds } } });
    }
    await prisma.$disconnect();
  });

  // ─── Portada — RBAC ────────────────────────────────────────────────────────

  describe('Portada · RBAC', () => {
    it('POST /:id/portada sin token → 401', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      await request(app)
        .post(`${BASE}/${news.id}/portada`)
        .attach('file', PNG_1x1, { filename: 'portada.png', contentType: 'image/png' })
        .expect(401);
    });

    it('POST /:id/portada con PRODUCTOR → 403', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const producer = await loginUsuarioPassword(app, 'user', 'User1234!');
      await request(app)
        .post(`${BASE}/${news.id}/portada`)
        .set('Authorization', `Bearer ${producer}`)
        .attach('file', PNG_1x1, { filename: 'portada.png', contentType: 'image/png' })
        .expect(403);
    });
  });

  // ─── Portada — comportamiento ──────────────────────────────────────────────

  describe('Portada', () => {
    it('ADMIN sube portada png → 200 con imagenUrl gestionada', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);

      const res = await request(app)
        .post(`${BASE}/${news.id}/portada`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', PNG_1x1, { filename: 'portada.png', contentType: 'image/png' })
        .expect(200);

      expect(res.body.data.imagenUrl).toBeTruthy();
      expect(res.body.data.imagenUrl).toContain('/uploads/noticias/');
    });

    it('mime inválido (gif) → 400', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      await request(app)
        .post(`${BASE}/${news.id}/portada`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', GIF_1x1, { filename: 'x.gif', contentType: 'image/gif' })
        .expect(400);
    });

    it('noticia inexistente → 404', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      await request(app)
        .post(`${BASE}/999999999/portada`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', PNG_1x1, { filename: 'portada.png', contentType: 'image/png' })
        .expect(404);
    });

    it('DELETE /:id/portada → imagenUrl null', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      await request(app)
        .post(`${BASE}/${news.id}/portada`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', PNG_1x1, { filename: 'portada.png', contentType: 'image/png' })
        .expect(200);

      const res = await request(app)
        .delete(`${BASE}/${news.id}/portada`)
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);
      expect(res.body.data.imagenUrl).toBeNull();
    });
  });

  // ─── Galería ───────────────────────────────────────────────────────────────

  describe('Galería', () => {
    it('alta incrementa orden y aparece en GET /news/:id ordenada', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);

      const first = await request(app)
        .post(`${BASE}/${news.id}/imagenes`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', PNG_1x1, { filename: 'g1.png', contentType: 'image/png' })
        .expect(201);
      const second = await request(app)
        .post(`${BASE}/${news.id}/imagenes`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', PNG_1x1, { filename: 'g2.png', contentType: 'image/png' })
        .expect(201);

      expect(first.body.data.orden).toBe(0);
      expect(second.body.data.orden).toBe(1);

      const detail = await request(app)
        .get(`${BASE}/${news.id}`)
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);
      const galeria = detail.body.data.galeria as { id: number; orden: number }[];
      expect(galeria).toHaveLength(2);
      expect(galeria.map((g) => g.orden)).toEqual([0, 1]);
    });

    it('GET /news/public/:slug expone galería como array de URLs', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      await request(app)
        .post(`${BASE}/${news.id}/imagenes`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', PNG_1x1, { filename: 'g1.png', contentType: 'image/png' })
        .expect(201);

      const res = await request(app).get(`${BASE}/public/${news.slug}`).expect(200);
      expect(Array.isArray(res.body.data.galeria)).toBe(true);
      expect(res.body.data.galeria).toHaveLength(1);
      expect(typeof res.body.data.galeria[0]).toBe('string');
    });

    it('tope de 10 imágenes → 400 en la 11ª', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);

      for (let i = 0; i < 10; i += 1) {
        await request(app)
          .post(`${BASE}/${news.id}/imagenes`)
          .set('Authorization', `Bearer ${admin}`)
          .attach('file', PNG_1x1, { filename: `g${i}.png`, contentType: 'image/png' })
          .expect(201);
      }

      await request(app)
        .post(`${BASE}/${news.id}/imagenes`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', PNG_1x1, { filename: 'g11.png', contentType: 'image/png' })
        .expect(400);
    });

    it('DELETE imagen inexistente → 404', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      await request(app)
        .delete(`${BASE}/${news.id}/imagenes/999999999`)
        .set('Authorization', `Bearer ${admin}`)
        .expect(404);
    });

    it('DELETE imagen existente → 204 y desaparece del detalle', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const added = await request(app)
        .post(`${BASE}/${news.id}/imagenes`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', PNG_1x1, { filename: 'g1.png', contentType: 'image/png' })
        .expect(201);

      await request(app)
        .delete(`${BASE}/${news.id}/imagenes/${added.body.data.id}`)
        .set('Authorization', `Bearer ${admin}`)
        .expect(204);

      const detail = await request(app)
        .get(`${BASE}/${news.id}`)
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);
      expect(detail.body.data.galeria).toHaveLength(0);
    });

    it('borrar la noticia elimina en cascada sus NoticiaImagen', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      await request(app)
        .post(`${BASE}/${news.id}/imagenes`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', PNG_1x1, { filename: 'g1.png', contentType: 'image/png' })
        .expect(201);

      await request(app)
        .delete(`${BASE}/${news.id}`)
        .set('Authorization', `Bearer ${admin}`)
        .expect(204);
      const idx = createdNewsIds.indexOf(news.id);
      if (idx >= 0) createdNewsIds.splice(idx, 1);

      const count = await prisma.noticiaImagen.count({ where: { noticiaId: news.id } });
      expect(count).toBe(0);
    });
  });
});
