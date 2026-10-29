import { useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import type { ProducerCertificacion } from '@/shared/types/producerProfile';
import { ProfileCertificationsList } from '@/shared/components/profile/ProfileCertificationsList';
import { CertificacionDeleteConfirmModal } from '@/shared/components/profile/CertificacionDeleteConfirmModal';

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
  const [confirmingDelete, setConfirmingDelete] = useState<ProducerCertificacion | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadLockRef = useRef(false);
  const deleteLockRef = useRef(false);

  function acceptFile(selectedFile: File) {
    setSuccess(null);

    if (selectedFile.type !== CERTIFICACION_ACCEPT) {
      setFile(null);
      setError('La certificación debe ser un archivo PDF.');
      return;
    }

    if (selectedFile.size > CERTIFICACION_MAX_BYTES) {
      setFile(null);
      setError('El archivo supera el tamaño máximo de 10 MB.');
      return;
    }

    setError(null);
    setFile(selectedFile);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0] ?? null;
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!selectedFile) return;
    acceptFile(selectedFile);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (busy) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) acceptFile(droppedFile);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!busy) setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  async function handleUpload() {
    if (busy || uploadLockRef.current) return;
    if (!file) {
      setError('Seleccioná un archivo PDF.');
      return;
    }
    uploadLockRef.current = true;
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
      uploadLockRef.current = false;
      setBusy(false);
    }
  }

  function handleDeleteRequest(certId: number) {
    const cert = certificaciones.find((c) => c.id === certId) ?? null;
    setConfirmingDelete(cert);
  }

  async function handleDeleteConfirm() {
    if (!confirmingDelete || deletingId !== null || deleteLockRef.current) return;
    const certId = confirmingDelete.id;
    deleteLockRef.current = true;
    setDeletingId(certId);
    setError(null);
    setSuccess(null);
    try {
      await onDelete(certId);
      setSuccess('Certificación eliminada correctamente.');
      setConfirmingDelete(null);
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'No se pudo eliminar la certificación. Intentá nuevamente.'),
      );
    } finally {
      deleteLockRef.current = false;
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ProfileCertificationsList
        certificaciones={certificaciones}
        emptyMessage="Sin certificaciones cargadas."
        onDelete={disabled ? undefined : handleDeleteRequest}
        deletingId={deletingId}
      />

      <CertificacionDeleteConfirmModal
        isOpen={confirmingDelete !== null}
        certificacion={confirmingDelete}
        isBusy={deletingId !== null}
        submitError={error}
        onClose={() => {
          if (deletingId === null) setConfirmingDelete(null);
        }}
        onConfirm={() => void handleDeleteConfirm()}
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
          <span className="mt-3 block text-sm font-medium text-maps-muted">Archivo PDF</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={CERTIFICACION_ACCEPT}
            disabled={busy}
            onChange={handleFileChange}
            className="hidden"
            aria-label="Seleccionar archivo PDF de certificación"
          />
          <div
            className={`mt-1 rounded-xl border border-dashed transition ${
              isDragOver ? 'border-maps-brand bg-maps-brand-soft/40' : 'border-maps-border bg-white'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex w-full flex-col items-center justify-center gap-1.5 px-4 py-6 text-maps-muted transition hover:text-maps-brand disabled:opacity-60"
            >
              {file ? (
                <>
                  <FileText size={20} strokeWidth={1.75} />
                  <span className="max-w-full truncate text-sm font-medium text-maps-heading">
                    {file.name}
                  </span>
                  <span className="text-[11px]">Click o arrastrá para reemplazar</span>
                </>
              ) : (
                <>
                  <Upload size={20} strokeWidth={1.75} />
                  <span className="text-sm font-medium">Seleccioná o arrastrá un PDF</span>
                  <span className="text-[11px]">Solo PDF · máximo 10 MB</span>
                </>
              )}
            </button>
          </div>
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
