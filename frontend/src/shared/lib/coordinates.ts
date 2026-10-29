export type CoordinateInput = number | string | null | undefined;

export type NormalizedCoordinates = {
  latitud: number;
  longitud: number;
};

function normalizeCoordinate(value: CoordinateInput): number | null {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

export function normalizeCoordinates(
  latitud: CoordinateInput,
  longitud: CoordinateInput,
): NormalizedCoordinates | null {
  const normalizedLatitud = normalizeCoordinate(latitud);
  const normalizedLongitud = normalizeCoordinate(longitud);

  if (normalizedLatitud === null || normalizedLongitud === null) return null;
  if (normalizedLatitud < -90 || normalizedLatitud > 90) return null;
  if (normalizedLongitud < -180 || normalizedLongitud > 180) return null;

  return {
    latitud: normalizedLatitud,
    longitud: normalizedLongitud,
  };
}
