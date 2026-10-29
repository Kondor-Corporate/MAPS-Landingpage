import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PublicLayout } from '@/shared/layouts/PublicLayout';

describe('PublicLayout footer', () => {
  it('presenta marca, enlaces públicos reales y créditos, sin placeholder legal', () => {
    vi.stubGlobal('scrollTo', vi.fn());
    render(
      <MemoryRouter>
        <PublicLayout>
          <p>Contenido</p>
        </PublicLayout>
      </MemoryRouter>,
    );

    const footer = screen.getByRole('contentinfo');
    const links = within(footer).getAllByRole('link');

    expect(within(footer).getByText('MAPSASESORES')).toBeTruthy();
    expect(
      within(footer).getByText(
        'Un espacio para conocer a nuestros asesores y acceder a información de interés.',
      ),
    ).toBeTruthy();

    expect(within(footer).getByRole('link', { name: 'Noticias' })).toHaveAttribute(
      'href',
      '/#noticias',
    );
    expect(within(footer).getByRole('link', { name: 'Nosotros' })).toHaveAttribute(
      'href',
      '/#nosotros',
    );
    expect(within(footer).getByRole('link', { name: 'Mapa de Asesores' })).toHaveAttribute(
      'href',
      '/#mapa',
    );

    expect(
      within(footer).getByText('© 2026 MAPS Asesores. Todos los derechos reservados.'),
    ).toBeTruthy();
    expect(within(footer).getByText(/Desarrollado por/)).toBeTruthy();
    expect(within(footer).getByAltText('Kondor')).toBeTruthy();

    expect(within(footer).queryByRole('heading', { name: 'Legal' })).toBeNull();
    expect(within(footer).queryByText(/próximamente/i)).toBeNull();
    expect(within(footer).queryByText(/términos/i)).toBeNull();
    expect(within(footer).queryByText(/privacidad/i)).toBeNull();

    for (const link of links) {
      expect(link.getAttribute('href')).toBeTruthy();
      expect(link.getAttribute('href')).not.toBe('#');
      expect(link.getAttribute('href')).not.toMatch(/terminos|privacidad|proximamente/i);
    }
  });
});
