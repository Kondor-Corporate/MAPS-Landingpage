import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  delete: vi.fn(),
  createReadStream: vi.fn(),
  getMetadata: vi.fn(),
  file: vi.fn(),
  bucket: vi.fn(),
  storage: vi.fn(),
  loadEnv: vi.fn(),
}));

vi.mock('@google-cloud/storage', () => ({
  Storage: mocks.storage,
}));

vi.mock('../src/config/env.js', () => ({
  loadEnv: mocks.loadEnv,
}));

import { GcsStorageAdapter } from '../src/lib/storage/gcs.adapter.js';

describe('GcsStorageAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadEnv.mockReturnValue({
      GCS_BUCKET: 'private-staging-bucket',
      GCS_PREFIX: 'maps-staging/private',
      API_PUBLIC_URL: 'https://staging.example.invalid',
    });
    mocks.file.mockReturnValue({
      save: mocks.save,
      delete: mocks.delete,
      createReadStream: mocks.createReadStream,
      getMetadata: mocks.getMetadata,
    });
    mocks.bucket.mockReturnValue({ file: mocks.file });
    mocks.storage.mockImplementation(function StorageMock() {
      return { bucket: mocks.bucket };
    });
  });

  it('usa ADC y guarda una certificación privada detrás de una URL del API', async () => {
    const adapter = new GcsStorageAdapter();
    const buffer = Buffer.from('pdf');

    const result = await adapter.uploadCertificacion({
      buffer,
      mimeType: 'application/pdf',
      productorId: 7,
    });

    expect(mocks.storage).toHaveBeenCalledWith();
    expect(mocks.bucket).toHaveBeenCalledWith('private-staging-bucket');
    expect(result.url).toMatch(
      /^https:\/\/staging\.example\.invalid\/api\/v1\/uploads\/certificaciones\/[0-9a-f-]+\.pdf$/,
    );
    expect(result.url).not.toContain('private-staging-bucket');
    expect(result.url).not.toContain('maps-staging/private');

    const objectKey = mocks.file.mock.calls[0]?.[0] as string;
    expect(objectKey).toMatch(/^maps-staging\/private\/certificaciones\/[0-9a-f-]+\.pdf$/);
    expect(mocks.save).toHaveBeenCalledWith(buffer, {
      contentType: 'application/pdf',
      resumable: false,
      validation: 'crc32c',
      metadata: { cacheControl: 'private, max-age=3600' },
    });
  });

  it('admite un prefijo vacío sin agregar barras a la clave', async () => {
    mocks.loadEnv.mockReturnValue({
      GCS_BUCKET: 'private-staging-bucket',
      GCS_PREFIX: '',
      API_PUBLIC_URL: 'https://staging.example.invalid',
    });
    const adapter = new GcsStorageAdapter();

    await adapter.uploadFoto({
      buffer: Buffer.from('image'),
      mimeType: 'image/png',
      productorId: 7,
    });

    expect(mocks.file.mock.calls[0]?.[0]).toMatch(/^fotos\/[0-9a-f-]+\.png$/);
  });

  it('normaliza la barra final de API_PUBLIC_URL al persistir la URL', async () => {
    mocks.loadEnv.mockReturnValue({
      GCS_BUCKET: 'private-staging-bucket',
      GCS_PREFIX: 'maps-staging',
      API_PUBLIC_URL: 'https://staging.example.invalid/',
    });
    const adapter = new GcsStorageAdapter();

    const result = await adapter.uploadFoto({
      buffer: Buffer.from('image'),
      mimeType: 'image/webp',
      productorId: 7,
    });

    expect(result.url).toMatch(
      /^https:\/\/staging\.example\.invalid\/api\/v1\/uploads\/fotos\/[0-9a-f-]+\.webp$/,
    );
    expect(result.url).not.toContain('invalid//api');
  });

  it('preserva Content-Type y Cache-Control al leer un objeto', async () => {
    const adapter = new GcsStorageAdapter();
    const filename = '8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.webp';
    const stream = Readable.from(Buffer.from('image'));
    mocks.createReadStream.mockReturnValue(stream);
    mocks.getMetadata.mockResolvedValue([
      { contentType: 'image/webp', cacheControl: 'public, max-age=86400', size: '5' },
    ]);

    const result = await adapter.readPublicFile('fotos', filename);

    expect(mocks.file).toHaveBeenCalledWith(`maps-staging/private/fotos/${filename}`);
    expect(result).toEqual({
      stream,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=86400',
      contentLength: 5,
    });
    expect(mocks.createReadStream).toHaveBeenCalledWith({ validation: 'crc32c' });
  });

  it.each([
    '../../secreto.pdf',
    '%2e%2e%2fsecreto.pdf',
    '8d4c5ee5-8ce4-17bc-a5e2-7610ff473bdd.pdf',
  ])('rechaza nombre inválido %s sin consultar el bucket', async (filename) => {
    const adapter = new GcsStorageAdapter();

    await expect(adapter.readPublicFile('certificaciones', filename)).resolves.toBeNull();
    expect(mocks.file).not.toHaveBeenCalled();
  });

  it('solo elimina URLs administradas del origen, categoría y prefijo esperados', async () => {
    const adapter = new GcsStorageAdapter();
    const filename = '4bd9ff51-e11f-4a90-83c6-f1ae948eceea.pdf';

    await adapter.deleteCertificacion(
      `https://staging.example.invalid/api/v1/uploads/certificaciones/${filename}`,
    );
    await adapter.deleteCertificacion(
      `https://otro.example.invalid/api/v1/uploads/certificaciones/${filename}`,
    );
    await adapter.deleteCertificacion(
      `https://staging.example.invalid/api/v1/uploads/fotos/${filename}`,
    );
    await adapter.deleteCertificacion(
      `https://staging.example.invalid/api/v1/uploads//certificaciones/${filename}`,
    );
    await adapter.deleteCertificacion(
      `https://staging.example.invalid/api/v1/uploads/certificaciones/${filename}?download=1`,
    );
    await adapter.deleteCertificacion(
      `https://staging.example.invalid/api/v1/uploads/certificaciones/%2e%2e/${filename}`,
    );

    expect(mocks.file).toHaveBeenCalledOnce();
    expect(mocks.file).toHaveBeenCalledWith(`maps-staging/private/certificaciones/${filename}`);
    expect(mocks.delete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it('traduce un objeto inexistente a null sin filtrar detalles internos', async () => {
    const adapter = new GcsStorageAdapter();
    const filename = '8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.pdf';
    mocks.getMetadata.mockRejectedValue({ code: 404, message: 'bucket internals' });

    await expect(adapter.readPublicFile('certificaciones', filename)).resolves.toBeNull();
  });
});
