import { useState, useCallback } from 'react';
import { producersService, type ProducerCreateData, type Producer } from '@/shared/services/producersService';

interface UseProducersOptions {
  initialPage?: number;
  itemsPerPage?: number;
}

/**
 * Hook para manejar la lógica de productores
 */
export const useProducers = (options: UseProducersOptions = {}) => {
  const { initialPage = 1, itemsPerPage = 20 } = options;

  const [productores, setProductores] = useState<Producer[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carga la lista de productores
   */
  const loadProductores = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await producersService.getProducers(page, itemsPerPage);
      setProductores(response.data.productores);
      setCurrentPage(page);
      setTotalPages(response.data.totalPaginas);
      setTotal(response.data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar productores';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  /**
   * Crea un nuevo productor
   */
  const createProducer = useCallback(async (data: ProducerCreateData) => {
    setError(null);

    try {
      await producersService.createProducer(data);
      await loadProductores(1);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear productor';
      setError(message);
      return false;
    }
  }, [loadProductores]);

  /**
   * Obtiene un productor por ID
   */
  const getProducerById = useCallback(async (id: number) => {
    try {
      const response = await producersService.getProducerById(id);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener productor';
      setError(message);
      return null;
    }
  }, []);

  /**
   * Actualiza un productor
   */
  const updateProducer = useCallback(
    async (id: number, data: Partial<ProducerCreateData>) => {
      setError(null);

      try {
        await producersService.updateProducer(id, data);
        await loadProductores(currentPage);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar productor';
        setError(message);
        return false;
      }
    },
    [loadProductores, currentPage],
  );

  /**
   * Elimina un productor
   */
  const deleteProducer = useCallback(
    async (id: number) => {
      setError(null);

      try {
        await producersService.deleteProducer(id);
        await loadProductores(currentPage);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar productor';
        setError(message);
        return false;
      }
    },
    [loadProductores, currentPage],
  );

  /**
   * Agrega una red social
   */
  const addRedSocial = useCallback(
    async (productorId: number, data: { plataforma: string; url: string; orden?: number }) => {
      setError(null);

      try {
        await producersService.addRedSocial(productorId, data);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al agregar red social';
        setError(message);
        return false;
      }
    },
    [],
  );

  /**
   * Elimina una red social
   */
  const deleteRedSocial = useCallback(
    async (redSocialId: number) => {
      setError(null);

      try {
        await producersService.deleteRedSocial(redSocialId);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar red social';
        setError(message);
        return false;
      }
    },
    [],
  );

  return {
    // Estado
    productores,
    currentPage,
    totalPages,
    total,
    loading,
    error,

    // Funciones
    loadProductores,
    createProducer,
    getProducerById,
    updateProducer,
    deleteProducer,
    addRedSocial,
    deleteRedSocial,

    // Utilidades
    clearError: () => setError(null),
  };
};
