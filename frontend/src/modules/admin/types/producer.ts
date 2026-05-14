export type ProducerEstado = 'ACTIVO' | 'INACTIVO';

export type Producer = {
  id: string;
  nombre: string;
  avatarUrl?: string;
  estado: ProducerEstado;
  dni: string;
  email: string;
  telefono: string;
  sucursal: string;
  fechaAlta: string;
  ultimaActividad: string;
};

export type ProducerInput = Omit<Producer, 'id' | 'ultimaActividad' | 'fechaAlta'> & {
  fechaAlta?: string;
  ultimaActividad?: string;
};
