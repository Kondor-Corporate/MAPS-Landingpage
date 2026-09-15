/**
 * Carrusel editorial para la página pública de detalle de una noticia.
 * A diferencia de `NewsImageCarousel` (usado en el modal de vista previa),
 * nunca recorta la imagen: usa `object-contain` y un alto adaptable.
 * Fuente de verdad visual: docs/Noticia MAPS.html.
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NewsImage } from '@/shared/components/NewsImage';

type Props = {
  images: string[];
  gradient: string;
};

const DEFAULT_RATIO = 3 / 2;
const MOBILE_BREAKPOINT = 760;
const SWIPE_THRESHOLD = 40;

function useViewportWidth() {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
}

export function NewsArticleCarousel({ images, gradient }: Props) {
  const [active, setActive] = useState(0);
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const touchStartX = useRef<number | null>(null);
  const width = useViewportWidth();

  const total = images.length;
  const single = total <= 1;

  useEffect(() => {
    setActive(0);
    setRatios({});
  }, [images]);

  useEffect(() => {
    if (single) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setActive((i) => (i + 1) % total);
      if (event.key === 'ArrowLeft') setActive((i) => (i - 1 + total) % total);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [single, total]);

  if (total === 0) return null;

  function goTo(index: number) {
    setActive(((index % total) + total) % total);
  }

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD) goTo(active + (dx < 0 ? 1 : -1));
  }

  const mobile = width < MOBILE_BREAKPOINT;
  const activeRatio = ratios[active] ?? DEFAULT_RATIO;
  const frameHeight = mobile
    ? Math.round(
        Math.min(
          Math.max(240, width - 56 - 40) / activeRatio + 44,
          Math.max(260, (typeof window === 'undefined' ? 800 : window.innerHeight) * 0.82),
        ),
      )
    : Math.round(Math.min(620, Math.max(420, width * 0.44)));

  return (
    <figure className="mb-9 sm:mb-[52px]">
      <div
        className="relative w-full overflow-hidden rounded border border-maps-border bg-maps-surface transition-[height] duration-300 ease-out"
        style={{ height: `${frameHeight}px` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="absolute inset-0 flex items-center justify-center p-5 transition-opacity duration-[400ms] ease-in-out"
            style={{ opacity: index === active ? 1 : 0, pointerEvents: index === active ? 'auto' : 'none' }}
            aria-hidden={index !== active}
          >
            <NewsImage
              src={url}
              gradient={gradient}
              className="h-full max-h-full w-full max-w-full"
              imageClassName="h-full w-full object-contain"
              alt={`Imagen ${index + 1} de la noticia`}
              onImageLoad={(event) => {
                const img = event.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setRatios((prev) => ({ ...prev, [index]: img.naturalWidth / img.naturalHeight }));
                }
              }}
            />
          </div>
        ))}

        {!single ? (
          <div className="pointer-events-none absolute right-3.5 top-3.5 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-semibold text-maps-heading">
            {active + 1} / {total}
          </div>
        ) : null}

        {!single ? (
          <>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              aria-label="Imagen anterior"
              className="absolute left-3.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-maps-border bg-white/95 text-maps-heading transition-colors hover:border-maps-brand hover:text-maps-brand-hover"
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              aria-label="Imagen siguiente"
              className="absolute right-3.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-maps-border bg-white/95 text-maps-heading transition-colors hover:border-maps-brand hover:text-maps-brand-hover"
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          </>
        ) : null}
      </div>

      {!single ? (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {images.map((url, index) => (
            <button
              key={`dot-${url}-${index}`}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ir a la imagen ${index + 1}`}
              aria-current={index === active}
              className={`h-[7px] rounded-full transition-all duration-300 ${
                index === active ? 'w-[26px] bg-maps-brand' : 'w-[7px] bg-maps-border'
              }`}
            />
          ))}
        </div>
      ) : null}
    </figure>
  );
}
