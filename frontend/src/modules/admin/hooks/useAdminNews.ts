/**
 * Hook de gestión admin de Noticias.
 * Orquesta fetch, mutaciones (crear/editar/publicar/despublicar/eliminar) y estados loading/error.
 */
import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import {
  mapApiNewsToUiNews,
  mapUiNewsToCreatePayload,
  mapUiNewsToUpdatePayload,
} from '@/modules/admin/lib/mapNews';
import {
  createNews as createNewsApi,
  deleteNews as deleteNewsApi,
  listNews,
  updateNews as updateNewsApi,
} from '@/modules/admin/services/news.service';
import type { News, NewsInput } from '@/modules/admin/types/news';

export function useAdminNews() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const rows = await listNews();
      setNews(rows.map(mapApiNewsToUiNews));
    } catch (err) {
      setError(getApiErrorMessage(err));
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createNews = useCallback(
    async (input: NewsInput, publicada: boolean) => {
      setError(null);
      const payload = mapUiNewsToCreatePayload(input, publicada);
      const row = await createNewsApi(payload);
      await refetch();
      return mapApiNewsToUiNews(row);
    },
    [refetch],
  );

  const updateNews = useCallback(
    async (id: string, input: NewsInput, publicada: boolean) => {
      setError(null);
      const numId = Number.parseInt(id, 10);
      const payload = mapUiNewsToUpdatePayload(input, publicada);
      const row = await updateNewsApi(numId, payload);
      await refetch();
      return mapApiNewsToUiNews(row);
    },
    [refetch],
  );

  const deleteNews = useCallback(
    async (id: string) => {
      setError(null);
      const numId = Number.parseInt(id, 10);
      await deleteNewsApi(numId);
      await refetch();
    },
    [refetch],
  );

  const publishNews = useCallback(
    async (id: string) => {
      setError(null);
      const numId = Number.parseInt(id, 10);
      await updateNewsApi(numId, { publicada: true });
      await refetch();
    },
    [refetch],
  );

  const unpublishNews = useCallback(
    async (id: string) => {
      setError(null);
      const numId = Number.parseInt(id, 10);
      await updateNewsApi(numId, { publicada: false });
      await refetch();
    },
    [refetch],
  );

  return {
    news,
    loading,
    error,
    refetch,
    createNews,
    updateNews,
    deleteNews,
    publishNews,
    unpublishNews,
  };
}
