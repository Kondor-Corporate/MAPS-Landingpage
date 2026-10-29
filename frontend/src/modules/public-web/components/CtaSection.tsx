export function CtaSection() {
  return (
    <section
      id="encontra-tu-asesor"
      className="bg-gradient-to-br from-maps-brand to-maps-brand-hover px-4 py-[clamp(2.75rem,7vw,6rem)] text-white sm:px-6 lg:px-10"
    >
      <div className="mx-auto flex max-w-[948px] flex-col items-center gap-5 text-center sm:gap-8">
        <h2 className="text-[clamp(1.6rem,5vw,2.5rem)] font-bold leading-[1.15] tracking-[-0.6px] lg:leading-[48px]">
          Elegí cómo querés que te acompañemos
        </h2>
        <p className="max-w-[872px] text-[clamp(1rem,2.5vw,1.125rem)] leading-relaxed text-white/85">
          Buscá a tu asesor, conocé su propuesta y contactalo directamente. La elección es tuya. <br /> El compromiso es nuestro.
        </p>
        <a
          href="#mapa"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-7 text-base font-bold text-maps-brand shadow-cta transition-transform hover:-translate-y-0.5 sm:h-16 sm:min-w-[244px] sm:px-8 sm:text-lg"
        >
          Encontrá tu asesor
        </a>
      </div>
    </section>
  );
}
