import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

/**
 * Ejecuta el flujo completo de cierre de sesión:
 * 1. Llama POST /auth/logout (revoca el refresh token en BD).
 * 2. Limpia el store de Zustand independientemente del resultado.
 * 3. Redirige a /login.
 *
 * Si la petición falla (red, token ya expirado, etc.) la sesión local
 * se limpia de todas formas para no dejar estado inconsistente.
 */
export function useLogout() {
  const navigate = useNavigate();
  const storeLogout = useAuthStore((s) => s.logout);

  return useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // intencional: fallo de red o token expirado no bloquean el logout local
    } finally {
      storeLogout();
      void navigate('/login', { replace: true });
    }
  }, [navigate, storeLogout]);
}
