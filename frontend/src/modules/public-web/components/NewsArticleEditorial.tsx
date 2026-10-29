/**
 * Cuerpo editorial de la página pública de detalle de una noticia.
 * Fiel a docs/Noticia MAPS.html: categoría, título, bajada, metadata,
 * carrusel de imágenes completas, cuerpo del artículo y compartir.
 */
import { NewsBody } from '@/shared/components/NewsBody';
import { estimateReadingMinutes } from '@/shared/lib/mapPublicNews';
import type { NewsItem } from '@/shared/types/news';
import { NewsArticleCarousel } from './NewsArticleCarousel';
import { NewsShareActions } from './NewsShareActions';

type Props = {
  item: NewsItem;
};

export function NewsArticleEditorial({ item }: Props) {
  const body = item.content?.trim() || item.description?.trim() || '';
  // Para el estimado de lectura, contamos texto sin marcas HTML.
  const readingMinutes = estimateReadingMinutes(body.replace(/<[^>]+>/g, ' '));
  const images = [item.imageUrl, ...(item.galeria ?? [])].filter(
    (url): url is string => Boolean(url?.trim()),
  );

  return (
    <article className="min-w-0 flex-1 basis-[640px]">
      <div className="mb-4 flex items-center gap-3.5 sm:mb-5">
        <span className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-maps-brand-hover">
          {item.category}
        </span>
        <span className="h-px max-w-[120px] flex-1 bg-maps-border" />
      </div>

      <h1 className="mb-4 font-serif text-[clamp(1.75rem,6vw,3.625rem)] font-bold leading-[1.1] tracking-[-0.022em] text-maps-heading sm:mb-[22px] sm:leading-[1.08]">
        {item.title}
      </h1>

      {item.description ? (
        <p className="mb-5 max-w-[32em] font-serif text-[17px] leading-[1.5] text-maps-body sm:mb-[26px] sm:text-[23px]">
          {item.description}
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-3 border-y border-maps-border py-3 text-[13px] text-maps-muted-soft sm:mb-10 sm:py-4">
        {item.publishedAtLabel ? (
          <span>
            Publicado el <time dateTime={item.publishedAt}>{item.publishedAtLabel}</time>
          </span>
        ) : null}
        {item.publishedAtLabel && body ? <span className="text-maps-border">·</span> : null}
        {body ? <span>{readingMinutes} min de lectura</span> : null}
      </div>

      {images.length > 0 ? (
        <NewsArticleCarousel images={images} gradient={item.imageGradient} />
      ) : null}

      <NewsBody
        content={body}
        className="max-w-[720px] text-[16px] leading-[1.7] text-maps-body sm:text-[19px] sm:leading-[1.75]"
        emptyLabel="Esta noticia no tiene contenido disponible."
      />

      <div className="mt-8 max-w-[720px] border-t border-maps-border pt-6 sm:mt-[52px] sm:pt-[26px]">
        <p className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-maps-muted-soft">
          Compartir esta noticia
        </p>
        <NewsShareActions slug={item.slug} title={item.title} variant="editorial" />
      </div>
    </article>
  );
}
