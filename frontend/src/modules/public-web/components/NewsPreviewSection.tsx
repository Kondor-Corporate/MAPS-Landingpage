/**
 * Sección de noticias en la Home pública (`#noticias`).
 * Muestra previews desde API y abre el modal de detalle al hacer click.
 */
import { useNewsModalStore } from '@/shared/store/newsModalStore';
import { usePublicNews } from '@/shared/hooks/usePublicNews';
import { NewsImage } from '@/shared/components/NewsImage';
import type { NewsItem } from '@/shared/types/news';

const PREVIEW_LIMIT = 3; // Cantidad alineada al diseño de la sección Home.

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

function NewsPreviewCard({
  item,
  onOpen,
}: {
  item: NewsItem;
  onOpen: (item: NewsItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex h-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-card transition-transform hover:scale-105 hover:shadow-lg"
    >
      <NewsImage
        src={item.imageUrl}
        gradient={item.imageGradient}
        className="h-[195px] w-full shrink-0"
        iconSize={22}
      />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-md bg-maps-brand-soft px-3 py-1 font-semibold text-maps-brand">
            {item.category}
          </span>
          <span className="text-maps-muted-soft">{item.date}</span>
        </div>
        <h3 className="line-clamp-2 text-xl font-bold leading-[25px] text-maps-heading">
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

function LoadingCards() {
  return (
    <>
      {Array.from({ length: PREVIEW_LIMIT }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card animate-pulse"
        >
          <div className="h-[195px] w-full bg-white/20" />
          <div className="flex flex-col gap-3 p-6">
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
  const openModal = useNewsModalStore((state) => state.openModal);
  const { news, loading, error, refetch } = usePublicNews(PREVIEW_LIMIT);

  function handleOpen(item: NewsItem) {
    openModal(item, news);
  }

  return (
    <section id="noticias" className="bg-maps-brand px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-8 rounded-full bg-white" />
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
              Actualidad
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold leading-tight lg:leading-10 tracking-[-0.9px] text-white">
            Últimas Noticias y Novedades
          </h2>
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
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <LoadingCards />
          </div>
        ) : null}

        {!error && !loading && news.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/30 bg-white/10 px-6 py-10 text-center">
            <p className="text-sm font-medium text-white">Todavía no hay noticias publicadas.</p>
            <p className="mt-1 text-xs text-white/70">
              Cuando publiques novedades públicas desde el admin, aparecerán acá.
            </p>
          </div>
        ) : null}

        {!error && !loading && news.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {news.map((item) => (
              <NewsPreviewCard key={item.slug ?? item.title} item={item} onOpen={handleOpen} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
