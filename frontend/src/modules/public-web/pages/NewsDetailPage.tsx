import { Link, useParams } from 'react-router-dom';
import { NewsArticleContent } from '@/modules/public-web/components/NewsArticleContent';
import { usePublicNewsBySlug } from '@/shared/hooks/usePublicNewsBySlug';

function DetailLoading() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card animate-pulse" aria-busy="true">
      <div className="h-[260px] bg-maps-border sm:h-[360px]" />
      <div className="space-y-4 p-6 sm:p-8">
        <div className="h-4 w-40 rounded bg-maps-surface" />
        <div className="h-4 rounded bg-maps-surface" />
        <div className="h-4 rounded bg-maps-surface" />
        <div className="h-4 w-4/5 rounded bg-maps-surface" />
      </div>
    </div>
  );
}

export function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { newsItem, loading, error, notFound, refetch } = usePublicNewsBySlug(slug);

  return (
    <div className="bg-maps-surface px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <nav aria-label="Navegación de la noticia" className="mb-6 flex flex-wrap gap-3">
          <Link
            to="/noticias"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-bold text-maps-heading hover:bg-maps-surface"
          >
            <span aria-hidden>←</span>
            Volver a todas las noticias
          </Link>
          <Link
            to="/#noticias"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-maps-brand hover:bg-maps-brand-soft"
          >
            Volver al inicio
          </Link>
        </nav>

        {loading ? <DetailLoading /> : null}

        {!loading && (notFound || (!error && !newsItem)) ? (
          <div className="rounded-2xl border border-maps-border bg-white px-6 py-16 text-center shadow-card">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-maps-brand">Noticias</p>
            <h1 className="mt-3 text-3xl font-bold text-maps-heading">Noticia no encontrada</h1>
            <p className="mx-auto mt-3 max-w-lg text-maps-muted">
              El enlace puede ser incorrecto o la noticia ya no está publicada.
            </p>
            <Link
              to="/noticias"
              className="mt-6 inline-flex rounded-lg bg-maps-brand px-5 py-3 text-sm font-bold text-white hover:bg-maps-brand-hover"
            >
              Ver noticias publicadas
            </Link>
          </div>
        ) : null}

        {!loading && error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-6 shadow-card">
            <h1 className="text-xl font-bold text-maps-heading">No pudimos cargar esta noticia.</h1>
            <p className="mt-2 text-sm text-maps-muted">Intentá nuevamente en unos instantes.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 rounded-lg bg-maps-brand px-4 py-2 text-sm font-bold text-white hover:bg-maps-brand-hover"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!loading && !error && !notFound && newsItem ? (
          <NewsArticleContent item={newsItem} />
        ) : null}
      </div>
    </div>
  );
}
