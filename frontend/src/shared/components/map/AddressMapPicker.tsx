import { useCallback, useEffect, useRef, useState } from 'react';
import Map, { Marker, type MapRef, type MarkerDragEvent } from 'react-map-gl/maplibre';
import { MapPinIcon } from '@/shared/components/map/MapPinIcon';
import { LA_PLATA_VIEW, MAP_STYLE } from '@/shared/components/map/mapStyle';
import {
  normalizeCoordinates,
  type CoordinateInput,
} from '@/shared/lib/coordinates';
import { geocodeQuery, reverseGeocodeQuery } from '@/shared/lib/geocode';

const DEBOUNCE_MS = 600;
const MIN_QUERY_LENGTH = 5;

export type PickedCoords = { latitud: number; longitud: number };
export type InitialCoords = { latitud: CoordinateInput; longitud: CoordinateInput };
export type LocationSource = 'cleared' | 'geocoded' | 'manual';
export type PickedLocation = {
  direccion: string;
  latitud?: number;
  longitud?: number;
  source: LocationSource;
};

type Status =
  | 'idle'
  | 'loading'
  | 'found'
  | 'not-found'
  | 'error'
  | 'manual'
  | 'reverse-loading'
  | 'reverse-error';
type LocationOrigin =
  | 'initial/persisted'
  | 'user-address-input'
  | 'geocoded'
  | 'manual-pin'
  | 'reverse-geocoded-label';

type Props = {
  direccion: string;
  initialCoords?: InitialCoords | null;
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
  'reverse-loading': 'Buscando dirección de la ubicación seleccionada...',
  'reverse-error': 'No se pudo determinar una dirección exacta para esta ubicación.',
};

