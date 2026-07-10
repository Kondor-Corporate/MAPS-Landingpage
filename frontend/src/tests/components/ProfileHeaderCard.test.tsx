import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfileHeaderCard } from '@/shared/components/profile/ProfileHeaderCard';
import type { ProfileHeaderData } from '@/shared/types/producerProfile';

/**
 * No ejecuta todavía (sin runner de tests wireado en el frontend, ver docs/TESTING.md).
 * Escrito siguiendo el patrón de `LoginPage.test.tsx`.
 */

const PROFILE: ProfileHeaderData = {
  slug: 'lucas-legorburu',
  nombre: 'Lucas',
  apellido: 'Legorburu',
  nombreCompleto: 'Lucas Legorburu',
  tituloProfesional: 'Productor de Seguros',
  matricula: '33497',
  verificado: true,
  bio: null,
  ciudad: 'Diagonal 75 172',
  direccion: null,
  idiomas: [],
  foto: null,
  telefono: null,
  whatsapp: null,
  anosExperiencia: null,
  clientesActivos: null,
  latitud: null,
  longitud: null,
  especialidades: [],
  redesSociales: [],
  certificaciones: [],
  email: 'lucas@example.com',
};

function makeImageFile(name = 'avatar.png', type = 'image/png') {
  return new File(['contenido'], name, { type });
}

describe('ProfileHeaderCard', () => {
  it('variant intranet con onUploadFoto: el avatar es clickeable', () => {
    render(<ProfileHeaderCard profile={PROFILE} onUploadFoto={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cambiar foto de perfil/i })).toBeInTheDocument();
  });

  it('variant public: el avatar NO es clickeable aunque se pase onUploadFoto', () => {
    render(<ProfileHeaderCard profile={PROFILE} onUploadFoto={vi.fn()} variant="public" />);
    expect(
      screen.queryByRole('button', { name: /cambiar foto de perfil/i }),
    ).not.toBeInTheDocument();
  });

  it('sin onUploadFoto: el avatar no es clickeable', () => {
    render(<ProfileHeaderCard profile={PROFILE} />);
    expect(
      screen.queryByRole('button', { name: /cambiar foto de perfil/i }),
    ).not.toBeInTheDocument();
  });

  it('seleccionar una imagen llama a onUploadFoto con el archivo', async () => {
    const user = userEvent.setup();
    const onUploadFoto = vi.fn().mockResolvedValue(undefined);
    render(<ProfileHeaderCard profile={PROFILE} onUploadFoto={onUploadFoto} />);

    const trigger = screen.getByRole('button', { name: /cambiar foto de perfil/i });
    const input = trigger.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeImageFile();

    await user.upload(input, file);

    expect(onUploadFoto).toHaveBeenCalledWith(file);
  });

  it('archivo mayor a 5MB no llama a onUploadFoto y muestra error', async () => {
    const user = userEvent.setup();
    const onUploadFoto = vi.fn();
    render(<ProfileHeaderCard profile={PROFILE} onUploadFoto={onUploadFoto} />);

    const trigger = screen.getByRole('button', { name: /cambiar foto de perfil/i });
    const input = trigger.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = makeImageFile();
    Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 });

    await user.upload(input, bigFile);

    expect(onUploadFoto).not.toHaveBeenCalled();
    expect(screen.getByText(/no puede superar los 5mb/i)).toBeInTheDocument();
  });

  it('muestra error si onUploadFoto rechaza', async () => {
    const user = userEvent.setup();
    const onUploadFoto = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'No se pudo subir la imagen' } },
    });
    render(<ProfileHeaderCard profile={PROFILE} onUploadFoto={onUploadFoto} />);

    const trigger = screen.getByRole('button', { name: /cambiar foto de perfil/i });
    const input = trigger.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, makeImageFile());

    expect(await screen.findByText(/no se pudo subir la imagen/i)).toBeInTheDocument();
  });
});
