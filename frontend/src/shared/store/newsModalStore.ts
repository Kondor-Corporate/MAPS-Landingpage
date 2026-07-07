/**
 * Estado global del modal de detalle de Noticias.
 * Compartido entre Home, intranet y listados que abren el mismo `NewsDetailModal`.
 */
import { create } from 'zustand';
import type { NewsItem } from '@/shared/types/news';

type NewsModalState = {
  isOpen: boolean;
  selectedNews: NewsItem | null;
  recentNews: NewsItem[];
  openModal: (news: NewsItem, recentNews?: NewsItem[]) => void;
  closeModal: () => void;
};

export const useNewsModalStore = create<NewsModalState>((set) => ({
  isOpen: false,
  selectedNews: null,
  recentNews: [],
  openModal: (news, recentNews = []) =>
    set({
      isOpen: true,
      selectedNews: news,
      recentNews,
    }),
  closeModal: () =>
    set({
      isOpen: false,
      selectedNews: null,
      recentNews: [],
    }),
}));
