export type MapProducerSpecialty = {
  clave: string;
  label: string;
};

export type MapProducer = {
  slug: string;
  nombreCompleto: string;
  tituloProfesional: string | null;
  ciudad: string | null;
  latitud: number;
  longitud: number;
  foto: string | null;
  whatsapp: string | null;
  verificado: boolean;
  especialidades: MapProducerSpecialty[];
};
