import { create } from 'zustand';
import { newsMock } from '@/modules/admin/data/newsMock';
import type { News, NewsEstado, NewsInput } from '@/modules/admin/types/news';

type NewsState = {
  news: News[];
  addNews: (input: NewsInput) => News;
  updateNews: (id: string, input: NewsInput) => void;
  setEstado: (id: string, estado: NewsEstado) => void;
  removeNews: (id: string) => void;
};

function generateId(): string {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useNews = create<NewsState>((set) => ({
  news: newsMock,
  addNews: (input) => {
    const now = new Date().toISOString();
    const created: News = {
      id: generateId(),
      ...input,
      ultimaModificacion: now,
    };
    set((state) => ({ news: [created, ...state.news] }));
    return created;
  },
  updateNews: (id, input) =>
    set((state) => ({
      news: state.news.map((n) =>
        n.id === id
          ? {
              ...n,
              ...input,
              ultimaModificacion: new Date().toISOString(),
            }
          : n,
      ),
    })),
  setEstado: (id, estado) =>
    set((state) => ({
      news: state.news.map((n) =>
        n.id === id ? { ...n, estado, ultimaModificacion: new Date().toISOString() } : n,
      ),
    })),
  removeNews: (id) => set((state) => ({ news: state.news.filter((n) => n.id !== id) })),
}));
