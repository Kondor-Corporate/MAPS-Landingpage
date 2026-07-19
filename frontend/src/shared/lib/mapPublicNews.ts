/**
 * Mapeo de DTOs de lectura (público/intranet) al tipo `NewsItem` de cards y modales.
 * También define gradientes de fallback cuando no hay `imagenUrl`.
 */
import type { ApiPublicNews } from '@/shared/services/publicNews.service';
import type { NewsItem } from '@/shared/types/news';
import { formatNewsCardDate, formatNewsFullDate } from '@/shared/utils/newsDate';

const CATEGORIA_LABEL: Record<string, string> = {
  NOVEDAD: 'Novedad',
  EVENTO: 'Evento',
  CIRCULAR: 'Circular',
  PRODUCTO: 'Producto',
  COMUNICADO: 'Comunicado',
};

const GRADIENT_BY_CATEGORY: Record<string, string> = {
  NOVEDAD: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #00a4c0 100%)',
  EVENTO: 'linear-gradient(135deg, #1e3a8a 0%, #00a4c0 100%)',
  CIRCULAR: 'linear-gradient(135deg, #0089a3 0%, #00a4c0 50%, #67e8f9 100%)',
  PRODUCTO: 'linear-gradient(135deg, #161121 0%, #374151 50%, #00a4c0 100%)',
  COMUNICADO: 'linear-gradient(135deg, #131117 0%, #1e3a8a 100%)',
};

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #00a4c0 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #00a4c0 100%)',
  'linear-gradient(135deg, #0089a3 0%, #00a4c0 50%, #67e8f9 100%)',
];

export const DEFAULT_NEWS_GRADIENT = FALLBACK_GRADIENTS[0];

export function getNewsGradientByCategory(categoria: string, index = 0): string {
  return GRADIENT_BY_CATEGORY[categoria] ?? FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
}

function resolveGradient(dto: ApiPublicNews, index: number): string {
  return getNewsGradientByCategory(dto.categoria, index);
}

export function mapApiPublicNewsToNewsItem(dto: ApiPublicNews, index = 0): NewsItem {
  const publishedAt = dto.publicadaEn ?? '';
  return {
    slug: dto.slug,
    category: CATEGORIA_LABEL[dto.categoria] ?? dto.categoria,
    date: formatNewsCardDate(dto.publicadaEn),
    title: dto.titulo,
    href: `/noticias/${dto.slug}`,
    imageGradient: resolveGradient(dto, index),
    imageUrl: dto.imagenUrl,
    content: dto.contenido,
    description: dto.descripcion,
    publishedAt,
    publishedAtLabel: formatNewsFullDate(dto.publicadaEn),
  };
}

/** Mismo DTO de lectura que noticias públicas; visibilidad la filtra el endpoint. */
export const mapApiIntranetNewsToNewsItem = mapApiPublicNewsToNewsItem;

export function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
