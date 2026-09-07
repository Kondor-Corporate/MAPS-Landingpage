import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';

const mocks = vi.hoisted(() => ({
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  getCertificacionesUploadDir: vi.fn(() => '/tmp/certificaciones'),
  getFotosUploadDir: vi.fn(() => '/tmp/fotos'),
  getNoticiasUploadDir: vi.fn(() => '/tmp/noticias'),
  certificacionPublicUrl: vi.fn(
    (filename: string) => `https://frontend.example/uploads/certificaciones/${filename}`,
  ),
  fotoPublicUrl: vi.fn(
    (filename: string) => `https://frontend.example/uploads/fotos/${filename}`,
  ),
  noticiaPublicUrl: vi.fn(
    (filename: string) => `https://frontend.example/uploads/noticias/${filename}`,
  ),
  loadEnv: vi.fn(),
  send: vi.fn(),
  s3Client: vi.fn(),
  putObjectCommand: vi.fn(),
  deleteObjectCommand: vi.fn(),
}));

vi.mock('node:fs', () => ({
  writeFileSync: mocks.writeFileSync,
  unlinkSync: mocks.unlinkSync,
}));

vi.mock('../src/lib/uploadPaths.js', () => ({
  getCertificacionesUploadDir: mocks.getCertificacionesUploadDir,
  getFotosUploadDir: mocks.getFotosUploadDir,
  getNoticiasUploadDir: mocks.getNoticiasUploadDir,
  certificacionPublicUrl: mocks.certificacionPublicUrl,
  fotoPublicUrl: mocks.fotoPublicUrl,
  noticiaPublicUrl: mocks.noticiaPublicUrl,
}));

vi.mock('../src/config/env.js', () => ({
  loadEnv: mocks.loadEnv,
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: mocks.s3Client,
  PutObjectCommand: mocks.putObjectCommand,
  DeleteObjectCommand: mocks.deleteObjectCommand,
}));

import { LocalStorageAdapter } from '../src/lib/storage/local.adapter.js';
import { S3StorageAdapter } from '../src/lib/storage/s3.adapter.js';

const LOCAL_ORIGIN = 'https://frontend.example';
const CERT_FILENAME = '12-1700000000000-a1b2c3d4.pdf';
const FOTO_FILENAME = '9-1700000000000-deadbeef.png';
const NOTICIA_FILENAME = '8d4c5ee5-8ce4-47bc-a5e2-7610ff473bdd.jpg';

function localManagedUrl(category: 'certificaciones' | 'fotos' | 'noticias', filename: string) {
  return `${LOCAL_ORIGIN}/uploads/${category}/${filename}`;
}

function configureLocalEnv(apiPublicUrl = LOCAL_ORIGIN) {
  mocks.loadEnv.mockReturnValue({
    API_PUBLIC_URL: apiPublicUrl,
    PORT: 3000,
    S3_BUCKET: 'maps-bucket',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY: 'test-access',
    S3_SECRET_KEY: 'test-secret',
    S3_PUBLIC_BASE_URL: 'https://cdn.example',
  });
}

function configureS3Env(publicBaseUrl: string) {
  mocks.loadEnv.mockReturnValue({
    API_PUBLIC_URL: LOCAL_ORIGIN,
    PORT: 3000,
    S3_BUCKET: 'maps-bucket',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY: 'test-access',
    S3_SECRET_KEY: 'test-secret',
    S3_PUBLIC_BASE_URL: publicBaseUrl,
  });
}

