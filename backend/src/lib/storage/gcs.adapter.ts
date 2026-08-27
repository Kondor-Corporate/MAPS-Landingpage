import { Storage, type Bucket } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';
import { loadEnv } from '../../config/env.js';
import { isStoredFilename } from './types.js';
import type {
  StorageAdapter,
  StoredFileCategory,
  StoredFileReadResult,
  UploadCertificacionInput,
  UploadCertificacionResult,
  UploadFotoInput,
  UploadFotoResult,
} from './types.js';

const API_ROUTE_PREFIX = '/api/v1/uploads';
const CERT_CACHE_CONTROL = 'private, max-age=3600';
const FOTO_CACHE_CONTROL = 'public, max-age=86400';

const FOTO_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === 404 || code === '404';
}

function cacheControlFor(category: StoredFileCategory): string {
  return category === 'certificaciones' ? CERT_CACHE_CONTROL : FOTO_CACHE_CONTROL;
}

export class GcsStorageAdapter implements StorageAdapter {
  private readonly bucket: Bucket;
  private readonly prefix: string;
  private readonly publicApiOrigin: string;

  constructor() {
    const env = loadEnv();
    if (!env.GCS_BUCKET || !env.API_PUBLIC_URL) {
      throw new Error('GCS storage requires GCS_BUCKET and API_PUBLIC_URL');
    }

    this.prefix = env.GCS_PREFIX?.replace(/^\/+|\/+$/g, '') ?? '';
    this.publicApiOrigin = env.API_PUBLIC_URL.replace(/\/$/, '');

    // Application Default Credentials: Cloud Run autentica mediante su service account.
    this.bucket = new Storage().bucket(env.GCS_BUCKET);
  }

  async uploadCertificacion(input: UploadCertificacionInput): Promise<UploadCertificacionResult> {
    const filename = `${randomUUID()}.pdf`;
    await this.save('certificaciones', filename, input.buffer, input.mimeType, CERT_CACHE_CONTROL);
    return {
      url: this.publicUrl('certificaciones', filename),
      tamanoBytes: input.buffer.length,
      mimeType: input.mimeType,
    };
  }

  async deleteCertificacion(url: string): Promise<void> {
    await this.deleteFromManagedUrl(url, 'certificaciones');
  }

  async uploadFoto(input: UploadFotoInput): Promise<UploadFotoResult> {
    const extension = FOTO_EXTENSION_BY_MIME[input.mimeType] ?? 'jpg';
    const filename = `${randomUUID()}.${extension}`;
    await this.save('fotos', filename, input.buffer, input.mimeType, FOTO_CACHE_CONTROL);
    return { url: this.publicUrl('fotos', filename) };
  }

  async deleteFoto(url: string): Promise<void> {
    await this.deleteFromManagedUrl(url, 'fotos');
  }

  async readPublicFile(
    category: StoredFileCategory,
    filename: string,
  ): Promise<StoredFileReadResult | null> {
    if (!isStoredFilename(category, filename)) return null;

    const file = this.bucket.file(this.objectKey(category, filename));
    try {
      const [metadata] = await file.getMetadata();
      const parsedSize =
        typeof metadata.size === 'string' ? Number.parseInt(metadata.size, 10) : metadata.size;
      return {
        stream: file.createReadStream({ validation: 'crc32c' }),
        contentType:
          typeof metadata.contentType === 'string'
            ? metadata.contentType
            : category === 'certificaciones'
              ? 'application/pdf'
              : 'application/octet-stream',
        cacheControl:
          typeof metadata.cacheControl === 'string'
            ? metadata.cacheControl
            : cacheControlFor(category),
        contentLength:
          typeof parsedSize === 'number' && Number.isSafeInteger(parsedSize) && parsedSize >= 0
            ? parsedSize
            : undefined,
      };
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw new Error('No se pudo leer el archivo almacenado');
    }
  }

  private async save(
    category: StoredFileCategory,
    filename: string,
    buffer: Buffer,
    contentType: string,
    cacheControl: string,
  ): Promise<void> {
    await this.bucket.file(this.objectKey(category, filename)).save(buffer, {
      contentType,
      resumable: false,
      validation: 'crc32c',
      metadata: { cacheControl },
    });
  }

  private async deleteFromManagedUrl(
    rawUrl: string,
    expectedCategory: StoredFileCategory,
  ): Promise<void> {
    const managed = this.parseManagedUrl(rawUrl);
    if (!managed || managed.category !== expectedCategory) return;

    await this.bucket.file(this.objectKey(managed.category, managed.filename)).delete({
      ignoreNotFound: true,
    });
  }

  private parseManagedUrl(
    rawUrl: string,
  ): { category: StoredFileCategory; filename: string } | null {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return null;
    }

    if (
      parsed.origin !== new URL(this.publicApiOrigin).origin ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    const match = parsed.pathname.match(/^\/api\/v1\/uploads\/(certificaciones|fotos)\/([^/]+)$/);
    if (!match) return null;

    const category = match[1];
    if (category !== 'certificaciones' && category !== 'fotos') return null;
    const filename = match[2];
    if (!filename) return null;
    return isStoredFilename(category, filename) ? { category, filename } : null;
  }

  private objectKey(category: StoredFileCategory, filename: string): string {
    const relative = `${category}/${filename}`;
    return this.prefix ? `${this.prefix}/${relative}` : relative;
  }

  private publicUrl(category: StoredFileCategory, filename: string): string {
    return `${this.publicApiOrigin}${API_ROUTE_PREFIX}/${category}/${filename}`;
  }
}
