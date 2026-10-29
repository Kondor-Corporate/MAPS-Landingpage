/**
 * Carrusel de imágenes de galería para la vista completa de una noticia (MAPS-019).
 * Construido sin dependencias: scroll-snap nativo + botones y dots.
 * Se renderiza solo cuando hay imágenes; con una sola imagen no muestra controles.
 */
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  images: string[];
};

export function NewsImageCarousel({ images }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (images.length === 0) return null;

  const single = images.length === 1;

  function scrollToIndex(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(index, images.length - 1));
    const child = track.children[clamped] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    setActive(clamped);
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActive(Math.max(0, Math.min(index, images.length - 1)));
  }

  return (
    <section className="mt-8" aria-label="Galería de imágenes de la noticia">
      <div className="relative overflow-hidden rounded-2xl bg-maps-surface">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex h-[220px] snap-x snap-mandatory overflow-x-auto scroll-smooth sm:h-[360px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((url, index) => (
            <div key={url} className="h-full w-full shrink-0 snap-start">
              <img
                src={url}
                alt={`Imagen ${index + 1} de la noticia`}
                className="h-full w-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
        </div>

        {!single ? (
          <>
            <button
              type="button"
              onClick={() => scrollToIndex(active - 1)}
              disabled={active === 0}
              className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-maps-heading shadow-card transition hover:bg-white disabled:opacity-40"
              aria-label="Imagen anterior"
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => scrollToIndex(active + 1)}
              disabled={active === images.length - 1}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-maps-heading shadow-card transition hover:bg-white disabled:opacity-40"
              aria-label="Imagen siguiente"
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>

            <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
              {images.map((url, index) => (
                <button
                  key={`dot-${url}`}
                  type="button"
                  onClick={() => scrollToIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === active ? 'w-6 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'
                  }`}
                  aria-label={`Ir a la imagen ${index + 1}`}
                  aria-current={index === active}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
