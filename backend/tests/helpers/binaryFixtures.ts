/**
 * Fixtures binarios compartidos para tests de integración D3A.
 * Buffer/base64 únicamente — sin archivos físicos en disco.
 */

/** PNG 1×1 decodificable (base64). Válido para D3A y decodificación real. */
export const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Fixture PDF: firma `%PDF-` válida para el contrato D3A.
 * No implica un documento PDF completo ni parseable.
 */
export const PDF_SIGNATURE_FIXTURE = Buffer.from('%PDF-1.4 test certificacion D3A');

/**
 * Fixture JPEG: firma `FF D8 FF` válida para el contrato D3A.
 * No implica una imagen JPEG completamente decodificable.
 */
export const JPEG_SIGNATURE_FIXTURE = Buffer.from([0xff, 0xd8, 0xff, 0x00]);

/**
 * Fixture WebP: prefijo RIFF + marcador WEBP en offset 8–11, válido para D3A.
 * No implica una imagen WebP completamente decodificable.
 */
export const WEBP_SIGNATURE_FIXTURE = Buffer.from('RIFFxxxxWEBP', 'ascii');

/** Contenido arbitrario sin firma reconocible por D3A. */
export const UPLOAD_GARBAGE = Buffer.from('not-a-valid-upload');
