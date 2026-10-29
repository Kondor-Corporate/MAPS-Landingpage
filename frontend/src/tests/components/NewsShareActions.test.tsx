import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsShareActions } from '@/modules/public-web/components/NewsShareActions';
import { getNewsShareUrl, getPublicNewsUrl } from '@/shared/lib/newsShare';

describe('compartir noticias', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('WhatsApp usa la URL pública del slug codificada', () => {
    const articleUrl = getPublicNewsUrl('novedad-maps', 'https://maps.example');
    const shareUrl = getNewsShareUrl('whatsapp', 'Novedad MAPS', articleUrl);

    expect(decodeURIComponent(shareUrl)).toContain('https://maps.example/noticias/novedad-maps');
  });

  it('LinkedIn usa la URL pública del slug codificada', () => {
    const articleUrl = getPublicNewsUrl('novedad-maps', 'https://maps.example');
    const shareUrl = getNewsShareUrl('linkedin', 'Novedad MAPS', articleUrl);

    expect(shareUrl).toContain(encodeURIComponent(articleUrl));
  });

  it('copiar enlace usa la URL exacta del origen actual', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<NewsShareActions slug="novedad-maps" title="Novedad MAPS" />);

    await userEvent.click(screen.getByRole('button', { name: /copiar enlace/i }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/noticias/novedad-maps`,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/se copió al portapapeles/i);
  });

  it('muestra un fallback manual si falla Clipboard API', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<NewsShareActions slug="novedad-maps" title="Novedad MAPS" />);

    await userEvent.click(screen.getByRole('button', { name: /copiar enlace/i }));

    expect(screen.getByText(/no pudimos copiar automáticamente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enlace de la noticia/i)).toHaveValue(
      `${window.location.origin}/noticias/novedad-maps`,
    );
  });

  it('deriva el host del origen recibido y no de un dominio hardcodeado', () => {
    const url = getPublicNewsUrl('novedad-maps', 'https://sitio-real.example');

    expect(url).toBe('https://sitio-real.example/noticias/novedad-maps');
    expect(url).not.toMatch(/localhost|127\.0\.0\.1/);
  });
});
