import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PublicLayout } from '@/shared/layouts/PublicLayout';

describe('PublicLayout footer', () => {
  it('solo presenta enlaces con destinos públicos reales', () => {
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

    expect(within(footer).getByRole('link', { name: 'Noticias' })).toHaveAttribute(
      'href',
      '/#noticias',
    );
    for (const link of links) {
      expect(link.getAttribute('href')).toBeTruthy();
      expect(link.getAttribute('href')).not.toBe('#');
      expect(link.getAttribute('href')).not.toMatch(/terminos|privacidad|proximamente/i);
    }
    expect(within(footer).getByText(/próximamente/i).tagName).toBe('P');
  });
});
