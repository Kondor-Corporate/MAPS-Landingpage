import { AppError } from './errors.js';
import {
  detectAllowedUploadType,
  type AllowedUploadMime,
} from './detectAllowedUploadType.js';

export type UploadContentFamily = 'certificacion' | 'foto' | 'noticia';

const FAMILY_MESSAGES: Record<UploadContentFamily, string> = {
  certificacion: 'El archivo no es un PDF válido',
  foto: 'La foto debe ser un archivo JPG, PNG o WEBP válido',
  noticia: 'La imagen debe ser un archivo JPG, JPEG o PNG válido',
};

const ALLOWED_BY_FAMILY: Record<UploadContentFamily, readonly AllowedUploadMime[]> = {
  certificacion: ['application/pdf'],
  foto: ['image/jpeg', 'image/png', 'image/webp'],
  noticia: ['image/jpeg', 'image/png'],
};

function isAllowedForFamily(
  mime: AllowedUploadMime,
  family: UploadContentFamily,
): boolean {
  return ALLOWED_BY_FAMILY[family].includes(mime);
}

export function assertAllowedUploadContent(
  buffer: Buffer,
  family: UploadContentFamily,
): AllowedUploadMime {
  const detected = detectAllowedUploadType(buffer);

  if (detected === null || !isAllowedForFamily(detected, family)) {
    throw new AppError(400, FAMILY_MESSAGES[family]);
  }

  return detected;
}
