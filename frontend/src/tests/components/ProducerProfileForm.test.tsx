import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProducerProfileForm } from '@/modules/intranet/components/ProducerProfileForm';
import type { ProducerProfile } from '@/modules/intranet/types/producerProfile';

vi.mock('@/shared/components/map/AddressMapPicker', () => ({
  AddressMapPicker: ({
    direccion,
    initialCoords,
    onChange,
  }: {
    direccion: string;
    initialCoords?: { latitud: number; longitud: number } | null;
    onChange: (location: {
      direccion: string;
      latitud?: number;
      longitud?: number;
      source: 'cleared' | 'geocoded' | 'manual';
    }) => void;
  }) => (
    <div>
      <span data-testid="profile-picker-address">{direccion}</span>
      <span data-testid="profile-picker-latitude">{initialCoords?.latitud ?? ''}</span>
      <span data-testid="profile-picker-longitude">{initialCoords?.longitud ?? ''}</span>
      <button
        type="button"
        onClick={() =>
          onChange({
            direccion: 'Calle 50 1000, La Plata',
            latitud: -35.1111,
            longitud: -58.2222,
            source: 'manual',
          })
        }
      >
        Mover pin de perfil
      </button>
    </div>
  ),
}));

const PROFILE: ProducerProfile = {
  id: 1,
  email: 'productor@example.com',
  slug: 'juan-perez',
  nombre: 'Juan',
  apellido: 'Pérez',
  nombreCompleto: 'Juan Pérez',
  tituloProfesional: null,
  matricula: null,
  verificado: true,
  bio: null,
  ciudad: 'La Plata',
  direccion: 'Calle 12 345, La Plata',
  idiomas: [],
  foto: null,
  telefono: null,
  whatsapp: null,
  anosExperiencia: null,
  clientesActivos: null,
  latitud: -34.9123,
  longitud: -57.9456,
  especialidades: [],
  redesSociales: [],
  certificaciones: [],
};

function renderForm(profile = PROFILE) {
  const updateProfile = vi.fn().mockResolvedValue(profile);
  render(
    <ProducerProfileForm
      open
      onClose={vi.fn()}
      profile={profile}
      onSaved={vi.fn()}
      updateProfile={updateProfile}
      uploadCertificacion={vi.fn()}
      deleteCertificacion={vi.fn()}
    />,
  );
  return { updateProfile };
}

describe('ProducerProfileForm coordinate flow', () => {
  it('flujo productor: inicializa dirección y coordenadas persistidas', () => {
    renderForm();

    expect(screen.getByTestId('profile-picker-address')).toHaveTextContent(
      'Calle 12 345, La Plata',
    );
    expect(screen.getByTestId('profile-picker-latitude')).toHaveTextContent('-34.9123');
    expect(screen.getByTestId('profile-picker-longitude')).toHaveTextContent('-57.9456');
  });

  it('flujo productor: mover el pin incluye latitud y longitud en el PATCH', async () => {
    const user = userEvent.setup();
    const { updateProfile } = renderForm();

    await user.click(screen.getByRole('button', { name: /mover pin de perfil/i }));
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));

    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        direccion: 'Calle 50 1000, La Plata',
        latitud: -35.1111,
        longitud: -58.2222,
      }),
    );
  });

  it('flujo productor: al reabrir refleja las últimas coordenadas guardadas', () => {
    const updateProfile = vi.fn().mockResolvedValue(PROFILE);
    const commonProps = {
      onClose: vi.fn(),
      onSaved: vi.fn(),
      updateProfile,
      uploadCertificacion: vi.fn(),
      deleteCertificacion: vi.fn(),
    };
    const { rerender } = render(
      <ProducerProfileForm open profile={PROFILE} {...commonProps} />,
    );

    rerender(<ProducerProfileForm open={false} profile={PROFILE} {...commonProps} />);
    rerender(
      <ProducerProfileForm
        open
        profile={{
          ...PROFILE,
          direccion: 'Calle 50 1000, La Plata',
          latitud: -35.1111,
          longitud: -58.2222,
        }}
        {...commonProps}
      />,
    );

    expect(screen.getByTestId('profile-picker-address')).toHaveTextContent(
      'Calle 50 1000, La Plata',
    );
    expect(screen.getByTestId('profile-picker-latitude')).toHaveTextContent('-35.1111');
    expect(screen.getByTestId('profile-picker-longitude')).toHaveTextContent('-58.2222');
  });

  it('conserva campos sin guardar cuando se actualizan las certificaciones', async () => {
    const user = userEvent.setup();
    const commonProps = {
      onClose: vi.fn(),
      onSaved: vi.fn(),
      updateProfile: vi.fn().mockResolvedValue(PROFILE),
      uploadCertificacion: vi.fn(),
      deleteCertificacion: vi.fn(),
    };
    const { rerender } = render(
      <ProducerProfileForm open profile={PROFILE} {...commonProps} />,
    );
    const bio = screen.getByLabelText(/trayectoria/i);
    await user.type(bio, 'Texto todavía no guardado');

    rerender(
      <ProducerProfileForm
        open
        profile={{
          ...PROFILE,
          certificaciones: [
            {
              id: 10,
              nombre: 'Certificación nueva',
              archivoUrl: '/certificacion.pdf',
              tamanoBytes: 1024,
              mimeType: 'application/pdf',
            },
          ],
        }}
        {...commonProps}
      />,
    );

    expect(bio).toHaveValue('Texto todavía no guardado');
    expect(screen.getByText('Certificación nueva')).toBeInTheDocument();
  });
});
