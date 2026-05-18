import { authService } from '../services/authService';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

/**
 * Cliente HTTP con manejo automático de refresh token
 * Intercepta requests y respuestas para:
 * 1. Agregar Authorization header
 * 2. Detectar token expirado (401)
 * 3. Hacer refresh automático
 * 4. Reintentar request con nuevo token
 */
export const httpClient = {
  /**
   * Realiza un fetch con interceptores
   * @param url - URL relativa a API_BASE (ej: '/auth/login')
   * @param options - RequestInit + opciones adicionales
   */
  async fetch<T = any>(
    url: string,
    options: FetchOptions = {},
  ): Promise<Response> {
    const { skipAuth = false, skipRefresh = false, ...fetchOptions } = options;

    // Asegurar que sea una URL completa
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

    // Construir headers
    const headers = new Headers(fetchOptions.headers);

    // Agregar Authorization si no se skippea
    if (!skipAuth) {
      const token = authService.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    // Primer intento
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
      credentials: 'include', // Para cookies (refresh token)
    });

    // Si es 401 y no skipeamos refresh, intentar renovar
    if (response.status === 401 && !skipAuth && !skipRefresh) {
      try {
        // Intentar refresh
        const newToken = await authService.refreshAccessToken();

        // Reintentar request original con nuevo token
        const retryHeaders = new Headers(fetchOptions.headers);
        retryHeaders.set('Authorization', `Bearer ${newToken}`);

        return await fetch(fullUrl, {
          ...fetchOptions,
          headers: retryHeaders,
          credentials: 'include',
        });
      } catch (error) {
        // Si refresh falla, retornar error 401 original
        console.error('Token refresh falló, usuario debe reloguarse:', error);
        return response;
      }
    }

    return response;
  },

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    options?: Omit<FetchOptions, 'method' | 'body'>,
  ): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    body?: any,
    options?: Omit<FetchOptions, 'method' | 'body'>,
  ): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    body?: any,
    options?: Omit<FetchOptions, 'method' | 'body'>,
  ): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    body?: any,
    options?: Omit<FetchOptions, 'method' | 'body'>,
  ): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    options?: Omit<FetchOptions, 'method' | 'body'>,
  ): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // DELETE puede no tener respuesta
    const text = await response.text();
    if (!text) return undefined as unknown as T;
    return JSON.parse(text);
  },
};
