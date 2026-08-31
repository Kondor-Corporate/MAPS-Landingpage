/**
 * Tipo de presentación compartido para cards y modal de Noticias (Home, intranet, dashboards).
 * Es independiente del modelo admin (`modules/admin/types/news.ts`).
 */
export type NewsItem = {
  slug?: string;
  category: string;
  date: string;
  title: string;
  href: string;
  imageGradient: string;
  imageUrl?: string | null;
  galeria?: string[];
  content?: string;
  description?: string | null;
  author?: string;
  publishedAt?: string;
  publishedAtLabel?: string;
};
