import { useCallback, useEffect, useState } from 'react';
import { getProducerBySlug } from '@/modules/public-web/services/producerProfile.service';
import type { PublicProducerProfileApi } from '@/modules/public-web/types/producerProfile';

export function usePublicProducerProfile(slug: string | undefined) {
  const [profile, setProfile] = useState<PublicProducerProfileApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!slug) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const api = await getProducerBySlug(slug);
      setProfile(api);
    } catch {
      setProfile(null);
      setError('Perfil no encontrado');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { profile, loading, error, refetch };
}
