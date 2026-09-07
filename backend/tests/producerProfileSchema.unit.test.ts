import { describe, expect, it } from 'vitest';
import { updateMyProfileSchema } from '../src/validations/producerProfile.schema.js';

const LATITUDE_MESSAGE = 'La latitud debe estar entre -90 y 90';
const LONGITUDE_MESSAGE = 'La longitud debe estar entre -180 y 180';

function expectFieldError(
  result: ReturnType<typeof updateMyProfileSchema.safeParse>,
  field: 'latitud' | 'longitud',
  message: string,
) {
  expect(result.success).toBe(false);
  if (result.success) return;
  const fieldErrors = result.error.flatten().fieldErrors[field];
  expect(fieldErrors).toBeDefined();
  expect(fieldErrors).toContain(message);
}

describe('updateMyProfileSchema — coordenadas', () => {
  describe('pares válidos', () => {
    it('acepta latitud 90 y longitud 180', () => {
      const parsed = updateMyProfileSchema.safeParse({
        bio: 'ok',
        latitud: 90,
        longitud: 180,
      });
      expect(parsed.success).toBe(true);
    });

    it('acepta latitud -90 y longitud -180', () => {
      const parsed = updateMyProfileSchema.safeParse({
        bio: 'ok',
        latitud: -90,
        longitud: -180,
      });
      expect(parsed.success).toBe(true);
    });

    it('acepta (0, 0)', () => {
      const parsed = updateMyProfileSchema.safeParse({
        bio: 'ok',
        latitud: 0,
        longitud: 0,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.latitud).toBe(0);
        expect(parsed.data.longitud).toBe(0);
      }
    });

    it('acepta coordenadas de La Plata', () => {
      const parsed = updateMyProfileSchema.safeParse({
        bio: 'ok',
        latitud: -34.9214,
        longitud: -57.9545,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.latitud).toBe(-34.9214);
        expect(parsed.data.longitud).toBe(-57.9545);
      }
    });
  });

  describe('inválidos por bounds', () => {
    it('rechaza latitud 91', () => {
      expectFieldError(
        updateMyProfileSchema.safeParse({ bio: 'ok', latitud: 91, longitud: -58 }),
        'latitud',
        LATITUDE_MESSAGE,
      );
    });

    it('rechaza latitud -91', () => {
      expectFieldError(
        updateMyProfileSchema.safeParse({ bio: 'ok', latitud: -91, longitud: -58 }),
        'latitud',
        LATITUDE_MESSAGE,
      );
    });

    it('rechaza longitud 181', () => {
      expectFieldError(
        updateMyProfileSchema.safeParse({ bio: 'ok', latitud: -34, longitud: 181 }),
        'longitud',
        LONGITUDE_MESSAGE,
      );
    });

    it('rechaza longitud -181', () => {
      expectFieldError(
        updateMyProfileSchema.safeParse({ bio: 'ok', latitud: -34, longitud: -181 }),
        'longitud',
        LONGITUDE_MESSAGE,
      );
    });
  });

  describe('tipo incorrecto (number-only)', () => {
    it('rechaza latitud string', () => {
      const parsed = updateMyProfileSchema.safeParse({
        bio: 'ok',
        latitud: '-34.92',
        longitud: -57.95,
      });
      expect(parsed.success).toBe(false);
    });

    it('rechaza longitud string', () => {
      const parsed = updateMyProfileSchema.safeParse({
        bio: 'ok',
        latitud: -34.92,
        longitud: '-57.95',
      });
      expect(parsed.success).toBe(false);
    });

    it('rechaza latitud null', () => {
      const parsed = updateMyProfileSchema.safeParse({
        bio: 'ok',
        latitud: null,
        longitud: -57.95,
      });
      expect(parsed.success).toBe(false);
    });

    it('rechaza longitud null', () => {
      const parsed = updateMyProfileSchema.safeParse({
        bio: 'ok',
        latitud: -34.92,
        longitud: null,
      });
      expect(parsed.success).toBe(false);
    });

    it('rechaza latitud Infinity', () => {
      expectFieldError(
        updateMyProfileSchema.safeParse({ bio: 'ok', latitud: Infinity, longitud: -58 }),
        'latitud',
        LATITUDE_MESSAGE,
      );
    });

    it('rechaza longitud -Infinity', () => {
      expectFieldError(
        updateMyProfileSchema.safeParse({ bio: 'ok', latitud: -34, longitud: -Infinity }),
        'longitud',
        LONGITUDE_MESSAGE,
      );
    });
  });

  describe('pareja lat/lng', () => {
    it('acepta solo latitud en el schema (pareja la valida el service)', () => {
      const parsed = updateMyProfileSchema.safeParse({ latitud: -34.9 });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.latitud).toBe(-34.9);
        expect(parsed.data.longitud).toBeUndefined();
      }
    });
  });
});
