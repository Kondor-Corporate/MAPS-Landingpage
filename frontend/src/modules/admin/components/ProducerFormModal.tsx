import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { SUCURSALES_OPTIONS } from '@/modules/admin/data/producersMock';
import type { Producer, ProducerInput } from '@/modules/admin/types/producer';

type Mode = 'create' | 'edit';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
  producer?: Producer | null;
  onSubmit: (input: ProducerInput) => void;
};

type FormState = {
  nombre: string;
  dni: string;
  email: string;
  telefono: string;
  sucursal: string;
  estado: Producer['estado'];
  avatarUrl: string;
};

const EMPTY_FORM: FormState = {
  nombre: '',
  dni: '',
  email: '',
  telefono: '',
  sucursal: SUCURSALES_OPTIONS[0],
  estado: 'ACTIVO',
  avatarUrl: '',
};

function fromProducer(p: Producer): FormState {
  return {
    nombre: p.nombre,
    dni: p.dni,
    email: p.email,
    telefono: p.telefono,
    sucursal: p.sucursal,
    estado: p.estado,
    avatarUrl: p.avatarUrl ?? '',
  };
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.nombre.trim()) errors.nombre = 'Requerido';
  if (!/^\d{7,9}$/.test(form.dni.trim())) errors.dni = 'DNI inválido (7–9 dígitos)';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Email inválido';
  if (!form.telefono.trim()) errors.telefono = 'Requerido';
  return errors;
}

export function ProducerFormModal({ isOpen, onClose, mode, producer, onSubmit }: Props) {
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    onSubmit({
      nombre: form.nombre.trim(),
      dni: form.dni.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      sucursal: form.sucursal,
      estado: form.estado,
      avatarUrl: form.avatarUrl.trim() || undefined,
    });
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
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
                ? 'Completá los datos para dar de alta un productor.'
                : 'Actualizá los datos del productor seleccionado.'}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nombre completo" error={errors.nombre} required>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              className={inputClasses}
              placeholder="Juan Pérez"
            />
          </Field>
          <Field label="DNI" error={errors.dni} required>
            <input
              type="text"
              inputMode="numeric"
              value={form.dni}
              onChange={(e) => handleChange('dni', e.target.value)}
              className={inputClasses}
              placeholder="12345678"
            />
          </Field>
          <Field label="Email" error={errors.email} required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={inputClasses}
              placeholder="juan@maps.com.ar"
            />
          </Field>
          <Field label="Teléfono" error={errors.telefono} required>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              className={inputClasses}
              placeholder="+54 11 ..."
            />
          </Field>
          <Field label="Sucursal">
            <select
              value={form.sucursal}
              onChange={(e) => handleChange('sucursal', e.target.value)}
              className={inputClasses}
            >
              {SUCURSALES_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          {mode === 'edit' ? (
            <Field label="Estado">
              <select
                value={form.estado}
                onChange={(e) =>
                  handleChange('estado', e.target.value as Producer['estado'])
                }
                className={inputClasses}
              >
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </Field>
          ) : (
            <Field label="Avatar URL (opcional)">
              <input
                type="url"
                value={form.avatarUrl}
                onChange={(e) => handleChange('avatarUrl', e.target.value)}
                className={inputClasses}
                placeholder="https://..."
              />
            </Field>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-maps-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover"
          >
            {mode === 'create' ? 'Crear productor' : 'Guardar cambios'}
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
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-maps-muted">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      {children}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
