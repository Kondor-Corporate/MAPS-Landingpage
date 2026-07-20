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

export interface StorageAdapter {
  uploadCertificacion(input: UploadCertificacionInput): Promise<UploadCertificacionResult>;
  deleteCertificacion(url: string): Promise<void>;
  uploadFoto(input: UploadFotoInput): Promise<UploadFotoResult>;
  deleteFoto(url: string): Promise<void>;
}
