import { Link } from 'react-router-dom';
import { RecentNewsCard } from '@/shared/components/RecentNewsCard';
import { NOVEDADES_INTRANET_PATH } from '@/shared/constants/dashboardLinks';
import { useIntranetNews } from '@/shared/hooks/useIntranetNews';
import { useNewsModalStore } from '@/shared/store/newsModalStore';
import type { NewsItem } from '@/shared/types/news';

const PREVIEW_LIMIT = 3;

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

type Props = {
  limit?: number;
  viewAllHref?: string;
};

function LoadingCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse flex-col overflow-hidden rounded-2xl bg-white shadow-card"
        >
          <div className="h-[195px] w-full bg-maps-surface" />
          <div className="flex flex-col gap-3 p-6">
            <div className="h-3 w-24 rounded bg-maps-surface" />
            <div className="h-5 w-full rounded bg-maps-surface" />
            <div className="h-5 w-3/4 rounded bg-maps-surface" />
          </div>
        </div>
      ))}
    </>
  );
}

export function RecentNewsGrid({
  limit = PREVIEW_LIMIT,
  viewAllHref = NOVEDADES_INTRANET_PATH,
}: Props) {
  const openModal = useNewsModalStore((state) => state.openModal);
  const { news, loading, error, refetch } = useIntranetNews(limit);

  function handleOpen(item: NewsItem) {
    openModal(item, news);
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold text-maps-heading">Comunicados Recientes</h2>
        {viewAllHref ? (
          <Link
            to={viewAllHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-maps-brand hover:text-maps-brand-hover"
          >
            Ver todo en novedades
            <ArrowIcon />
          </Link>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 font-semibold underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!error && loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <LoadingCards count={limit} />
        </div>
      ) : null}

      {!error && !loading && news.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-maps-border bg-white px-6 py-10 text-center shadow-card">
          <p className="text-sm font-medium text-maps-heading">No hay comunicados internos publicados.</p>
          <p className="mt-1 text-xs text-maps-muted">
            Cuando haya novedades para productores, aparecerán acá.
          </p>
        </div>
      ) : null}

      {!error && !loading && news.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {news.map((item) => (
            <RecentNewsCard
              key={item.slug ?? item.title}
              item={item}
              onClick={handleOpen}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
