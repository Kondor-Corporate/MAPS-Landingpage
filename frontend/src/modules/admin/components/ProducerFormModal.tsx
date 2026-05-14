import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import type { Producer, ProducerFormSubmit } from '@/modules/admin/types/producer';
import { producerNombreCompleto } from '@/modules/admin/types/producer';

type Mode = 'create' | 'edit';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
  producer?: Producer | null;
  submitting?: boolean;
  submitError?: string | null;
  onSubmit: (input: ProducerFormSubmit) => Promise<void>;
};

type FormState = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
};

const EMPTY_FORM: FormState = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
};

function fromProducer(p: Producer): FormState {
  return {
    nombre: p.nombre,
    apellido: p.apellido,
    email: p.email,
    telefono: p.telefono,
  };
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.nombre.trim()) errors.nombre = 'Requerido';
  if (!form.apellido.trim()) errors.apellido = 'Requerido';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Email inválido';
  return errors;
}

export function ProducerFormModal({
  isOpen,
  onClose,
  mode,
  producer,
  submitting = false,
  submitError,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (mode === 'edit' && producer) {
      setForm(fromProducer(producer));
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, mode, producer]);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    try {
      await onSubmit({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
      });
    } catch {
      /* error mostrado vía submitError props */
    }
  }

  const titleNombre =
    mode === 'edit' && producer ? producerNombreCompleto(producer) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6 p-6">
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
            <UserPlus size={20} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-maps-heading">
              {mode === 'create' ? 'Nuevo productor' : 'Editar productor'}
            </h2>
            <p className="text-sm text-maps-muted">
              {mode === 'create'
                ? 'Los datos enviados se guardan según MAPS (sin sucursal ni redes en esta etapa).'
                : titleNombre
                  ? `Editando: ${titleNombre}`
                  : 'Actualizá los datos del productor seleccionado.'}
            </p>
          </div>
        </header>

        {submitError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {submitError}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nombre" error={errors.nombre} required>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              className={inputClasses}
              placeholder="María"
            />
          </Field>
          <Field label="Apellido" error={errors.apellido} required>
            <input
              type="text"
              value={form.apellido}
              onChange={(e) => handleChange('apellido', e.target.value)}
              className={inputClasses}
              placeholder="Juárez"
            />
          </Field>
          <Field label="Email" error={errors.email} required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={inputClasses}
              placeholder="maria.juarez@..."
            />
          </Field>
          <Field label="Teléfono" hint="Opcional">
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              className={inputClasses}
              placeholder="+54 11 ..."
            />
          </Field>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-maps-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover disabled:opacity-50"
          >
            {submitting ? 'Guardando…' : mode === 'create' ? 'Crear productor' : 'Guardar cambios'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

const inputClasses =
  'w-full rounded-lg border border-maps-border bg-white px-3 py-2 text-sm text-maps-heading transition focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20';

function Field({
  label,
  children,
  error,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-maps-muted">
        {label}
        {hint ? (
          <span className="ml-1 normal-case font-normal text-maps-muted">{hint}</span>
        ) : null}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      {children}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
