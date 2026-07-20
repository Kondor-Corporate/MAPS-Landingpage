import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsDetailModal } from '@/modules/public-web/components/NewsDetailModal';
import { NewsDetailPage } from '@/modules/public-web/pages/NewsDetailPage';
import { useNewsModalStore } from '@/shared/store/newsModalStore';

const mockArticleContent = vi.hoisted(() =>
  vi.fn(({ item }: { item: { title: string } }) => (
    <div data-testid="article-content">{item.title}</div>
  )),
);
const mockUsePublicNewsBySlug = vi.hoisted(() => vi.fn());

vi.mock('@/modules/public-web/components/NewsArticleContent', () => ({
  NewsArticleContent: mockArticleContent,
}));
vi.mock('@/shared/hooks/usePublicNewsBySlug', () => ({
  usePublicNewsBySlug: mockUsePublicNewsBySlug,
}));

const newsItem = {
  slug: 'contenido-unico',
  category: 'Novedad',
  date: '18 jul 2026',
  title: 'Contenido único',
  href: '/noticias/contenido-unico',
  imageGradient: 'linear-gradient(#000, #fff)',
  content: 'Cuerpo compartido.',
  publishedAt: '2026-07-18T12:00:00.000Z',
};

describe('reutilización del contenido de noticias', () => {
  beforeEach(() => {
    mockArticleContent.mockClear();
    vi.stubGlobal('scrollTo', vi.fn());
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  it('modal y página renderizan el mismo NewsArticleContent', () => {
    useNewsModalStore.setState({
      isOpen: true,
      selectedNews: newsItem,
      recentNews: [],
    });
    const modal = render(
      <MemoryRouter initialEntries={['/']}>
        <NewsDetailModal />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('article-content')).toHaveTextContent('Contenido único');
    modal.unmount();

    mockUsePublicNewsBySlug.mockReturnValue({
      newsItem,
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/noticias/contenido-unico']}>
        <Routes>
          <Route path="/noticias/:slug" element={<NewsDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('article-content')).toHaveTextContent('Contenido único');
    expect(mockArticleContent).toHaveBeenCalledTimes(2);
  });
});
