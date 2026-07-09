import type {
  AdminProducerCertificacion,
  AdminProducerRedSocial,
  AdminProducerSpecialty,
} from '@/modules/admin/types/adminProducer';

export type ProducerEstado = 'ACTIVO' | 'INACTIVO';

/**
 * Fila/listado UI admin productores (no es el DTO crudo del API).
 * Mantiene `null` en los campos opcionales — la UI decide el placeholder.
 */
export type Producer = {
  id: string;
  slug: string;
  nombre: string;
  apellido: string;
  avatarUrl: string | null;
  estado: ProducerEstado;
  dni: string | null;
  email: string;
  telefono: string | null;
  sucursal: string;
  fechaAlta: string;
  ultimaActividad: string;
  ultimoLogin: string | null;
  matricula: string | null;
  verificado: boolean;
  tituloProfesional: string | null;
  anosExperiencia: number | null;
  clientesActivos: number | null;
  bio: string | null;
  ciudad: string | null;
  direccion: string | null;
  whatsapp: string | null;
  latitud: number | null;
  longitud: number | null;
  idiomas: string[];
  especialidades: AdminProducerSpecialty[];
  redesSociales: AdminProducerRedSocial[];
  certificaciones: AdminProducerCertificacion[];
};

export function producerNombreCompleto(p: Producer): string {
  return [p.nombre, p.apellido].join(' ').trim();
}

export type ProducerFormSubmit = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  ciudad: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  activo?: boolean;
  matricula?: string;
  verificado?: boolean;
  tituloProfesional?: string;
  anosExperiencia?: string;
  clientesActivos?: string;
  /** Solo en alta (`mode==='create'`); nunca se envía al editar. */
  password?: string;
};
