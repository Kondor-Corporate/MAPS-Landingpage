import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PostulacionModal } from '@/modules/public-web/components/PostulacionModal';
import { createPostulacion } from '@/modules/public-web/services/postulaciones.service';

vi.mock('@/modules/public-web/services/postulaciones.service', () => ({
  createPostulacion: vi.fn(),
}));

const createPostulacionMock = vi.mocked(createPostulacion);

const CONSENT_TEXT =
  'Acepto que los datos ingresados sean utilizados para gestionar y evaluar mi postulación.';

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nombre completo/i), 'Ana Gómez');
  await user.type(screen.getByLabelText(/^dni/i), '30111222');
  await user.type(screen.getByLabelText(/teléfono/i), '2215550101');
  await user.type(screen.getByLabelText(/matrícula/i), 'MAT-100');
  await user.type(screen.getByLabelText(/localidad/i), 'La Plata');
  await user.click(screen.getByRole('radio', { name: 'Soy productor nuevo' }));
}

describe('PostulacionModal', () => {
  beforeEach(() => {
    createPostulacionMock.mockReset();
    createPostulacionMock.mockResolvedValue(undefined);
    // El modal enfoca el cierre en un frame. Si ese frame corre entre teclas,
    // userEvent pierde el foco del input.
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el consentimiento desmarcado y sin enlace a una política', () => {
    render(<PostulacionModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('checkbox', { name: CONSENT_TEXT })).not.toBeChecked();
    expect(screen.getByText(CONSENT_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/privacidad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/política/i)).not.toBeInTheDocument();
  });

  it('no envía la postulación si el consentimiento no está marcado', async () => {
    const user = userEvent.setup();
    render(<PostulacionModal isOpen onClose={vi.fn()} />);

    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Enviar postulación' }));

    expect(
      screen.getByText('Debés aceptar el uso de tus datos para enviar la postulación.'),
    ).toBeInTheDocument();
    expect(createPostulacionMock).not.toHaveBeenCalled();
  });

  it('envía consentimiento true una sola vez cuando el checkbox está marcado', async () => {
    const user = userEvent.setup();
    render(<PostulacionModal isOpen onClose={vi.fn()} />);

    await fillValid(user);
    const consent = screen.getByRole('checkbox', { name: CONSENT_TEXT });
    await user.click(consent);
    expect(consent).toBeChecked();
    expect(screen.getByLabelText(/nombre completo/i)).toHaveValue('Ana Gómez');
    await user.click(screen.getByRole('button', { name: 'Enviar postulación' }));

    expect(createPostulacionMock).toHaveBeenCalledTimes(1);
    const payload = createPostulacionMock.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      nombreCompleto: 'Ana Gómez',
      dni: '30111222',
      telefono: '2215550101',
      matricula: 'MAT-100',
      localidad: 'La Plata',
      situacion: 'PRODUCTOR_NUEVO',
      consentimiento: true,
    });
    expect(payload).not.toHaveProperty('consentedAt');
    expect(payload).not.toHaveProperty('privacyVersion');
  });
});
