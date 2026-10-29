import { describe, expect, it } from 'vitest';
import { distanceKm, formatDistance } from '@/shared/lib/distance';

const LA_PLATA = { latitude: -34.9214, longitude: -57.9545 };
const CABA = { latitude: -34.6037, longitude: -58.3816 };

describe('distanceKm', () => {
  it('el mismo punto da 0', () => {
    expect(distanceKm(LA_PLATA, LA_PLATA)).toBe(0);
  });

  it('es simétrica', () => {
    expect(distanceKm(LA_PLATA, CABA)).toBe(distanceKm(CABA, LA_PLATA));
  });

  it('La Plata ↔ CABA queda en un rango geográfico razonable', () => {
    const km = distanceKm(LA_PLATA, CABA);
    expect(km).toBeGreaterThanOrEqual(48);
    expect(km).toBeLessThanOrEqual(58);
  });
});

describe('formatDistance', () => {
  it.each([
    [0, '0 m'],
    [0.499, '499 m'],
    [0.999, '999 m'],
    [1, '1.0 km'],
    [9.94, '9.9 km'],
    [9.99, '10.0 km'],
    [10, '10 km'],
    [10.6, '11 km'],
  ])('%s → %s', (km, label) => {
    expect(formatDistance(km)).toBe(label);
  });
});
