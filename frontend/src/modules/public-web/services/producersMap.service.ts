import axios from 'axios';
import { API_BASE_URL } from '@/lib/apiConfig';
import type { MapProducer } from '@/modules/public-web/types/producerMap';

type ApiSuccess<T> = { data: T; message: string; error: null };

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export async function getProducersForMap(): Promise<MapProducer[]> {
  const { data } = await publicApi.get<
    ApiSuccess<{ producers: MapProducer[] }>
  >('/producers/map');
  return data.data.producers;
}