const STATUS_TONE: Record<Status, string> = {
  idle: 'text-maps-muted',
  loading: 'text-maps-muted',
  found: 'text-emerald-700',
  'not-found': 'text-amber-700',
  error: 'text-rose-600',
  manual: 'text-maps-brand',
  'reverse-loading': 'text-maps-muted',
  'reverse-error': 'text-amber-700',
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
  const initialNormalizedCoords = normalizeCoordinates(
    initialCoords?.latitud,
    initialCoords?.longitud,
  );
  const initialLat = initialNormalizedCoords?.latitud;
  const initialLng = initialNormalizedCoords?.longitud;
  const initialAddress = direccion.trim();
  const hasInitialQuery = !initialNormalizedCoords && initialAddress.length >= MIN_QUERY_LENGTH;
  const requestId = useRef(0);
  const debounceHandle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldGeocode = useRef(hasInitialQuery);
  const didMount = useRef(false);
  const lastEmitted = useRef<PickedLocation | null>(null);
  const onChangeRef = useRef(onChange);
  const locationOrigin = useRef<LocationOrigin>('initial/persisted');
  const [address, setAddress] = useState(direccion);
  const [status, setStatus] = useState<Status>(
    initialNormalizedCoords ? 'found' : hasInitialQuery ? 'loading' : 'idle',
  );
  const [coords, setCoords] = useState<PickedCoords | null>(initialNormalizedCoords);
  const [geocodeRevision, setGeocodeRevision] = useState(0);

  onChangeRef.current = onChange;

  const invalidatePendingGeocode = useCallback(() => {
    requestId.current += 1;
    if (debounceHandle.current) {
      clearTimeout(debounceHandle.current);
      debounceHandle.current = null;
    }
  }, []);

  const emit = useCallback((location: PickedLocation) => {
    lastEmitted.current = location;
    onChangeRef.current(location);
  }, []);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    const normalizedCoords =
      initialLat !== undefined && initialLng !== undefined
        ? { latitud: initialLat, longitud: initialLng }
        : null;
    const trimmedDireccion = direccion.trim();
    const emitted = lastEmitted.current;
    const isParentEcho =
      emitted !== null &&
      emitted.direccion === trimmedDireccion &&
      emitted.latitud === normalizedCoords?.latitud &&
      emitted.longitud === normalizedCoords?.longitud;

    if (isParentEcho) {
      lastEmitted.current = null;
      return;
    }

    invalidatePendingGeocode();
    setAddress(direccion);
    setCoords(normalizedCoords);

    if (normalizedCoords) {
      locationOrigin.current = 'initial/persisted';
      shouldGeocode.current = false;
      setStatus('found');
      mapRef.current?.flyTo({
        center: [normalizedCoords.longitud, normalizedCoords.latitud],
        zoom: 15,
        duration: 0,
      });
      return;
    }

    const canGeocode = trimmedDireccion.length >= MIN_QUERY_LENGTH;
    locationOrigin.current = 'initial/persisted';
    shouldGeocode.current = canGeocode;
    setStatus(canGeocode ? 'loading' : 'idle');
    if (canGeocode) setGeocodeRevision((revision) => revision + 1);
  }, [direccion, initialLat, initialLng, invalidatePendingGeocode]);

  useEffect(() => {
    const trimmed = address.trim();
    const origin = locationOrigin.current;

    if (
      !shouldGeocode.current ||
      trimmed.length < MIN_QUERY_LENGTH ||
      origin === 'manual-pin' ||
      origin === 'reverse-geocoded-label'
    ) {
      return;
    }
    const currentRequestId = ++requestId.current;

    debounceHandle.current = setTimeout(() => {
      debounceHandle.current = null;
      shouldGeocode.current = false;
      geocodeQuery(trimmed)
        .then((result) => {
          if (currentRequestId !== requestId.current || address.trim() !== trimmed) return;

          if (!result) {
            setStatus('not-found');
            setCoords(null);
            mapRef.current?.flyTo({
              center: [LA_PLATA_VIEW.longitude, LA_PLATA_VIEW.latitude],
              zoom: LA_PLATA_VIEW.zoom,
              duration: 600,
            });
            return;
          }

          const next = { latitud: result.latitude, longitud: result.longitude };
          locationOrigin.current = 'geocoded';
          setStatus('found');
          setCoords(next);
          emit({ direccion: trimmed, ...next, source: 'geocoded' });
          mapRef.current?.flyTo({
            center: [next.longitud, next.latitud],
            zoom: 15,
            duration: 600,
          });
        })
        .catch(() => {
          if (currentRequestId !== requestId.current || address.trim() !== trimmed) return;
          setStatus('error');
          setCoords(null);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceHandle.current) {
        clearTimeout(debounceHandle.current);
        debounceHandle.current = null;
      }
    };
  }, [address, emit, geocodeRevision]);

  useEffect(
    () => () => {
      requestId.current += 1;
      if (debounceHandle.current) clearTimeout(debounceHandle.current);
    },
    [],
  );

  function handleAddressChange(nextAddress: string) {
    invalidatePendingGeocode();
    locationOrigin.current = 'user-address-input';
    const trimmed = nextAddress.trim();
    const canGeocode = trimmed.length >= MIN_QUERY_LENGTH;
    shouldGeocode.current = canGeocode;
    setAddress(nextAddress);
    setCoords(null);
    setStatus(canGeocode ? 'loading' : 'idle');
    emit({ direccion: trimmed, source: 'cleared' });
  }

  function handleDragEnd(e: MarkerDragEvent) {
    invalidatePendingGeocode();
    locationOrigin.current = 'manual-pin';
    shouldGeocode.current = false;
    const next = { latitud: e.lngLat.lat, longitud: e.lngLat.lng };
    const currentRequestId = requestId.current;
    const currentAddress = address.trim();
    setCoords(next);
    setStatus('reverse-loading');
    emit({ direccion: currentAddress, ...next, source: 'manual' });

    void reverseGeocodeQuery(next.latitud, next.longitud)
      .then((direccionResult) => {
        if (currentRequestId !== requestId.current) return;

        if (!direccionResult) {
          setStatus('reverse-error');
          return;
        }

        locationOrigin.current = 'reverse-geocoded-label';
        shouldGeocode.current = false;
        setAddress(direccionResult);
        setStatus('manual');
        emit({ direccion: direccionResult, ...next, source: 'manual' });
      })
      .catch(() => {
        if (currentRequestId === requestId.current) setStatus('reverse-error');
      });
  }

  const center = coords ?? { latitud: LA_PLATA_VIEW.latitude, longitud: LA_PLATA_VIEW.longitude };
  const showPin = coords !== null || status === 'not-found' || status === 'error';

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
