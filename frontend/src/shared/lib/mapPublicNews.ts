import type { ApiPublicNews } from '@/shared/services/publicNews.service';
import type { NewsItem } from '@/shared/types/news';
import { relativeTimeFromNow } from '@/shared/utils/relativeTime';

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

function formatPublicNewsDate(iso: string | null): string {
  if (!iso) return '';
  const relative = relativeTimeFromNow(iso);
  if (relative.startsWith('Hoy') || relative === 'Ayer' || relative.includes('/')) {
    return relative;
  }
  return `Hace ${relative}`;
}

function formatFullPublicDate(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

function resolveGradient(dto: ApiPublicNews, index: number): string {
  return GRADIENT_BY_CATEGORY[dto.categoria] ?? FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
}

export function mapApiPublicNewsToNewsItem(dto: ApiPublicNews, index = 0): NewsItem {
  const publishedAt = dto.publicadaEn ?? '';
  return {
    slug: dto.slug,
    category: CATEGORIA_LABEL[dto.categoria] ?? dto.categoria,
    date: formatPublicNewsDate(dto.publicadaEn),
    title: dto.titulo,
    href: `#noticias-${dto.slug}`,
    imageGradient: resolveGradient(dto, index),
    imageUrl: dto.imagenUrl,
    content: dto.contenido,
    description: dto.descripcion,
    author: 'Equipo Editorial MAPS',
    publishedAt,
    publishedAtLabel: formatFullPublicDate(dto.publicadaEn),
  };
}

/** Mismo DTO de lectura que noticias públicas; visibilidad la filtra el endpoint. */
export const mapApiIntranetNewsToNewsItem = mapApiPublicNewsToNewsItem;

export function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
