import { NewsImage } from '@/shared/components/NewsImage';
import type { NewsItem } from '@/shared/types/news';

type PublicNewsCardProps = {
  item: NewsItem;
  onOpen: (item: NewsItem) => void;
};

export function PublicNewsCard({ item, onOpen }: PublicNewsCardProps) {
  return (
    <article className="h-full w-full">
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={`Vista previa de noticia: ${item.title}`}
        className="group flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-maps-brand"
      >
        <NewsImage
          src={item.imageUrl}
          gradient={item.imageGradient}
          cover={item.cover}
          className="h-[168px] w-full shrink-0 sm:h-[195px]"
          imageClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          iconSize={22}
        />
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-md bg-maps-brand-soft px-3 py-1 font-semibold text-maps-brand">
              {item.category}
            </span>
            <time dateTime={item.publishedAt} className="text-maps-muted-soft">
              {item.date}
            </time>
          </div>
          <h3 className="mt-3 line-clamp-2 min-h-[46px] text-lg font-bold leading-[1.25] text-maps-heading sm:mt-4 sm:min-h-[50px] sm:text-xl">
            {item.title}
          </h3>
          {/* La bajada queda equidistante entre título y "Leer más": el bloque flex-1
              la centra verticalmente, con la misma separación arriba y abajo. */}
          <div className="flex flex-1 items-center py-3 sm:py-4">
            <p
              className={`line-clamp-2 text-sm leading-6 text-maps-muted ${
                item.description ? '' : 'invisible'
              }`}
            >
              {item.description || 'placeholder'}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-maps-brand">
            Leer más
            <span aria-hidden>→</span>
          </span>
        </div>
      </button>
    </article>
  );
}
