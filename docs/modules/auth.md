# Auth y routing

Documentacion tecnica del flujo de autenticacion, sesion y control de acceso de MAPS Asesores.

Para el estado global del producto, usar el README raiz y el indice de documentacion en `docs/README.md`. Este documento se limita al modulo Auth/Routing.

---

## Proposito

El modulo de autenticacion permite que productores, administradores y superadministradores ingresen al portal, mantengan sesion y accedan solo a las zonas permitidas por su rol.

- Backend: endpoints REST bajo `/api/v1/auth`.
- Frontend: pantalla de login, store de sesion, refresh automatico y guards de rutas.
- Sesion: access token en memoria y refresh token en cookie httpOnly.

---

## Stack involucrado

| Capa | Tecnologias |
|------|-------------|
| Frontend | React, React Router, Zustand, Axios |
| Backend | Express, JWT, cookie-parser, Zod, Prisma |
| Seguridad | Cookies httpOnly, RBAC, rate limit en login, CORS con credenciales |
| Tests | Vitest + Supertest en backend; tests de router/store en frontend |

---

## Backend

Las rutas estan definidas en `backend/src/api/v1/routes/auth.routes.ts` y montadas bajo `/api/v1/auth`.

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `POST` | `/login` | Valida credenciales, emite access token y setea cookie de refresh |
| `POST` | `/refresh` | Renueva el access token usando la cookie `maps_refresh` |
| `POST` | `/logout` | Revoca sesion y limpia cookie de refresh |
| `PATCH` | `/me/password` | Cambio self-service de contraseña del usuario autenticado |

### Login

Flujo principal:

1. Valida body con Zod: `{ usuario, password }`.
2. Busca el usuario por `usuario`.
3. Verifica que este activo.
4. Compara password con `bcrypt`.
5. Genera access token firmado con `JWT_SECRET`.
6. Genera refresh token firmado con `REFRESH_SECRET`.
7. Guarda hash del refresh en `SesionToken`.
8. Devuelve `{ accessToken, user }` y setea cookie httpOnly.

La respuesta no expone `passwordHash` ni devuelve refresh token en el body en el flujo normal de la SPA.

### Refresh

El refresh token viaja en cookie httpOnly `maps_refresh`. En produccion, el body `refreshToken` solo deberia aceptarse si `ALLOW_REFRESH_BODY=true`.

### Logout

Requiere `Authorization: Bearer <accessToken>`. Revoca la sesion asociada al refresh token y limpia la cookie.

### Cambio de contraseña propia (`PATCH /me/password`)

Endpoint canónico de self-service. Disponible para **cualquier `Usuario` autenticado** (`PRODUCTOR`, `ADMIN`, `SUPERADMIN`). No es un flujo de Productor: la lógica vive en Auth.

Cadena: `authenticate` → `passwordChangeLimiter` → `validate(changeMyPasswordSchema)` → `authController.changeMyPassword`.

Reglas:

1. Requiere `currentPassword`, `newPassword` y `confirmPassword`.
2. La nueva contraseña debe cumplir la política existente (`passwordPolicy`: mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número) y coincidir con la confirmación (si no, `422`).
3. Si la contraseña actual no coincide: `400 Contraseña actual incorrecta` (no `401`, para no forzar logout en el cliente).
4. Recién después se rechaza `newPassword === currentPassword` (`400`).
5. Hash con `bcrypt` coste 12.
6. En una sola transacción: actualiza `passwordHash`, incrementa `tokenVersion` e elimina todas las filas `SesionToken` del usuario.
7. Tras el éxito el controller limpia la cookie `maps_refresh`. El access token en curso queda inválido por `tokenVersion`.

Rate limiter: ventana de 15 minutos, clave `req.user.sub` (no IP). La misma instancia se reutiliza en el alias temporal `PATCH /api/v1/producers/me/password` (solo `PRODUCTOR`; ver `docs/modules/producers.md`), de modo que canónico y alias comparten cupo/store.

Tras un cambio exitoso el frontend limpia solo el auth store y redirige a `/login`. No llama `POST /auth/logout` ni `useLogout` en este flujo: las sesiones ya fueron revocadas en servidor.

Formulario y cliente HTTP compartidos:

- `frontend/src/modules/auth/components/ChangePasswordForm.tsx`
- `frontend/src/modules/auth/services/auth.service.ts` (`PATCH /auth/me/password`)

Lo usan el perfil de productor (`/intranet/mi-perfil`) y el de admin/superadmin (`/admin/mi-perfil`).

