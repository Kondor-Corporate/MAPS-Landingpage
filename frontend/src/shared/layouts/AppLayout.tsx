import type { ReactNode } from 'react';
import { Navbar } from '@/shared/components/Navbar';

type AppLayoutProps = {
  children: ReactNode;
};

/** Navbar + contenido (intranet / admin). */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
