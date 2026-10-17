import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import { listPostulaciones } from '@/modules/admin/services/postulaciones.service';
import type { Postulacion } from '@/modules/admin/types/postulacion';

/** Fetch de postulaciones (solo lectura). Misma estrategia que `useAdminAdmins`. */
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

  return { data, loading, error, refetch };
}
