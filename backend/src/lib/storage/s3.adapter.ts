import { randomBytes } from 'node:crypto';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { loadEnv } from '../../config/env.js';
import type {
  StorageAdapter,
  StoredFileCategory,
  UploadCertificacionInput,
  UploadCertificacionResult,
  UploadFotoInput,
  UploadFotoResult,
  UploadImagenNoticiaInput,
  UploadImagenNoticiaResult,
} from './types.js';

const FOTO_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const NOTICIA_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

const S3_MANAGED_KEY_PATTERNS: Record<StoredFileCategory, RegExp> = {
  certificaciones: /^certificaciones\/\d+\/\d+-[0-9a-f]{8}\.pdf$/i,
  fotos: /^fotos\/\d+\/\d+-[0-9a-f]{8}\.(?:jpg|png|webp)$/i,
  noticias: /^noticias\/\d+\/\d+-[0-9a-f]{8}\.(?:jpg|png)$/i,
};

function parseS3ManagedKey(
  rawUrl: string,
  publicBaseUrl: string,
  category: StoredFileCategory,
): string | null {
  let parsed: URL;
  let base: URL;
  try {
    const normalizedBase = publicBaseUrl.replace(/\/$/, '');
    base = new URL(normalizedBase);
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.origin !== base.origin) {
    return null;
  }

  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    return null;
  }

  const basePath = base.pathname === '/' ? '' : base.pathname.replace(/\/$/, '');
  if (basePath) {
    if (parsed.pathname !== basePath && !parsed.pathname.startsWith(`${basePath}/`)) {
      return null;
    }
  }

  const key = basePath
    ? parsed.pathname.slice(basePath.length + 1)
    : parsed.pathname.replace(/^\//, '');

  if (!key || !S3_MANAGED_KEY_PATTERNS[category].test(key)) {
    return null;
  }

  return key;
}

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor() {
    const env = loadEnv();
    if (!env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
      throw new Error('S3 storage requires S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY');
    }
    this.bucket = env.S3_BUCKET;
    this.publicBaseUrl =
      env.S3_PUBLIC_BASE_URL?.replace(/\/$/, '') ??
      `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`;
    this.client = new S3Client({
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
    });
  }

  private async deleteManagedObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async uploadCertificacion(input: UploadCertificacionInput): Promise<UploadCertificacionResult> {
    const key = `certificaciones/${input.productorId}/${Date.now()}-${randomBytes(4).toString('hex')}.pdf`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );
    return {
      url: `${this.publicBaseUrl}/${key}`,
      tamanoBytes: input.buffer.length,
      mimeType: input.mimeType,
    };
  }

  async deleteCertificacion(url: string): Promise<void> {
    const key = parseS3ManagedKey(url, this.publicBaseUrl, 'certificaciones');
    if (!key) return;
    await this.deleteManagedObject(key);
  }

  async uploadFoto(input: UploadFotoInput): Promise<UploadFotoResult> {
    const ext = FOTO_EXTENSION_BY_MIME[input.mimeType] ?? 'jpg';
    const key = `fotos/${input.productorId}/${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );
    return { url: `${this.publicBaseUrl}/${key}` };
  }

  async deleteFoto(url: string): Promise<void> {
    const key = parseS3ManagedKey(url, this.publicBaseUrl, 'fotos');
    if (!key) return;
    await this.deleteManagedObject(key);
  }

  async uploadImagenNoticia(
    input: UploadImagenNoticiaInput,
  ): Promise<UploadImagenNoticiaResult> {
    const ext = NOTICIA_EXTENSION_BY_MIME[input.mimeType] ?? 'jpg';
    const key = `noticias/${input.noticiaId}/${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );
    return {
      url: `${this.publicBaseUrl}/${key}`,
      mimeType: input.mimeType,
      tamanoBytes: input.buffer.length,
    };
  }

  async deleteImagenNoticia(url: string): Promise<void> {
    const key = parseS3ManagedKey(url, this.publicBaseUrl, 'noticias');
    if (!key) return;
    await this.deleteManagedObject(key);
  }
}
