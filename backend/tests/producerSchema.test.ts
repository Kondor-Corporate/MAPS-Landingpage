import { describe, expect, it } from 'vitest';
import { updateProducerSchema } from '../src/validations/producer.schema.js';

const LATITUDE_MESSAGE = 'La latitud debe estar entre -90 y 90';
const LONGITUDE_MESSAGE = 'La longitud debe estar entre -180 y 180';

function expectFieldError(
  result: ReturnType<typeof updateProducerSchema.safeParse>,
  field: 'latitud' | 'longitud',
  message: string,
) {
  expect(result.success).toBe(false);
  if (result.success) return;
  const fieldErrors = result.error.flatten().fieldErrors[field];
  expect(fieldErrors).toBeDefined();
  expect(fieldErrors).toContain(message);
}

describe('producer admin schema', () => {
  it('tolera opcionales null al editar ubicacion', () => {
    const parsed = updateProducerSchema.safeParse({
      direccion: 'Diagonal 75 172, La Plata, Buenos Aires, Argentina',
      ciudad: 'Diagonal 75 172, La Plata, Buenos Aires, Argentina',
      latitud: -34.91234,
      longitud: -57.98765,
      telefono: null,
      anosExperiencia: null,
      clientesActivos: null,
      redesSociales: null,
    });

    expect(parsed.success).toBe(true);
  });

  describe('coordenadas válidas', () => {
    it('acepta latitud 90', () => {
      const parsed = updateProducerSchema.safeParse({ bio: 'ok', latitud: 90, longitud: 0 });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.latitud).toBe(90);
    });

    it('acepta latitud -90', () => {
      const parsed = updateProducerSchema.safeParse({ bio: 'ok', latitud: -90, longitud: 0 });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.latitud).toBe(-90);
    });

    it('acepta longitud 180', () => {
      const parsed = updateProducerSchema.safeParse({ bio: 'ok', latitud: 0, longitud: 180 });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.longitud).toBe(180);
    });

    it('acepta longitud -180', () => {
      const parsed = updateProducerSchema.safeParse({ bio: 'ok', latitud: 0, longitud: -180 });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.longitud).toBe(-180);
    });

    it('acepta (0, 0)', () => {
      const parsed = updateProducerSchema.safeParse({ bio: 'ok', latitud: 0, longitud: 0 });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.latitud).toBe(0);
        expect(parsed.data.longitud).toBe(0);
      }
    });

    it('coerce strings numéricos válidos de admin', () => {
      const parsed = updateProducerSchema.safeParse({
        bio: 'ok',
        latitud: '-34.92',
        longitud: '-57.95',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.latitud).toBe(-34.92);
        expect(parsed.data.longitud).toBe(-57.95);
      }
    });
  });

  describe('coordenadas inválidas', () => {
    it('rechaza latitud 91', () => {
      expectFieldError(
        updateProducerSchema.safeParse({ bio: 'ok', latitud: 91, longitud: -58 }),
        'latitud',
        LATITUDE_MESSAGE,
      );
    });

    it('rechaza latitud -91', () => {
      expectFieldError(
        updateProducerSchema.safeParse({ bio: 'ok', latitud: -91, longitud: -58 }),
        'latitud',
        LATITUDE_MESSAGE,
      );
    });

    it('rechaza longitud 181', () => {
      expectFieldError(
        updateProducerSchema.safeParse({ bio: 'ok', latitud: -34, longitud: 181 }),
        'longitud',
        LONGITUDE_MESSAGE,
      );
    });

    it('rechaza longitud -181', () => {
      expectFieldError(
        updateProducerSchema.safeParse({ bio: 'ok', latitud: -34, longitud: -181 }),
        'longitud',
        LONGITUDE_MESSAGE,
      );
    });

    it('rechaza latitud "91" tras coerción', () => {
      expectFieldError(
        updateProducerSchema.safeParse({ bio: 'ok', latitud: '91', longitud: '-58' }),
        'latitud',
        LATITUDE_MESSAGE,
      );
    });

    it('rechaza longitud "181" tras coerción', () => {
      expectFieldError(
        updateProducerSchema.safeParse({ bio: 'ok', latitud: '-34', longitud: '181' }),
        'longitud',
        LONGITUDE_MESSAGE,
      );
    });

    it('rechaza latitud "Infinity" tras coerción', () => {
      expectFieldError(
        updateProducerSchema.safeParse({ bio: 'ok', latitud: 'Infinity', longitud: '-58' }),
        'latitud',
        LATITUDE_MESSAGE,
      );
    });

    it('rechaza longitud "-Infinity" tras coerción', () => {
      expectFieldError(
        updateProducerSchema.safeParse({ bio: 'ok', latitud: '-34', longitud: '-Infinity' }),
        'longitud',
        LONGITUDE_MESSAGE,
      );
    });
  });

  describe('null / empty en coordenadas', () => {
    it('convierte null y "" en undefined preservando otros campos', () => {
      const parsed = updateProducerSchema.safeParse({
        bio: 'texto',
        latitud: null,
        longitud: '',
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.latitud).toBeUndefined();
        expect(parsed.data.longitud).toBeUndefined();
        expect(parsed.data.bio).toBe('texto');
      }
    });
  });

  describe('pareja lat/lng', () => {
    it('acepta solo latitud en el schema (pareja la valida el service)', () => {
      const parsed = updateProducerSchema.safeParse({ latitud: -34.9 });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.latitud).toBe(-34.9);
        expect(parsed.data.longitud).toBeUndefined();
      }
    });
  });
});
