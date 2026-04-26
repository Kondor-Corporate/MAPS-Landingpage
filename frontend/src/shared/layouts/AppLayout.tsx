import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/modules/auth/hooks/useLogout';

type AppLayoutProps = {
  children: ReactNode;
};

/**
 * Layout base de intranet y admin.
 * Contiene un header mínimo funcional con usuario activo y acción de logout.
 * El sidebar y la navbar final se agregarán en features posteriores.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <span className="text-sm font-semibold text-maps-heading">
          MAPS Asesores
        </span>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-maps-body">
              {user.usuario}{' '}
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium uppercase text-maps-body">
                {user.rol}
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-maps-body transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
