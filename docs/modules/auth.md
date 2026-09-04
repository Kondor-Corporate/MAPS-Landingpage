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
| Tests | Vitest + Supertest en backend. Archivos `*.test.*` de frontend existen; el runner no está cableado (D5) |

---

## Backend

Las rutas estan definidas en `backend/src/api/v1/routes/auth.routes.ts` y montadas bajo `/api/v1/auth`.

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `POST` | `/login` | Valida credenciales, emite access token y setea cookie de refresh |
| `POST` | `/refresh` | Renueva el access token usando la cookie `maps_refresh` |
| `POST` | `/logout` | Revoca la sesion refresh actual e idempotentemente limpia cookie `maps_refresh` (D2A) |
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

### Logout (`POST /logout`, D2A)

Logout de producto: cierra **solo la sesion refresh del transporte actual**. No usa middleware `authenticate` ni access token. La credencial que identifica la sesion es el refresh token.

**Resolucion del refresh (prioridad cookie > body):**

1. Si existe cookie httpOnly `maps_refresh` (string no vacio), se usa **solo** la cookie; el body se ignora por completo (incluso si trae `refreshToken` invalido).
2. Si no hay cookie y `allowRefreshBody` esta habilitado (`NODE_ENV !== 'production'` por defecto, o `ALLOW_REFRESH_BODY=true` en produccion), se valida `logoutBodySchema` y se toma `body.refreshToken`.
3. Si no hay cookie y `allowRefreshBody` esta desactivado, el body se ignora.

**Comportamiento del endpoint:**

| Situacion | HTTP | Revocacion server-side | Cookie respuesta |
|-----------|------|------------------------|------------------|
| Refresh valido (firma + `typ === 'refresh'`) | `200` | `SesionToken.deleteMany({ tokenHash })` para esa sesion | `clearCookie` |
| Sin refresh usable (ausente, ya revocado, corrupto) | `200` idempotente | No borra filas desconocidas | `clearCookie` |
| Refresh con firma/tipo invalido | `200` (misma respuesta; no revela validez) | **No** consulta BD (`deleteMany` no se invoca) | `clearCookie` |
| Logout repetido | `200` | Idempotente (0 filas es OK) | `clearCookie` |
| Body invalido cuando **participa** (sin cookie + `allowRefreshBody`) | `400` | — | — |
| Fallo real de BD al revocar | `500` | No se afirma revocacion | `clearCookie` (termina sesion local del navegador) |

**Validacion antes de BD:** `authService.logout` ejecuta `jwt.verify(refreshToken, REFRESH_SECRET, { ignoreExpiration: true })` y exige `typ === 'refresh'`. Solo se ignora la expiracion del JWT para permitir revocar un refresh legitimo ya expirado cuyo hash sigue en `SesionToken`. Tokens arbitrarios o manipulados no provocan `deleteMany`.

**Revocacion:** SHA-256 del refresh → `prisma.sesionToken.deleteMany({ where: { tokenHash } })`. No incrementa `Usuario.tokenVersion`. No elimina otras sesiones del mismo usuario (otros dispositivos/tabs conservan su refresh).

**Respuesta de exito (200):**

```json
{
  "data": null,
  "message": "Sesión cerrada",
  "error": null
}
```

**Limitacion explicita (access residual):** un access token ya emitido **antes** del logout sigue pasando `authenticate` hasta su expiracion natural (`JWT_EXPIRES_IN`, habitualmente ~15 min) mientras el usuario siga activo, el rol coincida y `ver === tokenVersion`. D2A no implementa denylist de access ni consulta de `SesionToken` por request.

**Caso sin refresh identificable:** si no hay cookie ni body usable, el servidor responde `200` e intenta `clearCookie`, pero **no puede** saber que fila `SesionToken` borrar. No se hace `deleteMany` por `usuarioId` (cerraria otros dispositivos).

**Frontend:**

