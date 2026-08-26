import { useEffect, useRef, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { AddressMapPicker } from '@/shared/components/map/AddressMapPicker';
import { ProducerCertificationsManager } from '@/shared/components/profile/ProducerCertificationsManager';
import { ProducerProfileAdminFields } from '@/modules/admin/components/ProducerProfileAdminFields';
import { PasswordField } from '@/shared/components/PasswordField';
import { passwordPolicyError } from '@/shared/utils/passwordPolicy';
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
  onUploadCertificacion?: (file: File, nombre: string) => Promise<void>;
  onDeleteCertificacion?: (certId: number) => Promise<void>;
};

type FormState = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  ciudad: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  matricula: string;
  tituloProfesional: string;
  verificado: boolean;
  anosExperiencia: string;
  clientesActivos: string;
  password: string;
  confirmPassword: string;
};

const EMPTY_FORM: FormState = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  ciudad: '',
  direccion: '',
  latitud: undefined,
  longitud: undefined,
  matricula: '',
  tituloProfesional: '',
  verificado: false,
  anosExperiencia: '',
  clientesActivos: '',
  password: '',
  confirmPassword: '',
};

function fromProducer(p: Producer): FormState {
  return {
    nombre: p.nombre,
    apellido: p.apellido,
    email: p.email,
    telefono: p.telefono ?? '',
    ciudad: p.ciudad ?? '',
    direccion: p.direccion ?? p.ciudad ?? '',
    latitud: p.latitud ?? undefined,
    longitud: p.longitud ?? undefined,
    matricula: p.matricula ?? '',
    tituloProfesional: p.tituloProfesional ?? '',
    verificado: p.verificado,
    anosExperiencia: p.anosExperiencia != null ? String(p.anosExperiencia) : '',
    clientesActivos: p.clientesActivos != null ? String(p.clientesActivos) : '',
    password: '',
    confirmPassword: '',
  };
}

function isNonNegativeIntegerString(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || /^\d+$/.test(trimmed);
}

function validate(form: FormState, mode: Mode): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.nombre.trim()) errors.nombre = 'Requerido';
  if (!form.apellido.trim()) errors.apellido = 'Requerido';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Email inválido';
  if (mode === 'create' && form.direccion.trim().length < 5) {
    errors.ciudad = 'Dirección requerida (mínimo 5 caracteres)';
  }
  if (
    form.direccion.trim().length >= 5 &&
    (form.latitud === undefined || form.longitud === undefined)
  ) {
    errors.ciudad = 'Confirmá la ubicación en el mapa';
  }
  if (!isNonNegativeIntegerString(form.anosExperiencia)) {
    errors.anosExperiencia = 'Ingrese un numero entero mayor o igual a 0';
  }
  if (!isNonNegativeIntegerString(form.clientesActivos)) {
    errors.clientesActivos = 'Ingrese un numero entero mayor o igual a 0';
  }
  if (mode === 'create') {
    const passwordError = passwordPolicyError(form.password);
    if (passwordError) errors.password = passwordError;
    else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
  }
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
  onUploadCertificacion,
  onDeleteCertificacion,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});
  const formContextRef = useRef<string | null>(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      formContextRef.current = null;
      return;
    }

    const formContext = `${mode}:${producer?.id ?? 'new'}`;
    if (formContextRef.current === formContext) return;

    formContextRef.current = formContext;
    setErrors({});
    if (mode === 'edit' && producer) {
      setForm(fromProducer(producer));
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, mode, producer]);

  // Validación de contraseña en tiempo real (solo en alta): feedback a medida que se escribe,
  // sin esperar al submit. No "regaña" mientras el campo está vacío.
  useEffect(() => {
    if (mode !== 'create') return;
    setErrors((prev) => {
      const next = { ...prev };
      const passwordError = form.password ? passwordPolicyError(form.password) : null;
      if (passwordError) next.password = passwordError;
      else delete next.password;

      if (form.confirmPassword) {
        if (!passwordError && form.password !== form.confirmPassword) {
          next.confirmPassword = 'Las contraseñas no coinciden';
        } else {
          delete next.confirmPassword;
        }
      } else {
        delete next.confirmPassword;
      }
      return next;
    });
  }, [form.password, form.confirmPassword, mode]);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submitLockRef.current) return;
    const v = validate(form, mode);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    submitLockRef.current = true;
    try {
      await onSubmit({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        ciudad: form.ciudad.trim() || form.direccion.trim(),
        direccion: form.direccion.trim(),
        latitud: form.latitud,
        longitud: form.longitud,
        matricula: form.matricula.trim(),
        tituloProfesional: form.tituloProfesional.trim(),
        verificado: form.verificado,
        anosExperiencia: form.anosExperiencia.trim(),
        clientesActivos: form.clientesActivos.trim(),
        ...(mode === 'create' ? { password: form.password } : {}),
      });
    } catch {
      /* error mostrado vía submitError props */
    } finally {
      submitLockRef.current = false;
    }
  }

  const titleNombre = mode === 'edit' && producer ? producerNombreCompleto(producer) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex max-h-[90vh] flex-col">
        <div className="flex flex-col gap-6 overflow-y-auto p-6">
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
                  ? 'Datos básicos y perfil profesional inicial.'
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
              />
            </Field>
            <Field label="Apellido" error={errors.apellido} required>
              <input
                type="text"
                value={form.apellido}
                onChange={(e) => handleChange('apellido', e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Email" error={errors.email} required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Teléfono" hint="Opcional">
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className={inputClasses}
              />
            </Field>
          </div>

          {mode === 'create' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <PasswordField
                label="Contraseña inicial"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={(v) => handleChange('password', v)}
                error={errors.password}
              />
              <PasswordField
                label="Confirmar contraseña"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(v) => handleChange('confirmPassword', v)}
                error={errors.confirmPassword}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <AddressMapPicker
              direccion={form.direccion}
              initialCoords={
                form.latitud !== undefined && form.longitud !== undefined
                  ? { latitud: form.latitud, longitud: form.longitud }
                  : null
              }
              required={mode === 'create'}
              onChange={(location) =>
                setForm((prev) => ({
                  ...prev,
                  ciudad: location.direccion,
                  direccion: location.direccion,
                  latitud: location.latitud,
                  longitud: location.longitud,
                }))
              }
            />
            {errors.ciudad ? <span className="text-xs text-rose-600">{errors.ciudad}</span> : null}
          </div>

          <ProducerProfileAdminFields
            matricula={form.matricula}
            tituloProfesional={form.tituloProfesional}
            verificado={form.verificado}
            anosExperiencia={form.anosExperiencia}
            clientesActivos={form.clientesActivos}
            errors={{
              anosExperiencia: errors.anosExperiencia,
              clientesActivos: errors.clientesActivos,
            }}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />

          {mode === 'edit' && producer && onUploadCertificacion && onDeleteCertificacion ? (
            <ProducerCertificationsManager
              certificaciones={producer.certificaciones}
              onUpload={onUploadCertificacion}
              onDelete={onDeleteCertificacion}
            />
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-maps-border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-11 w-full rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface disabled:opacity-50 sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover disabled:opacity-50 sm:w-auto"
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
        {hint ? <span className="ml-1 normal-case font-normal text-maps-muted">{hint}</span> : null}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      {children}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
