export type ProducerEstado = 'ACTIVO' | 'INACTIVO';

/**
 * Fila/listado UI admin productores (no es el DTO crudo del API).
 * `sucursal` puede quedar vacío: sin dato persistido en backend (placeholder UI).
 */
export type Producer = {
  id: string;
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
};

export function producerNombreCompleto(p: Producer): string {
  return [p.nombre, p.apellido].join(' ').trim();
}

/** Payload sólo para formularios (campos persistidos por API MAPS-009). */
export type ProducerFormSubmit = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  /** Alta en página de inactivos: el backend puede recibir cuenta activa inicial. */
  activo?: boolean;
};
