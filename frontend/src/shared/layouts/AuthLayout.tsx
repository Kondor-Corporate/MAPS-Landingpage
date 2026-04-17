import type { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

/** Split-screen login. */
export function AuthLayout({ children }: AuthLayoutProps) {
  return <div className="min-h-screen">{children}</div>;
}
