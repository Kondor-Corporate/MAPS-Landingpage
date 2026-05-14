# Etapa de autenticación — Backend y UI de inicio de sesión

Documentación de la entrega **Auth (API + pantalla de login responsive)** dentro del ecosistema **MAPS Asesores**. Complementa el [README principal del repositorio](../README.md) con detalle técnico y pasos de verificación para el equipo.

---

## Propósito de este módulo

Esta etapa habilita el **flujo de identidad** del portal: un productor o administrador puede autenticarse contra la API, recibir tokens de acceso y refresco (según el diseño acordado), y usar una **interfaz de login** alineada al diseño de Figma, usable desde móvil y escritorio.

- **Backend:** endpoints REST bajo `/api/v1/auth`, persistencia de sesiones de refresco y validación de credenciales.
- **Frontend:** pantalla **«Vista de Inicio de Sesión»** (referencia Figma, nodo `45:5`), integrada con la API mediante **Axios** con `withCredentials: true`; access token en memoria (Zustand), refresh token por cookie httpOnly.

---

## Stack tecnológico (esta etapa)

| Capa                       | Tecnologías                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**               | React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router v6, Zustand, Axios                                                      |
| **Backend**                | Node.js, Express 4, TypeScript                                                                                                     |
| **Datos**                  | PostgreSQL, Prisma ORM                                                                                                             |
| **Seguridad / validación** | `bcryptjs` (hash de contraseñas), `jsonwebtoken` (JWT), Zod (esquemas de entrada), `cookie-parser` (cookies httpOnly para refresh), `helmet` (cabeceras HTTP), límites de body en Express |
| **CORS**                   | `cors` con `credentials: true` y origen definido en `FRONTEND_ORIGIN`                                                              |
| **Tests de integración**   | Vitest, Supertest (`createApp()` sin servidor HTTP separado)                                                                       |

> El frontend usa **Axios** con `withCredentials: true` para todas las peticiones. El access token se guarda en memoria via **Zustand** (no en `localStorage` ni `sessionStorage`). El refresh token viaja solo por la cookie httpOnly `maps_refresh`.

---

## Backend — Flujo de autenticación

### Rutas (`authRouter`)

Definidas en [`backend/src/api/v1/routes/auth.routes.ts`](../backend/src/api/v1/routes/auth.routes.ts) y montadas en **`/api/v1/auth`**:

| Método | Ruta       | Middlewares / comportamiento                                                                          |
| ------ | ---------- | ----------------------------------------------------------------------------------------------------- |
| `POST` | `/login`   | Rate limit (10 intentos / 15 min en producción; relajado en desarrollo y `NODE_ENV=test`) → `authController.login` |
| `POST` | `/refresh` | `authController.refresh` (cookie httpOnly `maps_refresh`; en **producción** el body `refreshToken` solo si `ALLOW_REFRESH_BODY=true`) |
| `POST` | `/logout`  | `authenticate` → `authController.logout`                                                              |

### Login (`authController.login`)

1. **Validación del cuerpo** con Zod [`loginSchema`](../backend/src/validations/auth.schema.ts): `{ usuario: string, password: string }` (ambos mínimo 1 carácter).
2. **Lógica de negocio** en [`authService.login`](../backend/src/services/auth.service.ts):
   - Busca el usuario por `usuario` (campo único en Prisma).
   - Comprueba `activo` y verifica la contraseña con **`bcrypt.compare`** frente a `passwordHash`.
   - Genera un **JWT de acceso** (`JWT_SECRET`, expiración `JWT_EXPIRES_IN`, típicamente corta).
   - Genera un **JWT de refresco** (`REFRESH_SECRET`, expiración `REFRESH_EXPIRES_IN`), con tipo `refresh` y `jti` único.
   - Persiste el refresh en **`SesionToken`** (hash del token en base de datos) para poder revocar en logout.
3. **Respuesta HTTP 200** — JSON estándar del proyecto:
   - `data.accessToken`: JWT de acceso (el cliente lo envía en `Authorization: Bearer …` en rutas protegidas).
   - `data.user`: `{ id, usuario, rol }` (sin datos sensibles).
   - **No** se devuelve el refresh en el cuerpo; se envía en cookie **`maps_refresh`** ([`REFRESH_COOKIE_NAME`](../backend/src/config/authCookies.ts)): **httpOnly**, `sameSite: 'lax'`, `secure` en producción.

### Middleware `authenticate`

[`backend/src/middlewares/authenticate.ts`](../backend/src/middlewares/authenticate.ts) exige el header **`Authorization: Bearer <accessToken>`**, verifica la firma con `JWT_SECRET` y adjunta **`req.user`** (`sub`, `role`) para controladores posteriores (p. ej. `POST /logout`).

### Errores coherentes

