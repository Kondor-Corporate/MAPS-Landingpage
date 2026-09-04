import type { AxiosResponse } from 'axios';
import { api } from '@/lib/axios';
import type {
  Admin,
  CreateAdminPayload,
  ResetAdminPasswordPayload,
  SetAdminActivePayload,
  UpdateAdminUsuarioPayload,
} from '@/modules/admin/types/admin';

type ApiSuccess<T> = { data: T; message: string; error: null };

function unwrap<T>(res: AxiosResponse<ApiSuccess<T>>): T {
  return res.data.data;
}

export async function listAdmins(): Promise<Admin[]> {
  const res = await api.get<ApiSuccess<Admin[]>>('/admins');
  return unwrap(res);
}

export async function createAdmin(payload: CreateAdminPayload): Promise<Admin> {
  const res = await api.post<ApiSuccess<Admin>>('/admins', payload);
  return unwrap(res);
}

export async function updateAdminUsuario(
  id: number,
  payload: UpdateAdminUsuarioPayload,
): Promise<Admin> {
  const res = await api.patch<ApiSuccess<Admin>>(`/admins/${id}`, payload);
  return unwrap(res);
}

export async function setAdminActive(id: number, payload: SetAdminActivePayload): Promise<Admin> {
  const res = await api.patch<ApiSuccess<Admin>>(`/admins/${id}/activo`, payload);
  return unwrap(res);
}

export async function resetAdminPassword(
  id: number,
  payload: ResetAdminPasswordPayload,
): Promise<void> {
  await api.patch(`/admins/${id}/password`, payload);
}
