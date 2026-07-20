import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NewsDetailModal } from '@/modules/public-web/components/NewsDetailModal';

type PublicLayoutProps = {
  children: ReactNode;
};

const navLinks = [
  { label: 'Inicio', to: '/#inicio' },
  { label: 'Nosotros', to: '/#nosotros' },
  { label: 'Noticias', to: '/#noticias' },
  { label: 'Mapa de Asesores', to: '/#mapa' },
];

const brandLogoSrc = '/mapsLogo.webp';

const navLinkClassName =
  'whitespace-nowrap text-base font-medium text-maps-heading transition-colors hover:text-maps-brand';

const mobileNavLinkClassName =
  'rounded-lg px-4 py-3 text-sm font-medium text-maps-heading hover:bg-maps-surface hover:text-maps-brand transition-colors';

type PublicNavLinkProps = {
  to: string;
  label: string;
  className: string;
  isActive?: boolean;
  onNavigate?: () => void;
};

function PublicNavLink({ to, label, className, isActive = false, onNavigate }: PublicNavLinkProps) {
  return (
    <Link
      to={to}
      className={`${className} ${isActive ? 'text-maps-brand' : ''}`}
      aria-current={isActive ? 'location' : undefined}
      onClick={onNavigate}
    >
      {label}
    </Link>
  );
}

function PublicBrandLink({ className }: { className: string }) {
  const content = (
    <>
      <img
        src={brandLogoSrc}
        alt=""
        className="h-10 w-auto max-h-10 shrink-0 object-contain"
      />
      <span className="text-[20px] font-bold tracking-[-0.3px] text-maps-heading">
        MAPSASESORES
      </span>
    </>
  );

  return (
    <Link to="/#inicio" className={className}>
      {content}
    </Link>
  );
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const currentPublicTarget = `${location.pathname}${location.hash}`;

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }

    const sectionId = decodeURIComponent(location.hash.slice(1));

    const frame = window.requestAnimationFrame(() => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-maps-body antialiased">
      <header className="sticky top-0 z-40 border-b border-maps-border bg-white/90 backdrop-blur-md">
        <div className="relative flex h-[70px] w-full items-center px-4 sm:px-6 lg:px-10">
          <PublicBrandLink className="relative z-10 flex shrink-0 items-center gap-2" />

          <nav
            className="absolute left-1/2 top-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 lg:flex lg:gap-9"
            aria-label="Principal"
          >
            {navLinks.map((link) => (
              <PublicNavLink
                key={link.to}
                to={link.to}
                label={link.label}
                className={navLinkClassName}
                isActive={currentPublicTarget === link.to}
              />
            ))}
          </nav>

          <div className="relative z-10 ml-auto flex shrink-0 items-center gap-2">
            <Link
              to="/login"
              className="hidden h-10 items-center justify-center rounded-lg bg-maps-brand px-4 text-sm font-bold tracking-[0.21px] text-white transition-colors hover:bg-maps-brand-hover lg:inline-flex"
            >
              Acceso Productores
            </Link>

            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-maps-heading transition-colors hover:bg-maps-surface lg:hidden"
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M3 6h14M3 10h14M3 14h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden border-t border-maps-border bg-white px-4 py-3">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <PublicNavLink
                  key={link.to}
                  to={link.to}
                  label={link.label}
                  className={mobileNavLinkClassName}
                  isActive={currentPublicTarget === link.to}
                  onNavigate={() => setIsMenuOpen(false)}
                />
              ))}
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-maps-brand px-4 text-sm font-bold text-white hover:bg-maps-brand-hover transition-colors"
              >
                Acceso Productores
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>
      <NewsDetailModal />

      <footer className="border-t border-maps-border bg-white px-4 pb-12 pt-16 text-maps-body sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1188px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={brandLogoSrc}
                  alt=""
                  className="h-12 w-auto max-h-12 shrink-0 object-contain"
                />
                <span className="text-2xl font-bold tracking-[-0.3px] text-maps-heading">
                  MAPSASESORES
                </span>
              </div>
              <p className="max-w-[300px] text-sm leading-[22px] text-maps-muted">
                Un espacio para conocer a nuestros asesores y acceder a información de interés.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-maps-heading">Enlaces</h3>
              <ul className="flex flex-col gap-3 text-sm text-maps-muted">
                <li>
                  <Link
                    to="/#noticias"
                    className="transition-colors hover:text-maps-brand"
                  >
                    Noticias
                  </Link>
                </li>
                <li>
                  <Link
                    to="/#nosotros"
                    className="transition-colors hover:text-maps-brand"
                  >
                    Nosotros
                  </Link>
                </li>
                <li>
                  <Link
                    to="/#mapa"
                    className="transition-colors hover:text-maps-brand"
                  >
                    Mapa de asesores
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-maps-heading">Legal</h3>
              <p className="text-sm leading-[22px] text-maps-muted">
                Términos y condiciones y política de privacidad próximamente.
              </p>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-maps-border pt-8 text-sm text-maps-muted md:flex-row md:items-center">
            <p className="text-maps-body">© 2026 MAPS Asesores. Todos los derechos reservados.</p>
            <p className="flex items-center gap-2">
              Desarrollado por
              <img
                src="/kondor.webp"
                alt="Kondor"
                className="h-6 w-auto object-contain"
              />
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
