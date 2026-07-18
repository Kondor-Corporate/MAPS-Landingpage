import { useRef, useState } from 'react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import type { ProducerCertificacion } from '@/shared/types/producerProfile';
import { ProfileCertificationsList } from '@/shared/components/profile/ProfileCertificationsList';

type Props = {
  certificaciones: ProducerCertificacion[];
  onUpload: (file: File, nombre: string) => Promise<void>;
  onDelete: (certId: number) => Promise<void>;
  disabled?: boolean;
};

const CERTIFICACION_ACCEPT = 'application/pdf';
const CERTIFICACION_MAX_BYTES = 10 * 1024 * 1024;

export function ProducerCertificationsManager({
  certificaciones,
  onUpload,
  onDelete,
  disabled = false,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0] ?? null;
    setSuccess(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.type !== CERTIFICACION_ACCEPT) {
      e.target.value = '';
      setFile(null);
      setError('La certificación debe ser un archivo PDF.');
      return;
    }

    if (selectedFile.size > CERTIFICACION_MAX_BYTES) {
      e.target.value = '';
      setFile(null);
      setError('El archivo supera el tamaño máximo de 10 MB.');
      return;
    }

    setError(null);
    setFile(selectedFile);
  }

  async function handleUpload() {
    if (busy) return;
    if (!file) {
      setError('Seleccioná un archivo PDF.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await onUpload(file, nombre.trim() || file.name);
      setNombre('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccess('Certificación cargada correctamente.');
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'No se pudo subir la certificación. Intentá nuevamente.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(certId: number) {
    if (deletingId !== null) return;
    setDeletingId(certId);
    setError(null);
    setSuccess(null);
    try {
      await onDelete(certId);
      setSuccess('Certificación eliminada correctamente.');
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'No se pudo eliminar la certificación. Intentá nuevamente.'),
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ProfileCertificationsList
        certificaciones={certificaciones}
        emptyMessage="Sin certificaciones cargadas."
        onDelete={disabled ? undefined : handleDelete}
        deletingId={deletingId}
      />

      {!disabled ? (
        <div className="rounded-lg border border-dashed border-maps-border p-4">
          <p className="text-sm font-medium text-maps-heading">Agregar certificación (PDF)</p>
          {error ? (
            <p className="mt-2 text-xs text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-2 text-xs text-emerald-700" role="status">
              {success}
            </p>
          ) : null}
          <label className="mt-2 block text-sm font-medium text-maps-muted">
            Nombre del documento
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-maps-border px-3 py-2 text-sm"
              placeholder="Cédula Profesional"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-maps-muted">
            Archivo PDF
            <input
              ref={fileInputRef}
              type="file"
              accept={CERTIFICACION_ACCEPT}
              disabled={busy}
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm"
            />
          </label>
          <p className="mt-1 text-xs text-maps-muted">Solo PDF · máximo 10 MB</p>
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={busy || !file}
            className="mt-3 rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Subiendo…' : 'Subir PDF'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
