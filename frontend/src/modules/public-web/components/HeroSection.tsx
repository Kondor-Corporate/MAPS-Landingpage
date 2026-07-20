import { Link } from 'react-router-dom';
import heroBg from '@/assets/images/hero-bg.png';

export function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative flex w-full min-h-[480px] flex-col justify-center overflow-hidden bg-white pt-4 sm:min-h-[520px] lg:min-h-[560px]"
    >
      <img
        src={heroBg}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden className="absolute inset-0 bg-hero-gradient" />


      <div className="relative z-10 mx-auto w-full max-w-[1236px] px-6 py-10 sm:px-10 lg:px-16">
        <div className="flex max-w-[640px] flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-maps-brand/30 bg-maps-brand/20 px-3 py-[5px] backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-maps-brand" />
            <span className="text-[12px] font-bold uppercase tracking-[0.3px] text-white">
              Asesores de seguros
            </span>
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-extrabold leading-tight lg:leading-[66px] tracking-[-1.5px] lg:tracking-[-1.98px] text-white">
            Encontrá asesoramiento
            <br />cerca tuyo
          </h1>

          <p className="max-w-[540px] text-base sm:text-[18px] leading-[26px] sm:leading-[28px] text-[#e5e7eb]">
            Conocé a los asesores que forman parte de MAPS, explorá sus perfiles y encontrá una
            opción según tu ubicación.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <a
              href="#mapa"
              className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-lg bg-maps-brand px-6 text-base font-bold text-white shadow-cta transition-colors hover:bg-maps-brand-hover"
            >
              Encontrá tu Asesor
            </a>
            <Link
              to="/login"
              className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 text-base font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Soy Productor
            </Link>
          </div>

          <p className="mt-4 border-t border-white/10 pt-6 text-sm text-white/70">
            Perfiles públicos y datos de contacto en un solo lugar.
          </p>
        </div>
      </div>
    </section>
  );
}
