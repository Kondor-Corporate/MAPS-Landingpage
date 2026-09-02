import { FaClock } from 'react-icons/fa';
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
  const readingMinutes = estimateReadingMinutes(body);
  const galeria = item.galeria ?? [];

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="relative h-[260px] w-full overflow-hidden sm:h-[360px]">
        <NewsImage
          src={item.imageUrl}
          gradient={item.imageGradient}
          className="absolute inset-0 h-full w-full"
          showIcon={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
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
          <h1 className="max-w-4xl text-2xl font-bold leading-tight text-white drop-shadow-sm sm:text-4xl">
            {item.title}
          </h1>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        {item.publishedAtLabel ? (
          <p className="mb-6 text-sm text-maps-muted">
            Publicado el <time dateTime={item.publishedAt}>{item.publishedAtLabel}</time>
          </p>
        ) : null}

        <div className="whitespace-pre-line text-[15px] leading-8 text-maps-body sm:text-base">
          {body || 'Esta noticia no tiene contenido disponible.'}
        </div>

        {galeria.length > 0 ? <NewsImageCarousel images={galeria} /> : null}

        {showShare ? (
          <div className="mt-8 border-t border-maps-border pt-6">
            <NewsShareActions slug={item.slug} title={item.title} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
