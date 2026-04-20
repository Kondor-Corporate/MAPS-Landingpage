import type { ReactNode } from 'react';

const LOGO_SRC =
  'https://www.figma.com/api/mcp/asset/dd0ee30a-680d-4dcf-a03d-1db8c84e6ccf';

type AuthLayoutProps = {
  children: ReactNode;
};

/** Pantalla dividida: marca (izquierda) + formulario (derecha). Mobile-first. */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white font-sans lg:flex-row">
      <aside
        className="relative flex shrink-0 flex-col justify-between bg-gradient-to-br from-[#2DD4BF] via-[#3B82F6] to-[#1D4ED8] px-6 py-8 text-white lg:w-1/2 lg:min-h-screen lg:px-12 lg:py-12"
        aria-label="Marca MAPS Asesores"
      >
        <header className="flex items-center gap-3">
          <div className="flex h-[4.125rem] w-[5.375rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 shadow-lg shadow-black/10 ring-1 ring-white/20 backdrop-blur-sm">
            <img
              src={LOGO_SRC}
              alt=""
              className="h-12 w-auto max-w-[5.25rem] object-contain drop-shadow-sm"
              width={85}
              height={48}
            />
          </div>
          <span className="text-lg font-bold tracking-tight sm:text-xl lg:text-[1.25rem] lg:leading-7">
            MAPS Asesores
          </span>
        </header>

        <div className="my-8 max-w-[34rem] lg:my-0 lg:flex lg:flex-1 lg:flex-col lg:justify-center">
          <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] sm:text-4xl lg:text-[3.75rem] lg:leading-[4.125rem] lg:tracking-[-0.03em]">
            Seguros con Respaldo y Confianza
          </h1>
        </div>

        <p className="text-sm font-normal leading-5 text-white/80 lg:text-sm">
          © 2026 MAPS Asesores. Todos los derechos reservados.
        </p>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col justify-center bg-white px-6 py-10 lg:w-1/2 lg:px-8 lg:py-12">
        <div className="mx-auto w-full max-w-[28rem]">{children}</div>
      </main>
    </div>
  );
}
