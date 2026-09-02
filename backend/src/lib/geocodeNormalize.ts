/** Clave de caché estable para direcciones equivalentes (espacios, mayúsculas). */
export function normalizeGeocodeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Agrupa coordenadas cercanas bajo la misma clave de caché.
 * 5 decimales ≈ 1.1m de precisión, suficiente para reverse geocoding.
 */
export function normalizeReverseCoordinates(latitud: number, longitud: number): string {
  return `${latitud.toFixed(5)},${longitud.toFixed(5)}`;
}
