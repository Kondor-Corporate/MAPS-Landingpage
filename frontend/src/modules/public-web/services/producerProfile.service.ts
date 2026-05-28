import axios from 'axios';
import type { PublicProducerProfileApi } from '@/modules/public-web/types/producerProfile';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

type ApiSuccess<T> = { data: T; message: string; error: null };

const publicApi = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export async function getProducerBySlug(
  slug: string,
): Promise<PublicProducerProfileApi> {
  const { data } = await publicApi.get<
    ApiSuccess<{ profile: PublicProducerProfileApi }>
  >(`/producers/by-slug/${encodeURIComponent(slug)}`);
  return data.data.profile;
}
