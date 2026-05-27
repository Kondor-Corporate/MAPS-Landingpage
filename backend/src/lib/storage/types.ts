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

export interface StorageAdapter {
  uploadCertificacion(input: UploadCertificacionInput): Promise<UploadCertificacionResult>;
  deleteCertificacion(url: string): Promise<void>;
}
