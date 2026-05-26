import type { AdminProducerCertificacion } from '@/modules/admin/types/adminProducer';

export type ProducerEstado = 'ACTIVO' | 'INACTIVO';

/**
 * Fila/listado UI admin productores (no es el DTO crudo del API).
 */
export type Producer = {
  id: string;
  slug: string;
  nombre: string;
  apellido: string;
  avatarUrl?: string;
  estado: ProducerEstado;
  dni: string;
  email: string;
  telefono: string;
  sucursal: string;
  fechaAlta: string;
  ultimaActividad: string;
  matricula: string | null;
  verificado: boolean;
  tituloProfesional: string | null;
  anosExperiencia: number | null;
  clientesActivos: number | null;
  certificaciones: AdminProducerCertificacion[];
  ciudad: string;
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
  activo?: boolean;
  matricula?: string;
  verificado?: boolean;
  tituloProfesional?: string;
  anosExperiencia?: string;
  clientesActivos?: string;
};
