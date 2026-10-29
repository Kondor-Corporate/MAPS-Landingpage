import { describe, expect, it } from 'vitest';
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
  normalizeCoordinates,
} from '../src/lib/coordinates.js';

describe('normalizeCoordinates', () => {
  describe('pares válidos', () => {
    it('acepta coordenadas de La Plata aproximadas', () => {
      expect(normalizeCoordinates(-34.92, -57.95)).toEqual({
        latitud: -34.92,
        longitud: -57.95,
      });
    });

    it('acepta (0, 0)', () => {
      expect(normalizeCoordinates(0, 0)).toEqual({ latitud: 0, longitud: 0 });
    });

    it('acepta latitud en el límite inferior inclusive', () => {
      expect(normalizeCoordinates(LATITUDE_MIN, 0)).toEqual({
        latitud: LATITUDE_MIN,
        longitud: 0,
      });
    });

    it('acepta latitud en el límite superior inclusive', () => {
      expect(normalizeCoordinates(LATITUDE_MAX, 0)).toEqual({
        latitud: LATITUDE_MAX,
        longitud: 0,
      });
    });

    it('acepta longitud en el límite inferior inclusive', () => {
      expect(normalizeCoordinates(0, LONGITUDE_MIN)).toEqual({
        latitud: 0,
        longitud: LONGITUDE_MIN,
      });
    });

    it('acepta longitud en el límite superior inclusive', () => {
      expect(normalizeCoordinates(0, LONGITUDE_MAX)).toEqual({
        latitud: 0,
        longitud: LONGITUDE_MAX,
      });
    });
  });

  describe('inválidos por bounds', () => {
    it('rechaza latitud por encima de 90', () => {
      expect(normalizeCoordinates(90.000001, -57.95)).toBeNull();
    });

    it('rechaza latitud por debajo de -90', () => {
      expect(normalizeCoordinates(-90.000001, -57.95)).toBeNull();
    });

    it('rechaza longitud por encima de 180', () => {
      expect(normalizeCoordinates(-34.92, 180.000001)).toBeNull();
    });

    it('rechaza longitud por debajo de -180', () => {
      expect(normalizeCoordinates(-34.92, -180.000001)).toBeNull();
    });
  });

  describe('no finitos', () => {
    it('rechaza latitud NaN', () => {
      expect(normalizeCoordinates(Number.NaN, -57.95)).toBeNull();
    });

    it('rechaza longitud NaN', () => {
      expect(normalizeCoordinates(-34.92, Number.NaN)).toBeNull();
    });

    it('rechaza latitud Infinity', () => {
      expect(normalizeCoordinates(Number.POSITIVE_INFINITY, -57.95)).toBeNull();
    });

    it('rechaza longitud Infinity', () => {
      expect(normalizeCoordinates(-34.92, Number.POSITIVE_INFINITY)).toBeNull();
    });

    it('rechaza latitud -Infinity', () => {
      expect(normalizeCoordinates(Number.NEGATIVE_INFINITY, -57.95)).toBeNull();
    });

    it('rechaza longitud -Infinity', () => {
      expect(normalizeCoordinates(-34.92, Number.NEGATIVE_INFINITY)).toBeNull();
    });
  });

  describe('tipo incorrecto', () => {
    it('rechaza latitud string numérica', () => {
      expect(normalizeCoordinates('-34.92', -57.95)).toBeNull();
    });

    it('rechaza longitud string numérica', () => {
      expect(normalizeCoordinates(-34.92, '-57.95')).toBeNull();
    });

    it('rechaza latitud null', () => {
      expect(normalizeCoordinates(null, -57.95)).toBeNull();
    });

    it('rechaza longitud null', () => {
      expect(normalizeCoordinates(-34.92, null)).toBeNull();
    });

    it('rechaza latitud undefined', () => {
      expect(normalizeCoordinates(undefined, -57.95)).toBeNull();
    });

    it('rechaza longitud undefined', () => {
      expect(normalizeCoordinates(-34.92, undefined)).toBeNull();
    });

    it('rechaza otros valores unknown', () => {
      expect(normalizeCoordinates({ latitud: -34.92 }, -57.95)).toBeNull();
      expect(normalizeCoordinates(-34.92, [-57.95])).toBeNull();
    });
  });

  describe('propiedades del helper', () => {
    it('no muta los inputs numéricos', () => {
      const latitud = -34.92;
      const longitud = -57.95;

      normalizeCoordinates(latitud, longitud);

      expect(latitud).toBe(-34.92);
      expect(longitud).toBe(-57.95);
    });

    it('no lanza con unknown arbitrario', () => {
      expect(() => normalizeCoordinates(Symbol('lat'), BigInt(1))).not.toThrow();
      expect(normalizeCoordinates(Symbol('lat'), BigInt(1))).toBeNull();
    });

    it('devuelve una nueva pair simple sin referencias compartidas', () => {
      const result = normalizeCoordinates(-34.92, -57.95);

      expect(result).toEqual({ latitud: -34.92, longitud: -57.95 });
    });
  });
});
