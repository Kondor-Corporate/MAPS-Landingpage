import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PublicNewsCard } from '@/modules/public-web/components/PublicNewsCard';
import { usePublicNews } from '@/shared/hooks/usePublicNews';
import { useNewsModalStore } from '@/shared/store/newsModalStore';
import type { NewsItem } from '@/shared/types/news';

const PUBLIC_LIST_LIMIT = 20;

function NewsListSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3"
      aria-label="Cargando noticias"
      aria-busy="true"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl bg-white shadow-card animate-pulse">
          <div className="h-[195px] bg-maps-surface" />
          <div className="space-y-4 p-6">
            <div className="h-4 w-28 rounded bg-maps-surface" />
            <div className="h-6 rounded bg-maps-surface" />
            <div className="h-6 w-3/4 rounded bg-maps-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewsListPage() {
  // MVP: el endpoint público ya ordena por fecha y admite hasta 20 filas.
  // Deuda: incorporar paginación visible cuando el volumen editorial la requiera.
  const { news, loading, error, refetch } = usePublicNews(PUBLIC_LIST_LIMIT);
  const openModal = useNewsModalStore((state) => state.openModal);

  const handleOpen = (item: NewsItem) => openModal(item, news);

  return (
    <div className="bg-maps-surface px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-6 lg:px-10 lg:pb-12 lg:pt-8">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-8 flex flex-col gap-3 sm:flex-row-reverse sm:items-start sm:justify-between">
          <Link
            to="/#noticias"
            className="-mt-2 inline-flex w-fit shrink-0 self-end items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-maps-brand transition-colors hover:text-maps-brand-hover focus:outline-none focus:ring-2 focus:ring-maps-brand/40 focus:ring-offset-2"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver al inicio
          </Link>
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-maps-brand">Actualidad</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-maps-heading sm:text-4xl">
              Noticias
            </h1>
            <p className="mt-2 text-base leading-7 text-maps-muted">
              Novedades, comunicados e información pública de MAPS.
            </p>
          </div>
        </header>

        {loading ? <NewsListSkeleton /> : null}

        {!loading && error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-6 shadow-card">
            <p className="font-semibold text-maps-heading">No pudimos cargar las noticias.</p>
            <p className="mt-1 text-sm text-maps-muted">Intentá nuevamente en unos instantes.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 rounded-lg bg-maps-brand px-4 py-2 text-sm font-bold text-white hover:bg-maps-brand-hover"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!loading && !error && news.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-maps-border bg-white px-6 py-14 text-center shadow-card">
            <p className="font-semibold text-maps-heading">Todavía no hay noticias publicadas.</p>
            <p className="mt-2 text-sm text-maps-muted">Volvé más adelante para conocer novedades.</p>
          </div>
        ) : null}

        {!loading && !error && news.length > 0 ? (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
              <PublicNewsCard key={item.slug ?? item.title} item={item} onOpen={handleOpen} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
