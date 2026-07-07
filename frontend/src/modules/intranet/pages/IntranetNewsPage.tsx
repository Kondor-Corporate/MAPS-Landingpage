import { RecentNewsCard } from '@/shared/components/RecentNewsCard';
import { useIntranetNews } from '@/shared/hooks/useIntranetNews';
import { useNewsModalStore } from '@/shared/store/newsModalStore';
import type { NewsItem } from '@/shared/types/news';

const LIST_LIMIT = 20;

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
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
    </div>
  );
}

export function IntranetNewsPage() {
  const openModal = useNewsModalStore((state) => state.openModal);
  const { news, loading, error, refetch } = useIntranetNews(LIST_LIMIT);

  function handleOpen(item: NewsItem) {
    openModal(item, news);
  }

  return (
    <div className="flex flex-col gap-8 px-8 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-maps-heading">Novedades internas</h1>
        <p className="text-sm text-maps-muted">
          Comunicados y novedades publicadas para el equipo de productores.
        </p>
      </header>

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

      {loading ? <LoadingCards /> : null}

      {!loading && !error && news.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-maps-border bg-white px-6 py-14 text-center shadow-card">
          <p className="text-sm font-medium text-maps-heading">No hay novedades internas publicadas.</p>
          <p className="mt-1 text-xs text-maps-muted">
            Cuando se publiquen comunicados para productores, los verás acá.
          </p>
        </div>
      ) : null}

      {!loading && !error && news.length > 0 ? (
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
    </div>
  );
}
