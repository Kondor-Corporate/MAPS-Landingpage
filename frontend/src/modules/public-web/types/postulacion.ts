export type PostulacionSituacion = 'PRODUCTOR_NUEVO' | 'TRABAJA_CON_OTRAS';

export type CreatePostulacionPayload = {
  nombreCompleto: string;
  dni: string;
  telefono: string;
  matricula: string;
  localidad: string;
  situacion: PostulacionSituacion;
};
