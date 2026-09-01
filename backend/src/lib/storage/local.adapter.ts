import { randomBytes, randomUUID } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
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

function filenameFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const base = path.basename(pathname);
    return base || null;
  } catch {
    const parts = url.split('/');
    return parts[parts.length - 1] || null;
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
    const filename = filenameFromUrl(url);
    if (!filename) return;
    const filePath = path.join(getCertificacionesUploadDir(), filename);
    try {
      unlinkSync(filePath);
    } catch {
      /* file may already be gone */
    }
  }

  async uploadFoto(input: UploadFotoInput): Promise<UploadFotoResult> {
    const ext = FOTO_EXTENSION_BY_MIME[input.mimeType] ?? 'jpg';
    const filename = `${input.productorId}-${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
    const dest = path.join(getFotosUploadDir(), filename);
    writeFileSync(dest, input.buffer);
    return { url: fotoPublicUrl(filename) };
  }

  async deleteFoto(url: string): Promise<void> {
    const filename = filenameFromUrl(url);
    if (!filename) return;
    const filePath = path.join(getFotosUploadDir(), filename);
    try {
      unlinkSync(filePath);
    } catch {
      /* file may already be gone, or was an external URL we don't manage */
    }
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
    const filename = filenameFromUrl(url);
    if (!filename) return;
    const filePath = path.join(getNoticiasUploadDir(), filename);
    try {
      unlinkSync(filePath);
    } catch {
      /* file may already be gone, or was an external URL we don't manage */
    }
  }
}
