export type PostulacionSituacion = 'PRODUCTOR_NUEVO' | 'TRABAJA_CON_OTRAS';

export type CreatePostulacionPayload = {
  nombreCompleto: string;
  dni: string;
  telefono: string;
  matricula: string;
  localidad: string;
  situacion: PostulacionSituacion;
  /** Señal explícita. El servidor registra timestamp y versión; el cliente no los envía. */
  consentimiento: true;
  /** Honeypot anti-bot: siempre vacío para usuarios legítimos (campo señuelo oculto). */
  website?: string;
};
