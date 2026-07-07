/**
 * Modal de detalle de Noticias (Home e intranet).
 * Renderiza contenido real del item seleccionado y sugerencias relacionadas del mismo listado.
 */
import { useMemo, useState } from 'react';
import { FaWhatsapp, FaLinkedinIn, FaLink, FaClock } from 'react-icons/fa';
import { Modal } from '@/shared/components/Modal';
import { NewsImage } from '@/shared/components/NewsImage';
import { estimateReadingMinutes } from '@/shared/lib/mapPublicNews';
import { useNewsModalStore } from '@/shared/store/newsModalStore';
import type { NewsItem } from '@/shared/types/news';

function NewsHero({ item }: { item: NewsItem }) {
  return (
    <div className="relative h-[260px] w-full flex-shrink-0 overflow-hidden sm:h-[320px]">
      <NewsImage
        src={item.imageUrl}
        gradient={item.imageGradient}
        className="absolute inset-0 h-full w-full"
        showIcon={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
    </div>
  );
}

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
  const [copied, setCopied] = useState(false);

  const relatedItems = useMemo(() => {
    if (!selectedNews) return [];
    return recentNews.filter((item) => item.slug !== selectedNews.slug).slice(0, 2);
  }, [recentNews, selectedNews]);

  if (!selectedNews) return null;

  const readingMinutes = estimateReadingMinutes(
    selectedNews.content ?? selectedNews.description ?? '',
  );
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
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-maps-muted">
        Compartir
      </p>
      <button
        type="button"
        onClick={() => handleShareClick('whatsapp')}
        title="Compartir por WhatsApp"
        aria-label="Compartir por WhatsApp"
        className="flex w-full items-center gap-2.5 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
      >
        <FaWhatsapp size={16} />
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() => handleShareClick('linkedin')}
        title="Compartir por LinkedIn"
        aria-label="Compartir por LinkedIn"
        className="flex w-full items-center gap-2.5 rounded-lg bg-sky-50 px-3.5 py-2.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
      >
        <FaLinkedinIn size={16} />
        LinkedIn
      </button>
      <button
        type="button"
        onClick={handleCopyLink}
        title={copied ? 'Enlace copiado' : 'Copiar enlace'}
        aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
        className="flex w-full items-center gap-2.5 rounded-lg bg-maps-surface px-3.5 py-2.5 text-sm font-semibold text-maps-muted transition-colors hover:bg-maps-border/40"
      >
        <FaLink size={13} />
        {copied ? '¡Enlace copiado!' : 'Copiar enlace'}
      </button>
    </div>
  );

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
    <Modal isOpen={isOpen} onClose={closeModal} maxWidth="max-w-5xl" closeButtonVariant="dark">
      <div className="flex flex-col">
        <div className="relative flex-shrink-0">
          <NewsHero item={selectedNews} />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
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
            <h1 className="text-[1.5rem] font-bold leading-[1.2] text-white drop-shadow-sm sm:text-[1.85rem]">
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
            <div className="mt-2 space-y-5 border-t border-maps-border px-5 pb-8 pt-5 sm:px-6">
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
