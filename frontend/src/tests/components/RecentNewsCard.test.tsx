import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecentNewsCard } from '@/shared/components/RecentNewsCard';
import type { CoverCrop } from '@/shared/lib/coverCrop';

const mockNewsImage = vi.hoisted(() => vi.fn(() => <div data-testid="news-image" />));

vi.mock('@/shared/components/NewsImage', () => ({
  NewsImage: mockNewsImage,
}));

const cover: CoverCrop = {
  x: -10,
  y: 20,
  zoom: 2,
  area: { x: 25, y: 10, width: 50, height: 40 },
};

describe('RecentNewsCard', () => {
  it('pasa item.cover a NewsImage, igual que PublicNewsCard', () => {
    render(
      <RecentNewsCard
        item={{
          slug: 'con-encuadre',
          category: 'Novedad',
          date: '18 jul 2026',
          title: 'Noticia con encuadre',
          href: '/noticias/con-encuadre',
          imageGradient: 'linear-gradient(#000, #fff)',
          imageUrl: 'https://example.com/foto.jpg',
          cover,
        }}
        onClick={vi.fn()}
      />,
    );

    expect(mockNewsImage).toHaveBeenCalledWith(
      expect.objectContaining({ cover }),
      expect.anything(),
    );
  });

  it('sin cover persistido, no rompe y no fuerza un encuadre', () => {
    render(
      <RecentNewsCard
        item={{
          slug: 'sin-encuadre',
          category: 'Novedad',
          date: '18 jul 2026',
          title: 'Noticia sin encuadre',
          href: '/noticias/sin-encuadre',
          imageGradient: 'linear-gradient(#000, #fff)',
          imageUrl: 'https://example.com/foto.jpg',
        }}
        onClick={vi.fn()}
      />,
    );

    expect(mockNewsImage).toHaveBeenCalledWith(
      expect.objectContaining({ cover: undefined }),
      expect.anything(),
    );
  });
});
