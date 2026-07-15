/** Card reutilizable de noticia para grids de Home, intranet y dashboards. */
import type { NewsItem } from '@/shared/types/news';
import { NewsImage } from '@/shared/components/NewsImage';

const ArrowIcon = () => (
  <svg
    width="6"
    height="9"
    viewBox="0 0 6 9"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M1 1L5 4.5L1 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type RecentNewsCardProps = {
  item: NewsItem;
  onClick: (item: NewsItem) => void;
  /** `compact` reduce imagen/padding para dashboards; listados usan `default`. */
  variant?: 'default' | 'compact';
};

export function RecentNewsCard({
  item,
  onClick,
  variant = 'default',
}: RecentNewsCardProps) {
  const isCompact = variant === 'compact';

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="flex h-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-card transition-transform hover:scale-[1.02] hover:shadow-floating"
    >
      <NewsImage
        src={item.imageUrl}
        gradient={item.imageGradient}
        className={
          isCompact ? 'h-[150px] w-full shrink-0' : 'h-[195px] w-full shrink-0'
        }
        iconSize={isCompact ? 20 : 22}
      />
      <div
        className={
          isCompact
            ? 'flex min-h-0 flex-1 flex-col gap-3 p-5'
            : 'flex flex-1 flex-col gap-4 p-6'
        }
      >
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-md bg-maps-brand-soft px-3 py-1 font-semibold text-maps-brand">
            {item.category}
          </span>
          <span className="text-maps-muted-soft">{item.date}</span>
        </div>
        <h3
          className={
            isCompact
              ? 'line-clamp-2 text-lg font-bold leading-snug text-maps-heading'
              : 'line-clamp-2 text-xl font-bold leading-[25px] text-maps-heading'
          }
        >
          {item.title}
        </h3>
        <span className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-maps-brand">
          Leer más
          <ArrowIcon />
        </span>
      </div>
    </button>
  );
}
