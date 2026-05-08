import { useState } from 'react';
import type { ReactNode } from 'react';

type PublicLayoutProps = {
  children: ReactNode;
};

const navLinks = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Mapa de Asesores', href: '#mapa' },
];

export function PublicLayout({ children }: PublicLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-maps-body antialiased">
      <header className="sticky top-0 z-40 border-b border-maps-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[70px] max-w-[1268px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <a href="#inicio" className="flex items-center gap-2">
            <span className="text-[20px] font-bold tracking-[-0.3px] text-maps-heading">
              MAPSASESORES
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-9">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-maps-heading transition-colors hover:text-maps-brand"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <a
            href="/login"
            className="hidden lg:inline-flex h-10 items-center justify-center rounded-lg bg-maps-brand px-4 text-sm font-bold tracking-[0.21px] text-white transition-colors hover:bg-maps-brand-hover"
          >
            Acceso Productores
          </a>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg text-maps-heading hover:bg-maps-surface transition-colors"
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden border-t border-maps-border bg-white px-4 py-3">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-maps-heading hover:bg-maps-surface hover:text-maps-brand transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-maps-brand px-4 text-sm font-bold text-white hover:bg-maps-brand-hover transition-colors"
              >
                Acceso Productores
              </a>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-maps-dark px-4 sm:px-6 lg:px-10 pb-12 pt-16 text-white">
        <div className="mx-auto max-w-[1188px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-maps-brand text-lg font-extrabold">
                  M
                </div>
                <span className="text-2xl font-bold tracking-[-0.3px]">
                  MAPS Asesores
                </span>
              </div>
              <p className="max-w-[300px] text-sm leading-[22px] text-white/70">
                Modernización, gestión operativa y cobertura nacional al
                alcance de un clic.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold">Contacto</h3>
              <ul className="flex flex-col gap-3 text-sm text-white/70">
                <li>
                  <a href="#nosotros" className="hover:text-white">
                    Nosotros
                  </a>
                </li>
                <li>
                  <a href="/#contacto" className="hover:text-white">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold">Redes Sociales</h3>
              <ul className="flex flex-col gap-3 text-sm text-white/70">
                <li>
                  <a href="#terminos" className="hover:text-white">
                    Términos y Condiciones
                  </a>
                </li>
                <li>
                  <a href="#privacidad" className="hover:text-white">
                    Política de Privacidad
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/60 md:flex-row md:items-center">
            <p>© 2026 MAPS Asesores. Todos los derechos reservados.</p>
            <p className="flex items-center gap-2">
              Desarrollado por
              <span className="font-bold text-white">kondor</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
