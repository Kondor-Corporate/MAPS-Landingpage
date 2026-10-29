import { useCallback, useEffect, useState } from 'react';
import { getProducersForMap } from '@/modules/public-web/services/producersMap.service';
import type { MapProducer } from '@/modules/public-web/types/producerMap';

export function useProducersMap() {
  const [producers, setProducers] = useState<MapProducer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getProducersForMap();
      setProducers(rows);
    } catch {
      setProducers([]);
      setError('No se pudieron cargar los asesores en el mapa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { producers, loading, error, refetch };
}
