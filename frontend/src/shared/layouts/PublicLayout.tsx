import type { ReactNode } from 'react';

type PublicLayoutProps = {
  children: ReactNode;
};

/** Navbar pública + footer (web pública). */
export function PublicLayout({ children }: PublicLayoutProps) {
  return <div className="min-h-screen">{children}</div>;
}
