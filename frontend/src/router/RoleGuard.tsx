import { Navigate, Outlet } from 'react-router-dom';
import type { Rol } from '@/store/authStore';
import { useAuthStore } from '@/store/authStore';

type RoleGuardProps = {
  allowedRoles: readonly Rol[];
};

/**
 * Comprueba que el `rol` del usuario esté en `allowedRoles`.
 */
export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const user = useAuthStore((s) => s.user);

  if (!isInitialized) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.rol)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
