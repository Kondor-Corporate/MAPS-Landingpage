/**
 * Hook de novedades internas para intranet y dashboards autenticados.
 * Carga noticias `INTERNA` + publicadas; la separación de audiencia la aplica el backend.
 */
import { useCallback, useEffect, useState } from 'react';
import { mapApiIntranetNewsToNewsItem } from '@/shared/lib/mapPublicNews';
import { listIntranetNews } from '@/shared/services/intranetNews.service';
import type { NewsItem } from '@/shared/types/news';

export function useIntranetNews(limit = 3) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listIntranetNews({ limit });
      setNews(rows.map((row, index) => mapApiIntranetNewsToNewsItem(row, index)));
    } catch {
      setError('No pudimos cargar los comunicados en este momento.');
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { news, loading, error, refetch };
}
