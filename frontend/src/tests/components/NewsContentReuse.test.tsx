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
const mockUsePublicNews = vi.hoisted(() => vi.fn());

vi.mock('@/modules/public-web/components/NewsArticleContent', () => ({
  NewsArticleContent: mockArticleContent,
}));
vi.mock('@/shared/hooks/usePublicNewsBySlug', () => ({
  usePublicNewsBySlug: mockUsePublicNewsBySlug,
}));
vi.mock('@/shared/hooks/usePublicNews', () => ({
  usePublicNews: mockUsePublicNews,
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

describe('contenido de noticias en cada superficie', () => {
  beforeEach(() => {
    mockArticleContent.mockClear();
    mockUsePublicNews.mockReset();
    mockUsePublicNews.mockReturnValue({ news: [], loading: false, error: null, refetch: vi.fn() });
    vi.stubGlobal('scrollTo', vi.fn());
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  it('el modal de vista previa usa NewsArticleContent', () => {
    useNewsModalStore.setState({
      isOpen: true,
      selectedNews: newsItem,
      recentNews: [],
    });
    render(
      <MemoryRouter initialEntries={['/']}>
        <NewsDetailModal />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('article-content')).toHaveTextContent('Contenido único');
    expect(mockArticleContent).toHaveBeenCalledTimes(1);
  });

  it('la página de detalle muestra el contenido real de la noticia (sin pasar por el modal)', () => {
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

    expect(screen.getByRole('heading', { name: 'Contenido único' })).toBeInTheDocument();
    expect(screen.getByText('Cuerpo compartido.')).toBeInTheDocument();
    expect(mockArticleContent).not.toHaveBeenCalled();
  });
});
