import type { AxiosResponse } from 'axios';
import { api } from '@/lib/axios';
import type { Postulacion } from '@/modules/admin/types/postulacion';

type ApiSuccess<T> = { data: T; message: string; error: null };

function unwrap<T>(res: AxiosResponse<ApiSuccess<T>>): T {
  return res.data.data;
}

export async function listPostulaciones(): Promise<Postulacion[]> {
  const res = await api.get<ApiSuccess<Postulacion[]>>('/postulaciones');
  return unwrap(res);
}

/** Eliminación física. El backend sólo la autoriza a SUPERADMIN. */
export async function deletePostulacion(id: number): Promise<void> {
  await api.delete<ApiSuccess<null>>(`/postulaciones/${id}`);
}
