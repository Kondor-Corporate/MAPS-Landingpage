import { api } from '@/lib/axios';
import type { CreatePostulacionPayload } from '@/modules/public-web/types/postulacion';

type ApiSuccess<T> = { data: T; message: string; error: null };

/** Envía una postulación pública. Resuelve sólo cuando el servidor confirma (201). */
export async function createPostulacion(payload: CreatePostulacionPayload): Promise<void> {
  await api.post<ApiSuccess<null>>('/postulaciones', payload);
}
