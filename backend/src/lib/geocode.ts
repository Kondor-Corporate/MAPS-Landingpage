import { loadEnv } from '../config/env.js';

export type GeocodeResult = {
  latitud: number;
  longitud: number;
};

export type ReverseGeocodeResult = {
  direccion: string;
};

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const TIMEOUT_MS = 5000;
const ARGENTINA_COUNTRY_CODE = 'ar';
const BUENOS_AIRES_LA_PLATA_VIEWBOX = '-59.2,-34.2,-57.2,-35.4';

async function fetchNominatim(url: string): Promise<Response | null> {
  const env = loadEnv();
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
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 5) return null;

  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: ARGENTINA_COUNTRY_CODE,
    viewbox: BUENOS_AIRES_LA_PLATA_VIEWBOX,
    bounded: '0',
    q: trimmed,
  });
  const res = await fetchNominatim(
    `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
  );
  if (!res) return null;

  try {
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;

    const latitud = parseFloat(data[0].lat);
    const longitud = parseFloat(data[0].lon);
    if (Number.isNaN(latitud) || Number.isNaN(longitud)) return null;

    return { latitud, longitud };
  } catch {
    return null;
  }
}

export async function reverseGeocodeCoordinates(
  latitud: number,
  longitud: number,
): Promise<ReverseGeocodeResult | null> {
  if (
    !Number.isFinite(latitud) ||
    !Number.isFinite(longitud) ||
    latitud < -90 ||
    latitud > 90 ||
    longitud < -180 ||
    longitud > 180
  ) {
    return null;
  }

  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitud),
    lon: String(longitud),
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'es',
  });
  const res = await fetchNominatim(
    `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`,
  );
  if (!res) return null;

  try {
    const data = (await res.json()) as { display_name?: unknown };
    const direccion =
      typeof data.display_name === 'string' ? data.display_name.trim() : '';
    return direccion ? { direccion } : null;
  } catch {
    return null;
  }
}
