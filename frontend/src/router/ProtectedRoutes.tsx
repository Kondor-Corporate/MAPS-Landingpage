import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isInvalidRefreshError, refreshAccessToken } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

/**
 * Exige autenticación. Si no hay `user` o `accessToken`, redirige a login.
 * `isInitialized` sólo pasa a `true` tras `AuthInitializer` (hidratar + refresh silencioso).
 */
export function ProtectedRoutes() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [restoreState, setRestoreState] = useState<'idle' | 'checking' | 'done'>('idle');

  useEffect(() => {
    if (!isInitialized || isAuthenticated || !user || restoreState !== 'idle') {
      return;
    }

    setRestoreState('checking');
    void refreshAccessToken()
      .catch((error) => {
        if (isInvalidRefreshError(error)) {
          useAuthStore.getState().logout();
        }
      })
      .finally(() => {
        setRestoreState('done');
      });
  }, [isAuthenticated, isInitialized, restoreState, user]);

  if (!isInitialized) {
    return null;
  }

  if (!isAuthenticated) {
    if (user && restoreState !== 'done') {
      return null;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
