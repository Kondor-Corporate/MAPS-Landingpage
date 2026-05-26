export type GeocodeCoords = {
  longitude: number;
  latitude: number;
};

export async function geocodeQuery(query: string): Promise<GeocodeCoords | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data: Array<{ lat: string; lon: string }> = await res.json();
  if (!data.length) return null;
  return {
    longitude: parseFloat(data[0].lon),
    latitude: parseFloat(data[0].lat),
  };
}
