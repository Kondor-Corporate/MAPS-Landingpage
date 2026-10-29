/**
 * Cliente HTTP de novedades internas para intranet.
 * Consume `GET /news/intranet` (requiere JWT de productor o admin).
 */
import type { AxiosResponse } from 'axios';
import { api } from '@/lib/axios';
import type { ApiPublicNews, ListPublicNewsParams } from '@/shared/services/publicNews.service';

type ApiSuccess<T> = { data: T; message: string; error: null };

function unwrap<T>(res: AxiosResponse<ApiSuccess<T>>): T {
  return res.data.data;
}

export async function listIntranetNews(params?: ListPublicNewsParams): Promise<ApiPublicNews[]> {
  const res = await api.get<ApiSuccess<ApiPublicNews[]>>('/news/intranet', { params });
  return unwrap(res);
}