- Credenciales incorrectas o usuario inexistente → **`401`** con mensaje genérico **`Credenciales inválidas`** (evita enumeración de usuarios).
- Body inválido → **`400`** con `message: 'Datos de entrada inválidos'` y detalle Zod en `error`.

---

## Frontend — Diseño Figma y adaptabilidad

### Referencia de diseño

- Pantalla basada en el frame **«Vista de Inicio de Sesión»** del archivo Figma **Maps-Pagina-Web** (nodo `45:5`): panel izquierdo con gradiente de marca, titular y copyright; panel derecho con formulario (bienvenida, correo/usuario, contraseña con visibilidad, recordarme, CTA principal, divisor, solicitud de acceso, ayuda).

### Implementación en código

| Pieza            | Ubicación                                                                                                                                                                       | Notas                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout dividido  | [`frontend/src/shared/layouts/AuthLayout.tsx`](../frontend/src/shared/layouts/AuthLayout.tsx)                                                                                   | **Mobile-first:** en viewport pequeño el bloque de marca va arriba y el formulario abajo; desde **`lg:`** (1024px) se muestra reparto ~50/50 en fila.                                                                      |
| Página de login  | [`frontend/src/modules/auth/pages/LoginPage.tsx`](../frontend/src/modules/auth/pages/LoginPage.tsx)                                                                             | Validación local, toggle de contraseña, **`POST`** a `VITE_API_BASE_URL/auth/login` via **Axios** con `withCredentials: true`. El `accessToken` queda en el store de **Zustand** (memoria); el refresh en cookie httpOnly. |
| Punto de entrada | [`frontend/src/main.tsx`](../frontend/src/main.tsx)                                                                                                                             | Monta **`<RouterProvider router={appRouter} />`** dentro de **`<AuthInitializer>`**.                                                                                                                                       |
| Router           | [`frontend/src/router/index.tsx`](../frontend/src/router/index.tsx)                                                                                                             | `createBrowserRouter` con rutas públicas, intranet (`PRODUCTOR`), admin (`ADMIN`/`SUPERADMIN`) y fallback `*→/`.                                                                                                           |
| Guards           | [`PublicRoutes`](../frontend/src/router/PublicRoutes.tsx), [`ProtectedRoutes`](../frontend/src/router/ProtectedRoutes.tsx), [`RoleGuard`](../frontend/src/router/RoleGuard.tsx) | Guards reales con lógica completa. Esperan `isInitialized` antes de redirigir.                                                                                                                                             |
| Auth store       | [`frontend/src/store/authStore.ts`](../frontend/src/store/authStore.ts)                                                                                                         | Zustand con `persist` (solo `user`); `accessToken` en memoria; `isInitialized` / `isAuthenticated`.                                                                                                                        |
| HTTP client      | [`frontend/src/lib/axios.ts`](../frontend/src/lib/axios.ts)                                                                                                                     | Interceptor de `Authorization`, refresh automático ante `401` con flag `_retry` (sin bucle).                                                                                                                               |
| Logout           | [`frontend/src/modules/auth/hooks/useLogout.ts`](../frontend/src/modules/auth/hooks/useLogout.ts)                                                                               | Llama `POST /auth/logout`, limpia store y redirige a `/login`.                                                                                                                                                             |
| Estilos / tokens | [`frontend/tailwind.config.ts`](../frontend/tailwind.config.ts), [`frontend/index.html`](../frontend/index.html)                                                                | Paleta `maps.*`, fuente **Manrope** vía Google Fonts.                                                                                                                                                                      |

---

## Cómo probar (guía para el equipo)

### 1. Prerrequisitos

- Node.js LTS (≥ 20 recomendado).
- **Gestor de paquetes:** **npm** (el repositorio incluye `package-lock.json` en `frontend/` y `backend/`). Otros gestores no están soportados en MAPS-010.
- PostgreSQL accesible. Para desarrollo local, usar Docker Compose desde la raíz del repo (mapeo `5432:5432` → `DATABASE_URL` con `localhost:5432`). Si el backend corriera dentro de Docker en la misma red que el servicio `db`, usar host `db` y puerto `5432` en la URL.
- Archivos **`.env`** en backend y frontend (copiar desde `.env.example`).

**Backend** — variables relevantes validadas en [`loadEnv()`](../backend/src/config/env.ts):

- `DATABASE_URL`
- `JWT_SECRET` y `REFRESH_SECRET` (mínimo 32 caracteres cada uno)
- `JWT_EXPIRES_IN`, `REFRESH_EXPIRES_IN`
- `FRONTEND_ORIGIN` (debe coincidir con el origen del Vite dev server, p. ej. `http://localhost:5173`)
- `TRUST_PROXY` (opcional, default `false`): uso detrás de reverse proxy; ver comentarios en `backend/.env.example`.
- `ALLOW_REFRESH_BODY` (opcional): en producción por defecto **no** se acepta refresh por body; la SPA usa solo cookie httpOnly.
- `DEFAULT_PRODUCER_PASSWORD` (MAPS-009: contraseña inicial al crear productores desde admin; ver `backend/.env.example`). Backend y frontend corren localmente con `npm run dev`. La base oficial de desarrollo es `maps_asesores_dev`, expuesta en **`localhost:5432`** por `docker-compose.yml`.

