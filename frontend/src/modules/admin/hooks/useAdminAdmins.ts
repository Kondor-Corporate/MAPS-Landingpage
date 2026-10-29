import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import {
  createAdmin,
  listAdmins,
  resetAdminPassword,
  setAdminActive,
  updateAdminUsuario,
} from '@/modules/admin/services/admins.service';
import type {
  Admin,
  CreateAdminPayload,
  ResetAdminPasswordPayload,
  UpdateAdminUsuarioPayload,
} from '@/modules/admin/types/admin';

/**
 * Fetch + mutaciones de administradores.
 *
 * Estrategia de estado: igual que `useAdminProducers`.
 * - create / updateUsuario / setActivo: refetch del listado (GET /admins sin query).
 * - resetPassword: no refetch; el DTO no cambia (lastLoginAt/usuario/activo iguales).
 * Las fallas de mutación no limpian el listado ni se convierten en error global de carga;
 * el caller las muestra en el modal con getApiErrorMessage.
 */
export function useAdminAdmins() {
  const [data, setData] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const rows = await listAdmins();
      setData(rows);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const create = useCallback(
    async (payload: CreateAdminPayload) => {
      const row = await createAdmin(payload);
      await refetch();
      return row;
    },
    [refetch],
  );

  const updateUsuario = useCallback(
    async (id: number, payload: UpdateAdminUsuarioPayload) => {
      const row = await updateAdminUsuario(id, payload);
      await refetch();
      return row;
    },
    [refetch],
  );

  const setActivo = useCallback(
    async (id: number, activo: boolean) => {
      const row = await setAdminActive(id, { activo });
      await refetch();
      return row;
    },
    [refetch],
  );

  const resetPassword = useCallback(async (id: number, payload: ResetAdminPasswordPayload) => {
    await resetAdminPassword(id, payload);
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    create,
    updateUsuario,
    setActivo,
    resetPassword,
  };
}
