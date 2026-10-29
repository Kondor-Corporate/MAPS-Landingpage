/**
 * Tests de integración de imágenes de Noticias (MAPS-019).
 * Cubre upload de portada, galería (alta/baja, orden, tope), RBAC y limpieza en cascada.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';
import { getStorageAdapter } from '../src/lib/storage/index.js';
import { newsService } from '../src/services/news.service.js';
import {
  JPEG_SIGNATURE_FIXTURE,
  PNG_1x1,
  UPLOAD_GARBAGE,
  WEBP_SIGNATURE_FIXTURE,
} from './helpers/binaryFixtures.js';

const BASE = '/api/v1/news';
const AUTH = '/api/v1/auth';

const VALID_CONTENIDO = 'Contenido de prueba con mas de veinte caracteres.';

// 1x1 GIF mínimo para ejercitar el fileFilter de multer (rechazo temprano, no D3A).
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
      expect(res.body.data.imagenUrl).toMatch(/\.png$/i);
    });

    it('D3A — portada JPEG con firma válida → 200 y extensión .jpg', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);

      const res = await request(app)
        .post(`${BASE}/${news.id}/portada`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', JPEG_SIGNATURE_FIXTURE, {
          filename: 'portada.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      expect(res.body.data.imagenUrl).toMatch(/\.jpg$/i);
    });

    it('D3A — portada WebP declarada image/png → 400', async () => {
      const adapter = getStorageAdapter();
      const uploadSpy = vi.spyOn(adapter, 'uploadImagenNoticia');

      try {
        const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
        const news = await createNews(app, admin);

        const res = await request(app)
          .post(`${BASE}/${news.id}/portada`)
          .set('Authorization', `Bearer ${admin}`)
          .attach('file', WEBP_SIGNATURE_FIXTURE, {
            filename: 'portada.png',
            contentType: 'image/png',
          })
          .expect(400);

        expect(res.body.message).toBe(
          'La imagen debe ser un archivo JPG, JPEG o PNG válido',
        );
        expect(uploadSpy).not.toHaveBeenCalled();
      } finally {
        uploadSpy.mockRestore();
      }
    });

    it('D3A — portada basura declarada image/png → 400', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);

      const res = await request(app)
        .post(`${BASE}/${news.id}/portada`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', UPLOAD_GARBAGE, {
          filename: 'portada.png',
          contentType: 'image/png',
        })
        .expect(400);

      expect(res.body.message).toBe(
        'La imagen debe ser un archivo JPG, JPEG o PNG válido',
      );
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

    it('D3A — galería JPEG con firma válida → 201, mimeType y extensión .jpg', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);

      const res = await request(app)
        .post(`${BASE}/${news.id}/imagenes`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', JPEG_SIGNATURE_FIXTURE, {
          filename: 'galeria.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const imageId = res.body.data.id as number;
      expect(imageId).toBeGreaterThan(0);
      expect(res.body.data.url).toMatch(/\.jpg$/i);

      const persisted = await prisma.noticiaImagen.findUnique({
        where: { id: imageId },
        select: { mimeType: true, url: true },
      });

      expect(persisted).not.toBeNull();
      expect(persisted?.mimeType).toBe('image/jpeg');
      expect(persisted?.url).toBe(res.body.data.url);
    });

    it('D3A — galería WebP declarada image/png → 400', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);

      const res = await request(app)
        .post(`${BASE}/${news.id}/imagenes`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', WEBP_SIGNATURE_FIXTURE, {
          filename: 'galeria.png',
          contentType: 'image/png',
        })
        .expect(400);

      expect(res.body.message).toBe(
        'La imagen debe ser un archivo JPG, JPEG o PNG válido',
      );
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

  describe('D3A — storage no invocado (noticias)', () => {
    it('portada basura → uploadImagenNoticia no llamado', async () => {
      const adapter = getStorageAdapter();
      const uploadSpy = vi.spyOn(adapter, 'uploadImagenNoticia');

      try {
        const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
        const news = await createNews(app, admin);

        await request(app)
          .post(`${BASE}/${news.id}/portada`)
          .set('Authorization', `Bearer ${admin}`)
          .attach('file', UPLOAD_GARBAGE, {
            filename: 'portada.png',
            contentType: 'image/png',
          })
          .expect(400);

        expect(uploadSpy).not.toHaveBeenCalled();
      } finally {
        uploadSpy.mockRestore();
      }
    });

    it('galería WebP no permitida → uploadImagenNoticia no llamado', async () => {
      const adapter = getStorageAdapter();
      const uploadSpy = vi.spyOn(adapter, 'uploadImagenNoticia');

      try {
        const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
        const news = await createNews(app, admin);

        await request(app)
          .post(`${BASE}/${news.id}/imagenes`)
          .set('Authorization', `Bearer ${admin}`)
          .attach('file', WEBP_SIGNATURE_FIXTURE, {
            filename: 'galeria.png',
            contentType: 'image/png',
          })
          .expect(400);

        expect(uploadSpy).not.toHaveBeenCalled();
      } finally {
        uploadSpy.mockRestore();
      }
    });
  });
});

describe('D3C — storage ↔ DB consistency (noticias)', () => {
  const app = createApp();

  const uploadedNoticiaUrl =
    'http://localhost:3000/uploads/noticias/8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.jpg';

  beforeAll(() => {
    loadEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function portadaFile(): Express.Multer.File {
    return {
      buffer: PNG_1x1,
      originalname: 'portada.png',
      mimetype: 'image/png',
    } as Express.Multer.File;
  }

  function galeriaFile(): Express.Multer.File {
    return {
      buffer: PNG_1x1,
      originalname: 'galeria.png',
      mimetype: 'image/png',
    } as Express.Multer.File;
  }

  describe('setPortada (D)', () => {
    it('D1 — DB update falla → compensa nueva y no toca vieja', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const previousUrl = 'https://externo.example/old-portada.jpg';
      const dbError = new Error('D3C forced news DB failure');

      await prisma.noticia.update({
        where: { id: news.id },
        data: { imagenUrl: previousUrl },
      });

      const adapter = getStorageAdapter();
      const uploadSpy = vi.spyOn(adapter, 'uploadImagenNoticia').mockResolvedValue({
        url: uploadedNoticiaUrl,
        mimeType: 'image/png',
        tamanoBytes: PNG_1x1.length,
      });
      const updateSpy = vi.spyOn(prisma.noticia, 'update').mockRejectedValue(dbError);
      const deleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia').mockResolvedValue(undefined);

      try {
        await expect(newsService.setPortada(news.id, portadaFile())).rejects.toBe(dbError);
        expect(deleteSpy).toHaveBeenCalledWith(uploadedNoticiaUrl);
        expect(deleteSpy).not.toHaveBeenCalledWith(previousUrl);
        const row = await prisma.noticia.findUnique({
          where: { id: news.id },
          select: { imagenUrl: true },
        });
        expect(row?.imagenUrl).toBe(previousUrl);
      } finally {
        uploadSpy.mockRestore();
        updateSpy.mockRestore();
        deleteSpy.mockRestore();
      }
    });

    it('D2 — compensación falla → warning y error DB original', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const dbError = new Error('D3C forced news DB failure');
      const adapter = getStorageAdapter();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const uploadSpy = vi.spyOn(adapter, 'uploadImagenNoticia').mockResolvedValue({
        url: uploadedNoticiaUrl,
        mimeType: 'image/png',
        tamanoBytes: PNG_1x1.length,
      });
      const updateSpy = vi.spyOn(prisma.noticia, 'update').mockRejectedValue(dbError);
      const deleteSpy = vi
        .spyOn(adapter, 'deleteImagenNoticia')
        .mockRejectedValue(new Error('D3C storage compensation failure'));

      try {
        await expect(newsService.setPortada(news.id, portadaFile())).rejects.toBe(dbError);
        expect(warnSpy).toHaveBeenCalledWith(
          'storage.consistency_cleanup_failed',
          expect.objectContaining({
            operation: 'compensate_upload',
            category: 'noticias',
            resourceId: news.id,
          }),
        );
      } finally {
        warnSpy.mockRestore();
        uploadSpy.mockRestore();
        updateSpy.mockRestore();
        deleteSpy.mockRestore();
      }
    });

    it('D3 — success → orden upload, db, cleanup_old', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const previousUrl = 'https://externo.example/previous-portada.jpg';
      const adapter = getStorageAdapter();
      const events: string[] = [];

      await prisma.noticia.update({
        where: { id: news.id },
        data: { imagenUrl: previousUrl },
      });

      const originalUpload = adapter.uploadImagenNoticia.bind(adapter);
      const originalUpdate = prisma.noticia.update.bind(prisma.noticia);
      const uploadSpy = vi.spyOn(adapter, 'uploadImagenNoticia').mockImplementation(async (input) => {
        events.push('upload');
        return originalUpload(input);
      });
      const updateSpy = vi.spyOn(prisma.noticia, 'update').mockImplementation(async (args) => {
        events.push('db');
        return originalUpdate(args);
      });
      const deleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia').mockImplementation(async (url) => {
        if (url === previousUrl) {
          events.push('cleanup_old');
        }
      });

      try {
        await newsService.setPortada(news.id, portadaFile());
        expect(events).toEqual(['upload', 'db', 'cleanup_old']);
      } finally {
        uploadSpy.mockRestore();
        updateSpy.mockRestore();
        deleteSpy.mockRestore();
      }
    });

    it('D4 — cleanup vieja falla → HTTP 200 y DB con URL nueva', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const previousUrl = 'https://externo.example/legacy-cleanup.jpg';
      const adapter = getStorageAdapter();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      await prisma.noticia.update({
        where: { id: news.id },
        data: { imagenUrl: previousUrl },
      });

      const deleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia').mockImplementation(async (url) => {
        if (url === previousUrl) {
          throw new Error('D3C storage cleanup failure');
        }
      });

      try {
        const res = await request(app)
          .post(`${BASE}/${news.id}/portada`)
          .set('Authorization', `Bearer ${admin}`)
          .attach('file', PNG_1x1, { filename: 'portada.png', contentType: 'image/png' })
          .expect(200);

        expect(res.body.data.imagenUrl).toMatch(/\/uploads\/noticias\//);
        expect(warnSpy).toHaveBeenCalledWith(
          'storage.consistency_cleanup_failed',
          expect.objectContaining({
            operation: 'cleanup_after_db_replace',
            category: 'noticias',
            resourceId: news.id,
          }),
        );
      } finally {
        warnSpy.mockRestore();
        deleteSpy.mockRestore();
      }
    });

    it('D5 — portada vieja externa → cleanup no-op y 200', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const legacyUrl = 'https://externo.example/legacy-portada.png';
      const adapter = getStorageAdapter();
      const deleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia').mockResolvedValue(undefined);

      await prisma.noticia.update({
        where: { id: news.id },
        data: { imagenUrl: legacyUrl },
      });

      try {
        const res = await request(app)
          .post(`${BASE}/${news.id}/portada`)
          .set('Authorization', `Bearer ${admin}`)
          .attach('file', PNG_1x1, { filename: 'portada.png', contentType: 'image/png' })
          .expect(200);

        expect(res.body.data.imagenUrl).toMatch(/\/uploads\/noticias\//);
        expect(deleteSpy).toHaveBeenCalledWith(legacyUrl);
      } finally {
        deleteSpy.mockRestore();
      }
    });
  });

  describe('removePortada (E)', () => {
    it('E1 — DB null antes de storage delete', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const portadaUrl = 'https://externo.example/remove-me.jpg';
      const adapter = getStorageAdapter();
      const events: string[] = [];

      await prisma.noticia.update({
        where: { id: news.id },
        data: { imagenUrl: portadaUrl },
      });

      const originalUpdate = prisma.noticia.update.bind(prisma.noticia);
      const updateSpy = vi.spyOn(prisma.noticia, 'update').mockImplementation(async (args) => {
        events.push('db');
        return originalUpdate(args);
      });
      const deleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia').mockImplementation(async () => {
        events.push('storage');
      });

      try {
        await newsService.removePortada(news.id);
        expect(events).toEqual(['db', 'storage']);
      } finally {
        updateSpy.mockRestore();
        deleteSpy.mockRestore();
      }
    });

    it('E2 — DB update falla → storage no se toca', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const portadaUrl = 'https://externo.example/stays.jpg';
      const dbError = new Error('D3C forced news DB failure');

      await prisma.noticia.update({
        where: { id: news.id },
        data: { imagenUrl: portadaUrl },
      });

      const adapter = getStorageAdapter();
      const updateSpy = vi.spyOn(prisma.noticia, 'update').mockRejectedValue(dbError);
      const deleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia');

      try {
        await expect(newsService.removePortada(news.id)).rejects.toBe(dbError);
        expect(deleteSpy).not.toHaveBeenCalled();
        const row = await prisma.noticia.findUnique({
          where: { id: news.id },
          select: { imagenUrl: true },
        });
        expect(row?.imagenUrl).toBe(portadaUrl);
      } finally {
        updateSpy.mockRestore();
        deleteSpy.mockRestore();
      }
    });

    it('E3 — cleanup falla → DB null y HTTP 200', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const portadaUrl = 'https://externo.example/cleanup-fail.jpg';
      const adapter = getStorageAdapter();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      await prisma.noticia.update({
        where: { id: news.id },
        data: { imagenUrl: portadaUrl },
      });

      const deleteSpy = vi
        .spyOn(adapter, 'deleteImagenNoticia')
        .mockRejectedValue(new Error('D3C storage cleanup failure'));

      try {
        const res = await request(app)
          .delete(`${BASE}/${news.id}/portada`)
          .set('Authorization', `Bearer ${admin}`)
          .expect(200);

        expect(res.body.data.imagenUrl).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
          'storage.consistency_cleanup_failed',
          expect.objectContaining({
            operation: 'cleanup_after_db_delete',
            category: 'noticias',
            resourceId: news.id,
          }),
        );
      } finally {
        warnSpy.mockRestore();
        deleteSpy.mockRestore();
      }
    });

    it('E4 — sin portada → 200 sin delete storage', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const adapter = getStorageAdapter();
      const deleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia');

      try {
        const res = await request(app)
          .delete(`${BASE}/${news.id}/portada`)
          .set('Authorization', `Bearer ${admin}`)
          .expect(200);

        expect(res.body.data.imagenUrl).toBeNull();
        expect(deleteSpy).not.toHaveBeenCalled();
      } finally {
        deleteSpy.mockRestore();
      }
    });
  });

  describe('addImagenGaleria (F)', () => {
    it('F1 — create falla → compensa upload nuevo', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const dbError = new Error('D3C forced news DB failure');
      const adapter = getStorageAdapter();
      const uploadSpy = vi.spyOn(adapter, 'uploadImagenNoticia').mockResolvedValue({
        url: uploadedNoticiaUrl,
        mimeType: 'image/png',
        tamanoBytes: PNG_1x1.length,
      });
      const createSpy = vi.spyOn(prisma.noticiaImagen, 'create').mockRejectedValue(dbError);
      const deleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia').mockResolvedValue(undefined);

      try {
        await expect(newsService.addImagenGaleria(news.id, galeriaFile())).rejects.toBe(dbError);
        expect(deleteSpy).toHaveBeenCalledWith(uploadedNoticiaUrl);
      } finally {
        uploadSpy.mockRestore();
        createSpy.mockRestore();
        deleteSpy.mockRestore();
      }
    });

    it('F2 — compensación falla → warning y error DB original', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const dbError = new Error('D3C forced news DB failure');
      const adapter = getStorageAdapter();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const uploadSpy = vi.spyOn(adapter, 'uploadImagenNoticia').mockResolvedValue({
        url: uploadedNoticiaUrl,
        mimeType: 'image/png',
        tamanoBytes: PNG_1x1.length,
      });
      const createSpy = vi.spyOn(prisma.noticiaImagen, 'create').mockRejectedValue(dbError);
      const deleteSpy = vi
        .spyOn(adapter, 'deleteImagenNoticia')
        .mockRejectedValue(new Error('D3C storage compensation failure'));

      try {
        await expect(newsService.addImagenGaleria(news.id, galeriaFile())).rejects.toBe(dbError);
        expect(warnSpy).toHaveBeenCalledWith(
          'storage.consistency_cleanup_failed',
          expect.objectContaining({
            operation: 'compensate_upload',
            category: 'noticias',
          }),
        );
      } finally {
        warnSpy.mockRestore();
        uploadSpy.mockRestore();
        createSpy.mockRestore();
        deleteSpy.mockRestore();
      }
    });

    it('F3 — count falla → upload NO llamado', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const dbError = new Error('D3C forced news DB failure');
      const adapter = getStorageAdapter();
      const countSpy = vi.spyOn(prisma.noticiaImagen, 'count').mockRejectedValue(dbError);
      const uploadSpy = vi.spyOn(adapter, 'uploadImagenNoticia');

      try {
        await expect(newsService.addImagenGaleria(news.id, galeriaFile())).rejects.toBe(dbError);
        expect(uploadSpy).not.toHaveBeenCalled();
      } finally {
        countSpy.mockRestore();
        uploadSpy.mockRestore();
      }
    });

    it('F4 — happy path 201 sin compensación', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const adapter = getStorageAdapter();
      const deleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia');

      try {
        const res = await request(app)
          .post(`${BASE}/${news.id}/imagenes`)
          .set('Authorization', `Bearer ${admin}`)
          .attach('file', PNG_1x1, { filename: 'galeria.png', contentType: 'image/png' })
          .expect(201);

        expect(res.body.data.url).toMatch(/\.png$/i);
        expect(deleteSpy).not.toHaveBeenCalled();
      } finally {
        deleteSpy.mockRestore();
      }
    });
  });

  describe('removeImagenGaleria (G)', () => {
    it('G1 — DB delete antes de storage delete', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const added = await newsService.addImagenGaleria(news.id, galeriaFile());
      const adapter = getStorageAdapter();
      const events: string[] = [];

      const originalDelete = prisma.noticiaImagen.delete.bind(prisma.noticiaImagen);
      const dbDeleteSpy = vi.spyOn(prisma.noticiaImagen, 'delete').mockImplementation(async (args) => {
        events.push('db');
        return originalDelete(args);
      });
      const storageDeleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia').mockImplementation(async () => {
        events.push('storage');
      });

      try {
        await newsService.removeImagenGaleria(news.id, added.id);
        expect(events).toEqual(['db', 'storage']);
      } finally {
        dbDeleteSpy.mockRestore();
        storageDeleteSpy.mockRestore();
      }
    });

    it('G2 — DB delete falla → storage no llamado', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const added = await newsService.addImagenGaleria(news.id, galeriaFile());
      const dbError = new Error('D3C forced news DB failure');
      const adapter = getStorageAdapter();
      const dbDeleteSpy = vi.spyOn(prisma.noticiaImagen, 'delete').mockRejectedValue(dbError);
      const storageDeleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia');

      try {
        await expect(
          newsService.removeImagenGaleria(news.id, added.id),
        ).rejects.toBe(dbError);
        expect(storageDeleteSpy).not.toHaveBeenCalled();
        const row = await prisma.noticiaImagen.findUnique({ where: { id: added.id } });
        expect(row).not.toBeNull();
      } finally {
        dbDeleteSpy.mockRestore();
        storageDeleteSpy.mockRestore();
      }
    });

    it('G3 — cleanup falla → 204 y fila borrada', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const added = await request(app)
        .post(`${BASE}/${news.id}/imagenes`)
        .set('Authorization', `Bearer ${admin}`)
        .attach('file', PNG_1x1, { filename: 'g1.png', contentType: 'image/png' })
        .expect(201);
      const imagenId = added.body.data.id as number;
      const adapter = getStorageAdapter();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const storageDeleteSpy = vi
        .spyOn(adapter, 'deleteImagenNoticia')
        .mockRejectedValue(new Error('D3C storage cleanup failure'));

      try {
        await request(app)
          .delete(`${BASE}/${news.id}/imagenes/${imagenId}`)
          .set('Authorization', `Bearer ${admin}`)
          .expect(204);

        expect(warnSpy).toHaveBeenCalledWith(
          'storage.consistency_cleanup_failed',
          expect.objectContaining({
            operation: 'cleanup_after_db_delete',
            category: 'noticias',
            resourceId: news.id,
          }),
        );
        const row = await prisma.noticiaImagen.findUnique({ where: { id: imagenId } });
        expect(row).toBeNull();
      } finally {
        warnSpy.mockRestore();
        storageDeleteSpy.mockRestore();
      }
    });

    it('G4 — imagen inexistente → 404', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const adapter = getStorageAdapter();
      const dbDeleteSpy = vi.spyOn(prisma.noticiaImagen, 'delete');
      const storageDeleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia');

      try {
        await expect(
          newsService.removeImagenGaleria(news.id, 999_999_999),
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(dbDeleteSpy).not.toHaveBeenCalled();
        expect(storageDeleteSpy).not.toHaveBeenCalled();
      } finally {
        dbDeleteSpy.mockRestore();
        storageDeleteSpy.mockRestore();
      }
    });
  });

  describe('deleteNews (H)', () => {
    it('H1 — DB delete falla → storage nunca llamado', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      await prisma.noticia.update({
        where: { id: news.id },
        data: { imagenUrl: 'https://externo.example/portada.jpg' },
      });
      await newsService.addImagenGaleria(news.id, galeriaFile());

      const dbError = new Error('D3C forced news DB failure');
      const adapter = getStorageAdapter();
      const dbDeleteSpy = vi.spyOn(prisma.noticia, 'delete').mockRejectedValue(dbError);
      const storageDeleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia');

      try {
        await expect(newsService.deleteNews(news.id)).rejects.toBe(dbError);
        expect(storageDeleteSpy).not.toHaveBeenCalled();
        const row = await prisma.noticia.findUnique({ where: { id: news.id } });
        expect(row).not.toBeNull();
      } finally {
        dbDeleteSpy.mockRestore();
        storageDeleteSpy.mockRestore();
      }
    });

    it('H2 — DB delete OK → limpia portada y galería', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const portadaUrl = 'https://externo.example/h2-portada.jpg';

      await prisma.noticia.update({
        where: { id: news.id },
        data: { imagenUrl: portadaUrl },
      });
      const galeria = await newsService.addImagenGaleria(news.id, galeriaFile());

      const adapter = getStorageAdapter();
      const deletedUrls: string[] = [];
      const storageDeleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia').mockImplementation(async (url) => {
        deletedUrls.push(url);
      });

      try {
        await request(app)
          .delete(`${BASE}/${news.id}`)
          .set('Authorization', `Bearer ${admin}`)
          .expect(204);

        const idx = createdNewsIds.indexOf(news.id);
        if (idx >= 0) createdNewsIds.splice(idx, 1);

        expect(deletedUrls).toContain(portadaUrl);
        expect(deletedUrls).toContain(galeria.url);
        const row = await prisma.noticia.findUnique({ where: { id: news.id } });
        expect(row).toBeNull();
        const galeriaCount = await prisma.noticiaImagen.count({ where: { noticiaId: news.id } });
        expect(galeriaCount).toBe(0);
      } finally {
        storageDeleteSpy.mockRestore();
      }
    });

    it('H3 — un cleanup falla → todos intentados y 204', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const failUrl = 'https://externo.example/fail.jpg';
      const okUrl = 'https://externo.example/ok.jpg';

      await prisma.noticia.update({
        where: { id: news.id },
        data: { imagenUrl: failUrl },
      });
      await prisma.noticiaImagen.create({
        data: {
          noticiaId: news.id,
          url: okUrl,
          orden: 0,
          mimeType: 'image/png',
        },
      });

      const adapter = getStorageAdapter();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const attempted: string[] = [];
      const storageDeleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia').mockImplementation(async (url) => {
        attempted.push(url);
        if (url === failUrl) {
          throw new Error('D3C storage cleanup failure');
        }
      });

      try {
        await request(app)
          .delete(`${BASE}/${news.id}`)
          .set('Authorization', `Bearer ${admin}`)
          .expect(204);

        const idx = createdNewsIds.indexOf(news.id);
        if (idx >= 0) createdNewsIds.splice(idx, 1);

        expect(attempted.sort()).toEqual([failUrl, okUrl].sort());
        expect(warnSpy).toHaveBeenCalledTimes(1);
      } finally {
        warnSpy.mockRestore();
        storageDeleteSpy.mockRestore();
      }
    });

    it('H4 — varios cleanup fallan → warning por cada fallo', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const urlA = 'https://externo.example/fail-a.jpg';
      const urlB = 'https://externo.example/fail-b.jpg';

      await prisma.noticia.update({
        where: { id: news.id },
        data: { imagenUrl: urlA },
      });
      await prisma.noticiaImagen.create({
        data: {
          noticiaId: news.id,
          url: urlB,
          orden: 0,
          mimeType: 'image/png',
        },
      });

      const adapter = getStorageAdapter();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const storageDeleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia').mockRejectedValue(
        new Error('D3C storage cleanup failure'),
      );

      try {
        await request(app)
          .delete(`${BASE}/${news.id}`)
          .set('Authorization', `Bearer ${admin}`)
          .expect(204);

        const idx = createdNewsIds.indexOf(news.id);
        if (idx >= 0) createdNewsIds.splice(idx, 1);

        expect(storageDeleteSpy).toHaveBeenCalledTimes(2);
        expect(warnSpy).toHaveBeenCalledTimes(2);
      } finally {
        warnSpy.mockRestore();
        storageDeleteSpy.mockRestore();
      }
    });

    it('H5 — noticia sin imágenes → zero storage delete y 204', async () => {
      const admin = await loginUsuarioPassword(app, 'admin', 'Admin1234!');
      const news = await createNews(app, admin);
      const adapter = getStorageAdapter();
      const storageDeleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia');

      try {
        await request(app)
          .delete(`${BASE}/${news.id}`)
          .set('Authorization', `Bearer ${admin}`)
          .expect(204);

        const idx = createdNewsIds.indexOf(news.id);
        if (idx >= 0) createdNewsIds.splice(idx, 1);

        expect(storageDeleteSpy).not.toHaveBeenCalled();
      } finally {
        storageDeleteSpy.mockRestore();
      }
    });

    it('H6 — noticia inexistente → 404', async () => {
      const adapter = getStorageAdapter();
      const dbDeleteSpy = vi.spyOn(prisma.noticia, 'delete');
      const storageDeleteSpy = vi.spyOn(adapter, 'deleteImagenNoticia');

      try {
        await expect(newsService.deleteNews(999_999_999)).rejects.toMatchObject({
          statusCode: 404,
        });
        expect(dbDeleteSpy).not.toHaveBeenCalled();
        expect(storageDeleteSpy).not.toHaveBeenCalled();
      } finally {
        dbDeleteSpy.mockRestore();
        storageDeleteSpy.mockRestore();
      }
    });
  });
});
