export type AllowedUploadMime =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp';

const PDF_SIGNATURE = Buffer.from('%PDF-', 'ascii');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE_PREFIX = Buffer.from([0xff, 0xd8, 0xff]);
const RIFF_SIGNATURE = Buffer.from('RIFF', 'ascii');
const WEBP_SIGNATURE = Buffer.from('WEBP', 'ascii');

function hasPrefix(buffer: Buffer, prefix: Buffer): boolean {
  if (buffer.length < prefix.length) {
    return false;
  }
  return buffer.subarray(0, prefix.length).equals(prefix);
}

/**
 * Inspecciona solo los bytes necesarios del buffer.
 * Puro, síncrono, sin IO. No usa filename, extensión ni MIME declarado.
 */
export function detectAllowedUploadType(buffer: Buffer): AllowedUploadMime | null {
  if (buffer.length === 0) {
    return null;
  }

  if (hasPrefix(buffer, PDF_SIGNATURE)) {
    return 'application/pdf';
  }

  if (hasPrefix(buffer, PNG_SIGNATURE)) {
    return 'image/png';
  }

  if (hasPrefix(buffer, JPEG_SIGNATURE_PREFIX)) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 12 &&
    hasPrefix(buffer, RIFF_SIGNATURE) &&
    buffer.subarray(8, 12).equals(WEBP_SIGNATURE)
  ) {
    return 'image/webp';
  }

  return null;
}
