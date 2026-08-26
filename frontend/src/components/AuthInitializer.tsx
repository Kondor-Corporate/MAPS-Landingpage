import { useCallback, useEffect, useRef, useState } from 'react';
import { isInvalidRefreshError, refreshAccessToken } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

type AuthInitializerProps = {
  children: React.ReactNode;
};

/**
 * Tras la rehidratación de `persist`, intenta renovar el access token con la
 * cookie httpOnly para no forzar un nuevo login en cada recarga.
 */
export function AuthInitializer({ children }: AuthInitializerProps) {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const mountedRef = useRef(false);
  const attemptRef = useRef(0);

  const runBoot = useCallback(() => {
    const attempt = ++attemptRef.current;
    const { setInitialized } = useAuthStore.getState();
    setInitialized(false);
    setIsChecking(true);
    setSessionError(null);
    void (async () => {
      const { user, accessToken, logout } = useAuthStore.getState();
      const isProtectedPath =
        window.location.pathname.startsWith('/admin') ||
        window.location.pathname.startsWith('/intranet');

      try {
        if (!accessToken && (user != null || isProtectedPath)) {
          try {
            await refreshAccessToken();
          } catch (error) {
            if (isInvalidRefreshError(error)) {
              logout();
              return;
            }
            if (mountedRef.current && attempt === attemptRef.current) {
              setSessionError(
                'No pudimos verificar tu sesión porque el servicio no responde. Tu sesión no fue cerrada.',
              );
            }
          }
        }
      } finally {
        if (attempt === attemptRef.current && !useAuthStore.getState().isInitialized) {
          setInitialized(true);
        }
        if (mountedRef.current && attempt === attemptRef.current) {
          setIsChecking(false);
        }
      }
    })();
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (useAuthStore.persist.hasHydrated()) {
      runBoot();
      return () => {
        mountedRef.current = false;
      };
    }

    const unsub = useAuthStore.persist.onFinishHydration(() => {
      runBoot();
    });
    return () => {
      mountedRef.current = false;
      unsub?.();
    };
  }, [runBoot]);

  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-maps-surface p-4">
        <div className="w-full max-w-md rounded-xl border border-maps-border bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-maps-heading">No se pudo verificar la sesión</h1>
          <p className="mt-2 text-sm text-maps-body">{sessionError}</p>
          <button
            type="button"
            onClick={runBoot}
            className="mt-5 min-h-11 rounded-lg bg-maps-brand px-5 py-2 text-sm font-semibold text-white hover:bg-maps-brand-hover"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isChecking || !isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-maps-body">
        <p className="text-sm font-medium">Cargando sesión…</p>
      </div>
    );
  }

  return children;
}
