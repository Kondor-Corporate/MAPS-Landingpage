export function CtaSection() {
  return (
    <section
      id="encontra-tu-asesor"
      className="bg-gradient-to-br from-maps-brand to-maps-brand-hover px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-24 text-white"
    >
      <div className="mx-auto flex max-w-[948px] flex-col items-center gap-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold leading-tight lg:leading-[48px] tracking-[-0.6px]">
          Encontrá el asesor indicado para vos
        </h2>
        <p className="max-w-[672px] text-lg leading-[28px] text-white/85">
          Buscá asesores MAPS cerca tuyo, conocé sus perfiles y contactalos directamente
          a través de sus datos disponibles.
        </p>
        <a
          href="#mapa"
          className="inline-flex h-16 min-w-[244px] items-center justify-center rounded-xl bg-white px-8 text-lg font-bold text-maps-brand shadow-cta transition-transform hover:-translate-y-0.5"
        >
          Encontrá tu asesor
        </a>
      </div>
    </section>
  );
}
