/**
 * Cliente HTTP admin para Noticias (`/api/v1/news`).
 * Expone CRUD completo para el panel `/admin/noticias`.
 */
import type { AxiosResponse } from 'axios';
import { api } from '@/lib/axios';
import type {
  ApiNews,
  ApiNewsCreatePayload,
  ApiNewsUpdatePayload,
  ApiNoticiaImagen,
  ListNewsApiParams,
} from '@/modules/admin/lib/mapNews';

type ApiSuccess<T> = { data: T; message: string; error: null };

function unwrap<T>(res: AxiosResponse<ApiSuccess<T>>): T {
  return res.data.data;
}

export async function listNews(params?: ListNewsApiParams): Promise<ApiNews[]> {
  const res = await api.get<ApiSuccess<ApiNews[]>>('/news', { params });
  return unwrap(res);
}

export async function getNewsById(id: number): Promise<ApiNews> {
  const res = await api.get<ApiSuccess<ApiNews>>(`/news/${id}`);
  return unwrap(res);
}

export async function createNews(payload: ApiNewsCreatePayload): Promise<ApiNews> {
  const res = await api.post<ApiSuccess<ApiNews>>('/news', payload);
  return unwrap(res);
}

export async function updateNews(id: number, payload: ApiNewsUpdatePayload): Promise<ApiNews> {
  const res = await api.patch<ApiSuccess<ApiNews>>(`/news/${id}`, payload);
  return unwrap(res);
}

export async function deleteNews(id: number): Promise<void> {
  await api.delete(`/news/${id}`);
}

// `api` fija 'Content-Type: application/json' por defecto; con ese header ya
// puesto, axios serializa cualquier FormData a JSON en vez de mandarlo como
// multipart. Mismo patrón que producers.service.ts / producerProfile.service.ts:
// declarar 'multipart/form-data' sin boundary hace que el adapter lo elimine
// y deje que el navegador calcule el boundary correcto.
const MULTIPART_HEADERS = { 'Content-Type': 'multipart/form-data' };

/** Sube/reemplaza la portada de la noticia (archivo jpg/jpeg/png). */
export async function uploadPortada(id: number, file: File): Promise<ApiNews> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<ApiSuccess<ApiNews>>(`/news/${id}/portada`, form, {
    headers: MULTIPART_HEADERS,
  });
  return unwrap(res);
}

/** Quita la portada de la noticia. */
export async function deletePortada(id: number): Promise<ApiNews> {
  const res = await api.delete<ApiSuccess<ApiNews>>(`/news/${id}/portada`);
  return unwrap(res);
}

/** Agrega una imagen a la galería de la noticia. */
export async function addImagenGaleria(id: number, file: File): Promise<ApiNoticiaImagen> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<ApiSuccess<ApiNoticiaImagen>>(`/news/${id}/imagenes`, form, {
    headers: MULTIPART_HEADERS,
  });
  return unwrap(res);
}

/** Elimina una imagen de la galería de la noticia. */
export async function removeImagenGaleria(id: number, imagenId: number): Promise<void> {
  await api.delete(`/news/${id}/imagenes/${imagenId}`);
}
