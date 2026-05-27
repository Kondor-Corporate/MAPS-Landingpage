import { useState } from 'react';
import type { ProducerCertificacion } from '@/shared/types/producerProfile';
import { ProfileCertificationsList } from '@/shared/components/profile/ProfileCertificationsList';

type Props = {
  certificaciones: ProducerCertificacion[];
  onUpload: (file: File, nombre: string) => Promise<void>;
  onDelete: (certId: number) => Promise<void>;
  disabled?: boolean;
};

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

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Seleccioná un archivo PDF');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUpload(file, nombre.trim() || file.name);
      setNombre('');
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(certId: number) {
    setDeletingId(certId);
    setError(null);
    try {
      await onDelete(certId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
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
        <form
          onSubmit={(e) => void handleUpload(e)}
          className="rounded-lg border border-dashed border-maps-border p-4"
        >
          <p className="text-sm font-medium text-maps-heading">Agregar certificación (PDF)</p>
          {error ? (
            <p className="mt-2 text-xs text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
          <label className="mt-2 block text-sm font-medium text-maps-muted">
            Nombre del documento
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded-lg border border-maps-border px-3 py-2 text-sm"
              placeholder="Cédula Profesional"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-maps-muted">
            Archivo PDF
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !file}
            className="mt-3 rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Subiendo…' : 'Subir PDF'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
