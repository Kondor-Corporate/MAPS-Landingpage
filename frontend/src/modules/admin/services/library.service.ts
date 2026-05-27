import type { AxiosResponse } from 'axios';
import { api } from '@/lib/axios';
import type { ApiLibraryRamo } from '@/modules/admin/lib/mapLibraryRamo';
import type { RamoInput } from '@/modules/admin/types/library';
import { mapUiRamoToApi } from '@/modules/admin/lib/mapLibraryRamo';

type ApiSuccess<T> = { data: T; message: string; error: null };

function unwrap<T>(res: AxiosResponse<ApiSuccess<T>>): T {
  return res.data.data;
}

export async function listRamos(filters?: { activo?: boolean }): Promise<ApiLibraryRamo[]> {
  const params: Record<string, string> | undefined =
    filters?.activo === undefined
      ? undefined
      : { activo: filters.activo ? 'true' : 'false' };

  const res = await api.get<ApiSuccess<ApiLibraryRamo[]>>('/library/ramos', { params });
  return unwrap(res);
}

export async function getRamo(id: number): Promise<ApiLibraryRamo> {
  const res = await api.get<ApiSuccess<ApiLibraryRamo>>(`/library/ramos/${id}`);
  return unwrap(res);
}

export async function createRamo(payload: RamoInput): Promise<ApiLibraryRamo> {
  const res = await api.post<ApiSuccess<ApiLibraryRamo>>(
    '/library/ramos',
    mapUiRamoToApi(payload),
  );
  return unwrap(res);
}

export async function updateRamo(id: number, payload: RamoInput): Promise<ApiLibraryRamo> {
  const res = await api.patch<ApiSuccess<ApiLibraryRamo>>(
    `/library/ramos/${id}`,
    mapUiRamoToApi(payload),
  );
  return unwrap(res);
}

export async function setRamoActivo(
  id: number,
  payload: { activo: boolean },
): Promise<ApiLibraryRamo> {
  const res = await api.patch<ApiSuccess<ApiLibraryRamo>>(
    `/library/ramos/${id}/activo`,
    payload,
  );
  return unwrap(res);
}

export async function deleteRamo(id: number): Promise<void> {
  await api.delete(`/library/ramos/${id}`);
}
