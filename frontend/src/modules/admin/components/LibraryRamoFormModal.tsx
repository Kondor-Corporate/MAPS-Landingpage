import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { RamoIcon } from '@/modules/admin/components/RamoIcon';
import {
  ICONO_LABEL,
  ICONO_OPTIONS,
  TIPO_LABEL,
  type Ramo,
  type RamoIcono,
  type RamoInput,
  type RamoTipo,
} from '@/modules/admin/types/library';

type Mode = 'create' | 'edit';

type Props = {
  isOpen: boolean;
  mode: Mode;
  ramo?: Ramo | null;
  submitError?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: RamoInput) => void | Promise<void>;
};

type FormState = {
  nombre: string;
  descripcion: string;
  icono: RamoIcono;
  gdriveUrl: string;
  tipo: RamoTipo;
  orden: string;
  activo: boolean;
};

const EMPTY_FORM: FormState = {
  nombre: '',
  descripcion: '',
  icono: 'car',
  gdriveUrl: '',
  tipo: 'PRINCIPAL',
  orden: '1',
  activo: true,
};

function fromRamo(r: Ramo): FormState {
  return {
    nombre: r.nombre,
    descripcion: r.descripcion,
    icono: r.icono,
    gdriveUrl: r.gdriveUrl,
    tipo: r.tipo,
    orden: String(r.orden),
    activo: r.activo,
  };
}

function toInput(form: FormState): RamoInput {
  return {
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    icono: form.icono,
    gdriveUrl: form.gdriveUrl.trim(),
    tipo: form.tipo,
    orden: Math.max(1, parseInt(form.orden, 10) || 1),
    activo: form.activo,
  };
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.nombre.trim()) errors.nombre = 'Requerido';
  if (!form.descripcion.trim()) errors.descripcion = 'Requerido';
  if (!form.gdriveUrl.trim()) {
    errors.gdriveUrl = 'Requerido';
  } else if (!/^https:\/\/.+/i.test(form.gdriveUrl.trim())) {
    errors.gdriveUrl = 'Debe comenzar con https://';
  }
  return errors;
}

const inputClass =
  'w-full rounded-lg border border-maps-border bg-white px-3 py-2 text-sm text-maps-heading transition focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20';

export function LibraryRamoFormModal({
  isOpen,
  mode,
  ramo,
  submitError,
  submitting = false,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (mode === 'edit' && ramo) {
      setForm(fromRamo(ramo));
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, mode, ramo]);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    void onSubmit(toInput(form));
  }

  const title = mode === 'create' ? 'Nuevo ramo' : `Editar: ${ramo?.nombre ?? ''}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col gap-5 overflow-y-auto p-6">
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
            <FolderOpen size={20} strokeWidth={1.75} />
          </span>
          <h2 className="text-lg font-bold text-maps-heading">{title}</h2>
        </header>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-maps-heading">Nombre</span>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            className={inputClass}
          />
          {errors.nombre ? <span className="text-xs text-rose-600">{errors.nombre}</span> : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-maps-heading">Descripción</span>
          <textarea
            value={form.descripcion}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            rows={3}
            className={inputClass}
          />
          {errors.descripcion ? (
            <span className="text-xs text-rose-600">{errors.descripcion}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-maps-heading">Icono</span>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-maps-brand-soft text-maps-brand">
              <RamoIcon icon={form.icono} size={20} />
            </span>
            <select
              value={form.icono}
              onChange={(e) => handleChange('icono', e.target.value as RamoIcono)}
              className={inputClass}
            >
              {ICONO_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {ICONO_LABEL[key]}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-maps-heading">URL Google Drive</span>
          <input
            type="url"
            value={form.gdriveUrl}
            onChange={(e) => handleChange('gdriveUrl', e.target.value)}
            placeholder="https://drive.google.com/..."
            className={inputClass}
          />
          {errors.gdriveUrl ? (
            <span className="text-xs text-rose-600">{errors.gdriveUrl}</span>
          ) : null}
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-maps-heading">Tipo</legend>
          {(['PRINCIPAL', 'SECUNDARIO'] as RamoTipo[]).map((tipo) => (
            <label key={tipo} className="flex items-center gap-2 text-sm text-maps-body">
              <input
                type="radio"
                name="tipo"
                checked={form.tipo === tipo}
                onChange={() => handleChange('tipo', tipo)}
                className="text-maps-brand focus:ring-maps-brand"
              />
              {TIPO_LABEL[tipo]}
            </label>
          ))}
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-maps-heading">Orden</span>
          <input
            type="number"
            min={1}
            value={form.orden}
            onChange={(e) => handleChange('orden', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-maps-body">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => handleChange('activo', e.target.checked)}
            className="rounded border-maps-border text-maps-brand focus:ring-maps-brand"
          />
          Ramo activo (visible para productores)
        </label>

        {submitError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {submitError}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-maps-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-semibold text-maps-body transition hover:bg-maps-surface disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover disabled:opacity-50"
          >
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
