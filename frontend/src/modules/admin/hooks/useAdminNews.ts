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
  addImagenGaleria,
  createNews as createNewsApi,
  deleteNews as deleteNewsApi,
  deletePortada,
  listNews,
  removeImagenGaleria,
  updateNews as updateNewsApi,
  uploadPortada,
} from '@/modules/admin/services/news.service';
import type { NewsImageOps } from '@/modules/admin/components/NewsForm';
import type { News, NewsInput } from '@/modules/admin/types/news';

/**
 * Se lanza cuando el texto de la noticia ya se creó pero falló alguna operación
 * de imágenes. Lleva la noticia creada para que el formulario pase a modo edición
 * en vez de reintentar un `POST` y crear un duplicado.
 */
export class PartialCreateError extends Error {
  constructor(
    public readonly createdNews: News,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.cause = cause;
  }
}

/** Aplica secuencialmente las operaciones de imágenes tras persistir el texto. */
async function applyImageOps(newsId: number, images?: NewsImageOps): Promise<void> {
  if (!images) return;
  if (images.portadaFile) {
    await uploadPortada(newsId, images.portadaFile);
  } else if (images.removePortada) {
    await deletePortada(newsId);
  }
  for (const imagenId of images.galeriaEliminar) {
    await removeImagenGaleria(newsId, imagenId);
  }
  // Secuencial para preservar el orden de subida en la galería.
  for (const file of images.galeriaNuevas) {
    await addImagenGaleria(newsId, file);
  }
}

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
    async (input: NewsInput, publicada: boolean, images?: NewsImageOps) => {
      setError(null);
      const payload = mapUiNewsToCreatePayload(input, publicada);
      const row = await createNewsApi(payload);
      try {
        await applyImageOps(row.id, images);
      } catch (err) {
        // El texto ya persistió: no relanzar como si nada se hubiera creado
        // (evita que un reintento dispare un segundo POST y duplique la noticia).
        await refetch();
        throw new PartialCreateError(mapApiNewsToUiNews(row), err);
      }
      await refetch();
      return mapApiNewsToUiNews(row);
    },
    [refetch],
  );

  const updateNews = useCallback(
    async (id: string, input: NewsInput, publicada: boolean, images?: NewsImageOps) => {
      setError(null);
      const numId = Number.parseInt(id, 10);
      const payload = mapUiNewsToUpdatePayload(input, publicada);
      const row = await updateNewsApi(numId, payload);
      await applyImageOps(numId, images);
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
