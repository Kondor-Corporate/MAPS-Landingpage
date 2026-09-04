import { loadEnv } from '../config/env.js';
import { getCachedGeocode, setCachedGeocode } from './geocodeCache.js';
import { logGeocodeEvent } from './geocodeMetrics.js';
import { normalizeGeocodeQuery, normalizeReverseCoordinates } from './geocodeNormalize.js';
import { runWithNominatimSlot } from './nominatimLimiter.js';

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

async function fetchNominatim(url: string, operation: 'search' | 'reverse'): Promise<Response | null> {
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
    if (!res.ok) {
      logGeocodeEvent('geocode.provider_error', { operation, status: res.status });
      return null;
    }
    return res;
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    logGeocodeEvent('geocode.provider_error', {
      operation,
      reason: timedOut ? 'timeout' : 'network_error',
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGeocodeFromNominatim(trimmed: string): Promise<GeocodeResult | null> {
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
    'search',
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

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 5) return null;

  const cacheKey = `geocode:search:${normalizeGeocodeQuery(trimmed)}`;
  const cached = await getCachedGeocode<GeocodeResult>(cacheKey);
  if (cached.hit) {
    logGeocodeEvent('geocode.cache_hit', { operation: 'search' });
    return cached.value;
  }
  logGeocodeEvent('geocode.cache_miss', { operation: 'search' });

  const result = await runWithNominatimSlot(() => fetchGeocodeFromNominatim(trimmed));
  await setCachedGeocode(cacheKey, result);
  return result;
}

async function fetchReverseGeocodeFromNominatim(
  latitud: number,
  longitud: number,
): Promise<ReverseGeocodeResult | null> {
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
    'reverse',
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

  const cacheKey = `geocode:reverse:${normalizeReverseCoordinates(latitud, longitud)}`;
  const cached = await getCachedGeocode<ReverseGeocodeResult>(cacheKey);
  if (cached.hit) {
    logGeocodeEvent('geocode.cache_hit', { operation: 'reverse' });
    return cached.value;
  }
  logGeocodeEvent('geocode.cache_miss', { operation: 'reverse' });

  const result = await runWithNominatimSlot(() =>
    fetchReverseGeocodeFromNominatim(latitud, longitud),
  );
  await setCachedGeocode(cacheKey, result);
  return result;
}
