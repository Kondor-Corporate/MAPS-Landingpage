export const PRODUCER_SPECIALTY_KEYS = [
  'salud-integral',
  'automotores',
  'riesgos-art',
  'hogar-pyme',
  'vida-ahorro',
  'viajero',
  'mascotas',
  'ciber-risk',
] as const;

export type ProducerSpecialtyKey = (typeof PRODUCER_SPECIALTY_KEYS)[number];

export const PRODUCER_SPECIALTY_LABELS: Record<ProducerSpecialtyKey, string> = {
  'salud-integral': 'Salud Integral',
  automotores: 'Automotores',
  'riesgos-art': 'Riesgos ART',
  'hogar-pyme': 'Hogar y Pyme',
  'vida-ahorro': 'Vida y Ahorro',
  viajero: 'Viajero',
  mascotas: 'Mascotas',
  'ciber-risk': 'Ciber Risk',
};

export function specialtyKeyToLabel(clave: string): string {
  return (
    PRODUCER_SPECIALTY_LABELS[clave as ProducerSpecialtyKey] ?? clave
  );
}
