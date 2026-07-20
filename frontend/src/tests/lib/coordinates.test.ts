import { describe, expect, it } from 'vitest';
import { normalizeCoordinates } from '@/shared/lib/coordinates';

describe('normalizeCoordinates', () => {
  it('acepta numbers y strings numéricos como un par', () => {
    expect(normalizeCoordinates('-34.9214', -57.9545)).toEqual({
      latitud: -34.9214,
      longitud: -57.9545,
    });
  });

  it.each([
    [null, -57.9545],
    [-34.9214, undefined],
    [Number.NaN, -57.9545],
    ['inválida', -57.9545],
    [-34.9214, ''],
  ])('rechaza pares incompletos o inválidos: %s / %s', (latitud, longitud) => {
    expect(normalizeCoordinates(latitud, longitud)).toBeNull();
  });
});
