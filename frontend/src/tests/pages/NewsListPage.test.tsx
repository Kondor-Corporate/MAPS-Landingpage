import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsListPage } from '@/modules/public-web/pages/NewsListPage';
import { useNewsModalStore } from '@/shared/store/newsModalStore';

const mockUsePublicNews = vi.hoisted(() => vi.fn());
vi.mock('@/shared/hooks/usePublicNews', () => ({ usePublicNews: mockUsePublicNews }));

const news = [
  {
    slug: 'novedad-maps',
    category: 'Novedad',
    date: '18 jul 2026',
    title: 'Novedad MAPS',
    href: '/noticias/novedad-maps',
    imageGradient: 'linear-gradient(#000, #fff)',
    imageUrl: null,
    content: 'Contenido público de la noticia.',
    publishedAt: '2026-07-18T12:00:00.000Z',
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/noticias']}>
      <Routes>
        <Route path="/noticias" element={<NewsListPage />} />
        <Route path="/noticias/:slug" element={<p>Detalle abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NewsListPage', () => {
  beforeEach(() => {
    mockUsePublicNews.mockReset();
    useNewsModalStore.setState({ isOpen: false, selectedNews: null, recentNews: [] });
  });

  it('carga noticias publicadas', () => {
    mockUsePublicNews.mockReturnValue({
      news,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByRole('heading', { name: 'Novedad MAPS' })).toBeInTheDocument();
  });

  it('ofrece volver al hash real de noticias en la landing', () => {
    mockUsePublicNews.mockReturnValue({
      news,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    const backLink = screen.getByRole('link', { name: /volver al inicio/i });
    expect(backLink).toHaveAttribute('href', '/#noticias');
    expect(backLink).toHaveClass('px-2', 'py-1', 'text-sm', 'font-semibold');
    expect(backLink).not.toHaveClass('min-h-11', 'border', 'bg-white');

    const header = backLink.closest('header');
    expect(header).toHaveClass('mb-6', 'sm:mb-8');
    expect(header).not.toHaveClass('mb-10');
    expect(header).toHaveClass('sm:flex-row-reverse', 'sm:justify-between');
    expect(backLink).toHaveClass('-mt-2', 'self-end');
    expect(header?.parentElement?.parentElement).toHaveClass('pt-5', 'lg:pt-8');
    expect(header?.parentElement?.parentElement).not.toHaveClass('py-8', 'lg:py-20');
  });

  it('muestra el estado loading', () => {
    mockUsePublicNews.mockReturnValue({ news: [], loading: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByLabelText('Cargando noticias')).toHaveAttribute('aria-busy', 'true');
  });

  it('muestra el estado vacío', () => {
    mockUsePublicNews.mockReturnValue({ news: [], loading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText(/todavía no hay noticias publicadas/i)).toBeInTheDocument();
  });

  it('muestra un error amigable y permite reintentar', async () => {
    const refetch = vi.fn();
    mockUsePublicNews.mockReturnValue({
      news: [],
      loading: false,
      error: 'AxiosError: Request failed',
      refetch,
    });
    renderPage();

    expect(screen.getByRole('alert')).not.toHaveTextContent(/axios/i);
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('abre el modal desde una card sin abandonar el listado', async () => {
    mockUsePublicNews.mockReturnValue({
      news,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /vista previa.*novedad maps/i }));
    expect(useNewsModalStore.getState().isOpen).toBe(true);
    expect(useNewsModalStore.getState().selectedNews?.slug).toBe('novedad-maps');
    expect(screen.queryByText('Detalle abierto')).not.toBeInTheDocument();
  });
});
