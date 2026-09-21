import { Link } from 'react-router-dom';
import heroBg from '@/assets/images/hero-bg.webp';

export function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative flex w-full min-h-[440px] flex-col justify-center overflow-hidden bg-white pt-4 scroll-mt-[60px] sm:min-h-[520px] lg:min-h-[560px] lg:scroll-mt-[70px]"
    >
      <img
        src={heroBg}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
      />
      <div aria-hidden className="absolute inset-0 bg-hero-gradient" />


      <div className="relative z-10 mx-auto w-full max-w-[1236px] px-6 py-8 sm:px-10 sm:py-12 lg:px-16">
        <div className="flex max-w-[640px] flex-col gap-4 sm:gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-maps-brand/30 bg-maps-brand/20 px-3 py-[5px] backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-maps-brand" />
            <span className="text-[12px] font-bold uppercase tracking-[0.3px] text-white">
              Asesores de seguros
            </span>
          </span>

          <h1 className="text-[clamp(1.875rem,6vw,4.0625rem)] font-extrabold leading-[1.1] tracking-[-1px] text-white lg:leading-[66px] lg:tracking-[-1.98px]">
            El compromiso de asesorar está en nuestro ADN
          </h1>

          <p className="max-w-[640px] text-[15px] leading-[23px] text-[#e5e7eb] sm:text-[18px] sm:leading-[28px]">
            Hace 10 años elegimos una forma diferente de gestionar seguros: asesorar,
            acompañar y construir confianza. En MAPS, cada persona y cada familia
            encuentra mucho más que una póliza; encuentra un asesor respaldado por
            una organización profesional.
          </p>

          <div className="flex flex-wrap gap-3 pt-1 sm:gap-4 sm:pt-2">
            <a
              href="#mapa"
              className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-lg bg-maps-brand px-6 text-[15px] font-bold text-white shadow-cta transition-colors hover:bg-maps-brand-hover sm:h-12 sm:min-w-[160px] sm:text-base"
            >
              Encontrá tu Asesor
            </a>
            <Link
              to="/login"
              className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 text-[15px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:h-12 sm:min-w-[160px] sm:text-base"
            >
              Acceso Productores
            </Link>
          </div>

          <p className="mt-2 border-t border-white/10 pt-4 text-sm text-white/70 sm:mt-4 sm:pt-6">
            Perfiles públicos y datos de contacto en un solo lugar.
          </p>
        </div>
      </div>
    </section>
  );
}
