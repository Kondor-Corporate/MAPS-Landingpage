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
