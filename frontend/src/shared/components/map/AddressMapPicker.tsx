import { useEffect, useRef, useState } from 'react';
import Map, { Marker, type MapRef, type MarkerDragEvent } from 'react-map-gl/maplibre';
import { MapPinIcon } from '@/shared/components/map/MapPinIcon';
import { LA_PLATA_VIEW, MAP_STYLE } from '@/shared/components/map/mapStyle';
import { geocodeQuery } from '@/shared/lib/geocode';

const DEBOUNCE_MS = 600;
const MIN_QUERY_LENGTH = 5;

export type PickedCoords = { latitud: number; longitud: number };
export type LocationSource = 'cleared' | 'geocoded' | 'manual';
export type PickedLocation = {
  direccion: string;
  latitud?: number;
  longitud?: number;
  source: LocationSource;
};

type Status = 'idle' | 'loading' | 'found' | 'not-found' | 'error' | 'manual';

type Props = {
  direccion: string;
  initialCoords?: PickedCoords | null;
  onChange: (location: PickedLocation) => void;
  label?: string;
  required?: boolean;
  className?: string;
};

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Ingresá una dirección para ubicarla en el mapa.',
  loading: 'Verificando dirección...',
  found: 'Ubicación encontrada. Ajustá el pin si hace falta.',
  'not-found': 'No encontramos esa dirección. Podés ubicar el pin manualmente.',
  error: 'No pudimos verificar la dirección. Podés ubicar el pin manualmente.',
  manual: 'Ubicación ajustada manualmente.',
};

const STATUS_TONE: Record<Status, string> = {
  idle: 'text-maps-muted',
  loading: 'text-maps-muted',
  found: 'text-emerald-700',
  'not-found': 'text-amber-700',
  error: 'text-rose-600',
  manual: 'text-maps-brand',
};

export function AddressMapPicker({
  direccion,
  initialCoords,
  onChange,
  label = 'Dirección',
  required = false,
  className,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const originalDireccion = useRef(direccion.trim());
  const lastQueried = useRef<string | null>(initialCoords ? direccion.trim() : null);
  const initialLat = initialCoords?.latitud;
  const initialLng = initialCoords?.longitud;
  const [address, setAddress] = useState(direccion);
  const [status, setStatus] = useState<Status>(initialCoords ? 'found' : 'idle');
  const [coords, setCoords] = useState<PickedCoords | null>(initialCoords ?? null);

  useEffect(() => {
    setAddress(direccion);
    setCoords(
      initialLat !== undefined && initialLng !== undefined
        ? { latitud: initialLat, longitud: initialLng }
        : null,
    );
    setStatus(initialLat !== undefined && initialLng !== undefined ? 'found' : 'idle');
    originalDireccion.current = direccion.trim();
    lastQueried.current =
      initialLat !== undefined && initialLng !== undefined ? direccion.trim() : null;
  }, [direccion, initialLat, initialLng]);

  useEffect(() => {
    const trimmed = address.trim();

    if (trimmed === originalDireccion.current && coords) return;
    if (trimmed === lastQueried.current) return;

    if (trimmed.length < MIN_QUERY_LENGTH) {
      lastQueried.current = null;
      setStatus('idle');
      setCoords(null);
      onChange({ direccion: trimmed, source: 'cleared' });
      return;
    }

    setStatus('loading');
    setCoords(null);
    onChange({ direccion: trimmed, source: 'cleared' });

    const handle = setTimeout(() => {
      lastQueried.current = trimmed;
      geocodeQuery(trimmed)
        .then((result) => {
          if (!result) {
            setStatus('not-found');
            setCoords(null);
            onChange({ direccion: trimmed, source: 'cleared' });
            mapRef.current?.flyTo({
              center: [LA_PLATA_VIEW.longitude, LA_PLATA_VIEW.latitude],
              zoom: LA_PLATA_VIEW.zoom,
              duration: 600,
            });
            return;
          }

          const next = { latitud: result.latitude, longitud: result.longitude };
          setStatus('found');
          setCoords(next);
          onChange({ direccion: trimmed, ...next, source: 'geocoded' });
          mapRef.current?.flyTo({
            center: [next.longitud, next.latitud],
            zoom: 15,
            duration: 600,
          });
        })
        .catch(() => {
          setStatus('error');
          setCoords(null);
          onChange({ direccion: trimmed, source: 'cleared' });
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
    // onChange is intentionally omitted because parent forms recreate callbacks often.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  function handleAddressChange(nextAddress: string) {
    setAddress(nextAddress);
  }

  function handleDragEnd(e: MarkerDragEvent) {
    const next = { latitud: e.lngLat.lat, longitud: e.lngLat.lng };
    setCoords(next);
    setStatus('manual');
    onChange({ direccion: address.trim(), ...next, source: 'manual' });
  }

  const center = coords ?? { latitud: LA_PLATA_VIEW.latitude, longitud: LA_PLATA_VIEW.longitude };
  const showPin = status !== 'idle' && status !== 'loading';

  return (
    <div className={className ?? 'flex flex-col gap-2'}>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-maps-muted">
          {label}
          {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
        </span>
        <input
          type="text"
          value={address}
          onChange={(e) => handleAddressChange(e.target.value)}
          placeholder="Av. 7 1234, La Plata, Buenos Aires, Argentina"
          className="w-full rounded-lg border border-maps-border bg-white px-3 py-2 text-sm text-maps-heading transition focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
        />
      </label>

      <div className="relative h-[220px] w-full overflow-hidden rounded-xl border border-maps-border">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: center.longitud,
            latitude: center.latitud,
            zoom: coords ? 15 : LA_PLATA_VIEW.zoom,
          }}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          attributionControl={{ compact: true }}
          dragRotate={false}
          touchZoomRotate
        >
          {showPin && (
            <Marker
              longitude={center.longitud}
              latitude={center.latitud}
              anchor="bottom"
              draggable
              onDragEnd={handleDragEnd}
            >
              <span className="flex h-9 w-9 -translate-y-1 cursor-grab items-center justify-center rounded-full border-2 border-white bg-maps-brand text-white shadow-floating active:cursor-grabbing">
                <MapPinIcon className="h-5 w-5" />
              </span>
            </Marker>
          )}
        </Map>
      </div>
      <p className={`text-xs font-medium ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</p>
    </div>
  );
}
