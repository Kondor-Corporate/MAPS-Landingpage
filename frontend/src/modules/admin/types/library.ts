export type RamoTipo = 'PRINCIPAL' | 'SECUNDARIO';

export type RamoIcono =
  | 'car'
  | 'heart'
  | 'fire'
  | 'store'
  | 'bike'
  | 'shield'
  | 'key'
  | 'megaphone'
  | 'classic-car'
  | 'person'
  | 'people'
  | 'scales'
  | 'truck'
  | 'umbrella'
  | 'boat';

export type Ramo = {
  id: string;
  nombre: string;
  descripcion: string;
  icono: RamoIcono;
  gdriveUrl: string;
  tipo: RamoTipo;
  orden: number;
  activo: boolean;
  creadoEn: string;
  modificadoEn: string;
};

export type RamoInput = Omit<Ramo, 'id' | 'creadoEn' | 'modificadoEn'>;

export const TIPO_LABEL: Record<RamoTipo, string> = {
  PRINCIPAL: 'Principal',
  SECUNDARIO: 'Secundario',
};

export const ICONO_LABEL: Record<RamoIcono, string> = {
  car: 'Automotores',
  heart: 'Salud',
  fire: 'Incendio',
  store: 'Comercio',
  bike: 'Movilidad',
  shield: 'Cyber Risk',
  key: 'Caución',
  megaphone: 'Campañas',
  'classic-car': 'Autos clásicos',
  person: 'Accidentes personales',
  people: 'Vida colectivo',
  scales: 'Responsabilidad civil',
  truck: 'Transporte',
  umbrella: 'ART / Retiro',
  boat: 'Embarcaciones',
};

export const ICONO_OPTIONS: RamoIcono[] = [
  'car',
  'heart',
  'fire',
  'store',
  'bike',
  'shield',
  'key',
  'megaphone',
  'classic-car',
  'person',
  'people',
  'scales',
  'truck',
  'umbrella',
  'boat',
];
