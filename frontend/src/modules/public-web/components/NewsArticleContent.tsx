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

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="relative h-[200px] w-full overflow-hidden sm:h-[360px]">
        <NewsImage
          src={item.imageUrl}
          gradient={item.imageGradient}
          className="absolute inset-0 h-full w-full"
          showIcon={false}
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
