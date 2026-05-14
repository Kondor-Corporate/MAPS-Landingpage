import type { AxiosResponse } from 'axios';
import { api } from '@/lib/axios';
import type {
  AdminProducer,
  CreateProducerPayload,
  ListProducersFilters,
  SetProducerActivePayload,
  UpdateProducerPayload,
} from '@/modules/admin/types/adminProducer';

type ApiSuccess<T> = { data: T; message: string; error: null };

function unwrap<T>(res: AxiosResponse<ApiSuccess<T>>): T {
  return res.data.data;
}

export async function listProducers(filters?: ListProducersFilters): Promise<AdminProducer[]> {
  const params: Record<string, string> | undefined =
    filters?.activo === undefined ? undefined : { activo: filters.activo ? 'true' : 'false' };

  const res = await api.get<ApiSuccess<AdminProducer[]>>('/producers', { params });
  return unwrap(res);
}

export async function getProducerById(id: number): Promise<AdminProducer> {
  const res = await api.get<ApiSuccess<AdminProducer>>(`/producers/${id}`);
  return unwrap(res);
}

export async function createProducer(payload: CreateProducerPayload): Promise<AdminProducer> {
  const res = await api.post<ApiSuccess<AdminProducer>>('/producers', payload);
  return unwrap(res);
}

export async function updateProducer(
  id: number,
  payload: UpdateProducerPayload,
): Promise<AdminProducer> {
  const res = await api.patch<ApiSuccess<AdminProducer>>(`/producers/${id}`, payload);
  return unwrap(res);
}

export async function setProducerActive(
  id: number,
  payload: SetProducerActivePayload,
): Promise<AdminProducer> {
  const res = await api.patch<ApiSuccess<AdminProducer>>(`/producers/${id}/activo`, payload);
  return unwrap(res);
}
