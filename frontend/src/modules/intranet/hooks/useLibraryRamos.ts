import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import { mapApiRamoToUi } from '@/modules/admin/lib/mapLibraryRamo';
import { listRamos } from '@/modules/admin/services/library.service';
import type { Ramo } from '@/modules/admin/types/library';

export function useLibraryRamos() {
  const [ramos, setRamos] = useState<Ramo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const rows = await listRamos();
      setRamos(rows.map(mapApiRamoToUi));
    } catch (err) {
      setError(getApiErrorMessage(err));
      setRamos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ramos, loading, error, refetch };
}
