import { httpClient } from '../utils/httpClient';

export interface BibliotecaCreateData {
  nombre: string;
  descripcion?: string;
}

export interface RamoCreateData {
  bibliotecaId: number;
  nombre: string;
  descripcion?: string;
  orden?: number;
}

export interface RecursoCreateData {
  ramoId: number;
  url: string;
}

export interface RedSocial {
  id: number;
  plataforma: string;
  url: string;
  orden: number;
}

export interface Recurso {
  id: number;
  url: string;
  createdAt: string;
  updatedAt: string;
  subidoPor?: { usuario: string };
}

export interface Ramo {
  id: number;
  bibliotecaId: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  createdAt: string;
  updatedAt: string;
  recursos: Recurso[];
}

export interface Biblioteca {
  id: number;
  nombre: string;
  descripcion?: string;
  createdAt: string;
  updatedAt: string;
  ramos: Ramo[];
}

export const libraryService = {
  // ============ BIBLIOTECAS ============

  /**
   * Crea una nueva biblioteca
   */
  async createBiblioteca(data: BibliotecaCreateData) {
    return httpClient.post('/library/bibliotecas', data);
  },

  /**
   * Obtiene todas las bibliotecas
   */
  async getBibliotecas() {
    return httpClient.get('/library/bibliotecas', { skipAuth: true });
  },

  /**
   * Obtiene una biblioteca por ID
   */
  async getBibliotecaById(id: number) {
    return httpClient.get(`/library/bibliotecas/${id}`, { skipAuth: true });
  },

  /**
   * Actualiza una biblioteca
   */
  async updateBiblioteca(id: number, data: Partial<BibliotecaCreateData>) {
    return httpClient.patch(`/library/bibliotecas/${id}`, data);
  },

  /**
   * Elimina una biblioteca
   */
  async deleteBiblioteca(id: number) {
    return httpClient.delete(`/library/bibliotecas/${id}`);
  },

  // ============ RAMOS ============

  /**
   * Crea un nuevo ramo
   */
  async createRamo(data: RamoCreateData) {
    return httpClient.post('/library/ramos', data);
  },

  /**
   * Obtiene un ramo por ID
   */
  async getRamoById(id: number) {
    return httpClient.get(`/library/ramos/${id}`, { skipAuth: true });
  },

  /**
   * Actualiza un ramo
   */
  async updateRamo(id: number, data: Partial<RamoCreateData>) {
    return httpClient.patch(`/library/ramos/${id}`, data);
  },

  /**
   * Elimina un ramo
   */
  async deleteRamo(id: number) {
    return httpClient.delete(`/library/ramos/${id}`);
  },

  // ============ RECURSOS ============

  /**
   * Crea un nuevo recurso
   */
  async createRecurso(data: RecursoCreateData) {
    return httpClient.post('/library/recursos', data);
  },

  /**
   * Obtiene un recurso por ID
   */
  async getRecursoById(id: number) {
    return httpClient.get(`/library/recursos/${id}`, { skipAuth: true });
  },

  /**
   * Actualiza un recurso
   */
  async updateRecurso(id: number, data: { url?: string }) {
    return httpClient.patch(`/library/recursos/${id}`, data);
  },

  /**
   * Elimina un recurso
   */
  async deleteRecurso(id: number) {
    return httpClient.delete(`/library/recursos/${id}`);
  },
};
