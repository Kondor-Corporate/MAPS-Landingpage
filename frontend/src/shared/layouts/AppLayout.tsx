import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { NewsDetailModal } from '@/modules/public-web/components/NewsDetailModal';
import { AppSidebar, AppSidebarPanel } from '@/shared/layouts/AppSidebar';
import { useAuthStore } from '@/store/authStore';

type AppLayoutProps = {
  children: ReactNode;
};

const DESKTOP_SIDEBAR_STORAGE_KEY = 'maps-desktop-sidebar-collapsed';

function readDesktopSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseNavIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Layout base de intranet y admin.
 * Renderiza el sidebar lateral por rol + el contenido principal.
 * El logout vive dentro del footer del sidebar.
 * En viewports &lt; lg se ofrece un menú móvil (drawer) con los mismos items que el sidebar.
 * En desktop (lg+) el sidebar lateral puede ocultarse para dar ancho completo al contenido.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(
    readDesktopSidebarCollapsed,
  );

  const toggleDesktopSidebar = () => {
    setDesktopSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-maps-surface">
      <AppSidebar
        collapsed={desktopSidebarCollapsed}
        onToggleCollapse={toggleDesktopSidebar}
      />
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {user ? (
          <>
            <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-maps-border bg-white px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-expanded={mobileNavOpen}
              aria-controls="app-mobile-nav"
              aria-label="Abrir menú de navegación"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-maps-heading transition-colors hover:bg-maps-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maps-brand"
            >
              <MenuIcon />
            </button>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold text-maps-heading">
                MAPS Asesores
              </span>
              <span className="truncate text-xs text-maps-muted">Portal</span>
            </div>
            </header>
            {desktopSidebarCollapsed ? (
              <header className="sticky top-0 z-40 hidden items-center gap-3 border-b border-maps-border bg-white px-4 py-3 lg:flex">
              <button
                type="button"
                onClick={toggleDesktopSidebar}
                aria-expanded={false}
                aria-label="Mostrar menú de navegación"
                title="Mostrar menú"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-maps-heading transition-colors hover:bg-maps-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maps-brand"
              >
                <MenuIcon />
              </button>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold text-maps-heading">
                  MAPS Asesores
                </span>
                <span className="truncate text-xs text-maps-muted">
                  Portal de Productores
                </span>
              </div>
              </header>
            ) : null}
          </>
        ) : null}

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        <NewsDetailModal />

        {user && mobileNavOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[50] bg-black/40 lg:hidden"
              aria-label="Cerrar menú de navegación"
              onClick={() => setMobileNavOpen(false)}
            />
            <div
              id="app-mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Navegación del portal"
              className="fixed left-0 top-0 z-[51] flex h-full w-64 max-w-[85vw] flex-col border-r border-maps-border bg-white shadow-lg lg:hidden"
            >
              <AppSidebarPanel
                user={user}
                headerTrailing={
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    aria-label="Cerrar menú de navegación"
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-maps-heading transition-colors hover:bg-maps-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maps-brand"
                  >
                    <CloseNavIcon />
                  </button>
                }
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
