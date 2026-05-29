import { api } from '@/lib/axios';

export type GeocodeCoords = {
  longitude: number;
  latitude: number;
};

type GeocodeResponseData = {
  latitud: number;
  longitud: number;
} | null;

/**
 * Geocodifica un texto de búsqueda usando el proxy del backend.
 *
 * El backend (GET /api/v1/geocode?q=...) delega en Nominatim server-side
 * con el User-Agent correcto; el browser nunca llama a Nominatim directamente.
 *
 * Retorna null si no hubo resultado o si ocurrió un error de red.
 */
export async function geocodeQuery(query: string): Promise<GeocodeCoords | null> {
  try {
    const res = await api.get<{ data: GeocodeResponseData; message: string; error: null }>(
      '/geocode',
      { params: { q: query } },
    );
    const d = res.data.data;
    if (!d) return null;
    return { latitude: d.latitud, longitude: d.longitud };
  } catch {
    return null;
  }
}
