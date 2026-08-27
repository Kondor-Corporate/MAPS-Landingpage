import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  getCertificacionesUploadDir: vi.fn(() => '/tmp/certificaciones'),
  getFotosUploadDir: vi.fn(() => '/tmp/fotos'),
  certificacionPublicUrl: vi.fn(
    (filename: string) => `https://frontend.example/uploads/certificaciones/${filename}`,
  ),
  fotoPublicUrl: vi.fn(
    (filename: string) => `https://frontend.example/uploads/fotos/${filename}`,
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
  certificacionPublicUrl: mocks.certificacionPublicUrl,
  fotoPublicUrl: mocks.fotoPublicUrl,
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

describe('contratos storage local y S3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.s3Client.mockImplementation(function S3ClientMock() {
      return { send: mocks.send };
    });
    mocks.putObjectCommand.mockImplementation(function PutObjectCommandMock(input) {
      return { input };
    });
    mocks.deleteObjectCommand.mockImplementation(function DeleteObjectCommandMock(input) {
      return { input };
    });
    mocks.loadEnv.mockReturnValue({
      S3_BUCKET: 'maps-bucket',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'test-access',
      S3_SECRET_KEY: 'test-secret',
      S3_PUBLIC_BASE_URL: 'https://cdn.example',
    });
    mocks.send.mockResolvedValue({});
  });

  it('local conserva URLs /uploads y create/delete sobre disco local', async () => {
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

  it('S3 conserva URLs directas y comandos create/delete del proveedor', async () => {
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
});
