/**
 * Fuente de verdad del encuadre de portada de Noticias.
 *
 * El admin elige paneo + zoom en el modal de reencuadre (react-easy-crop). En vez
 * de regenerar el archivo, se persiste el encuadre en formato resolución-independiente
 * y se reproduce SIEMPRE con la misma transformación CSS, tanto en la preview del
 * admin como en las cards públicas. Así el modal, la preview y la web coinciden.
 *
 * - `x`, `y`, `zoom`: estado del cropper, para reabrir el modal en el mismo encuadre.
 * - `area`: `croppedArea` de react-easy-crop en % (0–100) del original. Define qué
 *   sub-rectángulo de la imagen debe ocupar todo el contenedor de portada.
 */
import type { CSSProperties } from 'react';

export type CoverCropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CoverCrop = {
  x: number;
  y: number;
  zoom: number;
  area: CoverCropArea;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Valida el JSON recibido de la API antes de usarlo como encuadre. */
export function parseCoverCrop(value: unknown): CoverCrop | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const area = v.area as Record<string, unknown> | undefined;
  if (!area || typeof area !== 'object') return null;
  if (
    !isFiniteNumber(v.x) ||
    !isFiniteNumber(v.y) ||
    !isFiniteNumber(v.zoom) ||
    !isFiniteNumber(area.x) ||
    !isFiniteNumber(area.y) ||
    !isFiniteNumber(area.width) ||
    !isFiniteNumber(area.height) ||
    area.width <= 0 ||
    area.height <= 0
  ) {
    return null;
  }
  return {
    x: v.x,
    y: v.y,
    zoom: v.zoom,
    area: { x: area.x, y: area.y, width: area.width, height: area.height },
  };
}

/**
 * Estilos inline para una `<img>` dentro de un contenedor `relative overflow-hidden`,
 * de modo que el sub-rectángulo `area` llene exactamente el contenedor. Se posiciona
 * de forma absoluta y `object-fit: fill` para que el mapeo sea lineal (el contenedor
 * de portada ya tiene el aspecto del encuadre, por lo que no hay deformación visible).
 * Los estilos inline pisan las clases de sizing/`object-cover` del consumidor.
 */
export function coverCropToImageStyle(crop: CoverCrop): CSSProperties {
  const { area } = crop;
  return {
    position: 'absolute',
    width: `${(10000 / area.width).toFixed(3)}%`,
    height: `${(10000 / area.height).toFixed(3)}%`,
    left: `${(-(area.x / area.width) * 100).toFixed(3)}%`,
    top: `${(-(area.y / area.height) * 100).toFixed(3)}%`,
    maxWidth: 'none',
    objectFit: 'fill',
  };
}
