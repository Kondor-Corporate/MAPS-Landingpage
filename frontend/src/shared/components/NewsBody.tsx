/**
 * Render del cuerpo de una noticia, compatible con dos formatos:
 * - Contenido enriquecido (HTML del editor): se sanea y se renderiza con estilos
 *   editoriales (`.news-prose`). La presentación la define el frontend.
 * - Noticias antiguas en texto plano: se muestran respetando saltos de línea
 *   (`whitespace-pre-line`), sin interpretar HTML.
 */
import { useMemo } from 'react';
import { looksLikeNewsHtml, sanitizeNewsHtml } from '@/shared/lib/sanitizeHtml';

type Props = {
  content: string;
  /** Clases del contenedor (ancho de lectura, tamaño tipográfico base). */
  className?: string;
  /** Texto a mostrar cuando no hay contenido. */
  emptyLabel?: string;
};

export function NewsBody({ content, className = '', emptyLabel }: Props) {
  const trimmed = content?.trim() ?? '';
  const isHtml = looksLikeNewsHtml(trimmed);
  const safeHtml = useMemo(() => (isHtml ? sanitizeNewsHtml(trimmed) : ''), [isHtml, trimmed]);

  if (!trimmed) {
    return emptyLabel ? <div className={className}>{emptyLabel}</div> : null;
  }

  if (isHtml) {
    return (
      <div
        className={`news-prose ${className}`.trim()}
        // El HTML ya fue saneado con una whitelist estricta (ver sanitizeHtml.ts).
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  return <div className={`whitespace-pre-line ${className}`.trim()}>{trimmed}</div>;
}
