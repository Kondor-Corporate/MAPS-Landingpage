import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import {
  changeMyPassword,
  deleteMyCertificacion,
  getMyProducerProfile,
  updateMyProducerProfile,
  uploadMyCertificacion,
  uploadMyFoto,
} from '@/modules/intranet/services/producerProfile.service';
import type {
  ChangeMyPasswordBody,
  ProducerProfile,
  UpdateMyProfileBody,
} from '@/modules/intranet/types/producerProfile';

export function useProducerProfile() {
  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await getMyProducerProfile();
      setProfile(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const updateProfile = useCallback(
    async (body: UpdateMyProfileBody) => {
      const updated = await updateMyProducerProfile(body);
      setProfile(updated);
      return updated;
    },
    [],
  );

  const uploadCertificacion = useCallback(
    async (file: File, nombre?: string) => {
      await uploadMyCertificacion(file, nombre);
      await refetch();
    },
    [refetch],
  );

  const deleteCertificacion = useCallback(
    async (certId: number) => {
      await deleteMyCertificacion(certId);
      await refetch();
    },
    [refetch],
  );

  const changePassword = useCallback(async (body: ChangeMyPasswordBody) => {
    await changeMyPassword(body);
  }, []);

  const uploadFoto = useCallback(async (file: File) => {
    const updated = await uploadMyFoto(file);
    setProfile(updated);
    return updated;
  }, []);

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile,
    uploadCertificacion,
    deleteCertificacion,
    changePassword,
    uploadFoto,
  };
}
