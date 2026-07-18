import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicLayout } from '@/shared/layouts/PublicLayout';

function TestApp({ initialEntry = '/' }: { initialEntry?: string }) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <PublicLayout>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <section id="inicio">Inicio</section>
                <section id="mapa">
                  Mapa
                  <Link to="/productor/demo">Ver perfil desde mapa</Link>
                </section>
              </>
            }
          />
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
});
