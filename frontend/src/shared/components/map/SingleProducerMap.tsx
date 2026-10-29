import Map, { Marker } from 'react-map-gl/maplibre';
import { MapPinIcon } from '@/shared/components/map/MapPinIcon';
import { MAP_STYLE } from '@/shared/components/map/mapStyle';

type Props = {
  latitud: number;
  longitud: number;
  label?: string;
  className?: string;
  zoom?: number;
};

export function SingleProducerMap({
  latitud,
  longitud,
  label,
  className = 'relative h-[192px] w-full sm:h-[220px]',
  zoom = 13,
}: Props) {
  return (
    <div className={className}>
      <Map
        initialViewState={{
          longitude: longitud,
          latitude: latitud,
          zoom,
        }}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={{ compact: true }}
        dragRotate={false}
        touchZoomRotate
      >
        <Marker longitude={longitud} latitude={latitud} anchor="bottom">
          <span
            aria-label={label ?? 'Ubicación del productor'}
            className="flex h-9 w-9 -translate-y-1 items-center justify-center rounded-full border-2 border-white bg-maps-brand text-white shadow-floating"
          >
            <MapPinIcon className="h-5 w-5" />
          </span>
        </Marker>
      </Map>
    </div>
  );
}
