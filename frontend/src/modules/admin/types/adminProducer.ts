/**
 * Contrato API admin `/producers` (MAPS-009 + MAPS-013 Fase 2).
 */
export type AdminProducerUsuario = {
  id: number;
  usuario: string;
  activo: boolean;
  rol: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type AdminProducerRedSocial = {
  plataforma: string;
  url: string;
  orden: number;
};

export type AdminProducerSpecialty = {
  clave: string;
  label: string;
};

export type AdminProducerCertificacion = {
  id: number;
  nombre: string;
  archivoUrl: string;
  tamanoBytes: number | null;
  mimeType: string;
};

export type AdminProducer = {
  id: number;
  slug: string;
  nombre: string;
  apellido: string;
  bio: string | null;
  ciudad: string | null;
  dni: string | null;
  foto: string | null;
  latitud: number | null;
  longitud: number | null;
  telefono: string | null;
  matricula: string | null;
  verificado: boolean;
  tituloProfesional: string | null;
  idiomas: string[];
  whatsapp: string | null;
  anosExperiencia: number | null;
  clientesActivos: number | null;
  especialidades: AdminProducerSpecialty[];
  redesSociales: AdminProducerRedSocial[];
  certificaciones: AdminProducerCertificacion[];
  createdAt: string;
  updatedAt: string;
  usuario: AdminProducerUsuario;
};

export type ProducerProfileAdminFields = {
  matricula?: string;
  verificado?: boolean;
  tituloProfesional?: string;
  anosExperiencia?: number;
  clientesActivos?: number;
};

export type CreateProducerPayload = {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  activo?: boolean;
} & ProducerProfileAdminFields;

export type UpdateProducerPayload = {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
} & ProducerProfileAdminFields;

export type SetProducerActivePayload = {
  activo: boolean;
};

export type ListProducersFilters = {
  activo?: boolean;
};
