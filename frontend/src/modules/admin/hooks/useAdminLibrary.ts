import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import { mapApiRamoToUi } from '@/modules/admin/lib/mapLibraryRamo';
import {
  createRamo,
  deleteRamo,
  listRamos,
  setRamoActivo,
  updateRamo,
} from '@/modules/admin/services/library.service';
import type { Ramo, RamoInput } from '@/modules/admin/types/library';

export function useAdminLibrary() {
  const [data, setData] = useState<Ramo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const rows = await listRamos();
      setData(rows.map(mapApiRamoToUi));
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
    async (input: RamoInput) => {
      setError(null);
      const row = await createRamo(input);
      await refetch();
      return mapApiRamoToUi(row);
    },
    [refetch],
  );

  const update = useCallback(
    async (id: string, input: RamoInput) => {
      setError(null);
      const numId = Number.parseInt(id, 10);
      const row = await updateRamo(numId, input);
      await refetch();
      return mapApiRamoToUi(row);
    },
    [refetch],
  );

  const toggleActivo = useCallback(
    async (id: string, activo: boolean) => {
      setError(null);
      const numId = Number.parseInt(id, 10);
      await setRamoActivo(numId, { activo });
      await refetch();
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      setError(null);
      const numId = Number.parseInt(id, 10);
      await deleteRamo(numId);
      await refetch();
    },
    [refetch],
  );

  return {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    toggleActivo,
    remove,
  };
}
