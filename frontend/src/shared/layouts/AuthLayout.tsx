import type { ReactNode } from 'react';

const LOGO_SRC = '/mapsLogo.webp';

type AuthLayoutProps = {
  children: ReactNode;
};

/** Pantalla dividida: marca (izquierda) + formulario (derecha). Mobile-first. */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white font-sans lg:flex-row">
      <aside
        className="relative flex shrink-0 flex-col justify-between overflow-hidden px-6 py-8 text-white lg:w-1/2 lg:min-h-screen lg:px-12 lg:py-10"
        style={{
          background:
            'radial-gradient(120% 140% at 8% 0%, #2DD4BF 0%, rgba(45,212,191,0) 42%), radial-gradient(140% 120% at 100% 100%, #1D4ED8 0%, rgba(29,78,216,0) 55%), linear-gradient(135deg, #22C7B8 0%, #2B8FE0 45%, #1E4FD6 100%)',
        }}
        aria-label="Marca MAPS Asesores"
      >
        {/* Curvas sutiles */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]"
          viewBox="0 0 800 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M-40 60 C 180 160, 260 -20, 480 90 S 760 260, 900 160"
            stroke="white"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M-60 780 C 160 700, 320 900, 560 800 S 820 700, 920 820"
            stroke="white"
            strokeWidth="2"
            fill="none"
          />
        </svg>

        {/* "M" decorativa translúcida (asset del proyecto), anclada abajo */}
        <img
          src="/m-traslucida.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-10 z-0 w-[115%] max-w-[42rem] select-none opacity-30 lg:-bottom-24 lg:-right-16 lg:w-[100%]"
        />

        <header className="relative flex items-center gap-3">
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

        <div className="relative my-8 max-w-[34rem] lg:my-0 lg:flex lg:flex-1 lg:flex-col lg:justify-center">
          <h1 className="text-4xl font-extrabold leading-[1.15] tracking-[-0.02em] sm:text-5xl lg:text-[4.5rem] lg:leading-[5.25rem] lg:tracking-[-0.03em]">
            Seguros con
            <br />
            Respaldo y
            <br />
            Confianza
          </h1>

          <span
            className="mt-5 block h-1 w-14 rounded-full bg-[#5EEAD4] lg:mt-6 lg:w-16"
            aria-hidden="true"
          />

          <p className="mt-5 max-w-[24rem] text-base leading-relaxed text-white/90 lg:mt-6 lg:text-lg">
            Accedé a tu portal para gestionar tu información de forma simple y segura.
          </p>
        </div>

        <p className="relative text-xs font-normal leading-5 text-white/80 lg:text-sm">
          © 2026 MAPS Asesores. Todos los derechos reservados.
        </p>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col justify-center bg-white px-6 py-10 lg:w-1/2 lg:px-8 lg:py-12">
        <div className="mx-auto w-full max-w-[28rem]">{children}</div>
      </main>
    </div>
  );
}
