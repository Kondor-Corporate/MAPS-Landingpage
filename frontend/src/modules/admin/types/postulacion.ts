export type PostulacionSituacion = 'PRODUCTOR_NUEVO' | 'TRABAJA_CON_OTRAS';

export type Postulacion = {
  id: number;
  nombreCompleto: string;
  dni: string;
  telefono: string;
  matricula: string;
  localidad: string;
  situacion: PostulacionSituacion;
  createdAt: string;
};