**Frontend** — [`frontend/.env.example`](../frontend/.env.example):

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### 2. Base de datos, migraciones y seed

Desde la raíz del repo:

```bash
docker compose up -d
docker compose ps
docker compose logs db
```

pgAdmin es opcional: conectarlo a host `localhost`, puerto `5432`, usuario `postgres`, password `postgres`, base `maps_asesores_dev`.

Desde la carpeta **`backend/`**:

```bash
npm install
npx prisma migrate dev
npm run db:seed
```

Para resetear completamente la base local de Docker, usar `docker compose down -v` desde la raíz. Esto borra el volumen `pgdata` y elimina los datos persistidos.

El seed ([`backend/prisma/seed.ts`](../backend/prisma/seed.ts)) crea usuarios de prueba, entre otros:

| `usuario`    | `password`   | `rol`        |
| ------------ | ------------ | ------------ |
| `admin`      | `Admin1234!` | `ADMIN`      |
| `superadmin` | `Super1234!` | `SUPERADMIN` |

### 3. Levantar servicios

Terminal 1 — API:

```bash
cd backend
npm run dev
# Por defecto: http://localhost:3000
```

Terminal 2 — UI:

```bash
cd frontend
npm install
npm run dev
# Por defecto: http://localhost:5173
```

### 4. Probar el login por API

**Endpoint:** `POST http://localhost:3000/api/v1/auth/login`

**Cuerpo (JSON):**

```json
{
  "usuario": "admin",
  "password": "Admin1234!"
}
```

**Respuesta esperada (200):** objeto con `data.accessToken`, `data.user`, `message`, `error`; cabecera **`Set-Cookie`** con **`maps_refresh`** (httpOnly).

Con **curl** (no guarda cookie en sesión interactiva como el navegador, pero valida el JSON):

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"usuario\":\"admin\",\"password\":\"Admin1234!\"}"
```

### 5. Probar la UI en el navegador

1. Abrir **`http://localhost:5173`**.
2. Ingresar credenciales de seed y enviar el formulario.
3. Comprobar en DevTools → **Application** → cookies del sitio del API (mismo sitio si hay proxy; con orígenes distintos la cookie queda bajo el host del API). El `accessToken` vive en memoria (Zustand) y no aparecerá en `localStorage`/`sessionStorage`; la cookie httpOnly `maps_refresh` sí es visible en la pestaña de cookies.

### 6. Comportamiento responsive

1. DevTools → **Toggle device toolbar** (Ctrl+Shift+M / Cmd+Shift+M).
2. Probar anchos **&lt; 1024px**: layout apilado (marca arriba, formulario abajo).
3. Probar **≥ 1024px**: dos columnas (marca a la izquierda, formulario a la derecha).
4. Verificar que no aparezca **scroll horizontal** no deseado y que botones e inputs sigan siendo usables.

### 7. Tests de integración automatizados (backend)

Con base de datos migrada y seed ejecutado:

```bash
cd backend
npm test
```

Suite principal: [`backend/tests/auth.integration.test.ts`](../backend/tests/auth.integration.test.ts) (login, refresh, logout). El archivo [`backend/tests/setup.ts`](../backend/tests/setup.ts) carga variables con `dotenv/config`.

---

## Mapa de carpetas (archivos clave de esta etapa)

```
MAPS-Landingpage/
├── docs/
│   └── README.md                 ← este documento
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── tests/
│   │   ├── setup.ts
│   │   └── auth.integration.test.ts
│   └── src/
│       ├── app.ts                 ← createApp(): CORS, cookieParser, /api/v1
│       ├── api/v1/
│       │   ├── index.ts           ← v1Router + mount de authRouter en /auth
│       │   └── routes/auth.routes.ts
│       ├── controllers/auth.controller.ts
│       ├── services/auth.service.ts
│       ├── middlewares/authenticate.ts
│       ├── validations/auth.schema.ts
│       └── config/
│           ├── env.ts
│           └── authCookies.ts     ← REFRESH_COOKIE_NAME, opciones de cookie
├── frontend/
│   ├── index.html
│   ├── tailwind.config.ts
│   └── src/
│       ├── main.tsx
│       ├── modules/auth/pages/LoginPage.tsx
│       └── shared/layouts/AuthLayout.tsx
└── README.md                      ← visión general del proyecto
```

---

## Roles y reglas de acceso