Compatibilidad: `PATCH /api/v1/producers/me/password` queda como alias temporal solo para `PRODUCTOR`. El restablecimiento admin de un productor (`PATCH /producers/:id/password`) no es self-service y sigue en el dominio Productores.

---

## Frontend

Piezas principales:

| Pieza | Archivo | Responsabilidad |
|-------|---------|-----------------|
| Login page | `frontend/src/modules/auth/pages/LoginPage.tsx` | Formulario y envio de credenciales |
| Auth store | `frontend/src/store/authStore.ts` | Usuario persistido, access token en memoria, estado de inicializacion |
| HTTP client | `frontend/src/lib/axios.ts` | Bearer token, refresh automatico ante 401 |
| Inicializacion | `frontend/src/components/AuthInitializer.tsx` | Rehidrata store y renueva token al cargar |
| Logout hook | `frontend/src/modules/auth/hooks/useLogout.ts` | Llama API, limpia store y redirige (logout explícito; no se usa tras cambio de contraseña) |
| Cambio de contraseña | `frontend/src/modules/auth/components/ChangePasswordForm.tsx` | Formulario self-service compartido (productor, admin, superadmin) |
| Auth service | `frontend/src/modules/auth/services/auth.service.ts` | `PATCH /auth/me/password` |

El access token no se persiste en `localStorage` ni `sessionStorage`. Solo se persiste `user` para poder rehidratar y pedir un nuevo access token con la cookie httpOnly.

---

## Routing y roles

Roles definidos por el enum Prisma `Rol`:

| Rol | Zona principal |
|-----|----------------|
| `PRODUCTOR` | `/intranet/*` |
| `ADMIN` | `/admin/*` |
| `SUPERADMIN` | `/admin/*` |

Rutas principales:

| Ruta | Acceso | Guard |
|------|--------|-------|
| `/` | Publico | Ninguno |
| `/productor/:slug` | Publico | Ninguno |
| `/login` | Invitados | `PublicRoutes` |
| `/intranet/*` | Autenticado productor | `ProtectedRoutes` + `RoleGuard(['PRODUCTOR'])` |
| `/admin/*` | Autenticado admin/superadmin | `ProtectedRoutes` + `RoleGuard(['ADMIN', 'SUPERADMIN'])` |
| `/unauthorized` | Publico | Ninguno |

Regla importante: un usuario `ADMIN` no accede a `/intranet` por defecto. Si una persona fisica necesita ambos accesos, se modela como cuentas separadas.

---

## Variables de entorno relacionadas

Backend:

```env
JWT_SECRET=dev_access_secret_change_me_32_chars_minimum
JWT_EXPIRES_IN=15m
REFRESH_SECRET=dev_refresh_secret_change_me_32_chars_minimum
REFRESH_EXPIRES_IN=30d
FRONTEND_ORIGIN=http://localhost:5173
ALLOW_REFRESH_BODY=false
```

Frontend:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## Verificacion manual

1. Levantar servicios y base de datos.
2. Aplicar migraciones y seed.
3. Abrir `http://localhost:5173`.
4. Login con usuario seed `admin` / `Admin1234!`.
5. Verificar redireccion a `/admin/dashboard`.
6. Logout y confirmar retorno a `/login`.
7. Probar usuario productor seed y confirmar acceso a `/intranet/*`.
8. Desde Mi perfil (productor o admin), cambiar la contraseña propia: debe pedir la actual, invalidar la sesión y volver a `/login`.
9. Confirmar que el login con la contraseña nueva funciona y el de la anterior falla.

API:

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"usuario\":\"admin\",\"password\":\"Admin1234!\"}"
```

---

## Tests relevantes

Backend:

- `backend/tests/auth.integration.test.ts` (login/refresh/logout y `PATCH /me/password` para PRODUCTOR, ADMIN y SUPERADMIN)
- `backend/tests/producers.integration.test.ts` (alias temporal `PATCH /producers/me/password`, solo PRODUCTOR)
- `backend/tests/authorize-validate.middleware.test.ts`

Frontend:

- `frontend/src/tests/store/authStore.test.ts`
- `frontend/src/tests/router/guards.test.tsx`
- `frontend/src/tests/lib/axios.test.ts`

---

## Pendientes conocidos

- E2E browser para flujo login -> zona protegida -> logout.
- Revisar configuracion final de cookies/CORS para produccion.
- Invitacion por email para el primer acceso del productor (ver `docs/modules/producers.md`). El "primer login" en si ya esta cubierto: el admin define la password inicial en el alta (MAPS-016, `docs/worklog/MAPS-016-credenciales-productores.md`).
