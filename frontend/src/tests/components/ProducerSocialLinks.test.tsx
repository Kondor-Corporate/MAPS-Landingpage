import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProducerSocialLinks } from '@/shared/components/profile/ProducerSocialLinks';

describe('ProducerSocialLinks', () => {
  it('no renderiza nada si no hay ninguna red social configurada', () => {
    const { container } = render(
      <ProducerSocialLinks whatsapp={null} redesSociales={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('solo muestra las redes con datos válidos', () => {
    render(
      <ProducerSocialLinks
        whatsapp="5491100000000"
        redesSociales={[{ plataforma: 'instagram', url: 'https://instagram.com/x', orden: 0 }]}
      />,
    );

    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/5491100000000',
    );
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/x',
    );
    expect(screen.queryByRole('link', { name: 'LinkedIn' })).not.toBeInTheDocument();
  });

  it('usa target="_blank" y rel seguro en los links externos', () => {
    render(
      <ProducerSocialLinks
        whatsapp={null}
        redesSociales={[{ plataforma: 'linkedin', url: 'https://linkedin.com/in/x', orden: 0 }]}
      />,
    );

    const link = screen.getByRole('link', { name: 'LinkedIn' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
