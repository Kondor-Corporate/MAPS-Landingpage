import { render, screen, waitFor } from '@testing-library/react';
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
  redesSociales: [
    { plataforma: 'instagram', url: 'https://instagram.com/lucas', orden: 0 },
    { plataforma: 'linkedin', url: 'https://linkedin.com/in/lucas', orden: 1 },
  ],
  certificaciones: [],
  email: 'lucas@example.com',
};

function makeImageFile(name = 'avatar.png', type = 'image/png') {
  return new File(['contenido'], name, { type });
}

function getFileInput() {
  return screen.getByLabelText(/seleccionar foto de perfil/i) as HTMLInputElement;
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

    const file = makeImageFile();

    await user.upload(getFileInput(), file);

    expect(onUploadFoto).toHaveBeenCalledWith(file);
  });

  it('archivo mayor a 5MB no llama a onUploadFoto y muestra error', async () => {
    const user = userEvent.setup();
    const onUploadFoto = vi.fn();
    render(<ProfileHeaderCard profile={PROFILE} onUploadFoto={onUploadFoto} />);

    const bigFile = makeImageFile();
    Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 });

    await user.upload(getFileInput(), bigFile);

    expect(onUploadFoto).not.toHaveBeenCalled();
    expect(screen.getByText(/tamaño máximo de 5 mb/i)).toBeInTheDocument();
  });

  it('un PDF como avatar muestra un mensaje humano y permite elegir otro archivo', async () => {
    const user = userEvent.setup();
    const onUploadFoto = vi.fn().mockResolvedValue(undefined);
    render(<ProfileHeaderCard profile={PROFILE} onUploadFoto={onUploadFoto} />);

    await user.upload(
      getFileInput(),
      new File(['%PDF'], 'documento.pdf', { type: 'application/pdf' }),
    );

    expect(screen.getByText('La foto debe ser JPG, PNG o WEBP.')).toBeInTheDocument();
    expect(onUploadFoto).not.toHaveBeenCalled();

    const image = makeImageFile();
    await user.upload(getFileInput(), image);
    expect(onUploadFoto).toHaveBeenCalledWith(image);
  });

  it('muestra error si onUploadFoto rechaza', async () => {
    const user = userEvent.setup();
    const onUploadFoto = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'No se pudo subir la imagen' } },
    });
    render(<ProfileHeaderCard profile={PROFILE} onUploadFoto={onUploadFoto} />);

    await user.upload(getFileInput(), makeImageFile());

    expect(await screen.findByText(/no se pudo subir la imagen/i)).toBeInTheDocument();
  });

  it('no muestra el mensaje técnico de Axios y conserva la foto anterior', async () => {
    const user = userEvent.setup();
    const onUploadFoto = vi.fn().mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: { status: 400, data: {} },
    });
    render(
      <ProfileHeaderCard
        profile={{ ...PROFILE, foto: '/foto-anterior.webp' }}
        onUploadFoto={onUploadFoto}
      />,
    );

    await user.upload(getFileInput(), makeImageFile());

    expect(await screen.findByText(/no se pudo subir la foto/i)).toBeInTheDocument();
    expect(screen.queryByText(/status code 400/i)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: PROFILE.nombreCompleto })).toHaveAttribute(
      'src',
      '/foto-anterior.webp',
    );
  });

  it('deshabilita el control durante el upload y permite reintentar después de un error', async () => {
    const user = userEvent.setup();
    let resolveUpload!: () => void;
    const pendingUpload = new Promise<void>((resolve) => {
      resolveUpload = resolve;
    });
    const onUploadFoto = vi
      .fn()
      .mockRejectedValueOnce(new Error('falló'))
      .mockReturnValueOnce(pendingUpload);
    render(<ProfileHeaderCard profile={PROFILE} onUploadFoto={onUploadFoto} />);

    const file = makeImageFile();
    await user.upload(getFileInput(), file);
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo subir la foto/i);

    await user.upload(getFileInput(), file);
    expect(screen.getByRole('button', { name: /cambiar foto de perfil/i })).toBeDisabled();
    expect(getFileInput()).toBeDisabled();

    resolveUpload();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /cambiar foto de perfil/i })).toBeEnabled(),
    );
    expect(onUploadFoto).toHaveBeenCalledTimes(2);
  });

  it('no muestra un botón de Email aunque el perfil tenga email', () => {
    render(<ProfileHeaderCard profile={PROFILE} />);
    expect(screen.queryByRole('link', { name: /email/i })).not.toBeInTheDocument();
  });

  it('muestra Instagram y LinkedIn junto a los demás datos de contacto', () => {
    render(<ProfileHeaderCard profile={PROFILE} />);
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/lucas',
    );
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://linkedin.com/in/lucas',
    );
  });
});
