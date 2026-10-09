export const PRODUCER_SPECIALTY_CATALOG = [
  { clave: 'salud-integral', label: 'Salud Integral' },
  { clave: 'automotores', label: 'Automotores' },
  { clave: 'riesgos-art', label: 'Riesgos ART' },
  { clave: 'hogar-pyme', label: 'Hogar y Pyme' },
  { clave: 'vida-ahorro', label: 'Vida y Ahorro' },
  { clave: 'viajero', label: 'Viajero' },
  { clave: 'mascotas', label: 'Mascotas' },
  { clave: 'ciber-risk', label: 'Ciber Risk' },
] as const;

export type ProducerSpecialtyKey =
  (typeof PRODUCER_SPECIALTY_CATALOG)[number]['clave'];

const HISTORICAL_LABELS: Record<string, string> = Object.fromEntries(
  PRODUCER_SPECIALTY_CATALOG.map((e) => [e.clave, e.label]),
);

/**
 * Etiqueta a mostrar para una especialidad guardada. El catálogo vigente son los
 * ramos de la Biblioteca Digital (el valor guardado ya es el nombre del ramo), pero
 * las claves históricas (ej. `viajero`) se traducen a su etiqueta legible.
 */
export function specialtyLabel(value: string): string {
  return HISTORICAL_LABELS[value] ?? value;
}
