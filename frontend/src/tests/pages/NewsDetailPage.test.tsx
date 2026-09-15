import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsDetailPage } from '@/modules/public-web/pages/NewsDetailPage';

const mockUsePublicNewsBySlug = vi.hoisted(() => vi.fn());
vi.mock('@/shared/hooks/usePublicNewsBySlug', () => ({
  usePublicNewsBySlug: mockUsePublicNewsBySlug,
}));

const mockUsePublicNews = vi.hoisted(() => vi.fn());
vi.mock('@/shared/hooks/usePublicNews', () => ({
  usePublicNews: mockUsePublicNews,
}));

const newsItem = {
  slug: 'noticia-directa',
  category: 'Comunicado',
  date: '18 jul 2026',
  title: 'Noticia directa',
  href: '/noticias/noticia-directa',
  imageGradient: 'linear-gradient(#001, #123)',
  imageUrl: 'https://cdn.example.com/noticia.jpg',
  content: 'Contenido seguro de la noticia.',
  publishedAt: '2026-07-18T12:00:00.000Z',
  publishedAtLabel: '18 de julio de 2026',
};

function renderDirectEntry() {
  return render(
    <MemoryRouter initialEntries={['/noticias/noticia-directa']}>
      <Routes>
        <Route path="/noticias/:slug" element={<NewsDetailPage />} />
        <Route path="/noticias" element={<p>Listado público</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NewsDetailPage', () => {
  beforeEach(() => {
    mockUsePublicNewsBySlug.mockReset();
    mockUsePublicNews.mockReset();
    mockUsePublicNews.mockReturnValue({ news: [], loading: false, error: null, refetch: vi.fn() });
  });

  it('muestra un slug válido cargado desde la API', () => {
    mockUsePublicNewsBySlug.mockReturnValue({
      newsItem,
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    });
    renderDirectEntry();
    expect(screen.getByRole('heading', { name: 'Noticia directa' })).toBeInTheDocument();
    expect(screen.getByText('Contenido seguro de la noticia.')).toBeInTheDocument();
  });

  it('muestra Noticia no encontrada para un slug inexistente', () => {
    mockUsePublicNewsBySlug.mockReturnValue({
      newsItem: null,
      loading: false,
      error: null,
      notFound: true,
      refetch: vi.fn(),
    });
    renderDirectEntry();
    expect(screen.getByRole('heading', { name: /noticia no encontrada/i })).toBeInTheDocument();
  });

  it('admite acceso directo sin datos precargados desde Home', () => {
    mockUsePublicNewsBySlug.mockReturnValue({
      newsItem,
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    });
    renderDirectEntry();
    expect(mockUsePublicNewsBySlug).toHaveBeenCalledWith('noticia-directa');
  });

  it('reemplaza una imagen rota con el fallback visual', () => {
    mockUsePublicNewsBySlug.mockReturnValue({
      newsItem,
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    });
    const { container } = renderDirectEntry();
    const image = container.querySelector('img[src="https://cdn.example.com/noticia.jpg"]');
    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);
    expect(container.querySelector('img[src="https://cdn.example.com/noticia.jpg"]')).toBeNull();
  });

  it('vuelve al listado público', async () => {
    mockUsePublicNewsBySlug.mockReturnValue({
      newsItem,
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    });
    renderDirectEntry();
    await userEvent.click(screen.getByRole('link', { name: /volver a noticias/i }));
    expect(screen.getByText('Listado público')).toBeInTheDocument();
  });

  it('ofrece volver al listado y el breadcrumb hacia el inicio', () => {
    mockUsePublicNewsBySlug.mockReturnValue({
      newsItem,
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    });
    renderDirectEntry();

    expect(screen.getByRole('link', { name: /volver a noticias/i })).toHaveAttribute(
      'href',
      '/noticias',
    );
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/#noticias');
    expect(screen.getByRole('link', { name: 'Noticias' })).toHaveAttribute('href', '/noticias');
  });

  it('muestra "Otras noticias" y "También puede interesarte" con datos reales reutilizados', () => {
    mockUsePublicNewsBySlug.mockReturnValue({
      newsItem,
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    });
    mockUsePublicNews.mockReturnValue({
      news: [
        { ...newsItem, slug: 'noticia-directa' },
        { ...newsItem, slug: 'otra-1', title: 'Otra noticia 1' },
        { ...newsItem, slug: 'otra-2', title: 'Otra noticia 2' },
        { ...newsItem, slug: 'otra-3', title: 'Otra noticia 3' },
        { ...newsItem, slug: 'otra-4', title: 'Otra noticia 4' },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderDirectEntry();

    expect(screen.getByText('Otras noticias')).toBeInTheDocument();
    expect(screen.getByText('También puede interesarte')).toBeInTheDocument();
    expect(screen.getAllByText('Otra noticia 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Otra noticia 4').length).toBeGreaterThan(0);
    expect(screen.queryByText('Noticia directa', { selector: 'p' })).not.toBeInTheDocument();
  });
});
