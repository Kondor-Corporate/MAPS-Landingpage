import { loadEnv } from '../config/env.js';

export type GeocodeResult = {
  latitud: number;
  longitud: number;
};

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const TIMEOUT_MS = 5000;
const ARGENTINA_COUNTRY_CODE = 'ar';
const BUENOS_AIRES_LA_PLATA_VIEWBOX = '-59.2,-34.2,-57.2,-35.4';

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 5) return null;

  const env = loadEnv();
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: ARGENTINA_COUNTRY_CODE,
    viewbox: BUENOS_AIRES_LA_PLATA_VIEWBOX,
    bounded: '0',
    q: trimmed,
  });
  const url = `${NOMINATIM_URL}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': env.NOMINATIM_USER_AGENT,
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;

    const latitud = parseFloat(data[0].lat);
    const longitud = parseFloat(data[0].lon);
    if (Number.isNaN(latitud) || Number.isNaN(longitud)) return null;

    return { latitud, longitud };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
