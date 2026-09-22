/**
 * Sección de noticias en la Home pública (`#noticias`).
 * Muestra previews desde API sin sacar al usuario de la landing.
 */
import { Link } from 'react-router-dom';
import { usePublicNews } from '@/shared/hooks/usePublicNews';
import { useNewsModalStore } from '@/shared/store/newsModalStore';
import type { NewsItem } from '@/shared/types/news';
import { PublicNewsCard } from '@/modules/public-web/components/PublicNewsCard';

const PREVIEW_LIMIT = 3; // Cantidad alineada al diseño de la sección Home.

function LoadingCards() {
  return (
    <>
      {Array.from({ length: PREVIEW_LIMIT }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card animate-pulse"
        >
          <div className="h-[168px] w-full bg-white/20 sm:h-[195px]" />
          <div className="flex flex-col gap-3 p-5 sm:p-6">
            <div className="h-3 w-24 rounded bg-white/20" />
            <div className="h-5 w-full rounded bg-white/20" />
            <div className="h-5 w-3/4 rounded bg-white/20" />
          </div>
        </div>
      ))}
    </>
  );
}

export function NewsPreviewSection() {
  const { news, loading, error, refetch } = usePublicNews(PREVIEW_LIMIT);
  const openModal = useNewsModalStore((state) => state.openModal);

  const handleOpen = (item: NewsItem) => openModal(item, news);

  return (
    <section
      id="noticias"
      className="scroll-mt-[60px] bg-maps-brand px-4 py-[clamp(2.75rem,7vw,6rem)] sm:px-6 lg:scroll-mt-[70px] lg:px-10"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-8 rounded-full bg-white" />
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
                Actualidad
              </span>
            </div>
            <h2 className="text-[clamp(1.5rem,4.5vw,2.25rem)] font-bold leading-[1.15] tracking-[-0.9px] text-white">
              Últimas Noticias y Novedades
            </h2>
          </div>
          <Link
            to="/noticias"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/40 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Ver todas las noticias
            <span aria-hidden>→</span>
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-sm text-white">
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 sm:gap-8">
            <LoadingCards />
          </div>
        ) : null}

        {!error && !loading && news.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/30 bg-white/10 px-6 py-10 text-center">
            <p className="text-sm font-medium text-white">Todavía no hay noticias publicadas.</p>
            <p className="mt-1 text-xs text-white/70">
              Próximamente vas a encontrar acá las últimas novedades de MAPS.
            </p>
          </div>
        ) : null}

        {!error && !loading && news.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 sm:gap-8">
            {news.map((item) => (
              <PublicNewsCard key={item.slug ?? item.title} item={item} onOpen={handleOpen} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
