import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/shared/services/authService';

interface User {
  id: number;
  usuario: string;
  rol: string;
}

/**
 * Hook de autenticación que proporciona:
 * - Estado de autenticación
 * - Función para logout
 * - Función para refresh token
 * - Información del usuario
 */
export const useAuth = () => {
  const navigate = useNavigate();

  /**
   * Obtiene el token de acceso actual
   */
  const accessToken = useMemo(() => {
    return authService.getAccessToken();
  }, []);

  /**
   * Verifica si el usuario está autenticado
   */
  const isAuthenticated = useMemo(() => {
    return accessToken !== null && !authService.isTokenExpired(accessToken);
  }, [accessToken]);

  /**
   * Obtiene la información del usuario del storage
   */
  const user = useMemo((): User | null => {
    const userStr = localStorage.getItem('maps_user') || sessionStorage.getItem('maps_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }, []);

  /**
   * Realiza logout seguro
   */
  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        // Intentar logout en servidor
        await authService.logout(accessToken);
      }
    } catch (error) {
      console.error('Error al logout:', error);
    } finally {
      // Limpiar siempre
      authService.clearTokens();
      navigate('/');
    }
  }, [accessToken, navigate]);

  /**
   * Renueva el token si está cerca de expirar
   * Retorna true si tuvo éxito, false si falló
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      if (!accessToken) return false;

      // Si el token ya expiró, hacer refresh
      if (authService.isTokenExpired(accessToken)) {
        await authService.refreshAccessToken();
        return true;
      }

      return true;
    } catch (error) {
      console.error('Error al refrescar token:', error);
      // Si el refresh falla, logout automático
      await logout();
      return false;
    }
  }, [accessToken, logout]);

  /**
   * Decodifica el token actual para obtener información
   */
  const getTokenInfo = useCallback(() => {
    if (!accessToken) return null;
    return authService.decodeToken(accessToken);
  }, [accessToken]);

  return {
    // Estado
    isAuthenticated,
    accessToken,
    user,

    // Funciones
    logout,
    refreshToken,
    getTokenInfo,

    // Utilidades
    isTokenExpired: (token?: string) => {
      const tokenToCheck = token || accessToken;
      return tokenToCheck ? authService.isTokenExpired(tokenToCheck) : true;
    },
  };
};
