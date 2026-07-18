import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AddressMapPicker,
  type PickedLocation,
} from '@/shared/components/map/AddressMapPicker';

const geocodeQueryMock = vi.hoisted(() => vi.fn());
const reverseGeocodeQueryMock = vi.hoisted(() => vi.fn());
const dragCoordinatesMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/geocode', () => ({
  geocodeQuery: geocodeQueryMock,
  reverseGeocodeQuery: reverseGeocodeQueryMock,
}));

vi.mock('react-map-gl/maplibre', async () => {
  const ReactModule = await import('react');

  return {
    default: ReactModule.forwardRef(
      (
        { children }: { children: React.ReactNode },
        ref: React.ForwardedRef<{ flyTo: ReturnType<typeof vi.fn> }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({ flyTo: vi.fn() }));
        return <div data-testid="map">{children}</div>;
      },
    ),
    Marker: ({
      children,
      latitude,
      longitude,
      onDragEnd,
    }: {
      children: React.ReactNode;
      latitude: number;
      longitude: number;
      onDragEnd: (event: { lngLat: { lat: number; lng: number } }) => void;
    }) => (
      <button
        type="button"
        aria-label="pin"
        data-latitude={latitude}
        data-longitude={longitude}
      onClick={() => onDragEnd({ lngLat: dragCoordinatesMock() })}
      >
        {children}
      </button>
    ),
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

function renderPicker({
  direccion = 'Calle 7 776, La Plata',
  initialCoords = { latitud: -34.9214, longitud: -57.9545 },
  onChange = vi.fn(),
}: {
  direccion?: string;
  initialCoords?: React.ComponentProps<typeof AddressMapPicker>['initialCoords'];
  onChange?: (location: PickedLocation) => void;
} = {}) {
  render(
    <AddressMapPicker
      direccion={direccion}
      initialCoords={initialCoords}
      onChange={onChange}
    />,
  );
  return { onChange };
}

describe('AddressMapPicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    geocodeQueryMock.mockReset();
    reverseGeocodeQueryMock.mockReset();
    reverseGeocodeQueryMock.mockResolvedValue('Calle 50 1000, La Plata');
    dragCoordinatesMock.mockReset();
    dragCoordinatesMock.mockReturnValue({ lat: -35.1234, lng: -58.5678 });
  });

  it('monta coordenadas number y muestra el pin inmediatamente', () => {
    renderPicker();

    expect(screen.getByRole('button', { name: 'pin' })).toHaveAttribute(
      'data-latitude',
      '-34.9214',
    );
    expect(screen.getByText(/ubicación encontrada/i)).toBeInTheDocument();
    expect(geocodeQueryMock).not.toHaveBeenCalled();
  });

  it('normaliza strings numéricos al montar', () => {
    renderPicker({
      initialCoords: { latitud: '-34.9301', longitud: '-57.9412' },
    });

    const pin = screen.getByRole('button', { name: 'pin' });
    expect(pin).toHaveAttribute('data-latitude', '-34.9301');
    expect(pin).toHaveAttribute('data-longitude', '-57.9412');
  });

  it('rechaza coordenadas null y geocodifica una dirección inicial válida', async () => {
    geocodeQueryMock.mockResolvedValue(null);
    renderPicker({ initialCoords: null });

    expect(screen.queryByRole('button', { name: 'pin' })).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(geocodeQueryMock).toHaveBeenCalledWith('Calle 7 776, La Plata');
  });

  it('prioriza dirección y coordenadas existentes sin geocodificar', () => {
    renderPicker();

    expect(screen.getByDisplayValue('Calle 7 776, La Plata')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'pin' })).toBeInTheDocument();
    expect(geocodeQueryMock).not.toHaveBeenCalled();
  });

  it('el montaje no emite source cleared', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('el drag actualiza latitud y longitud', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });

    fireEvent.click(screen.getByRole('button', { name: 'pin' }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ latitud: -35.1234, longitud: -58.5678 }),
    );
  });

  it('el drag establece el origen manual', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });

    fireEvent.click(screen.getByRole('button', { name: 'pin' }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: 'manual' }),
    );
    expect(screen.getByText(/buscando dirección/i)).toBeInTheDocument();
  });

  it('reverse geocode actualiza solo la dirección y conserva las coordenadas exactas', async () => {
    const onChange = vi.fn();
    renderPicker({ onChange });

    fireEvent.click(screen.getByRole('button', { name: 'pin' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(reverseGeocodeQueryMock).toHaveBeenCalledWith(-35.1234, -58.5678);
    expect(screen.getByDisplayValue('Calle 50 1000, La Plata')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({
      direccion: 'Calle 50 1000, La Plata',
      latitud: -35.1234,
      longitud: -58.5678,
      source: 'manual',
    });
    expect(screen.getByText(/ajustada manualmente/i)).toBeInTheDocument();
  });

  it('la dirección obtenida por reverse no dispara geocodificación directa', async () => {
    renderPicker();

    fireEvent.click(screen.getByRole('button', { name: 'pin' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(geocodeQueryMock).not.toHaveBeenCalled();
  });

  it('una respuesta reverse antigua no pisa un drag posterior', async () => {
    const firstReverse = deferred<string | null>();
    reverseGeocodeQueryMock
      .mockReturnValueOnce(firstReverse.promise)
      .mockResolvedValueOnce('Dirección del segundo pin');
    dragCoordinatesMock
      .mockReturnValueOnce({ lat: -35.1, lng: -58.1 })
      .mockReturnValueOnce({ lat: -35.2, lng: -58.2 });
    const onChange = vi.fn();
    renderPicker({ onChange });

    fireEvent.click(screen.getByRole('button', { name: 'pin' }));
    fireEvent.click(screen.getByRole('button', { name: 'pin' }));
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      firstReverse.resolve('Dirección obsoleta');
    });

    expect(screen.getByDisplayValue('Dirección del segundo pin')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        direccion: 'Dirección del segundo pin',
        latitud: -35.2,
        longitud: -58.2,
      }),
    );
  });

  it('un fallo de reverse conserva dirección, pin y coordenadas', async () => {
    reverseGeocodeQueryMock.mockRejectedValue(new Error('network'));
    renderPicker();

    fireEvent.click(screen.getByRole('button', { name: 'pin' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByDisplayValue('Calle 7 776, La Plata')).toBeInTheDocument();
    const pin = screen.getByRole('button', { name: 'pin' });
    expect(pin).toHaveAttribute('data-latitude', '-35.1234');
    expect(pin).toHaveAttribute('data-longitude', '-58.5678');
    expect(screen.getByText(/no se pudo determinar una dirección exacta/i)).toBeInTheDocument();
  });

  it('una respuesta reverse sin dirección conserva el estado manual', async () => {
    reverseGeocodeQueryMock.mockResolvedValue(null);
    const onChange = vi.fn();
    renderPicker({ onChange });

    fireEvent.click(screen.getByRole('button', { name: 'pin' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        direccion: 'Calle 7 776, La Plata',
        latitud: -35.1234,
        longitud: -58.5678,
        source: 'manual',
      }),
    );
    expect(screen.getByText(/no se pudo determinar una dirección exacta/i)).toBeInTheDocument();
  });

  it('una respuesta async antigua no pisa un pin movido manualmente', async () => {
    const pending = deferred<{ latitude: number; longitude: number } | null>();
    geocodeQueryMock.mockReturnValue(pending.promise);
    const onChange = vi.fn();
    renderPicker({ onChange });
    const previousPin = screen.getByRole('button', { name: 'pin' });

    fireEvent.change(screen.getByLabelText(/dirección/i), {
      target: { value: 'Diagonal 74 1500, La Plata' },
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.click(previousPin);
    await act(async () => {
      pending.resolve({ latitude: -34.8, longitude: -57.8 });
    });

    expect(onChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ source: 'geocoded' }),
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        latitud: -35.1234,
        longitud: -58.5678,
        source: 'manual',
      }),
    );
  });

  it('un cambio real de dirección sí geocodifica y aplica el último resultado', async () => {
    geocodeQueryMock.mockResolvedValue({ latitude: -34.9, longitude: -57.9 });
    const onChange = vi.fn();
    renderPicker({ onChange });

    fireEvent.change(screen.getByLabelText(/dirección/i), {
      target: { value: 'Diagonal 74 1500, La Plata' },
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(geocodeQueryMock).toHaveBeenCalledWith('Diagonal 74 1500, La Plata');
    expect(onChange).toHaveBeenLastCalledWith({
      direccion: 'Diagonal 74 1500, La Plata',
      latitud: -34.9,
      longitud: -57.9,
      source: 'geocoded',
    });
  });

  it('sin resultado conserva un pin disponible para selección manual', async () => {
    geocodeQueryMock.mockResolvedValue(null);
    const onChange = vi.fn();
    renderPicker({ onChange });

    fireEvent.change(screen.getByLabelText(/dirección/i), {
      target: { value: 'Dirección nueva sin resultado' },
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText(/podés ubicar el pin manualmente/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'pin' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: 'manual' }),
    );
  });
});
