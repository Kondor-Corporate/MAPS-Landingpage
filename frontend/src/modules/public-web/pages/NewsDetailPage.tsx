import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { NewsArticleEditorial } from '@/modules/public-web/components/NewsArticleEditorial';
import { NewsImage } from '@/shared/components/NewsImage';
import { usePublicNews } from '@/shared/hooks/usePublicNews';
import { usePublicNewsBySlug } from '@/shared/hooks/usePublicNewsBySlug';
import type { NewsItem } from '@/shared/types/news';

const RELATED_POOL_LIMIT = 7;
const SIDEBAR_LIMIT = 3;
const MORE_LIMIT = 3;

function TopBar({ title }: { title?: string }) {
  return (
    <div className="border-b border-maps-border bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-7 py-[11px]">
        <Link
          to="/noticias"
          className="inline-flex shrink-0 items-center gap-2 text-[13.5px] font-semibold text-maps-heading"
        >
          <span aria-hidden className="text-[15px] leading-none">
            ←
          </span>
          Volver a noticias
        </Link>

        {title ? (
          <nav aria-label="Ruta de navegación" className="flex flex-wrap gap-[7px] text-[12.5px] text-maps-muted-soft">
            <Link to="/#noticias" className="text-maps-muted-soft hover:text-maps-brand-hover">
              Inicio
            </Link>
            <span>/</span>
            <Link to="/noticias" className="text-maps-muted-soft hover:text-maps-brand-hover">
              Noticias
            </Link>
            <span>/</span>
            <span className="text-maps-border">{title}</span>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function DetailLoading() {
  return (
    <div className="mx-auto max-w-[1200px] animate-pulse px-7 py-12" aria-busy="true">
      <div className="h-4 w-32 rounded bg-maps-surface" />
      <div className="mt-6 h-10 w-3/4 rounded bg-maps-surface" />
      <div className="mt-4 h-4 w-1/2 rounded bg-maps-surface" />
      <div className="mt-10 h-[420px] w-full rounded bg-maps-surface" />
    </div>
  );
}

function SidebarItem({ item }: { item: NewsItem }) {
  return (
    <Link
      to={`/noticias/${item.slug}`}
      className="flex items-start gap-3.5 border-b border-maps-border py-[18px] text-maps-heading first:pt-0"
    >
      <NewsImage
        src={item.imageUrl}
        gradient={item.imageGradient}
        className="h-14 w-[76px] shrink-0"
        iconSize={14}
      />
      <div className="min-w-0">
        <p className="mb-[5px] text-[10.5px] font-bold uppercase tracking-[0.12em] text-maps-brand-hover">
          {item.category}
        </p>
        <p className="mb-1.5 font-serif text-[15.5px] font-semibold leading-[1.3] tracking-[-0.01em]">
          {item.title}
        </p>
        <p className="text-xs text-maps-muted-soft">{item.publishedAtLabel || item.date}</p>
      </div>
    </Link>
  );
}

function RelatedCard({ item }: { item: NewsItem }) {
  return (
    <Link to={`/noticias/${item.slug}`} className="block text-maps-heading">
      <NewsImage
        src={item.imageUrl}
        gradient={item.imageGradient}
        className="mb-3.5 aspect-video w-full"
        iconSize={20}
      />
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-maps-brand-hover">
        {item.category}
      </p>
      <p className="mb-2 font-serif text-[17px] font-semibold leading-[1.28] tracking-[-0.012em] sm:text-[20px]">
        {item.title}
      </p>
      <p className="text-[12.5px] text-maps-muted-soft">{item.publishedAtLabel || item.date}</p>
    </Link>
  );
}

export function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { newsItem, loading, error, notFound, refetch } = usePublicNewsBySlug(slug);
  const { news: relatedPool } = usePublicNews(RELATED_POOL_LIMIT);

  const related = useMemo(
    () => relatedPool.filter((item) => item.slug !== newsItem?.slug),
    [relatedPool, newsItem?.slug],
  );
  const sidebarItems = related.slice(0, SIDEBAR_LIMIT);
  const moreItems = related.slice(SIDEBAR_LIMIT, SIDEBAR_LIMIT + MORE_LIMIT);

  return (
    <div className="bg-white">
      <TopBar title={newsItem?.title} />

      {loading ? <DetailLoading /> : null}

      {!loading && (notFound || (!error && !newsItem)) ? (
        <div className="mx-auto max-w-[1200px] px-7 py-16 text-center">
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
        <div role="alert" className="mx-auto max-w-[1200px] px-7 py-16">
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
        <>
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-x-[clamp(40px,5vw,72px)] gap-y-10 px-7 py-[clamp(32px,5vw,64px)] pb-[clamp(48px,6vw,88px)]">
            <NewsArticleEditorial item={newsItem} />

            {sidebarItems.length > 0 ? (
              <aside className="min-w-0 flex-1 basis-[280px] sm:sticky sm:top-7 sm:max-w-[340px]">
                <p className="mb-1.5 border-b-2 border-maps-heading pb-3 text-[11.5px] font-bold uppercase tracking-[0.14em] text-maps-heading">
                  Otras noticias
                </p>
                {sidebarItems.map((item) => (
                  <SidebarItem key={item.slug ?? item.title} item={item} />
                ))}
                <Link
                  to="/noticias"
                  className="mt-[18px] inline-block text-[13.5px] font-semibold text-maps-heading hover:text-maps-brand-hover"
                >
                  Ver todas las noticias →
                </Link>
              </aside>
            ) : null}
          </div>

          {moreItems.length > 0 ? (
            <section className="border-t border-maps-border bg-white">
              <div className="mx-auto max-w-[1200px] px-7 py-[clamp(40px,5vw,64px)] pb-[clamp(56px,6vw,80px)]">
                <div className="mb-7 flex flex-wrap items-baseline justify-between gap-4">
                  <h2 className="font-serif text-[22px] font-bold tracking-[-0.015em] text-maps-heading sm:text-[28px]">
                    También puede interesarte
                  </h2>
                  <Link
                    to="/noticias"
                    className="text-[13.5px] font-semibold text-maps-heading hover:text-maps-brand-hover"
                  >
                    Todas las noticias →
                  </Link>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-x-[clamp(24px,3vw,40px)] gap-y-10">
                  {moreItems.map((item) => (
                    <RelatedCard key={item.slug ?? item.title} item={item} />
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
