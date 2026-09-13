import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LibraryRamoCard } from '@/modules/intranet/components/LibraryRamoCard';
import type { Ramo } from '@/modules/admin/types/library';

function makeRamo(overrides: Partial<Ramo> = {}): Ramo {
  return {
    id: '1',
    nombre: 'Automotores',
    descripcion: 'Material comercial de flota.',
    icono: 'car',
    gdriveUrl: 'https://drive.google.com/drive/folders/XXXX',
    tipo: 'PRINCIPAL',
    orden: 1,
    activo: true,
    creadoEn: '2026-01-01T00:00:00.000Z',
    modificadoEn: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('LibraryRamoCard', () => {
  it('con URL configurada ofrece un enlace al material', () => {
    render(<LibraryRamoCard ramo={makeRamo()} />);

    const action = screen.getByRole('link', { name: 'Explorar contenido' });
    expect(action).toHaveAttribute('href', 'https://drive.google.com/drive/folders/XXXX');
    expect(action).toHaveAttribute('target', '_blank');
    expect(action).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('sin URL o solo whitespace muestra material no disponible', () => {
    const { rerender } = render(<LibraryRamoCard ramo={makeRamo({ gdriveUrl: '' })} />);

    const unavailable = screen.getByRole('button', { name: 'Material en preparación' });
    expect(unavailable).toBeDisabled();
    expect(unavailable).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('link', { name: 'Explorar contenido' })).not.toBeInTheDocument();

    rerender(<LibraryRamoCard ramo={makeRamo({ gdriveUrl: '   ' })} />);
    expect(screen.getByRole('button', { name: 'Material en preparación' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Explorar contenido' })).not.toBeInTheDocument();
  });
});
