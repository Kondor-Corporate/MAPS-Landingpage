import { randomBytes } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { certificacionPublicUrl, getCertificacionesUploadDir } from '../uploadPaths.js';
import type { StorageAdapter, UploadCertificacionInput, UploadCertificacionResult } from './types.js';

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
}
