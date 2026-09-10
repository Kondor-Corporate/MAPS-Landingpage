export function LibraryHero() {
  return (
    <section className="relative w-full overflow-hidden bg-library-gradient px-8 pb-16 pt-20 text-center text-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
        <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm font-medium backdrop-blur-sm">
          Recursos para Productores
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Biblioteca Digital</h1>
        <p className="max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
          Accede y descarga todo el material comercial, folletos digitales y recursos actualizados
          para potenciar tu gestión de ventas.
        </p>
      </div>
    </section>
  );
}
