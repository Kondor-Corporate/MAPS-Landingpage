import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import {
  mapAdminProducerToProducer,
  producerFormToApiPayload,
} from '@/modules/admin/lib/mapAdminProducer';
import {
  createProducer,
  deleteProducerCertificacion,
  listProducers,
  setProducerActive,
  updateProducer,
  uploadProducerCertificacion,
} from '@/modules/admin/services/producers.service';
import type { Producer, ProducerFormSubmit } from '@/modules/admin/types/producer';

type Scope = 'active' | 'inactive';

export function useAdminProducers(scope: Scope) {
  const [data, setData] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activoFilter = scope === 'active';

  const refetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const rows = await listProducers({ activo: activoFilter });
      setData(rows.map(mapAdminProducerToProducer));
    } catch (err) {
      setError(getApiErrorMessage(err));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activoFilter]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const create = useCallback(
    async (input: ProducerFormSubmit) => {
      setError(null);
      const row = await createProducer({
        ...producerFormToApiPayload(input),
        activo: input.activo ?? true,
      } as Parameters<typeof createProducer>[0]);
      await refetch();
      return mapAdminProducerToProducer(row);
    },
    [refetch],
  );

  const update = useCallback(
    async (id: string, input: ProducerFormSubmit) => {
      setError(null);
      const numId = Number.parseInt(id, 10);
      const row = await updateProducer(numId, producerFormToApiPayload(input));
      await refetch();
      return mapAdminProducerToProducer(row);
    },
    [refetch],
  );

  const uploadCertificacion = useCallback(
    async (producerId: string, file: File, nombre?: string) => {
      setError(null);
      const numId = Number.parseInt(producerId, 10);
      await uploadProducerCertificacion(numId, file, nombre);
      await refetch();
    },
    [refetch],
  );

  const deleteCertificacion = useCallback(
    async (producerId: string, certId: number) => {
      setError(null);
      const numId = Number.parseInt(producerId, 10);
      await deleteProducerCertificacion(numId, certId);
      await refetch();
    },
    [refetch],
  );

  const activate = useCallback(
    async (id: string) => {
      setError(null);
      const numId = Number.parseInt(id, 10);
      await setProducerActive(numId, { activo: true });
      await refetch();
    },
    [refetch],
  );

  const deactivate = useCallback(
    async (id: string) => {
      setError(null);
      const numId = Number.parseInt(id, 10);
      await setProducerActive(numId, { activo: false });
      await refetch();
    },
    [refetch],
  );

  return {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    uploadCertificacion,
    deleteCertificacion,
    activate,
    deactivate,
  };
}
