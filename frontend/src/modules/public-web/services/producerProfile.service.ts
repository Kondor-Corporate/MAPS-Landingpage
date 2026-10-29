import axios from 'axios';
import { API_BASE_URL } from '@/lib/apiConfig';
import type { PublicProducerProfileApi } from '@/modules/public-web/types/producerProfile';

type ApiSuccess<T> = { data: T; message: string; error: null };

const publicApi = axios.create({
  baseURL: API_BASE_URL,
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
