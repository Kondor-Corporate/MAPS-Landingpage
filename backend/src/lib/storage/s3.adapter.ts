import { randomBytes } from 'node:crypto';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { loadEnv } from '../../config/env.js';
import type {
  StorageAdapter,
  UploadCertificacionInput,
  UploadCertificacionResult,
  UploadFotoInput,
  UploadFotoResult,
} from './types.js';

const FOTO_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function keyFromUrl(url: string, publicBase: string): string | null {
  const normalizedBase = publicBase.replace(/\/$/, '');
  if (url.startsWith(normalizedBase)) {
    return url.slice(normalizedBase.length + 1);
  }
  try {
    const pathname = new URL(url).pathname;
    return pathname.startsWith('/') ? pathname.slice(1) : pathname;
  } catch {
    return null;
  }
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
    const key = keyFromUrl(url, this.publicBaseUrl);
    if (!key) return;
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
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
    const key = keyFromUrl(url, this.publicBaseUrl);
    if (!key) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch {
      /* file may already be gone, or was an external URL we don't manage */
    }
  }
}
