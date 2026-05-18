import { useState, useCallback } from 'react';
import { libraryService, type Biblioteca, type BibliotecaCreateData, type RamoCreateData, type RecursoCreateData } from '@/shared/services/libraryService';

/**
 * Hook para manejar la lógica de la biblioteca digital
 */
export const useLibrary = () => {
  const [bibliotecas, setBibliotecas] = useState<Biblioteca[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carga todas las bibliotecas
   */
  const loadBibliotecas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await libraryService.getBibliotecas();
      setBibliotecas(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar bibliotecas';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crea una nueva biblioteca
   */
  const createBiblioteca = useCallback(async (data: BibliotecaCreateData) => {
    setError(null);

    try {
      await libraryService.createBiblioteca(data);
      await loadBibliotecas();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear biblioteca';
      setError(message);
      return false;
    }
  }, [loadBibliotecas]);

  /**
   * Obtiene una biblioteca por ID
   */
  const getBibliotecaById = useCallback(async (id: number) => {
    try {
      const response = await libraryService.getBibliotecaById(id);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener biblioteca';
      setError(message);
      return null;
    }
  }, []);

  /**
   * Actualiza una biblioteca
   */
  const updateBiblioteca = useCallback(
    async (id: number, data: Partial<BibliotecaCreateData>) => {
      setError(null);

      try {
        await libraryService.updateBiblioteca(id, data);
        await loadBibliotecas();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar biblioteca';
        setError(message);
        return false;
      }
    },
    [loadBibliotecas],
  );

  /**
   * Elimina una biblioteca
   */
  const deleteBiblioteca = useCallback(
    async (id: number) => {
      setError(null);

      try {
        await libraryService.deleteBiblioteca(id);
        await loadBibliotecas();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar biblioteca';
        setError(message);
        return false;
      }
    },
    [loadBibliotecas],
  );

  /**
   * Crea un nuevo ramo
   */
  const createRamo = useCallback(async (data: RamoCreateData) => {
    setError(null);

    try {
      await libraryService.createRamo(data);
      await loadBibliotecas();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear ramo';
      setError(message);
      return false;
    }
  }, [loadBibliotecas]);

  /**
   * Actualiza un ramo
   */
  const updateRamo = useCallback(
    async (id: number, data: Partial<RamoCreateData>) => {
      setError(null);

      try {
        await libraryService.updateRamo(id, data);
        await loadBibliotecas();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar ramo';
        setError(message);
        return false;
      }
    },
    [loadBibliotecas],
  );

  /**
   * Elimina un ramo
   */
  const deleteRamo = useCallback(
    async (id: number) => {
      setError(null);

      try {
        await libraryService.deleteRamo(id);
        await loadBibliotecas();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar ramo';
        setError(message);
        return false;
      }
    },
    [loadBibliotecas],
  );

  /**
   * Crea un nuevo recurso
   */
  const createRecurso = useCallback(async (data: RecursoCreateData) => {
    setError(null);

    try {
      await libraryService.createRecurso(data);
      await loadBibliotecas();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear recurso';
      setError(message);
      return false;
    }
  }, [loadBibliotecas]);

  /**
   * Actualiza un recurso
   */
  const updateRecurso = useCallback(
    async (id: number, data: { url?: string }) => {
      setError(null);

      try {
        await libraryService.updateRecurso(id, data);
        await loadBibliotecas();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar recurso';
        setError(message);
        return false;
      }
    },
    [loadBibliotecas],
  );

  /**
   * Elimina un recurso
   */
  const deleteRecurso = useCallback(
    async (id: number) => {
      setError(null);

      try {
        await libraryService.deleteRecurso(id);
        await loadBibliotecas();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar recurso';
        setError(message);
        return false;
      }
    },
    [loadBibliotecas],
  );

  return {
    // Estado
    bibliotecas,
    loading,
    error,

    // Funciones
    loadBibliotecas,
    createBiblioteca,
    getBibliotecaById,
    updateBiblioteca,
    deleteBiblioteca,
    createRamo,
    updateRamo,
    deleteRamo,
    createRecurso,
    updateRecurso,
    deleteRecurso,

    // Utilidades
    clearError: () => setError(null),
  };
};
