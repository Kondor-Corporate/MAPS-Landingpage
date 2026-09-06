import { describe, expect, it } from 'vitest';
import { AppError } from '../src/lib/errors.js';
import { assertAllowedUploadContent } from '../src/lib/uploadContentValidation.js';

const PDF_VALID = Buffer.from('%PDF-1.4 test');
const JPEG_VALID = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const PNG_VALID = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const WEBP_VALID = Buffer.from('RIFFxxxxWEBP', 'ascii');
const GARBAGE = Buffer.from('not-a-valid-upload');

function expectFamilyError(
  fn: () => unknown,
  message: string,
): void {
  try {
    fn();
    expect.fail('expected AppError');
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    const appErr = err as AppError;
    expect(appErr.statusCode).toBe(400);
    expect(appErr.message).toBe(message);
  }
}

describe('assertAllowedUploadContent — certificacion', () => {
  it('PDF → application/pdf', () => {
    expect(assertAllowedUploadContent(PDF_VALID, 'certificacion')).toBe(
      'application/pdf',
    );
  });

  it('PNG → AppError 400 con mensaje certificación', () => {
    expectFamilyError(
      () => assertAllowedUploadContent(PNG_VALID, 'certificacion'),
      'El archivo no es un PDF válido',
    );
  });

  it('basura → AppError 400 con mensaje certificación', () => {
    expectFamilyError(
      () => assertAllowedUploadContent(GARBAGE, 'certificacion'),
      'El archivo no es un PDF válido',
    );
  });
});

describe('assertAllowedUploadContent — foto', () => {
  it('JPEG → image/jpeg', () => {
    expect(assertAllowedUploadContent(JPEG_VALID, 'foto')).toBe('image/jpeg');
  });

  it('PNG → image/png', () => {
    expect(assertAllowedUploadContent(PNG_VALID, 'foto')).toBe('image/png');
  });

  it('WebP → image/webp', () => {
    expect(assertAllowedUploadContent(WEBP_VALID, 'foto')).toBe('image/webp');
  });

  it('basura → AppError 400 con mensaje foto', () => {
    expectFamilyError(
      () => assertAllowedUploadContent(GARBAGE, 'foto'),
      'La foto debe ser un archivo JPG, PNG o WEBP válido',
    );
  });
});

describe('assertAllowedUploadContent — noticia', () => {
  it('JPEG → image/jpeg', () => {
    expect(assertAllowedUploadContent(JPEG_VALID, 'noticia')).toBe('image/jpeg');
  });

  it('PNG → image/png', () => {
    expect(assertAllowedUploadContent(PNG_VALID, 'noticia')).toBe('image/png');
  });

  it('WebP → AppError 400 con mensaje noticia', () => {
    expectFamilyError(
      () => assertAllowedUploadContent(WEBP_VALID, 'noticia'),
      'La imagen debe ser un archivo JPG, JPEG o PNG válido',
    );
  });

  it('basura → AppError 400 con mensaje noticia', () => {
    expectFamilyError(
      () => assertAllowedUploadContent(GARBAGE, 'noticia'),
      'La imagen debe ser un archivo JPG, JPEG o PNG válido',
    );
  });
});
