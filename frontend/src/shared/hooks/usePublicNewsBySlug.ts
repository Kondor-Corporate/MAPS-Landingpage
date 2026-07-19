import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { mapApiPublicNewsToNewsItem } from '@/shared/lib/mapPublicNews';
import { getPublicNewsBySlug } from '@/shared/services/publicNews.service';
import type { NewsItem } from '@/shared/types/news';

const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function usePublicNewsBySlug(slug: string | undefined) {
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refetch = useCallback(async () => {
    const normalizedSlug = slug?.trim() ?? '';
    if (!PUBLIC_SLUG_PATTERN.test(normalizedSlug)) {
      setNewsItem(null);
      setError(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const row = await getPublicNewsBySlug(normalizedSlug);
      setNewsItem(mapApiPublicNewsToNewsItem(row));
    } catch (requestError) {
      setNewsItem(null);
      if (
        axios.isAxiosError(requestError) &&
        (requestError.response?.status === 404 || requestError.response?.status === 422)
      ) {
        setNotFound(true);
      } else {
        setError('No pudimos cargar esta noticia en este momento.');
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { newsItem, loading, error, notFound, refetch };
}
