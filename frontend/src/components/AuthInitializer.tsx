import { useEffect } from 'react';
import { refreshAccessToken } from '@/lib/axios';
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

  useEffect(() => {
    function runBoot() {
      void (async () => {
        const { user, accessToken, setInitialized, logout } =
          useAuthStore.getState();

        try {
          if (user && !accessToken) {
            try {
              await refreshAccessToken();
            } catch {
              logout();
              return;
            }
          }
        } finally {
          if (!useAuthStore.getState().isInitialized) {
            setInitialized(true);
          }
        }
      })();
    }

    if (useAuthStore.persist.hasHydrated()) {
      runBoot();
      return;
    }

    const unsub = useAuthStore.persist.onFinishHydration(() => {
      runBoot();
    });
    return () => {
      unsub?.();
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-maps-body">
        <p className="text-sm font-medium">Cargando sesión…</p>
      </div>
    );
  }

  return children;
}
