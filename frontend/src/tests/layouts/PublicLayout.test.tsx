import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicLayout } from '@/shared/layouts/PublicLayout';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Ruta actual">{`${location.pathname}${location.hash}`}</output>;
}

function TestApp({ initialEntry = '/' }: { initialEntry?: string }) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <PublicLayout>
        <LocationProbe />
        <Routes>
          <Route
            path="/"
            element={
              <>
                <section id="inicio">Inicio</section>
                <section id="noticias">Noticias Home</section>
                <section id="mapa">
                  Mapa
                  <Link to="/productor/demo">Ver perfil desde mapa</Link>
                </section>
              </>
            }
          />
          <Route path="/noticias" element={<div>Listado de noticias</div>} />
          <Route path="/noticias/:slug" element={<div>Detalle de noticia</div>} />
          <Route path="/productor/demo" element={<div>Perfil público</div>} />
        </Routes>
      </PublicLayout>
    </MemoryRouter>
  );
}

describe('PublicLayout scroll público', () => {
  const scrollTo = vi.fn();
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('scrollTo', scrollTo);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView);
    scrollTo.mockClear();
    scrollIntoView.mockClear();
  });

  it('lleva al inicio al cambiar de pathname sin hash', async () => {
    const user = userEvent.setup();
    render(<TestApp />);
    scrollTo.mockClear();

    await user.click(screen.getByRole('link', { name: 'Ver perfil desde mapa' }));

    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' }),
    );
  });

  it('una URL con hash desplaza a la sección y no ejecuta scroll-to-top', () => {
    render(<TestApp initialEntry="/#mapa" />);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('abrir un perfil desde la página pública comienza arriba', async () => {
    const user = userEvent.setup();
    render(<TestApp initialEntry="/#mapa" />);
    scrollTo.mockClear();

    await user.click(screen.getByRole('link', { name: 'Ver perfil desde mapa' }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });

  it('Noticias del header apunta a la sección de la landing', () => {
    render(<TestApp initialEntry="/noticias" />);

    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Noticias' })).toHaveAttribute(
      'href',
      '/#noticias',
    );
  });

  it('el menú mobile usa el mismo destino y se cierra al navegar', async () => {
    render(<TestApp initialEntry="/noticias" />);
    const header = screen.getByRole('banner');

    await userEvent.click(within(header).getByRole('button', { name: /abrir menú/i }));
    const newsLinks = within(header).getAllByRole('link', { name: 'Noticias' });
    expect(newsLinks).toHaveLength(2);
    expect(newsLinks.every((link) => link.getAttribute('href') === '/#noticias')).toBe(true);

    await userEvent.click(newsLinks[1]);
    expect(within(header).getByRole('button', { name: /abrir menú/i })).toBeInTheDocument();
  });

  it('desde un detalle, Noticias vuelve a Home y desplaza a la sección real', async () => {
    render(<TestApp initialEntry="/noticias/novedad-maps" />);
    scrollIntoView.mockClear();

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Noticias' }),
    );

    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/#noticias');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
