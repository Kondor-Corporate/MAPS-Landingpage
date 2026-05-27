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