describe('LocalStorageAdapter — managed URL y delete contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureLocalEnv();
    mocks.unlinkSync.mockImplementation(() => undefined);
  });

  it('cert managed válida → unlink sobre path correcto', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.deleteCertificacion(localManagedUrl('certificaciones', CERT_FILENAME));

    expect(mocks.unlinkSync).toHaveBeenCalledOnce();
    expect(mocks.unlinkSync).toHaveBeenCalledWith(
      path.join('/tmp/certificaciones', CERT_FILENAME),
    );
  });

  it('foto managed válida → unlink correcto', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.deleteFoto(localManagedUrl('fotos', FOTO_FILENAME));

    expect(mocks.unlinkSync).toHaveBeenCalledWith(path.join('/tmp/fotos', FOTO_FILENAME));
  });

  it('noticia managed válida → unlink correcto', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.deleteImagenNoticia(localManagedUrl('noticias', NOTICIA_FILENAME));

    expect(mocks.unlinkSync).toHaveBeenCalledWith(
      path.join('/tmp/noticias', NOTICIA_FILENAME),
    );
  });

  it('URL externa con mismo basename que archivo managed → NO unlink', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.deleteFoto(`https://externo.example/${FOTO_FILENAME}`);

    expect(mocks.unlinkSync).not.toHaveBeenCalled();
  });

  it('origin parecido/malicioso → NO unlink', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.deleteFoto(
      `https://frontend.example.evil.com/uploads/fotos/${FOTO_FILENAME}`,
    );

    expect(mocks.unlinkSync).not.toHaveBeenCalled();
  });

  it('categoría incorrecta → NO unlink', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.deleteCertificacion(localManagedUrl('fotos', FOTO_FILENAME));

    expect(mocks.unlinkSync).not.toHaveBeenCalled();
  });

  it('filename que no cumple naming managed → NO unlink', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.deleteCertificacion(
      localManagedUrl('certificaciones', 'not-a-managed-name.pdf'),
    );

    expect(mocks.unlinkSync).not.toHaveBeenCalled();
  });

  it('query/hash inesperado → NO unlink', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.deleteFoto(
      `${localManagedUrl('fotos', FOTO_FILENAME)}?download=1`,
    );
    await adapter.deleteFoto(
      `${localManagedUrl('fotos', FOTO_FILENAME)}#fragment`,
    );

    expect(mocks.unlinkSync).not.toHaveBeenCalled();
  });

  it('ENOENT → no throw', async () => {
    const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    mocks.unlinkSync.mockImplementation(() => {
      throw enoent;
    });

    const adapter = new LocalStorageAdapter();
    await expect(
      adapter.deleteCertificacion(localManagedUrl('certificaciones', CERT_FILENAME)),
    ).resolves.toBeUndefined();
  });

  it('error distinto de ENOENT → throw', async () => {
    mocks.unlinkSync.mockImplementation(() => {
      const error = Object.assign(new Error('EACCES'), { code: 'EACCES' });
      throw error;
    });

    const adapter = new LocalStorageAdapter();
    await expect(
      adapter.deleteFoto(localManagedUrl('fotos', FOTO_FILENAME)),
    ).rejects.toThrow('EACCES');
  });

  it('conserva URLs /uploads en upload y delete managed', async () => {
    const adapter = new LocalStorageAdapter();
    const uploaded = await adapter.uploadCertificacion({
      buffer: Buffer.from('pdf'),
      mimeType: 'application/pdf',
      productorId: 12,
    });

    expect(new URL(uploaded.url).pathname).toMatch(
      /^\/uploads\/certificaciones\/12-\d+-[0-9a-f]{8}\.pdf$/,
    );
    expect(mocks.writeFileSync).toHaveBeenCalledOnce();

    await adapter.deleteCertificacion(uploaded.url);
    expect(mocks.unlinkSync).toHaveBeenCalledOnce();
  });

  it('API_PUBLIC_URL con path conserva prefijo managed', async () => {
    configureLocalEnv('https://frontend.example/v1');
    const adapter = new LocalStorageAdapter();
    const url = `https://frontend.example/v1/uploads/fotos/${FOTO_FILENAME}`;

    await adapter.deleteFoto(url);

    expect(mocks.unlinkSync).toHaveBeenCalledWith(path.join('/tmp/fotos', FOTO_FILENAME));
  });
});