El sistema usa tres roles definidos en el enum Prisma `Rol`:

| Rol          | Zona de acceso | Restricción                                                         |
| ------------ | -------------- | ------------------------------------------------------------------- |
| `PRODUCTOR`  | `/intranet/*`  | Ve y gestiona únicamente su propio perfil                           |
| `ADMIN`      | `/admin/*`     | Puede ver y gestionar todos los productores                         |
| `SUPERADMIN` | `/admin/*`     | Ídem ADMIN + gestión de administradores y configuraciones sensibles |

**Regla importante:** un ADMIN no accede a `/intranet` por defecto. Si una misma persona física es admin y también productor, se gestiona como dos usuarios separados con roles diferenciados, no como un único usuario con roles combinados. La web pública (`/` y `/productor/:slug`) es accesible para cualquier usuario, autenticado o no.

---

## Estado del routing (MAPS-004)

El sistema de routing y autenticación del cliente está **completamente implementado**:

| Ruta               | Acceso         | Guard                                                   |
| ------------------ | -------------- | ------------------------------------------------------- |
| `/`                | Público        | —                                                       |
| `/productor/:slug` | Público        | —                                                       |
| `/login`           | Solo invitados | `PublicRoutes` (redirige si hay sesión)                 |
| `/intranet/*`      | Autenticado    | `ProtectedRoutes` → `RoleGuard(['PRODUCTOR'])`          |
| `/admin/*`         | Autenticado    | `ProtectedRoutes` → `RoleGuard(['ADMIN','SUPERADMIN'])` |
| `/unauthorized`    | Público        | —                                                       |
| `*`                | —              | Redirige a `/`                                          |

---

## Estado real (alto nivel, MAPS-009)

| Módulo                                | Estado                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Admin — **productores**               | Integrado con **API real** `/api/v1/producers` (ver work-log MAPS-009). |
| Admin — **noticias**                  | **Mock** en cliente; sin API de negocio.                                |
| Público — **landing / mapa**          | **Locales / mock** según implementación actual.                         |
| **Perfil público** `/productor/:slug` | No sustituido por API de lectura en MAPS-009.                           |

---

## Pendientes para próximas features

### 1. Layouts finales (próxima feature)

`AppLayout` tiene un header mínimo funcional (usuario + logout). Faltan sidebar y footer permanentes. `PublicLayout` es un stub sin navbar ni footer aún.

### 2. Páginas de negocio (stubs pendientes)

| Módulo             | Archivo                                                                                                  | Siguiente paso                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Dashboard intranet | [`intranet/pages/DashboardPage.tsx`](../frontend/src/modules/intranet/pages/DashboardPage.tsx)           | Contenido real                                          |
| Dashboard admin    | [`admin/pages/DashboardPage.tsx`](../frontend/src/modules/admin/pages/DashboardPage.tsx)                 | Contenido real                                          |
| CRUD productores   | [`admin/pages/ProducersPage.tsx`](../frontend/src/modules/admin/pages/ProducersPage.tsx)                 | **MAPS-009** — integrado con `/api/v1/producers`        |
| Noticias           | [`admin/pages/NewsManagementPage.tsx`](../frontend/src/modules/admin/pages/NewsManagementPage.tsx)       | **Mock** — conectar API futura `/news`                  |
| Biblioteca         | [`intranet/pages/DigitalLibraryPage.tsx`](../frontend/src/modules/intranet/pages/DigitalLibraryPage.tsx) | Conectar endpoints `/library`                           |
| Landing + mapa     | [`public-web/pages/HomePage.tsx`](../frontend/src/modules/public-web/pages/HomePage.tsx)                 | Contenidos **locales/mock**; catálogo backend pendiente |

### 3. Otros pendientes

| Acción             | Detalle                                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seed PRODUCTOR     | Agregar usuario productor en [`backend/prisma/seed.ts`](../backend/prisma/seed.ts) para pruebas con ese rol                                                                             |
| Assets locales     | Logo en `AuthLayout` usa URL temporal de Figma; copiar a `frontend/public/`                                                                                                             |
| Tests E2E          | Valorar Playwright: flujo login → zona protegida → logout por rol                                                                                                                       |
| CORS en producción | Verificar `FRONTEND_ORIGIN` y `secure: true` en cookies por entorno                                                                                                                     |
| Docs MAPS-009      | [`tdd/MAPS-009-tdd-admin-api-productores.md`](./tdd/MAPS-009-tdd-admin-api-productores.md) y [`worklog/MAPS-009-admin-api-productores.md`](./worklog/MAPS-009-admin-api-productores.md) |

---

_Documento técnico principalmente MAPS-003 y MAPS-004 (auth/routing); ver también estado real MAPS-009 arriba. Para arquitectura global y convenciones del equipo, ver el [README raíz](../README.md)._
