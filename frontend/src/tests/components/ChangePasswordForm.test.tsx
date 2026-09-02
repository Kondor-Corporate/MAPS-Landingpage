import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChangePasswordForm,
  PASSWORD_CHANGE_SUCCESS_REDIRECT_MS,
} from '@/modules/auth/components/ChangePasswordForm';

/**
 * MAPS-016 / D1A: no ejecuta todavía (sin runner de tests wireado en el frontend,
 * ver docs/TESTING.md). Escrito siguiendo el patrón de `LoginPage.test.tsx`.
 */

afterEach(() => {
  vi.useRealTimers();
});

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

  it('en el estado formulario el botón cerrar del modal está visible', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /cerrar modal/i })).toBeInTheDocument();
  });

  it('durante el envío el botón cerrar sigue visible', async () => {
    let resolveChange!: () => void;
    const changePassword = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveChange = resolve;
        }),
    );
    const user = userEvent.setup();
    renderModal({ changePassword });

    await user.type(screen.getByLabelText(/contraseña actual/i), 'Temporal123');
    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'NuevaClave456');
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), 'NuevaClave456');
    await user.click(screen.getByRole('button', { name: /^cambiar contraseña$/i }));

    expect(screen.getByText('Guardando…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar modal/i })).toBeInTheDocument();
    resolveChange();
  });

  it('escribir varios caracteres mantiene el foco en el input activo', async () => {
    const user = userEvent.setup();
    renderModal();

    const current = screen.getByLabelText(/contraseña actual/i);
    await user.type(current, 'Temporal123');
    expect(current).toHaveFocus();

    const next = screen.getByLabelText(/^nueva contraseña/i);
    await user.type(next, 'NuevaClave456');
    expect(next).toHaveFocus();

    const confirm = screen.getByLabelText(/confirmar nueva contraseña/i);
    await user.type(confirm, 'NuevaClave456');
    expect(confirm).toHaveFocus();
  });

  it('tras éxito muestra confirmación, no llama onSaved de inmediato y luego lo hace una sola vez', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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

    expect(await screen.findByText('Contraseña actualizada')).toBeInTheDocument();
    expect(screen.getByText(/por seguridad, tenés que iniciar sesión nuevamente/i)).toBeInTheDocument();
    expect(screen.getByText(/redirigiendo al inicio de sesión/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña actual/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cambiar contraseña$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cancelar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cerrar modal/i })).not.toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(PASSWORD_CHANGE_SUCCESS_REDIRECT_MS - 1);
    expect(onSaved).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('muestra error si la contraseña actual es incorrecta (400 del backend) y no cierra el modal', async () => {
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