describe('S3StorageAdapter — managed URL y delete contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureS3Env('https://cdn.example');
    mocks.s3Client.mockImplementation(function S3ClientMock() {
      return { send: mocks.send };
    });
    mocks.putObjectCommand.mockImplementation(function PutObjectCommandMock(input) {
      return { input };
    });
    mocks.deleteObjectCommand.mockImplementation(function DeleteObjectCommandMock(input) {
      return { input };
    });
    mocks.send.mockResolvedValue({});
  });

  const certKey = 'certificaciones/12/1700000000000-a1b2c3d4.pdf';
  const fotoKey = 'fotos/9/1700000000000-deadbeef.webp';
  const noticiaKey = 'noticias/4/1700000000000-abcdef12.png';

  it('base sin path + URL managed → key correcta', async () => {
    const adapter = new S3StorageAdapter();
    await adapter.deleteCertificacion(`https://cdn.example/${certKey}`);

    expect(mocks.deleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'maps-bucket',
      Key: certKey,
    });
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it('base CON path + URL managed → key relativa correcta', async () => {
    configureS3Env('https://cdn.example/maps-assets');
    const adapter = new S3StorageAdapter();

    await adapter.deleteImagenNoticia(
      `https://cdn.example/maps-assets/${noticiaKey}`,
    );

    expect(mocks.deleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'maps-bucket',
      Key: noticiaKey,
    });
  });

  it('otro origin → no client.send', async () => {
    const adapter = new S3StorageAdapter();
    await adapter.deleteFoto(`https://otro.example/${fotoKey}`);

    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('origin prefijo malicioso → no client.send', async () => {
    const adapter = new S3StorageAdapter();
    await adapter.deleteFoto(`https://cdn.example.evil.com/${fotoKey}`);

    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('pathname prefijo parcial → no client.send', async () => {
    configureS3Env('https://cdn.example/maps');
    const adapter = new S3StorageAdapter();
    await adapter.deleteImagenNoticia(
      `https://cdn.example/maps-evil/${noticiaKey}`,
    );

    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('categoría incorrecta → no client.send', async () => {
    const adapter = new S3StorageAdapter();
    await adapter.deleteFoto(`https://cdn.example/${noticiaKey}`);

    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('key con naming no managed → no client.send', async () => {
    const adapter = new S3StorageAdapter();
    await adapter.deleteCertificacion('https://cdn.example/certificaciones/evil.pdf');

    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('query/hash/credentials inesperadas → no client.send', async () => {
    const adapter = new S3StorageAdapter();
    await adapter.deleteFoto(`https://cdn.example/${fotoKey}?version=1`);
    await adapter.deleteFoto(`https://cdn.example/${fotoKey}#frag`);
    await adapter.deleteFoto(`https://user:pass@cdn.example/${fotoKey}`);

    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('managed válida → DeleteObjectCommand correcto en foto', async () => {
    const adapter = new S3StorageAdapter();
    const uploaded = await adapter.uploadFoto({
      buffer: Buffer.from('image'),
      mimeType: 'image/webp',
      productorId: 9,
    });

    expect(uploaded.url).toMatch(
      /^https:\/\/cdn\.example\/fotos\/9\/\d+-[0-9a-f]{8}\.webp$/,
    );
    expect(mocks.putObjectCommand).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledOnce();

    await adapter.deleteFoto(uploaded.url);

    expect(mocks.deleteObjectCommand).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });

  it('client.send reject → throw', async () => {
    mocks.send.mockRejectedValueOnce(new Error('network down'));
    const adapter = new S3StorageAdapter();

    await expect(adapter.deleteFoto(`https://cdn.example/${fotoKey}`)).rejects.toThrow(
      'network down',
    );
  });

  it('cert/foto/noticia cumplen misma semántica de delete managed', async () => {
    const adapter = new S3StorageAdapter();

    await adapter.deleteCertificacion(`https://cdn.example/${certKey}`);
    await adapter.deleteFoto(`https://cdn.example/${fotoKey}`);
    await adapter.deleteImagenNoticia(`https://cdn.example/${noticiaKey}`);

    expect(mocks.deleteObjectCommand).toHaveBeenCalledTimes(3);
    expect(mocks.send).toHaveBeenCalledTimes(3);
  });
});
