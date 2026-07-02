import type { AxiosResponse } from 'axios';
import { api } from '@/lib/axios';
import type {
  ApiNews,
  ApiNewsCreatePayload,
  ApiNewsUpdatePayload,
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
