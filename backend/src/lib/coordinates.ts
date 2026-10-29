export const LATITUDE_MIN = -90;
export const LATITUDE_MAX = 90;
export const LONGITUDE_MIN = -180;
export const LONGITUDE_MAX = 180;

export type CoordinatePair = {
  latitud: number;
  longitud: number;
};

export function normalizeCoordinates(
  latitud: unknown,
  longitud: unknown,
): CoordinatePair | null {
  if (typeof latitud !== 'number' || typeof longitud !== 'number') {
    return null;
  }

  if (
    !Number.isFinite(latitud) ||
    !Number.isFinite(longitud) ||
    latitud < LATITUDE_MIN ||
    latitud > LATITUDE_MAX ||
    longitud < LONGITUDE_MIN ||
    longitud > LONGITUDE_MAX
  ) {
    return null;
  }

  return { latitud, longitud };
}
