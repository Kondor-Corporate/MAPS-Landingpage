import { httpClient } from '../utils/httpClient';

export interface ProducerCreateData {
  slug: string;
  nombre: string;
  apellido: string;
  bio?: string;
  ciudad?: string;
  dni?: string;
  foto?: string;
  latitud?: number;
  longitud?: number;
  telefono?: string;
}

export interface RedSocial {
  id: number;
  plataforma: string;
  url: string;
  orden: number;
}

export interface Producer {
  id: number;
  slug: string;
  nombre: string;
  apellido: string;
  bio?: string;
  ciudad?: string;
  foto?: string;
  latitud?: number;
  longitud?: number;
  telefono?: string;
  usuario?: { usuario: string; rol: string };
  redesSociales: RedSocial[];
  createdAt: string;
  updatedAt: string;
}

export const producersService = {
  /**
   * Crea un nuevo productor
   */
  async createProducer(data: ProducerCreateData) {
    return httpClient.post('/producers', data);
  },

  /**
   * Obtiene todos los productores (solo admin)
   */
  async getProducers(pagina: number = 1, limite: number = 20) {
    return httpClient.get(`/producers?pagina=${pagina}&limite=${limite}`);
  },

  /**
   * Obtiene el directorio público de productores
   */
  async getDirectory(pagina: number = 1, limite: number = 20) {
    return httpClient.get(`/producers/directory?pagina=${pagina}&limite=${limite}`, {
      skipAuth: true,
    });
  },

  /**
   * Obtiene un productor por ID
   */
  async getProducerById(id: number) {
    return httpClient.get(`/producers/${id}`, { skipAuth: true });
  },

  /**
   * Obtiene un productor por slug
   */
  async getProducerBySlug(slug: string) {
    return httpClient.get(`/producers/slug/${slug}`, { skipAuth: true });
  },

  /**
   * Actualiza un productor
   */
  async updateProducer(id: number, data: Partial<ProducerCreateData>) {
    return httpClient.patch(`/producers/${id}`, data);
  },

  /**
   * Elimina un productor
   */
  async deleteProducer(id: number) {
    return httpClient.delete(`/producers/${id}`);
  },

  /**
   * Agrega una red social a un productor
   */
  async addRedSocial(productorId: number, data: { plataforma: string; url: string; orden?: number }) {
    return httpClient.post(`/producers/${productorId}/redes-sociales`, data);
  },

  /**
   * Actualiza una red social
   */
  async updateRedSocial(
    redSocialId: number,
    data: { plataforma?: string; url?: string; orden?: number },
  ) {
    return httpClient.patch(`/producers/redes-sociales/${redSocialId}`, data);
  },

  /**
   * Elimina una red social
   */
  async deleteRedSocial(redSocialId: number) {
    return httpClient.delete(`/producers/redes-sociales/${redSocialId}`);
  },
};
