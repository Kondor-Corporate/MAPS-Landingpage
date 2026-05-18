const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export interface LoginResponse {
  data: {
    accessToken: string;
    user: {
      id: number;
      usuario: string;
      rol: string;
    };
  };
  message: string;
  error: null;
}

export interface RefreshResponse {
  data: {
    accessToken: string;
  };
  message: string;
  error: null;
}

export const authService = {
  /**
   * Realiza login y guarda tokens (access + refresh en cookie)
   */
  async login(
    usuario: string,
    password: string,
    rememberMe: boolean = false,
  ): Promise<LoginResponse['data']> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ usuario, password }),
    });

    const json = (await response.json()) as LoginResponse;

    if (!response.ok) {
      throw new Error(json.message || 'Error al iniciar sesión');
    }

    // Guardar accessToken según preferencia
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('maps_access_token', json.data.accessToken);

    // Limpiar el otro storage
    if (rememberMe) {
      sessionStorage.removeItem('maps_access_token');
    } else {
      localStorage.removeItem('maps_access_token');
    }

    return json.data;
  },

  /**
   * Renueva el accessToken usando el refreshToken
   * El refreshToken viene en cookie httpOnly desde el backend
   */
  async refreshAccessToken(): Promise<string> {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Envía cookies (incluye refresh token)
        body: JSON.stringify({}),
      });

      const json = (await response.json()) as RefreshResponse;

      if (!response.ok) {
        throw new Error(json.message || 'Error al renovar token');
      }

      // Guardar nuevo accessToken (mantener en mismo storage que antes)
      const hasInLocalStorage = localStorage.getItem('maps_access_token');
      if (hasInLocalStorage) {
        localStorage.setItem('maps_access_token', json.data.accessToken);
      } else {
        sessionStorage.setItem('maps_access_token', json.data.accessToken);
      }

      return json.data.accessToken;
    } catch (error) {
      // Limpiar tokens si el refresh falla
      this.clearTokens();
      throw error;
    }
  },

  /**
   * Cierra sesión y revoca tokens en el servidor
   */
  async logout(accessToken: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Limpiar siempre, incluso si el servidor falla
      this.clearTokens();
    }
  },

  /**
   * Limpia todos los tokens del cliente
   */
  clearTokens(): void {
    localStorage.removeItem('maps_access_token');
    sessionStorage.removeItem('maps_access_token');
    localStorage.removeItem('maps_user');
    sessionStorage.removeItem('maps_user');
  },

  /**
   * Obtiene el accessToken del storage
   */
  getAccessToken(): string | null {
    return (
      localStorage.getItem('maps_access_token') ||
      sessionStorage.getItem('maps_access_token')
    );
  },

  /**
   * Verifica si existe un token válido
   */
  hasAccessToken(): boolean {
    return this.getAccessToken() !== null;
  },

  /**
   * Decodifica un JWT para obtener su payload (sin verificar firma)
   */
  decodeToken(token: string): Record<string, any> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('JWT inválido');

      const decoded = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
      );
      return decoded;
    } catch (error) {
      console.error('Error decodificando token:', error);
      return {};
    }
  },

  /**
   * Verifica si un token ha expirado
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded.exp) return true;

    // exp está en segundos, Date.now() en milisegundos
    // Dar 30 segundos de margen
    return decoded.exp * 1000 <= Date.now() + 30000;
  },
};
