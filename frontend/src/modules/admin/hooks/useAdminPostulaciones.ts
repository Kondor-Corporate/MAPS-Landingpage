import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import {
  deletePostulacion,
  listPostulaciones,
} from '@/modules/admin/services/postulaciones.service';
import type { Postulacion } from '@/modules/admin/types/postulacion';

/** Fetch de postulaciones y baja local tras un DELETE exitoso. */
export function useAdminPostulaciones() {
  const [data, setData] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const rows = await listPostulaciones();
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

  const remove = useCallback(async (id: number) => {
    await deletePostulacion(id);
    setData((prev) => prev.filter((row) => row.id !== id));
  }, []);

  return { data, loading, error, refetch, remove };
}
