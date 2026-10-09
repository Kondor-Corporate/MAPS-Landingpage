/**
 * Tipografía de marca: Manrope (misma familia que el frontend real).
 * Cargada vía @remotion/google-fonts para que quede disponible en preview y render.
 */
import { loadFont } from '@remotion/google-fonts/Manrope';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
});

/** Familia lista para usar en `style={{ fontFamily }}`. */
export const MANROPE = fontFamily;

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

/** Espaciados de letra usados en los lockups de marca. */
export const letterSpacing = {
  tightHeading: '-1.5px',
  tight: '-0.5px',
  wide: '4px',
  ultraWide: '14px',
} as const;
