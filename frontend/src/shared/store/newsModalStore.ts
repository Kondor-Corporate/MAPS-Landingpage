import { create } from 'zustand';
import type { NewsItem } from '@/shared/types/news';

type NewsModalState = {
  isOpen: boolean;
  selectedNews: NewsItem | null;
  openModal: (news: NewsItem) => void;
  closeModal: () => void;
};

export const useNewsModalStore = create<NewsModalState>((set) => ({
  isOpen: false,
  selectedNews: null,
  openModal: (news) =>
    set({
      isOpen: true,
      selectedNews: news,
    }),
  closeModal: () =>
    set({
      isOpen: false,
      selectedNews: null,
    }),
}));
