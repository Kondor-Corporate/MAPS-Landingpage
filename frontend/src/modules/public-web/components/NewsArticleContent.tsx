import { useState } from 'react';
import { FaClock } from 'react-icons/fa';
import { NewsBody } from '@/shared/components/NewsBody';
import { NewsImage } from '@/shared/components/NewsImage';
import { estimateReadingMinutes } from '@/shared/lib/mapPublicNews';
import type { NewsItem } from '@/shared/types/news';
import { NewsImageCarousel } from './NewsImageCarousel';
import { NewsShareActions } from './NewsShareActions';

type NewsArticleContentProps = {
  item: NewsItem;
  showShare?: boolean;
};

export function NewsArticleContent({ item, showShare = true }: NewsArticleContentProps) {
  const body = item.content?.trim() || item.description?.trim() || '';
  const readingMinutes = estimateReadingMinutes(body.replace(/<[^>]+>/g, ' '));
  const galeria = item.galeria ?? [];
  // Alto del hero: por defecto un aspect-ratio aproximado (misma sensación que el
  // frame fijo anterior); en cuanto se conoce la proporción real de la imagen
  // (`onImageLoad`), el frame se ajusta para mostrarla completa (`object-contain`).
  const [heroRatio, setHeroRatio] = useState<number | null>(null);
  const heroImage = item.imageUrl?.trim();

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div
        className={`relative w-full overflow-hidden bg-maps-heading transition-[height] duration-300 ease-out min-h-[200px] max-h-[45dvh] sm:min-h-[320px] sm:max-h-[60dvh] ${
          heroRatio ? '' : 'aspect-[2/1] sm:aspect-[21/9]'
        }`}
        style={heroRatio ? { aspectRatio: heroRatio } : undefined}
      >
        {heroImage ? (
          // Relleno decorativo: la misma foto, ampliada y con blur, para que las
          // imágenes verticales/angostas no dejen franjas negras a los costados
          // del recorte `object-contain` de la capa principal.
          <img
            src={heroImage}
            alt=""
            aria-hidden
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
          />
        ) : null}
        {heroImage ? <div className="absolute inset-0 bg-black/25" /> : null}
        <NewsImage
          src={item.imageUrl}
          gradient={item.imageGradient}
          className="absolute inset-0 h-full w-full"
          imageClassName="h-full w-full object-contain"
          showIcon={false}
          onImageLoad={(event) => {
            const img = event.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              setHeroRatio(img.naturalWidth / img.naturalHeight);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
          <div className="mb-2.5 flex flex-wrap items-center gap-2 sm:mb-3">
            <span className="inline-flex items-center rounded-full bg-maps-brand px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
              {item.category}
            </span>
            {body ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-medium text-maps-heading">
                <FaClock size={10} aria-hidden />
                {readingMinutes} min lectura
              </span>
            ) : null}
          </div>
          <h1 className="max-w-4xl text-[clamp(1.35rem,4.5vw,2.25rem)] font-bold leading-tight text-white drop-shadow-sm sm:text-4xl">
            {item.title}
          </h1>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-8 sm:py-8">
        {item.publishedAtLabel ? (
          <p className="mb-4 text-sm text-maps-muted sm:mb-6">
            Publicado el <time dateTime={item.publishedAt}>{item.publishedAtLabel}</time>
          </p>
        ) : null}

        <NewsBody
          content={body}
          className="text-[15px] leading-7 text-maps-body sm:text-base sm:leading-8"
          emptyLabel="Esta noticia no tiene contenido disponible."
        />

        {galeria.length > 0 ? <NewsImageCarousel images={galeria} /> : null}

        {showShare ? (
          <div className="mt-6 border-t border-maps-border pt-5 sm:mt-8 sm:pt-6">
            <NewsShareActions slug={item.slug} title={item.title} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
