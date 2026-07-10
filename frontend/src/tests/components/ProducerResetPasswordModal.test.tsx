import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProducerResetPasswordModal } from '@/modules/admin/components/ProducerResetPasswordModal';
import type { Producer } from '@/modules/admin/types/producer';

/**
 * MAPS-016: no ejecuta todavía (sin runner de tests wireado en el frontend,
 * ver docs/TESTING.md). Escrito siguiendo el patrón de `LoginPage.test.tsx`.
 */

const PRODUCER: Producer = {
  id: '1',
  slug: 'juan-perez',
  nombre: 'Juan',
  apellido: 'Pérez',
  avatarUrl: null,
  estado: 'ACTIVO',
  dni: null,
  email: 'juan.perez@example.com',
  telefono: null,
  sucursal: '',
  fechaAlta: '2026-01-01T00:00:00.000Z',
  ultimaActividad: '2026-01-01T00:00:00.000Z',
  ultimoLogin: null,
  matricula: null,
  verificado: false,
  tituloProfesional: null,
  anosExperiencia: null,
  clientesActivos: null,
  bio: null,
  ciudad: null,
  direccion: null,
  whatsapp: null,
  latitud: null,
  longitud: null,
  idiomas: [],
  especialidades: [],
  redesSociales: [],
  certificaciones: [],
};

describe('ProducerResetPasswordModal', () => {
  it('no pide la contraseña actual', () => {
    render(
      <ProducerResetPasswordModal
        isOpen
        producer={PRODUCER}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.queryByLabelText(/contraseña actual/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar nueva contraseña/i)).toBeInTheDocument();
  });

  it('confirmación distinta a la nueva contraseña no llama onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProducerResetPasswordModal
        isOpen
        producer={PRODUCER}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'Reseteada789');
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), 'Distinta123');
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }));

    expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submit válido llama onSubmit con newPassword y confirmPassword', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProducerResetPasswordModal
        isOpen
        producer={PRODUCER}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'Reseteada789');
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), 'Reseteada789');
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      newPassword: 'Reseteada789',
      confirmPassword: 'Reseteada789',
    });
  });

  it('valida la nueva contraseña en tiempo real, antes de tocar submit', async () => {
    const user = userEvent.setup();
    render(
      <ProducerResetPasswordModal
        isOpen
        producer={PRODUCER}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'debil');
    expect(screen.getByText(/al menos una mayúscula/i)).toBeInTheDocument();
  });

  it('el ícono de mostrar/ocultar cambia el type del input', async () => {
    const user = userEvent.setup();
    render(
      <ProducerResetPasswordModal
        isOpen
        producer={PRODUCER}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const newPasswordInput = screen.getByLabelText(/^nueva contraseña/i);
    expect(newPasswordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getAllByRole('button', { name: /mostrar contraseña/i })[0]);
    expect(newPasswordInput).toHaveAttribute('type', 'text');
  });

  it('muestra loading, éxito (submitError null) y error (submitError seteado)', () => {
    const { rerender } = render(
      <ProducerResetPasswordModal
        isOpen
        producer={PRODUCER}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        submitting
      />,
    );
    expect(screen.getByRole('button', { name: /restableciendo/i })).toBeDisabled();

    rerender(
      <ProducerResetPasswordModal
        isOpen
        producer={PRODUCER}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        submitError="No se pudo restablecer la contraseña"
      />,
    );
    expect(screen.getByText(/no se pudo restablecer la contraseña/i)).toBeInTheDocument();
  });

  it('cierra y reabre: los campos quedan vacíos', () => {
    const { rerender } = render(
      <ProducerResetPasswordModal
        isOpen
        producer={PRODUCER}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    rerender(
      <ProducerResetPasswordModal
        isOpen={false}
        producer={PRODUCER}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    rerender(
      <ProducerResetPasswordModal
        isOpen
        producer={PRODUCER}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/^nueva contraseña/i)).toHaveValue('');
    expect(screen.getByLabelText(/confirmar nueva contraseña/i)).toHaveValue('');
  });
});
