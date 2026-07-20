import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsDetailPage } from '@/modules/public-web/pages/NewsDetailPage';

const mockUsePublicNewsBySlug = vi.hoisted(() => vi.fn());
vi.mock('@/shared/hooks/usePublicNewsBySlug', () => ({
  usePublicNewsBySlug: mockUsePublicNewsBySlug,
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
    await userEvent.click(screen.getByRole('link', { name: /volver a todas las noticias/i }));
    expect(screen.getByText('Listado público')).toBeInTheDocument();
  });

  it('ofrece volver al listado y al hash real de noticias en la Home', () => {
    mockUsePublicNewsBySlug.mockReturnValue({
      newsItem,
      loading: false,
      error: null,
      notFound: false,
      refetch: vi.fn(),
    });
    renderDirectEntry();

    expect(screen.getByRole('link', { name: /volver a todas las noticias/i })).toHaveAttribute(
      'href',
      '/noticias',
    );
    expect(screen.getByRole('link', { name: /volver al inicio/i })).toHaveAttribute(
      'href',
      '/#noticias',
    );
  });
});
