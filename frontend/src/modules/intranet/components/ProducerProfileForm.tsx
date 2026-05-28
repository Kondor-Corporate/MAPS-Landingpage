import { useEffect, useState } from 'react';
import { Modal } from '@/shared/components/Modal';
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
  telefono: string;
  whatsapp: string;
  foto: string;
  idiomasText: string;
  latitud: string;
  longitud: string;
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
    telefono: p.telefono ?? '',
    whatsapp: p.whatsapp ?? '',
    foto: p.foto ?? '',
    idiomasText: p.idiomas.join(', '),
    latitud: p.latitud != null ? String(p.latitud) : '',
    longitud: p.longitud != null ? String(p.longitud) : '',
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
    if (open) {
      setForm(fromProfile(profile));
      setError(null);
    }
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
        ciudad: form.ciudad.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        foto: form.foto.trim() || undefined,
        idiomas,
        latitud: form.latitud.trim() ? Number(form.latitud) : undefined,
        longitud: form.longitud.trim() ? Number(form.longitud) : undefined,
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
      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-maps-heading">
              Ciudad
              <input
                value={form.ciudad}
                onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-maps-border px-3 py-2 text-sm"
              />
            </label>
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
            <label className="block text-sm font-medium text-maps-heading">
              URL foto
              <input
                value={form.foto}
                onChange={(e) => setForm((f) => ({ ...f, foto: e.target.value }))}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-maps-heading">
              Latitud
              <input
                value={form.latitud}
                onChange={(e) => setForm((f) => ({ ...f, latitud: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-maps-border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-maps-heading">
              Longitud
              <input
                value={form.longitud}
                onChange={(e) => setForm((f) => ({ ...f, longitud: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-maps-border px-3 py-2 text-sm"
              />
            </label>
          </div>
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
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
