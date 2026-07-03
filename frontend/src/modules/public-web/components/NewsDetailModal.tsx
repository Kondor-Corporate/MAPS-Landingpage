import { useMemo, useState } from 'react';
import { FaWhatsapp, FaLinkedinIn, FaLink, FaClock } from 'react-icons/fa';
import { Modal } from '@/shared/components/Modal';
import { estimateReadingMinutes } from '@/shared/lib/mapPublicNews';
import { useNewsModalStore } from '@/shared/store/newsModalStore';
import type { NewsItem } from '@/shared/types/news';

function NewsHero({ item }: { item: NewsItem }) {
  if (item.imageUrl) {
    return (
      <div className="relative h-[260px] sm:h-[320px] w-full flex-shrink-0 overflow-hidden">
        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
      </div>
    );
  }

  return (
    <div
      className="relative h-[260px] sm:h-[320px] w-full flex-shrink-0 overflow-hidden"
      style={{ background: item.imageGradient }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
    </div>
  );
}

function RelatedThumb({ item }: { item: NewsItem }) {
  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt=""
        className="h-[52px] w-[52px] flex-shrink-0 rounded-lg object-cover"
      />
    );
  }

  return (
    <div
      className="h-[52px] w-[52px] flex-shrink-0 rounded-lg transition-transform duration-200 group-hover:scale-[1.04]"
      style={{ background: item.imageGradient }}
      aria-hidden
    />
  );
}

export function NewsDetailModal() {
  const { isOpen, selectedNews, recentNews, openModal, closeModal } = useNewsModalStore();
  const [copied, setCopied] = useState(false);

  const relatedItems = useMemo(() => {
    if (!selectedNews) return [];
    return recentNews
      .filter((item) => item.slug !== selectedNews.slug)
      .slice(0, 2);
  }, [recentNews, selectedNews]);

  if (!selectedNews) return null;

  const readingMinutes = estimateReadingMinutes(selectedNews.content ?? selectedNews.description ?? '');
  const body = selectedNews.content?.trim() || selectedNews.description?.trim() || '';

  const handleShareClick = (platform: 'whatsapp' | 'linkedin') => {
    const url = window.location.href;
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(selectedNews.title + ' ' + url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
    window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const shareContent = (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maps-muted mb-1">
        Compartir
      </p>
      <button
        type="button"
        onClick={() => handleShareClick('whatsapp')}
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm font-semibold w-full"
      >
        <FaWhatsapp size={16} />
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() => handleShareClick('linkedin')}
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors text-sm font-semibold w-full"
      >
        <FaLinkedinIn size={16} />
        LinkedIn
      </button>
      <button
        type="button"
        onClick={handleCopyLink}
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-maps-surface text-maps-muted hover:bg-maps-border/40 transition-colors text-sm font-semibold w-full"
      >
        <FaLink size={13} />
        {copied ? '¡Enlace copiado!' : 'Copiar enlace'}
      </button>
    </div>
  );

  const relatedContent =
    relatedItems.length > 0 ? (
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maps-muted mb-1">
          Relacionados
        </p>
        {relatedItems.map((article) => (
          <button
            key={article.slug ?? article.title}
            type="button"
            onClick={() => openModal(article, recentNews)}
            className="group flex w-full gap-3 rounded-xl p-2 -mx-2 text-left transition-colors hover:bg-maps-surface"
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
    <Modal isOpen={isOpen} onClose={closeModal} maxWidth="max-w-5xl">
      <div className="flex flex-col lg:h-full lg:overflow-y-auto">
        <div className="relative flex-shrink-0">
          <NewsHero item={selectedNews} />
          <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-maps-brand px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                {selectedNews.category}
              </span>
              {body ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-medium text-maps-heading">
                  <FaClock size={10} />
                  {readingMinutes} min lectura
                </span>
              ) : null}
            </div>
            <h1 className="text-[1.5rem] sm:text-[1.85rem] font-bold leading-[1.2] text-white drop-shadow-sm">
              {selectedNews.title}
            </h1>
          </div>
        </div>

        <article className="min-w-0">
          <div className="flex items-center gap-3 px-5 pb-4 pt-5 sm:px-6">
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-maps-border/60" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-tight text-maps-heading">
                {selectedNews.author ?? 'Equipo Editorial MAPS'}
              </p>
              {selectedNews.publishedAtLabel ? (
                <p className="mt-0.5 text-[11.5px] text-maps-muted">
                  Publicado el {selectedNews.publishedAtLabel}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 px-5 pb-6 pt-2 text-[14px] leading-[1.85] text-maps-body sm:px-6">
            {body ? (
              <p className="whitespace-pre-line">{body}</p>
            ) : (
              <p className="text-maps-muted">Esta noticia no tiene contenido disponible.</p>
            )}
          </div>

          {(shareContent || relatedContent) && (
            <div className="mt-2 space-y-5 border-t border-maps-border px-5 pb-6 pt-5 sm:px-6">
              <div className={`grid gap-6 ${relatedContent ? 'sm:grid-cols-2' : ''}`}>
                {shareContent}
                {relatedContent}
              </div>
            </div>
          )}
        </article>
      </div>
    </Modal>
  );
}
