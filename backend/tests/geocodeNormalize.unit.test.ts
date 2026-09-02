import { describe, expect, it } from 'vitest';
import {
  normalizeGeocodeQuery,
  normalizeReverseCoordinates,
} from '../src/lib/geocodeNormalize.js';

describe('normalizeGeocodeQuery', () => {
  it('recorta, colapsa espacios y pasa a minúsculas', () => {
    expect(normalizeGeocodeQuery('  Diagonal   75   172,  La Plata  ')).toBe(
      'diagonal 75 172, la plata',
    );
  });

  it('trata direcciones equivalentes como la misma clave de caché', () => {
    const a = normalizeGeocodeQuery('Calle 50 1000, La Plata');
    const b = normalizeGeocodeQuery('  calle   50 1000,   LA PLATA ');
    expect(a).toBe(b);
  });
});

describe('normalizeReverseCoordinates', () => {
  it('redondea a 5 decimales', () => {
    expect(normalizeReverseCoordinates(-34.9214321, -57.9545678)).toBe(
      '-34.92143,-57.95457',
    );
  });

  it('agrupa coordenadas cercanas bajo la misma clave', () => {
    const a = normalizeReverseCoordinates(-34.921431, -57.954567);
    const b = normalizeReverseCoordinates(-34.9214309, -57.9545671);
    expect(a).toBe(b);
  });
});
