import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Monitor, MapPin, Headphones, UserRound, ArrowRight } from 'lucide-react';
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

const footerHighlights = [
  { icon: Monitor, label: 'Gestión Digital' },
  { icon: MapPin, label: 'Cobertura Nacional' },
  { icon: Headphones, label: 'Atención Personalizada' },
];

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
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

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
              aria-controls="public-mobile-nav"
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
          <div
            id="public-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="lg:hidden border-t border-maps-border bg-white px-4 py-3"
          >
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

      {isMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 top-[70px] z-30 bg-black/40 lg:hidden"
          aria-label="Cerrar menú de navegación"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <main className="flex-1">{children}</main>
      <NewsDetailModal />

      <footer className="relative overflow-hidden bg-white px-4 pb-8 pt-14 text-maps-body sm:px-6 lg:px-10 lg:pt-16">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-maps-brand/[0.06] blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-maps-brand/[0.05] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-[1188px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_1fr] lg:gap-8">
            <div className="flex flex-col gap-5 lg:pr-8">
              <div className="flex items-center gap-3">
                <img
                  src={brandLogoSrc}
                  alt=""
                  className="h-11 w-auto max-h-11 shrink-0 object-contain"
                />
                <span className="text-2xl font-bold tracking-[-0.3px] text-maps-heading">
                  MAPSASESORES
                </span>
              </div>

              <p className="max-w-[340px] text-sm leading-[22px] text-maps-muted">
                Un espacio para conocer a nuestros asesores y acceder a información de interés.
              </p>

              <span aria-hidden className="h-[3px] w-10 rounded-full bg-maps-brand" />

              <ul className="flex flex-wrap gap-x-6 gap-y-4">
                {footerHighlights.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2">
                    <Icon className="h-5 w-5 shrink-0 text-maps-brand" aria-hidden />
                    <span className="text-xs leading-[16px] text-maps-muted">{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-4 border-maps-border lg:border-l lg:pl-8">
              <h3 className="text-base font-semibold text-maps-heading">Navegación</h3>
              <nav aria-label="Footer">
                <ul className="flex flex-col gap-3 text-sm">
                  {navLinks.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-maps-muted transition-colors hover:text-maps-brand focus-visible:text-maps-brand focus-visible:outline-none"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="flex flex-col gap-4 border-maps-border lg:border-l lg:pl-8">
              <h3 className="text-base font-semibold text-maps-heading">Acceso Productores</h3>
              <p className="text-sm leading-[22px] text-maps-muted">
                Si sos productor, accedé a tu cuenta para gestionar tu información.
              </p>
              <Link
                to="/login"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-maps-brand px-5 text-sm font-bold text-maps-heading transition-colors hover:bg-maps-brand hover:text-white hover:shadow-[0_0_24px_rgba(0,164,192,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maps-brand/50 focus-visible:ring-offset-2 sm:w-fit"
              >
                <UserRound className="h-4 w-4 text-maps-brand transition-colors group-hover:text-white" aria-hidden />
                Acceso Productores
                <ArrowRight className="h-4 w-4 transition-colors" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-maps-border pt-6 text-sm text-maps-muted md:flex-row md:items-center">
            <p>© 2026 MAPS Asesores. Todos los derechos reservados.</p>
            <p className="flex items-center gap-2">
              Desarrollado por
              <img src="/kondor.webp" alt="Kondor" className="h-6 w-auto object-contain" />
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
