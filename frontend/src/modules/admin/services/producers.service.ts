import type { AxiosResponse } from 'axios';
import { api } from '@/lib/axios';
import type {
  AdminProducer,
  AdminProducerCertificacion,
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

export async function uploadProducerCertificacion(
  producerId: number,
  file: File,
  nombre?: string,
): Promise<AdminProducerCertificacion> {
  const form = new FormData();
  form.append('file', file);
  if (nombre?.trim()) {
    form.append('nombre', nombre.trim());
  }
  const res = await api.post<ApiSuccess<{ certificacion: AdminProducerCertificacion }>>(
    `/producers/${producerId}/certificaciones`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return unwrap(res).certificacion;
}

export async function deleteProducerCertificacion(
  producerId: number,
  certId: number,
): Promise<void> {
  await api.delete(`/producers/${producerId}/certificaciones/${certId}`);
}
