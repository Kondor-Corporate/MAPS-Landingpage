import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProducerFormModal } from '@/modules/admin/components/ProducerFormModal';
import type { Producer } from '@/modules/admin/types/producer';

/**
 * MAPS-016: no ejecuta todavía (no hay runner de tests wireado en el frontend,
 * ver docs/TESTING.md). Escrito siguiendo el patrón de `LoginPage.test.tsx`
 * para quedar listo apenas se agregue vitest/jsdom/msw al proyecto.
 */

type PickedLocation = {
  direccion: string;
  latitud?: number;
  longitud?: number;
  source: 'cleared' | 'geocoded' | 'manual';
};

// AddressMapPicker usa maplibre-gl (WebGL) — se reemplaza por un stub liviano
// que expone un botón para simular una ubicación confirmada.
vi.mock('@/shared/components/map/AddressMapPicker', () => ({
  AddressMapPicker: ({ onChange }: { onChange: (location: PickedLocation) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          direccion: 'Calle 7 776, La Plata, Buenos Aires, Argentina',
          latitud: -34.9214,
          longitud: -57.9545,
          source: 'manual',
        })
      }
    >
      Simular ubicación confirmada
    </button>
  ),
}));

const BASE_PRODUCER: Producer = {
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

function renderModal(props: Partial<React.ComponentProps<typeof ProducerFormModal>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <ProducerFormModal isOpen onClose={onClose} mode="create" onSubmit={onSubmit} {...props} />,
  );
  return { onSubmit, onClose };
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^nombre/i), 'Nuevo');
  await user.type(screen.getByLabelText(/^apellido/i), 'Productor');
  await user.type(screen.getByLabelText(/^email/i), 'nuevo@example.com');
  await user.click(screen.getByRole('button', { name: /simular ubicación confirmada/i }));
}

describe('ProducerFormModal', () => {
  it('modo create: renderiza campos de contraseña inicial y confirmación', () => {
    renderModal({ mode: 'create' });

    expect(screen.getByLabelText(/contraseña inicial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
  });

  it('modo edit: NO renderiza campos de contraseña', () => {
    renderModal({ mode: 'edit', producer: BASE_PRODUCER });

    expect(screen.queryByLabelText(/contraseña inicial/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/confirmar contraseña/i)).not.toBeInTheDocument();
  });

  it('modo create: confirmación distinta a la contraseña muestra error y no llama onSubmit', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal({ mode: 'create' });

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/contraseña inicial/i), 'Temporal123');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Distinta456');
    await user.click(screen.getByRole('button', { name: /crear productor/i }));

    expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('modo create: contraseña débil (sin mayúscula/número) muestra error y no llama onSubmit', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal({ mode: 'create' });

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/contraseña inicial/i), 'debil');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'debil');
    await user.click(screen.getByRole('button', { name: /crear productor/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('modo create: submit válido llama onSubmit con password incluido', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal({ mode: 'create' });

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/contraseña inicial/i), 'Temporal123');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Temporal123');
    await user.click(screen.getByRole('button', { name: /crear productor/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ password: 'Temporal123' }));
  });

  it('modo update: payload no incluye password', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal({ mode: 'edit', producer: BASE_PRODUCER });

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.not.objectContaining({ password: expect.anything() }),
    );
  });

  it('modo create: valida la contraseña en tiempo real, antes de tocar submit', async () => {
    const user = userEvent.setup();
    renderModal({ mode: 'create' });

    const passwordInput = screen.getByLabelText(/contraseña inicial/i);
    await user.type(passwordInput, 'debil');

    expect(screen.getByText(/al menos una mayúscula/i)).toBeInTheDocument();

    await user.type(passwordInput, '1234A');
    expect(screen.queryByText(/al menos una mayúscula/i)).not.toBeInTheDocument();
  });

  it('modo create: la confirmación se valida en tiempo real al escribir', async () => {
    const user = userEvent.setup();
    renderModal({ mode: 'create' });

    await user.type(screen.getByLabelText(/contraseña inicial/i), 'Temporal123');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Distinta456');

    expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/confirmar contraseña/i));
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Temporal123');

    expect(screen.queryByText(/no coinciden/i)).not.toBeInTheDocument();
  });

  it('modo create: el ícono de mostrar/ocultar cambia el type del input', async () => {
    const user = userEvent.setup();
    renderModal({ mode: 'create' });

    const passwordInput = screen.getByLabelText(/contraseña inicial/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getAllByRole('button', { name: /mostrar contraseña/i })[0]);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getAllByRole('button', { name: /ocultar contraseña/i })[0]);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('cierra y reabre en modo create: los campos de contraseña quedan vacíos', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ProducerFormModal isOpen onClose={vi.fn()} mode="create" onSubmit={vi.fn()} />,
    );

    await user.type(screen.getByLabelText(/contraseña inicial/i), 'Temporal123');
    expect(screen.getByLabelText(/contraseña inicial/i)).toHaveValue('Temporal123');

    rerender(<ProducerFormModal isOpen={false} onClose={vi.fn()} mode="create" onSubmit={vi.fn()} />);
    rerender(<ProducerFormModal isOpen onClose={vi.fn()} mode="create" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/contraseña inicial/i)).toHaveValue('');
  });
});
