import { randomBytes, randomUUID } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../../config/env.js';
import {
  certificacionPublicUrl,
  fotoPublicUrl,
  getCertificacionesUploadDir,
  getFotosUploadDir,
  getNoticiasUploadDir,
  noticiaPublicUrl,
} from '../uploadPaths.js';
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

const LOCAL_MANAGED_FILENAME_PATTERNS: Record<StoredFileCategory, RegExp> = {
  certificaciones: /^\d+-\d+-[0-9a-f]{8}\.pdf$/i,
  fotos: /^\d+-\d+-[0-9a-f]{8}\.(?:jpg|png|webp)$/i,
  noticias:
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png)$/i,
};

function getLocalPublicBaseUrl(): URL {
  const env = loadEnv();
  const raw =
    env.API_PUBLIC_URL?.replace(/\/$/, '') ?? `http://localhost:${env.PORT}`;
  return new URL(`${raw}/`);
}

function parseLocalManagedFilename(
  rawUrl: string,
  category: StoredFileCategory,
): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    return null;
  }

  const publicBase = getLocalPublicBaseUrl();
  if (parsed.origin !== publicBase.origin) {
    return null;
  }

  const basePath =
    publicBase.pathname === '/' ? '' : publicBase.pathname.replace(/\/$/, '');
  const categorySegment = `uploads/${category}`;
  const expectedPrefix =
    basePath === '' ? `/${categorySegment}/` : `${basePath}/${categorySegment}/`;

  if (!parsed.pathname.startsWith(expectedPrefix)) {
    return null;
  }

  const filename = parsed.pathname.slice(expectedPrefix.length);
  if (!filename || filename.includes('/')) {
    return null;
  }

  if (!LOCAL_MANAGED_FILENAME_PATTERNS[category].test(filename)) {
    return null;
  }

  return filename;
}

function isENOENT(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'ENOENT'
  );
}

function unlinkManagedFile(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch (error) {
    if (isENOENT(error)) {
      return;
    }
    throw error;
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  async uploadCertificacion(input: UploadCertificacionInput): Promise<UploadCertificacionResult> {
    const filename = `${input.productorId}-${Date.now()}-${randomBytes(4).toString('hex')}.pdf`;
    const dest = path.join(getCertificacionesUploadDir(), filename);
    writeFileSync(dest, input.buffer);
    return {
      url: certificacionPublicUrl(filename),
      tamanoBytes: input.buffer.length,
      mimeType: input.mimeType,
    };
  }

  async deleteCertificacion(url: string): Promise<void> {
    const filename = parseLocalManagedFilename(url, 'certificaciones');
    if (!filename) return;
    const filePath = path.join(getCertificacionesUploadDir(), filename);
    unlinkManagedFile(filePath);
  }

  async uploadFoto(input: UploadFotoInput): Promise<UploadFotoResult> {
    const ext = FOTO_EXTENSION_BY_MIME[input.mimeType] ?? 'jpg';
    const filename = `${input.productorId}-${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
    const dest = path.join(getFotosUploadDir(), filename);
    writeFileSync(dest, input.buffer);
    return { url: fotoPublicUrl(filename) };
  }

  async deleteFoto(url: string): Promise<void> {
    const filename = parseLocalManagedFilename(url, 'fotos');
    if (!filename) return;
    const filePath = path.join(getFotosUploadDir(), filename);
    unlinkManagedFile(filePath);
  }

  async uploadImagenNoticia(
    input: UploadImagenNoticiaInput,
  ): Promise<UploadImagenNoticiaResult> {
    const ext = NOTICIA_EXTENSION_BY_MIME[input.mimeType] ?? 'jpg';
    const filename = `${randomUUID()}.${ext}`;
    const dest = path.join(getNoticiasUploadDir(), filename);
    writeFileSync(dest, input.buffer);
    return {
      url: noticiaPublicUrl(filename),
      mimeType: input.mimeType,
      tamanoBytes: input.buffer.length,
    };
  }

  async deleteImagenNoticia(url: string): Promise<void> {
    const filename = parseLocalManagedFilename(url, 'noticias');
    if (!filename) return;
    const filePath = path.join(getNoticiasUploadDir(), filename);
    unlinkManagedFile(filePath);
  }
}
