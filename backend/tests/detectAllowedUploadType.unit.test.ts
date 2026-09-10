import { describe, expect, it } from 'vitest';
import { detectAllowedUploadType } from '../src/lib/detectAllowedUploadType.js';

const PDF_VALID = Buffer.from('%PDF-1.4 test');
const JPEG_VALID = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const PNG_VALID = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const WEBP_VALID = Buffer.from('RIFFxxxxWEBP', 'ascii');

describe('detectAllowedUploadType', () => {
  it('PDF firma válida → application/pdf', () => {
    expect(detectAllowedUploadType(PDF_VALID)).toBe('application/pdf');
  });

  it('JPEG firma válida → image/jpeg', () => {
    expect(detectAllowedUploadType(JPEG_VALID)).toBe('image/jpeg');
  });

  it('PNG firma completa → image/png', () => {
    expect(detectAllowedUploadType(PNG_VALID)).toBe('image/png');
  });

  it('WebP RIFF....WEBP → image/webp', () => {
    expect(detectAllowedUploadType(WEBP_VALID)).toBe('image/webp');
  });

  it('buffer vacío → null', () => {
    expect(detectAllowedUploadType(Buffer.alloc(0))).toBeNull();
  });

  it('buffer corto → null', () => {
    expect(detectAllowedUploadType(Buffer.from([0xff]))).toBeNull();
  });

  it('texto arbitrario → null', () => {
    expect(detectAllowedUploadType(Buffer.from('hello'))).toBeNull();
  });

  it('PDF firma alterada → null', () => {
    expect(detectAllowedUploadType(Buffer.from('XPDF-1.4'))).toBeNull();
  });

  it('JPEG firma alterada → null', () => {
    expect(detectAllowedUploadType(Buffer.from([0xff, 0xd7, 0xff]))).toBeNull();
  });

  it('PNG con un byte de firma cambiado → null', () => {
    const altered = Buffer.from(PNG_VALID);
    altered[0] = 0x88;
    expect(detectAllowedUploadType(altered)).toBeNull();
  });

  it('RIFF sin WEBP → null', () => {
    expect(detectAllowedUploadType(Buffer.from('RIFFxxxxABCD', 'ascii'))).toBeNull();
  });

  it('WEBP sin RIFF → null', () => {
    const withoutRiff = Buffer.alloc(12, 0);
    WEBP_VALID.subarray(8, 12).copy(withoutRiff, 8);
    expect(detectAllowedUploadType(withoutRiff)).toBeNull();
  });

  it('PNG truncado → null sin lanzar', () => {
    expect(() =>
      detectAllowedUploadType(PNG_VALID.subarray(0, 7)),
    ).not.toThrow();
    expect(detectAllowedUploadType(PNG_VALID.subarray(0, 7))).toBeNull();
  });

  it('WebP truncado → null sin lanzar', () => {
    expect(() =>
      detectAllowedUploadType(WEBP_VALID.subarray(0, 11)),
    ).not.toThrow();
    expect(detectAllowedUploadType(WEBP_VALID.subarray(0, 11))).toBeNull();
  });
});
