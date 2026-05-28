import { isAxiosError } from 'axios';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { AuthLayout } from '@/shared/layouts/AuthLayout';
import type { Rol } from '@/store/authStore';
import { useAuthStore } from '@/store/authStore';

type FieldErrors = {
  usuario?: string;
  password?: string;
};

function validateUsuario(value: string): string | undefined {
  const v = value.trim();
  if (!v) return 'Ingresa tu correo o usuario.';
  if (v.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    return 'Correo electrónico no válido.';
  }
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) return 'Ingresa tu contraseña.';
  return undefined;
}

type LoginResponse = {
  data: {
    accessToken: string;
    user: { id: number; usuario: string; rol: string; slug: string | null };
  } | null;
  message: string;
  error: unknown;
};

export function LoginPage() {
  const formId = useId();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const usuarioId = `${formId}-usuario`;
  const passwordId = `${formId}-password`;

  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const next: FieldErrors = {};
    const uErr = validateUsuario(usuario);
    const pErr = validatePassword(password);
    if (uErr) next.usuario = uErr;
    if (pErr) next.password = pErr;
    setErrors(next);
    if (uErr || pErr) return;

    setIsLoading(true);
    try {
      const { data: body } = await api.post<LoginResponse>('/auth/login', {
        usuario: usuario.trim(),
        password,
      });

      if (!body.data) {
        setApiError('Respuesta inesperada del servidor.');
        return;
      }

      const { accessToken, user: u } = body.data;
      const user = {
        id: u.id,
        usuario: u.usuario,
        rol: u.rol as Rol,
        slug: u.slug ?? null,
      };
      login(user, accessToken);
      if (user.rol === 'PRODUCTOR') {
        void navigate('/intranet/dashboard', { replace: true });
      } else {
        void navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        const data = err.response.data as { message?: string } | undefined;
        setApiError(data?.message ?? 'No se pudo iniciar sesión.');
        return;
      }
      setApiError('Error de red. Comprueba tu conexión y la URL del API.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-8">
        <header>
          <h2 className="text-3xl font-bold tracking-tight text-maps-heading">
            Bienvenido{' '}
            <span role="img" aria-label="saludo">
              👋
            </span>
          </h2>
          <p className="mt-2 text-base leading-6 text-maps-body">
            Ingresa tus credenciales para acceder al portal de MAPS.
          </p>
        </header>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          {apiError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {apiError}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor={usuarioId} className="text-sm font-medium text-maps-body">
              Usuario
            </label>
            <input
              id={usuarioId}
              name="usuario"
              type="text"
              autoComplete="username"
              placeholder="nombre@ejemplo.com"
              value={usuario}
              onChange={(e) => {
                setUsuario(e.target.value);
                if (errors.usuario) setErrors((s) => ({ ...s, usuario: undefined }));
              }}
              aria-invalid={Boolean(errors.usuario)}
              aria-describedby={errors.usuario ? `${usuarioId}-err` : undefined}
              className="h-14 w-full rounded-lg border border-maps-border bg-white px-4 text-sm text-maps-heading outline-none ring-maps-brand transition placeholder:text-maps-muted focus:border-maps-brand focus:ring-2 focus:ring-maps-brand/25"
            />
            {errors.usuario ? (
              <p id={`${usuarioId}-err`} className="text-sm text-red-600" role="alert">
                {errors.usuario}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={passwordId} className="text-sm font-medium text-maps-body">
              Contraseña
            </label>
            <div className="relative">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((s) => ({ ...s, password: undefined }));
                }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? `${passwordId}-err` : undefined}
                className="h-14 w-full rounded-lg border border-maps-border bg-white py-3 pl-4 pr-12 text-sm text-maps-heading outline-none ring-maps-brand transition placeholder:text-maps-muted focus:border-maps-brand focus:ring-2 focus:ring-maps-brand/25"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-maps-body transition hover:bg-maps-border/40 hover:text-maps-heading focus:outline-none focus:ring-2 focus:ring-maps-brand/40"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password ? (
              <p id={`${passwordId}-err`} className="text-sm text-red-600" role="alert">
                {errors.password}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
            <a
              href="#"
              className="font-medium text-maps-brand transition hover:text-maps-brand-hover hover:underline focus:outline-none focus:ring-2 focus:ring-maps-brand/40 rounded"
              onClick={(e) => e.preventDefault()}
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="h-14 w-full rounded-lg bg-maps-brand font-semibold text-white shadow-md shadow-maps-brand/25 transition hover:bg-maps-brand-hover focus:outline-none focus:ring-2 focus:ring-maps-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Ingresando…' : 'Ingresar al Portal'}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <span className="w-full border-t border-maps-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-maps-muted">
                ¿Eres nuevo aquí?
              </span>
            </div>
          </div>

          <button
            type="button"
            className="h-[3.75rem] w-full rounded-lg border-2 border-maps-brand bg-white font-semibold text-maps-brand transition hover:bg-maps-brand/5 focus:outline-none focus:ring-2 focus:ring-maps-brand focus:ring-offset-2"
            onClick={() => {
              /* Solicitar acceso: enlazar cuando exista la ruta */
            }}
          >
            Solicitar Acceso
          </button>
        </form>

        <p className="text-center text-sm text-maps-body">
          ¿Necesitas ayuda?{' '}
          <a
            href="#"
            className="font-semibold text-maps-brand transition hover:text-maps-brand-hover hover:underline focus:outline-none focus:ring-2 focus:ring-maps-brand/40 rounded"
            onClick={(e) => e.preventDefault()}
          >
            Contactar soporte
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}
