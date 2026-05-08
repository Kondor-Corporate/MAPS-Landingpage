export function CtaSection() {
  return (
    <section
      id="contacto"
      className="bg-gradient-to-br from-maps-brand to-maps-brand-hover px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-24 text-white"
    >
      <div className="mx-auto flex max-w-[948px] flex-col items-center gap-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold leading-tight lg:leading-[48px] tracking-[-0.6px]">
          ¿Listo para asegurar tu futuro?
        </h2>
        <p className="max-w-[672px] text-lg leading-[28px] text-white/85">
          Conectate con un asesor MAPS y recibí orientación personalizada
          para proteger lo que más te importa, hoy mismo.
        </p>
        <a
          href="/#contacto"
          className="inline-flex h-16 min-w-[244px] items-center justify-center rounded-xl bg-white px-8 text-lg font-bold text-maps-brand shadow-cta transition-transform hover:-translate-y-0.5"
        >
          Contactanos
        </a>
      </div>
    </section>
  );
}
