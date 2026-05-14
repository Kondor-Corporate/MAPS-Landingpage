/**
 * Contrato API admin `/producers` (MAPS-009). Alineado a `toAdminProducerDto` en backend.
 */
export type AdminProducerUsuario = {
  id: number;
  usuario: string;
  activo: boolean;
  rol: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
  usuario: AdminProducerUsuario;
};

export type CreateProducerPayload = {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  activo?: boolean;
};

export type UpdateProducerPayload = {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
};

export type SetProducerActivePayload = {
  activo: boolean;
};

export type ListProducersFilters = {
  activo?: boolean;
};
