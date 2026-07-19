/** Preview compartida entre superficies públicas e internas. */
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Modal } from '@/shared/components/Modal';
import { NewsImage } from '@/shared/components/NewsImage';
import { useNewsModalStore } from '@/shared/store/newsModalStore';
import type { NewsItem } from '@/shared/types/news';
import { NewsArticleContent } from './NewsArticleContent';

function RelatedThumb({ item }: { item: NewsItem }) {
  return (
    <NewsImage
      src={item.imageUrl}
      gradient={item.imageGradient}
      className="h-[52px] w-[52px] flex-shrink-0 rounded-lg transition-transform duration-200 group-hover:scale-[1.04]"
      iconSize={14}
    />
  );
}

export function NewsDetailModal() {
  const { isOpen, selectedNews, recentNews, openModal, closeModal } = useNewsModalStore();
  const location = useLocation();

  const relatedItems = useMemo(() => {
    if (!selectedNews) return [];
    return recentNews.filter((item) => item.slug !== selectedNews.slug).slice(0, 2);
  }, [recentNews, selectedNews]);

  if (!selectedNews) return null;
  const isPublicPreview =
    !location.pathname.startsWith('/intranet') && !location.pathname.startsWith('/admin');

  const relatedContent =
    relatedItems.length > 0 ? (
      <div className="flex flex-col gap-3">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-maps-muted">
          Relacionados
        </p>
        {relatedItems.map((article) => (
          <button
            key={article.slug ?? article.title}
            type="button"
            onClick={() => openModal(article, recentNews)}
            title={`Leer: ${article.title}`}
            className="group -mx-2 flex w-full gap-3 rounded-xl p-2 text-left transition-colors hover:bg-maps-surface"
          >
            <RelatedThumb item={article} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[9.5px] font-black uppercase tracking-[0.18em] text-maps-brand">
                {article.category}
              </p>
              <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-maps-heading transition-colors group-hover:text-maps-brand">
                {article.title}
              </p>
              <p className="mt-0.5 text-[11px] text-maps-muted">{article.date}</p>
            </div>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      maxWidth="max-w-5xl"
      closeButtonVariant="dark"
      ariaLabel={`Vista previa: ${selectedNews.title}`}
    >
      <div className="flex flex-col">
        <NewsArticleContent item={selectedNews} showShare={isPublicPreview} />
        {isPublicPreview ? (
          <div className="flex flex-col gap-3 border-t border-maps-border px-5 py-5 sm:flex-row sm:px-8">
            {selectedNews.slug ? (
              <Link
                to={`/noticias/${selectedNews.slug}`}
                onClick={closeModal}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-maps-brand px-5 py-3 text-center text-sm font-bold text-white hover:bg-maps-brand-hover"
              >
                Abrir noticia completa
              </Link>
            ) : null}
          </div>
        ) : null}
        {relatedContent ? (
          <div className="border-t border-maps-border px-5 pb-8 pt-5 sm:px-8">
            {relatedContent}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
