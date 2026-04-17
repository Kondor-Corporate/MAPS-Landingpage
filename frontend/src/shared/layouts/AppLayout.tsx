import type { ReactNode } from 'react';

type AppLayoutProps = {
  children: ReactNode;
};

/** Sidebar + header (intranet / admin). */
export function AppLayout({ children }: AppLayoutProps) {
  return <div className="min-h-screen">{children}</div>;
}
