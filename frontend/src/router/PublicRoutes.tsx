import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * Rutas solo para invitados (login, registro, etc.). Si ya hay sesión,
 * redirige al área que corresponda al rol. Espera a `isInitialized` para
 * alinear con la hidratación de Zustand y el refresh en `AuthInitializer`.
 */
export function PublicRoutes() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isInitialized) {
    return null;
  }

  if (isAuthenticated && user) {
    if (user.rol === 'PRODUCTOR') {
      return <Navigate to="/intranet/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}
