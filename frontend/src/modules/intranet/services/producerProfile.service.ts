import type { AxiosResponse } from 'axios';
import { api } from '@/lib/axios';
import type { ProducerCertificacion } from '@/shared/types/producerProfile';
import type {
  ChangeMyPasswordBody,
  ProducerProfile,
  UpdateMyProfileBody,
} from '@/modules/intranet/types/producerProfile';

type ApiSuccess<T> = { data: T; message: string; error: null };

function unwrap<T>(res: AxiosResponse<ApiSuccess<T>>): T {
  return res.data.data;
}

export async function getMyProducerProfile(): Promise<ProducerProfile> {
  const res = await api.get<ApiSuccess<{ profile: ProducerProfile }>>(
    '/producers/me',
  );
  return unwrap(res).profile;
}

export async function updateMyProducerProfile(
  body: UpdateMyProfileBody,
): Promise<ProducerProfile> {
  const res = await api.patch<ApiSuccess<{ profile: ProducerProfile }>>(
    '/producers/me',
    body,
  );
  return unwrap(res).profile;
}

export async function uploadMyCertificacion(
  file: File,
  nombre?: string,
): Promise<ProducerCertificacion> {
  const form = new FormData();
  form.append('file', file);
  if (nombre?.trim()) {
    form.append('nombre', nombre.trim());
  }
  const res = await api.post<ApiSuccess<{ certificacion: ProducerCertificacion }>>(
    '/producers/me/certificaciones',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return unwrap(res).certificacion;
}

export async function deleteMyCertificacion(certId: number): Promise<void> {
  await api.delete(`/producers/me/certificaciones/${certId}`);
}

export async function changeMyPassword(body: ChangeMyPasswordBody): Promise<void> {
  await api.patch('/producers/me/password', body);
}

export async function uploadMyFoto(file: File): Promise<ProducerProfile> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<ApiSuccess<{ profile: ProducerProfile }>>(
    '/producers/me/foto',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return unwrap(res).profile;
}
