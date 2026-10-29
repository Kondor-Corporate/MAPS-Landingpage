import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsPreviewSection } from '@/modules/public-web/components/NewsPreviewSection';
import { NewsListPage } from '@/modules/public-web/pages/NewsListPage';
import { PublicLayout } from '@/shared/layouts/PublicLayout';
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
    publishedAtLabel: '18 de julio de 2026',
  },
];

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Ruta actual">{`${location.pathname}${location.hash}`}</output>;
}

function TestApp({ initialEntry }: { initialEntry: '/' | '/noticias' }) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <PublicLayout>
        <LocationProbe />
        <Routes>
          <Route path="/" element={<NewsPreviewSection />} />
          <Route path="/noticias" element={<NewsListPage />} />
          <Route path="/noticias/:slug" element={<p>Detalle completo</p>} />
        </Routes>
      </PublicLayout>
    </MemoryRouter>
  );
}

describe('flujo híbrido de noticias públicas', () => {
  beforeEach(() => {
    mockUsePublicNews.mockReturnValue({
      news,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    useNewsModalStore.setState({ isOpen: false, selectedNews: null, recentNews: [] });
    vi.stubGlobal('scrollTo', vi.fn());
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  it('una card de Home abre el modal sin cambiar de ruta', async () => {
    render(<TestApp initialEntry="/" />);
    await userEvent.click(screen.getByRole('button', { name: /vista previa.*novedad maps/i }));

    expect(screen.getByRole('dialog', { name: /vista previa: novedad maps/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent(/^\/$/);
  });

  it('cerrar el modal conserva Home, su posición lógica y devuelve el foco', async () => {
    render(<TestApp initialEntry="/" />);
    const opener = screen.getByRole('button', { name: /vista previa.*novedad maps/i });
    await userEvent.click(opener);
    await userEvent.click(screen.getByRole('button', { name: /cerrar modal/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent(/^\/$/);
    expect(opener).toHaveFocus();
  });

  it('Abrir noticia completa navega al deep link del slug', async () => {
    render(<TestApp initialEntry="/" />);
    await userEvent.click(screen.getByRole('button', { name: /vista previa.*novedad maps/i }));
    await userEvent.click(screen.getByRole('link', { name: /abrir noticia completa/i }));

    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/noticias/novedad-maps');
    expect(screen.getByText('Detalle completo')).toBeInTheDocument();
  });

  it('la acción general Ver todas las noticias navega al listado', async () => {
    render(<TestApp initialEntry="/" />);
    await userEvent.click(screen.getByRole('link', { name: 'Ver todas las noticias' }));

    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/noticias');
  });

  it('una card del listado abre el mismo modal y cerrarlo mantiene el listado', async () => {
    render(<TestApp initialEntry="/noticias" />);
    await userEvent.click(screen.getByRole('button', { name: /vista previa.*novedad maps/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cerrar modal/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/noticias');
  });

  it('compartir desde el modal usa siempre el deep link público', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<TestApp initialEntry="/" />);
    await userEvent.click(screen.getByRole('button', { name: /vista previa.*novedad maps/i }));
    await userEvent.click(screen.getByRole('button', { name: /compartir por whatsapp/i }));

    const destination = String(open.mock.calls[0]?.[0]);
    expect(decodeURIComponent(destination)).toContain(
      `${window.location.origin}/noticias/novedad-maps`,
    );
  });

  it('Escape cierra el modal y mantiene la ruta actual', async () => {
    render(<TestApp initialEntry="/noticias" />);
    await userEvent.click(screen.getByRole('button', { name: /vista previa.*novedad maps/i }));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/noticias');
  });
});
