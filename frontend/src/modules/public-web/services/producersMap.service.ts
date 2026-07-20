import axios from 'axios';
import type { MapProducer } from '@/modules/public-web/types/producerMap';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';

type ApiSuccess<T> = { data: T; message: string; error: null };

const publicApi = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export async function getProducersForMap(): Promise<MapProducer[]> {
  const { data } = await publicApi.get<
    ApiSuccess<{ producers: MapProducer[] }>
  >('/producers/map');
  return data.data.producers;
}