- `useLogout` (`frontend/src/modules/auth/hooks/useLogout.ts`): best-effort `POST /auth/logout`; en `finally` limpia el auth store y navega a `/login` aunque la red falle.
- El interceptor Axios (`frontend/src/lib/axios.ts`) excluye `/auth/logout` del flujo automatico `401 → refresh → retry` (`isAuthEndpoint`).

**Distincion con cambio de contraseña:** `PATCH /me/password` revoca **todas** las sesiones del usuario (`tokenVersion++` + `deleteMany` por `usuarioId`). El logout explicito del sidebar usa `POST /logout` y cierra solo la sesion refresh actual.

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
| HTTP client | `frontend/src/lib/axios.ts` | Bearer token, refresh automatico ante 401; `/auth/logout` excluido del retry (D2A) |
| Inicializacion | `frontend/src/components/AuthInitializer.tsx` | Rehidrata store y renueva token al cargar |
| Logout hook | `frontend/src/modules/auth/hooks/useLogout.ts` | Best-effort remoto + limpieza local en `finally` (logout explicito; no se usa tras cambio de contraseña) |
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
FRONTEND_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
ALLOW_REFRESH_BODY=false
```

Frontend:

```env
VITE_API_BASE_URL=http://127.0.0.1:3000/api/v1
```

---

## Verificacion manual

1. Levantar servicios y base de datos.
2. Aplicar migraciones y seed.
3. Abrir `http://127.0.0.1:5173`.
4. Login con usuario seed `admin` / `Admin1234!`.
5. Verificar redireccion a `/admin/dashboard`.
6. Logout y confirmar retorno a `/login`.
7. Probar usuario productor seed y confirmar acceso a `/intranet/*`.
8. Desde Mi perfil (productor o admin), cambiar la contraseña propia: debe pedir la actual, invalidar la sesión y volver a `/login`.
9. Confirmar que el login con la contraseña nueva funciona y el de la anterior falla.

API:

```bash
curl -s -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"usuario\":\"admin\",\"password\":\"Admin1234!\"}"
```

---

## Tests relevantes

Backend:

- `backend/tests/auth.integration.test.ts` (login/refresh/logout D2A y `PATCH /me/password` para PRODUCTOR, ADMIN y SUPERADMIN)
- `backend/tests/producers.integration.test.ts` (alias temporal `PATCH /producers/me/password`, solo PRODUCTOR)
- `backend/tests/authorize-validate.middleware.test.ts`

Frontend:

- Existen archivos en `frontend/src/tests/` (store, guards, axios, `ChangePasswordForm`). No hay runner Vitest en `frontend/package.json`; no se ejecutan en CI. Pendiente D5.

---

## Pendientes conocidos

- E2E browser para flujo login -> zona protegida -> logout.
- Revisar configuracion final de cookies/CORS para produccion.
- Invitacion por email para el primer acceso del productor (ver `docs/modules/producers.md`). El "primer login" en si ya esta cubierto: el admin define la password inicial en el alta (MAPS-016, `docs/worklog/MAPS-016-credenciales-productores.md`).

### Deuda D2C — session hardening (diferida)

D2A endurece el **logout de producto** (revocacion de la sesion refresh actual). **No** implementa refresh rotation, reuse detection, token families ni grace period.

El refresh token sigue siendo **reutilizable** hasta su expiracion (`REFRESH_EXPIRES_IN`, default 30d) mientras la fila `SesionToken` exista y el usuario no haya hecho logout de esa cookie ni un evento de revocacion global (cambio de contraseña, reset admin, desactivacion, cambio de `usuario` ADMIN, etc.). Un refresh robado que el usuario nunca revoca sigue siendo un riesgo de sesion; eso no se describe como bug resuelto por D2A.

Estado: **deuda de session hardening**, actualmente diferida. Una rotacion correcta requiere diseno adicional para concurrencia multi-tab, token families/reuse detection y lost-response handling. Ver TDD `docs/tdd/D2A-tdd-logout-robusto.md` (seccion Deuda D2C) y worklog `docs/worklog/D2A-logout-robusto.md`.
