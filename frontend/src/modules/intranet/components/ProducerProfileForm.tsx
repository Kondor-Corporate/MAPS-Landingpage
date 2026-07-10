import { useEffect, useState } from 'react';
import { Modal } from '@/shared/components/Modal';
import { AddressMapPicker } from '@/shared/components/map/AddressMapPicker';
import { ProducerCertificationsManager } from '@/shared/components/profile/ProducerCertificationsManager';
import { PRODUCER_SPECIALTY_CATALOG } from '@/modules/intranet/constants/producerSpecialties';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import type {
  ProducerProfile,
  UpdateMyProfileBody,
} from '@/modules/intranet/types/producerProfile';

type Props = {
  open: boolean;
  onClose: () => void;
  profile: ProducerProfile;
  onSaved: () => void;
  updateProfile: (body: UpdateMyProfileBody) => Promise<ProducerProfile>;
  uploadCertificacion: (file: File, nombre?: string) => Promise<void>;
  deleteCertificacion: (certId: number) => Promise<void>;
};

type FormState = {
  bio: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  whatsapp: string;
  idiomasText: string;
  latitud?: number;
  longitud?: number;
  linkedin: string;
  instagram: string;
  especialidades: Set<string>;
};

function fromProfile(p: ProducerProfile): FormState {
  const linkedin = p.redesSociales.find((r) => r.plataforma === 'linkedin')?.url ?? '';
  const instagram = p.redesSociales.find((r) => r.plataforma === 'instagram')?.url ?? '';

  return {
    bio: p.bio ?? '',
    ciudad: p.ciudad ?? '',
    direccion: p.direccion ?? p.ciudad ?? '',
    telefono: p.telefono ?? '',
    whatsapp: p.whatsapp ?? '',
    idiomasText: p.idiomas.join(', '),
    latitud: p.latitud ?? undefined,
    longitud: p.longitud ?? undefined,
    linkedin,
    instagram,
    especialidades: new Set(p.especialidades.map((e) => e.clave)),
  };
}

export function ProducerProfileForm({
  open,
  onClose,
  profile,
  onSaved,
  updateProfile,
  uploadCertificacion,
  deleteCertificacion,
}: Props) {
  const [form, setForm] = useState<FormState>(() => fromProfile(profile));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(fromProfile(profile));
    setError(null);
  }, [open, profile]);

  function toggleEspecialidad(clave: string) {
    setForm((prev) => {
      const next = new Set(prev.especialidades);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return { ...prev, especialidades: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const redesSociales: { plataforma: string; url: string; orden: number }[] = [];
      if (form.linkedin.trim()) {
        redesSociales.push({ plataforma: 'linkedin', url: form.linkedin.trim(), orden: 0 });
      }
      if (form.instagram.trim()) {
        redesSociales.push({
          plataforma: 'instagram',
          url: form.instagram.trim(),
          orden: redesSociales.length,
        });
      }

      const idiomas = form.idiomasText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const patchBody: UpdateMyProfileBody = {
        bio: form.bio.trim() || undefined,
        ciudad: form.ciudad.trim() || form.direccion.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        idiomas,
        latitud: form.latitud,
        longitud: form.longitud,
        especialidades: [...form.especialidades],
        redesSociales,
      };

      const hasPatch = Object.values(patchBody).some((v) => v !== undefined);
      if (!hasPatch) {
        setError('No hay cambios para guardar');
        return;
      }

      await updateProfile(patchBody);
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={(e) => void handleSubmit(e)} className="p-6 sm:p-8">
        <h2 className="text-xl font-bold text-maps-heading">Editar perfil</h2>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          <label className="block text-sm font-medium text-maps-heading">
            Trayectoria (bio)
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={4}
              className="mt-1 w-full rounded-lg border border-maps-border px-3 py-2 text-sm"
            />
          </label>

          <AddressMapPicker
            direccion={form.direccion}
            initialCoords={
              form.latitud !== undefined && form.longitud !== undefined
                ? { latitud: form.latitud, longitud: form.longitud }
                : null
            }
            onChange={(location) =>
              setForm((f) => ({
                ...f,
                ciudad: location.direccion,
                direccion: location.direccion,
                latitud: location.latitud,
                longitud: location.longitud,
              }))
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-maps-heading">
              Teléfono
              <input
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-maps-border px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-maps-heading">
              WhatsApp (solo dígitos)
              <input
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-maps-border px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-maps-heading">
            Idiomas (separados por coma)
            <input
              value={form.idiomasText}
              onChange={(e) => setForm((f) => ({ ...f, idiomasText: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-maps-border px-3 py-2 text-sm"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-maps-heading">Especialidades</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRODUCER_SPECIALTY_CATALOG.map((esp) => (
                <label
                  key={esp.clave}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-maps-border px-2 py-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={form.especialidades.has(esp.clave)}
                    onChange={() => toggleEspecialidad(esp.clave)}
                  />
                  {esp.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm font-medium text-maps-heading">
            LinkedIn URL
            <input
              value={form.linkedin}
              onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-maps-border px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-maps-heading">
            Instagram URL
            <input
              value={form.instagram}
              onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-maps-border px-3 py-2 text-sm"
            />
          </label>

          <ProducerCertificationsManager
            certificaciones={profile.certificaciones}
            onUpload={async (file, nombre) => uploadCertificacion(file, nombre)}
            onDelete={deleteCertificacion}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-maps-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-maps-border px-4 py-2 text-sm font-medium text-maps-body"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-maps-brand px-5 py-2 text-sm font-bold text-white hover:bg-maps-brand-hover disabled:opacity-60"
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
