import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProducerFormModal } from '@/modules/admin/components/ProducerFormModal';
import type { Producer } from '@/modules/admin/types/producer';

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0);
    return 1;
  });
});

type PickedLocation = {
  direccion: string;
  latitud?: number;
  longitud?: number;
  source: 'cleared' | 'geocoded' | 'manual';
};

vi.mock('@/shared/components/map/AddressMapPicker', () => ({
  AddressMapPicker: ({
    direccion,
    initialCoords,
    onChange,
  }: {
    direccion: string;
    initialCoords?: { latitud: number; longitud: number } | null;
    onChange: (location: PickedLocation) => void;
  }) => (
    <div>
      <span data-testid="picker-address">{direccion}</span>
      <span data-testid="picker-latitude">{initialCoords?.latitud ?? ''}</span>
      <span data-testid="picker-longitude">{initialCoords?.longitud ?? ''}</span>
      <button
        type="button"
        onClick={() =>
          onChange({
            direccion: 'Calle 50 1000, La Plata, Buenos Aires, Argentina',
            latitud: -34.9214,
            longitud: -57.9545,
            source: 'manual',
          })
        }
      >
        Simular ubicación confirmada
      </button>
    </div>
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

  it('flujo admin: inicializa el picker con dirección y coordenadas guardadas', () => {
    renderModal({
      mode: 'edit',
      producer: {
        ...BASE_PRODUCER,
        direccion: 'Calle 12 345, La Plata',
        latitud: -34.9123,
        longitud: -57.9456,
      },
    });

    expect(screen.getByTestId('picker-address')).toHaveTextContent(
      'Calle 12 345, La Plata',
    );
    expect(screen.getByTestId('picker-latitude')).toHaveTextContent('-34.9123');
    expect(screen.getByTestId('picker-longitude')).toHaveTextContent('-57.9456');
  });

  it('flujo admin: el payload incluye ambas coordenadas manuales', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal({ mode: 'edit', producer: BASE_PRODUCER });

    await user.click(screen.getByRole('button', { name: /simular ubicación confirmada/i }));
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        direccion: 'Calle 50 1000, La Plata, Buenos Aires, Argentina',
        latitud: -34.9214,
        longitud: -57.9545,
      }),
    );
  });

  it('flujo admin: al reabrir usa las coordenadas guardadas más recientes', () => {
    const initialProducer = {
      ...BASE_PRODUCER,
      direccion: 'Calle 12 345, La Plata',
      latitud: -34.9123,
      longitud: -57.9456,
    };
    const { rerender } = render(
      <ProducerFormModal
        isOpen
        onClose={vi.fn()}
        mode="edit"
        producer={initialProducer}
        onSubmit={vi.fn()}
      />,
    );

    rerender(
      <ProducerFormModal
        isOpen={false}
        onClose={vi.fn()}
        mode="edit"
        producer={initialProducer}
        onSubmit={vi.fn()}
      />,
    );
    rerender(
      <ProducerFormModal
        isOpen
        onClose={vi.fn()}
        mode="edit"
        producer={{
          ...initialProducer,
          direccion: 'Calle 50 1000, La Plata',
          latitud: -35.1234,
          longitud: -58.5678,
        }}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId('picker-address')).toHaveTextContent(
      'Calle 50 1000, La Plata',
    );
    expect(screen.getByTestId('picker-latitude')).toHaveTextContent('-35.1234');
    expect(screen.getByTestId('picker-longitude')).toHaveTextContent('-58.5678');
  });

  it('modo create: valida la contraseña en tiempo real, antes de tocar submit', async () => {
    const user = userEvent.setup();
    renderModal({ mode: 'create' });

    const passwordInput = screen.getByLabelText(/contraseña inicial/i);
    await user.type(passwordInput, 'debilpass');

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
