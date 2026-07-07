/**
 * Hook de noticias públicas para Home y surfaces anónimas.
 * Carga las últimas N noticias `PUBLICA` + publicadas vía API.
 */
import { useCallback, useEffect, useState } from 'react';
import { mapApiPublicNewsToNewsItem } from '@/shared/lib/mapPublicNews';
import { listPublicNews } from '@/shared/services/publicNews.service';
import type { NewsItem } from '@/shared/types/news';

export function usePublicNews(limit = 3) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listPublicNews({ limit });
      setNews(rows.map((row, index) => mapApiPublicNewsToNewsItem(row, index)));
    } catch {
      setError('No pudimos cargar las noticias en este momento.');
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
