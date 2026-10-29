import express from 'express';
import { Readable } from 'node:stream';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadsRouter } from '../src/api/v1/routes/uploads.routes.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';

const mocks = vi.hoisted(() => ({
  getStorageAdapter: vi.fn(),
  readPublicFile: vi.fn(),
}));

vi.mock('../src/lib/storage/index.js', () => ({
  getStorageAdapter: mocks.getStorageAdapter,
}));

function createTestApp() {
  const app = express();
  app.use('/api/v1/uploads', uploadsRouter);
  app.use(errorHandler);
  return app;
}

describe('GET /api/v1/uploads/:category/:filename', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStorageAdapter.mockReturnValue({
      readPublicFile: mocks.readPublicFile,
    });
  });

  it('sirve el archivo conservando tipo y política de caché', async () => {
    mocks.readPublicFile.mockResolvedValue({
      stream: Readable.from(Buffer.from('contenido')),
      contentType: 'application/pdf',
      cacheControl: 'private, max-age=3600',
      contentLength: 9,
    });

    const response = await request(createTestApp()).get(
      '/api/v1/uploads/certificaciones/8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.pdf',
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['cache-control']).toBe('private, max-age=3600');
    expect(mocks.readPublicFile).toHaveBeenCalledWith(
      'certificaciones',
      '8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.pdf',
    );
  });

  it('responde 404 genérico para categorías inválidas', async () => {
    const response = await request(createTestApp()).get(
      '/api/v1/uploads/otro/8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.pdf',
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      data: null,
      message: 'Archivo no encontrado',
      error: null,
    });
    expect(mocks.readPublicFile).not.toHaveBeenCalled();
  });

  it.each([
    'no-es-un-uuid.pdf',
    '8d4c5ee5-8ce4-17bc-a5e2-7610ff473bdd.pdf',
    '%2e%2e%2fsecreto.pdf',
  ])('responde 404 sin acceder al storage para filename inválido %s', async (filename) => {
    const response = await request(createTestApp()).get(
      `/api/v1/uploads/certificaciones/${filename}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Archivo no encontrado');
    expect(mocks.readPublicFile).not.toHaveBeenCalled();
  });

  it('ignora el query string al identificar una descarga válida', async () => {
    mocks.readPublicFile.mockResolvedValue({
      stream: Readable.from(Buffer.from('image')),
      contentType: 'image/webp',
      cacheControl: 'public, max-age=86400',
    });
    const filename = '8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.webp';

    const response = await request(createTestApp()).get(
      `/api/v1/uploads/fotos/${filename}?download=1`,
    );

    expect(response.status).toBe(200);
    expect(mocks.readPublicFile).toHaveBeenCalledWith('fotos', filename);
  });

  it('responde 404 genérico cuando el objeto no existe', async () => {
    mocks.readPublicFile.mockResolvedValue(null);

    const response = await request(createTestApp()).get(
      '/api/v1/uploads/fotos/8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.webp',
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Archivo no encontrado');
  });

  it('devuelve 404 para proveedores que no implementan lectura privada', async () => {
    mocks.getStorageAdapter.mockReturnValue({});

    const response = await request(createTestApp()).get(
      '/api/v1/uploads/fotos/8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.webp',
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Archivo no encontrado');
    expect(mocks.readPublicFile).not.toHaveBeenCalled();
  });

  it('maneja un error del stream antes de enviar el cuerpo', async () => {
    const failedStream = new Readable({
      read() {
        this.destroy(new Error('private-staging-bucket: stream failure'));
      },
    });
    mocks.readPublicFile.mockResolvedValue({
      stream: failedStream,
      contentType: 'application/pdf',
      cacheControl: 'private, max-age=3600',
    });

    const response = await request(createTestApp()).get(
      '/api/v1/uploads/certificaciones/8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.pdf',
    );

    expect(response.status).toBe(503);
    expect(response.body.message).toBe('Archivo temporalmente no disponible');
    expect(JSON.stringify(response.body)).not.toContain('private-staging-bucket');
  });

  it('no revela detalles del proveedor cuando la lectura falla', async () => {
    mocks.readPublicFile.mockRejectedValue(new Error('private-staging-bucket: permission denied'));

    const response = await request(createTestApp()).get(
      '/api/v1/uploads/fotos/8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.webp',
    );

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      data: null,
      message: 'Archivo temporalmente no disponible',
      error: null,
    });
    expect(JSON.stringify(response.body)).not.toContain('private-staging-bucket');
  });
});
