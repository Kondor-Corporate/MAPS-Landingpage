import type { ReactNode } from 'react';
import { AppSidebar } from '@/shared/layouts/AppSidebar';

type AppLayoutProps = {
  children: ReactNode;
};

/**
 * Layout base de intranet y admin.
 * Renderiza el sidebar lateral por rol + el contenido principal.
 * El logout vive dentro del footer del sidebar.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-maps-surface">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
