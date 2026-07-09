import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChangePasswordForm } from '@/modules/intranet/components/ChangePasswordForm';

/**
 * MAPS-016: no ejecuta todavía (sin runner de tests wireado en el frontend,
 * ver docs/TESTING.md). Escrito siguiendo el patrón de `LoginPage.test.tsx`.
 */

function renderModal(overrides: Partial<React.ComponentProps<typeof ChangePasswordForm>> = {}) {
  const changePassword = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <ChangePasswordForm
      open
      onClose={onClose}
      changePassword={changePassword}
      onSaved={onSaved}
      {...overrides}
    />,
  );
  return { changePassword, onClose, onSaved };
}

describe('ChangePasswordForm', () => {
  it('no renderiza contenido cuando open=false', () => {
    renderModal({ open: false });
    expect(screen.queryByText('Cambiar contraseña')).not.toBeInTheDocument();
  });

  it('valida la nueva contraseña en tiempo real, antes de tocar submit', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'debil');
    expect(screen.getByText(/al menos una mayúscula/i)).toBeInTheDocument();
  });

  it('el ícono de mostrar/ocultar cambia el type del input de nueva contraseña', async () => {
    const user = userEvent.setup();
    renderModal();

    const newPasswordInput = screen.getByLabelText(/^nueva contraseña/i);
    expect(newPasswordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getAllByRole('button', { name: /mostrar contraseña/i })[1]);
    expect(newPasswordInput).toHaveAttribute('type', 'text');
  });

  it('valida coincidencia entre nueva contraseña y confirmación', async () => {
    const user = userEvent.setup();
    const { changePassword } = renderModal();

    await user.type(screen.getByLabelText(/contraseña actual/i), 'Temporal123');
    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'NuevaClave456');
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), 'OtraClave789');
    await user.click(screen.getByRole('button', { name: /^cambiar contraseña$/i }));

    expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('submit exitoso llama a changePassword, onSaved y onClose', async () => {
    const user = userEvent.setup();
    const { changePassword, onSaved, onClose } = renderModal();

    await user.type(screen.getByLabelText(/contraseña actual/i), 'Temporal123');
    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'NuevaClave456');
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), 'NuevaClave456');
    await user.click(screen.getByRole('button', { name: /^cambiar contraseña$/i }));

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'Temporal123',
      newPassword: 'NuevaClave456',
      confirmPassword: 'NuevaClave456',
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('muestra error si la contraseña actual es incorrecta (401 del backend) y no cierra el modal', async () => {
    const user = userEvent.setup();
    const changePassword = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Contraseña actual incorrecta' } },
    });
    const onClose = vi.fn();
    renderModal({ changePassword, onClose });

    await user.type(screen.getByLabelText(/contraseña actual/i), 'Incorrecta');
    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'NuevaClave456');
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), 'NuevaClave456');
    await user.click(screen.getByRole('button', { name: /^cambiar contraseña$/i }));

    expect(await screen.findByText(/contraseña actual incorrecta/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('al reabrir, los campos quedan vacíos', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ChangePasswordForm
        open
        onClose={vi.fn()}
        changePassword={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/contraseña actual/i), 'Temporal123');

    rerender(
      <ChangePasswordForm open={false} onClose={vi.fn()} changePassword={vi.fn()} onSaved={vi.fn()} />,
    );
    rerender(
      <ChangePasswordForm open onClose={vi.fn()} changePassword={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(screen.getByLabelText(/contraseña actual/i)).toHaveValue('');
  });
});
