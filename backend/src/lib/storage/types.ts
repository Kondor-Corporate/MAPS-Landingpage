import type { Readable } from 'node:stream';

export type UploadCertificacionInput = {
  buffer: Buffer;
  mimeType: string;
  productorId: number;
};

export type UploadCertificacionResult = {
  url: string;
  tamanoBytes: number;
  mimeType: string;
};

export type UploadFotoInput = {
  buffer: Buffer;
  mimeType: string;
  productorId: number;
};

export type UploadFotoResult = {
  url: string;
};

export type StoredFileCategory = 'certificaciones' | 'fotos';

const STORED_FILE_PATTERNS: Record<StoredFileCategory, RegExp> = {
  certificaciones:
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i,
  fotos:
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i,
};

export function isStoredFilename(
  category: StoredFileCategory,
  filename: string,
): boolean {
  return STORED_FILE_PATTERNS[category].test(filename);
}

export type StoredFileReadResult = {
  stream: Readable;
  contentType: string;
  cacheControl: string;
  contentLength?: number;
};

export interface StorageAdapter {
  uploadCertificacion(input: UploadCertificacionInput): Promise<UploadCertificacionResult>;
  deleteCertificacion(url: string): Promise<void>;
  uploadFoto(input: UploadFotoInput): Promise<UploadFotoResult>;
  deleteFoto(url: string): Promise<void>;
  /**
   * Solo los proveedores privados que sirven archivos mediante el API implementan
   * lectura por stream. Local conserva express.static y S3 conserva sus URLs directas.
   */
  readPublicFile?(
    category: StoredFileCategory,
    filename: string,
  ): Promise<StoredFileReadResult | null>;
}
