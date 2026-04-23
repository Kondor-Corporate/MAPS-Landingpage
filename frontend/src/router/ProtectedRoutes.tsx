import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * Exige autenticación. Si no hay `user` o `accessToken`, redirige a login.
 * `isInitialized` sólo pasa a `true` tras `AuthInitializer` (hidratar + refresh silencioso).
 */
export function ProtectedRoutes() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isInitialized) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
