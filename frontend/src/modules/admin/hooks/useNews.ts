import { useState, useCallback } from 'react';
import { newsService, type NewsCreateData, type News } from '@/shared/services/newsService';

interface UseNewsOptions {
  initialPage?: number;
  itemsPerPage?: number;
}

/**
 * Hook para manejar la lógica de noticias
 */
export const useNews = (options: UseNewsOptions = {}) => {
  const { initialPage = 1, itemsPerPage = 20 } = options;

  const [noticias, setNoticias] = useState<News[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carga la lista de noticias
   */
  const loadNoticias = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await newsService.getNews(page, itemsPerPage);
      setNoticias(response.data.noticias);
      setCurrentPage(page);
      setTotalPages(response.data.totalPaginas);
      setTotal(response.data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar noticias';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  /**
   * Crea una nueva noticia
   */
  const createNews = useCallback(async (data: NewsCreateData) => {
    setError(null);

    try {
      await newsService.createNews(data);
      // Recargar lista
      await loadNoticias(1);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear noticia';
      setError(message);
      return false;
    }
  }, [loadNoticias]);

  /**
   * Obtiene una noticia por ID
   */
  const getNewsById = useCallback(async (id: number) => {
    try {
      const response = await newsService.getNewsById(id);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener noticia';
      setError(message);
      return null;
    }
  }, []);

  /**
   * Actualiza una noticia
   */
  const updateNews = useCallback(
    async (id: number, data: Partial<NewsCreateData>) => {
      setError(null);

      try {
        await newsService.updateNews(id, data);
        // Recargar lista
        await loadNoticias(currentPage);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar noticia';
        setError(message);
        return false;
      }
    },
    [loadNoticias, currentPage],
  );

  /**
   * Elimina una noticia
   */
  const deleteNews = useCallback(
    async (id: number) => {
      setError(null);

      try {
        await newsService.deleteNews(id);
        // Recargar lista
        await loadNoticias(currentPage);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar noticia';
        setError(message);
        return false;
      }
    },
    [loadNoticias, currentPage],
  );

  /**
   * Publica una noticia
   */
  const publishNews = useCallback(
    async (id: number) => {
      setError(null);

      try {
        await newsService.publishNews(id);
        // Actualizar estado local
        setNoticias((prev) =>
          prev.map((n) => (n.id === id ? { ...n, publicada: true } : n)),
        );
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al publicar noticia';
        setError(message);
        return false;
      }
    },
    [],
  );

  /**
   * Despublica una noticia
   */
  const unpublishNews = useCallback(
    async (id: number) => {
      setError(null);

      try {
        await newsService.unpublishNews(id);
        // Actualizar estado local
        setNoticias((prev) =>
          prev.map((n) => (n.id === id ? { ...n, publicada: false } : n)),
        );
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al despublicar noticia';
        setError(message);
        return false;
      }
    },
    [],
  );

  return {
    // Estado
    noticias,
    currentPage,
    totalPages,
    total,
    loading,
    error,

    // Funciones
    loadNoticias,
    createNews,
    getNewsById,
    updateNews,
    deleteNews,
    publishNews,
    unpublishNews,

    // Utilidades
    clearError: () => setError(null),
  };
};
