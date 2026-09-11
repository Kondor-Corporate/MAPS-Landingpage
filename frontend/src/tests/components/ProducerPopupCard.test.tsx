import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  ProducerPopupCard,
  type ProducerWithDistance,
} from '@/modules/public-web/components/FindAdvisorMap';

const producer: ProducerWithDistance = {
  slug: 'ana-perez',
  nombreCompleto: 'Ana Pérez',
  tituloProfesional: 'Productora asesora de seguros',
  ciudad: 'La Plata',
  direccion: null,
  latitud: -34.92,
  longitud: -57.95,
  foto: null,
  whatsapp: '5492215555555',
  verificado: true,
  especialidades: [{ clave: 'auto', label: 'Automotor' }],
  redesSociales: [
    { plataforma: 'instagram', url: 'https://instagram.com/ana-perez', orden: 0 },
    { plataforma: 'linkedin', url: 'https://linkedin.com/in/ana-perez', orden: 1 },
  ],
  distanceKm: 2.4,
};

describe('ProducerPopupCard', () => {
  it('ofrece una acción accesible y táctil para ver el perfil', () => {
    render(
      <MemoryRouter>
        <ProducerPopupCard producer={producer} />
      </MemoryRouter>,
    );

    const profileLink = screen.getByRole('link', { name: /ver perfil/i });
    expect(profileLink).toHaveAttribute('href', '/productor/ana-perez');
    expect(profileLink).toHaveClass('min-h-11');
  });

  it('mantiene una estructura contenida que no fuerza overflow horizontal', () => {
    const { container } = render(
      <MemoryRouter>
        <ProducerPopupCard producer={producer} />
      </MemoryRouter>,
    );

    expect(container.firstElementChild).toHaveClass('max-w-full', 'min-w-0');
    expect(screen.getByText('Ana Pérez').closest('div')).toHaveClass('min-w-0');
  });

  it('muestra WhatsApp, Instagram y LinkedIn con sus links correspondientes', () => {
    render(
      <MemoryRouter>
        <ProducerPopupCard producer={producer} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/5492215555555',
    );
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/ana-perez',
    );
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://linkedin.com/in/ana-perez',
    );
  });

  it('no muestra una red social sin dato configurado', () => {
    render(
      <MemoryRouter>
        <ProducerPopupCard producer={{ ...producer, whatsapp: null, redesSociales: [] }} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Instagram' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'LinkedIn' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver perfil/i })).toBeInTheDocument();
  });
});
