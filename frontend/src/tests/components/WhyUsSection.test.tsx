import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WhyUsSection } from '@/modules/public-web/components/WhyUsSection';

const ATENCION_PERSONALIZADA =
  'Asesoramiento humano y experto enfocado en tus necesidades reales, con el respaldo de compañías aseguradoras.';

describe('WhyUsSection', () => {
  it('describe Atención Personalizada con el respaldo de compañías aseguradoras', () => {
    render(<WhyUsSection />);

    expect(screen.getByRole('heading', { name: 'Atención Personalizada' })).toBeInTheDocument();
    expect(screen.getByText(ATENCION_PERSONALIZADA)).toBeInTheDocument();
    expect(screen.queryByText(/Federación Patronal/i)).not.toBeInTheDocument();
  });
});
