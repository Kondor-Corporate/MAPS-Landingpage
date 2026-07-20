import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { HeroSection } from '@/modules/public-web/components/HeroSection';

describe('HeroSection', () => {
  it('no renderiza métricas ficticias ni el respaldo social decorativo', () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/2[.,]?500/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/personas confían/i)).not.toBeInTheDocument();
  });

  it('mantiene destinos válidos para sus CTA', () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /encontrá tu asesor/i })).toHaveAttribute(
      'href',
      '#mapa',
    );
    expect(screen.getByRole('link', { name: /soy productor/i })).toHaveAttribute('href', '/login');
  });
});
