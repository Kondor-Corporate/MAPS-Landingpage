import type { AxiosResponse } from 'axios';
import { api } from '@/lib/axios';

type ApiSuccess<T> = { data: T; message: string; error: null };

export type ApiPublicNews = {
  slug: string;
  titulo: string;
  descripcion: string | null;
  contenido: string;
  categoria: string;
  imagenUrl: string | null;
  publicadaEn: string | null;
};

export type ListPublicNewsParams = {
  limit?: number;
  page?: number;
};

function unwrap<T>(res: AxiosResponse<ApiSuccess<T>>): T {
  return res.data.data;
}

export async function listPublicNews(params?: ListPublicNewsParams): Promise<ApiPublicNews[]> {
  const res = await api.get<ApiSuccess<ApiPublicNews[]>>('/news/public', { params });
  return unwrap(res);
}

export async function getPublicNewsBySlug(slug: string): Promise<ApiPublicNews> {
  const res = await api.get<ApiSuccess<ApiPublicNews>>(`/news/public/${slug}`);
  return unwrap(res);
}
