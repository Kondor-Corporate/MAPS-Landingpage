import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  geocodeAddress,
  reverseGeocodeCoordinates,
} from '../src/lib/geocode.js';

describe('geocodeAddress', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('consulta Nominatim acotado a Argentina y sesgado a Buenos Aires / La Plata', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ lat: '-34.9214', lon: '-57.9545' }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress('Diagonal 75 172, La Plata');

    expect(result).toEqual({ latitud: -34.9214, longitud: -57.9545 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('countrycodes')).toBe('ar');
    expect(url.searchParams.get('viewbox')).toBe('-59.2,-34.2,-57.2,-35.4');
    expect(url.searchParams.get('bounded')).toBe('0');
    expect(url.searchParams.get('q')).toBe('Diagonal 75 172, La Plata');
  });
});

describe('reverseGeocodeCoordinates', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('consulta Nominatim sin alterar las coordenadas seleccionadas', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        display_name: 'Calle 50 1000, La Plata, Buenos Aires, Argentina',
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await reverseGeocodeCoordinates(-34.923456, -57.956789);

    expect(result).toEqual({
      direccion: 'Calle 50 1000, La Plata, Buenos Aires, Argentina',
    });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/reverse');
    expect(url.searchParams.get('lat')).toBe('-34.923456');
    expect(url.searchParams.get('lon')).toBe('-57.956789');
    expect(url.searchParams.get('accept-language')).toBe('es');
  });

  it('devuelve null cuando Nominatim no informa una dirección', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ display_name: '' }) })),
    );

    await expect(reverseGeocodeCoordinates(-34.92, -57.95)).resolves.toBeNull();
  });
});
