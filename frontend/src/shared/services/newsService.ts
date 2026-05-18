import { httpClient } from '../utils/httpClient';

export interface NewsCreateData {
  titulo: string;
  slug: string;
  descripcion?: string;
  contenido: string;
  imagenUrl?: string;
  publicada?: boolean;
  visibilidad?: 'INTERNA' | 'PUBLICA';
}

export interface News {
  id: number;
  titulo: string;
  slug: string;
  descripcion?: string;
  contenido?: string;
  imagenUrl?: string;
  publicada: boolean;
  visibilidad: 'INTERNA' | 'PUBLICA';
  autor?: {
    id: number;
    usuario: string;
  };
  createdAt: string;
  updatedAt: string;
  publicadaEn?: string;
}

export interface NewsResponse {
  data: any;
  message: string;
  error: null;
}

export const newsService = {
  /**
   * Crea una nueva noticia
   */
  async createNews(data: NewsCreateData) {
    return httpClient.post<NewsResponse>('/news', data);
  },

  /**
   * Obtiene todas las noticias
   */
  async getNews(pagina: number = 1, limite: number = 20) {
    return httpClient.get<NewsResponse>(
      `/news?pagina=${pagina}&limite=${limite}`,
    );
  },

  /**
   * Obtiene una noticia por ID
   */
  async getNewsById(id: number) {
    return httpClient.get<NewsResponse>(`/news/${id}`);
  },

  /**
   * Obtiene una noticia por slug
   */
  async getNewsBySlug(slug: string) {
    return httpClient.get<NewsResponse>(`/news/slug/${slug}`);
  },

  /**
   * Actualiza una noticia
   */
  async updateNews(id: number, data: Partial<NewsCreateData>) {
    return httpClient.patch<NewsResponse>(`/news/${id}`, data);
  },

  /**
   * Elimina una noticia
   */
  async deleteNews(id: number) {
    return httpClient.delete<NewsResponse>(`/news/${id}`);
  },

  /**
   * Publica una noticia
   */
  async publishNews(id: number) {
    return httpClient.patch<NewsResponse>(`/news/${id}/publish`, {});
  },

  /**
   * Despublica una noticia
   */
  async unpublishNews(id: number) {
    return httpClient.patch<NewsResponse>(`/news/${id}/unpublish`, {});
  },
};
