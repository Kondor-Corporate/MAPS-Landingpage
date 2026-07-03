export type NewsItem = {
  slug?: string;
  category: string;
  date: string;
  title: string;
  href: string;
  imageGradient: string;
  imageUrl?: string | null;
  content?: string;
  description?: string | null;
  author?: string;
  publishedAt?: string;
  publishedAtLabel?: string;
};
