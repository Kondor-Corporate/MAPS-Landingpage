# Etapa de autenticación — Backend y UI de inicio de sesión

Documentación de la entrega **Auth (API + pantalla de login responsive)** dentro del ecosistema **MAPS Asesores**. Complementa el [README principal del repositorio](../README.md) con detalle técnico y pasos de verificación para el equipo.

---

## Propósito de este módulo

Esta etapa habilita el **flujo de identidad** del portal: un productor o administrador puede autenticarse contra la API, recibir tokens de acceso y refresco (según el diseño acordado), y usar una **interfaz de login** alineada al diseño de Figma, usable desde móvil y escritorio.

- **Backend:** endpoints REST bajo `/api/v1/auth`, persistencia de sesiones de refresco y validación de credenciales.
- **Frontend:** pantalla **«Vista de Inicio de Sesión»** (referencia Figma, nodo `45:5`), integrada con la API mediante `fetch` y almacenamiento del JWT de acceso en el navegador.

---

## Stack tecnológico (esta etapa)

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| **Backend** | Node.js, Express 4, TypeScript |
| **Datos** | PostgreSQL, Prisma ORM |
| **Seguridad / validación** | `bcryptjs` (hash de contraseñas), `jsonwebtoken` (JWT), Zod (esquemas de entrada), `cookie-parser` (cookies httpOnly para refresh) |
| **CORS** | `cors` con `credentials: true` y origen definido en `FRONTEND_ORIGIN` |
| **Tests de integración** | Vitest, Supertest (`createApp()` sin servidor HTTP separado) |

> El README raíz menciona herramientas previstas para fases posteriores (p. ej. React Router, cliente HTTP). En el `package.json` actual del frontend, la dependencia explícita para esta etapa es **React + Vite + Tailwind**; el login usa **`fetch` nativo**.

---

## Backend — Flujo de autenticación

### Rutas (`authRouter`)

Definidas en [`backend/src/api/v1/routes/auth.routes.ts`](../backend/src/api/v1/routes/auth.routes.ts) y montadas en **`/api/v1/auth`**:

| Método | Ruta | Middlewares / comportamiento |
|--------|------|------------------------------|
| `POST` | `/login` | Rate limit (10 intentos / 15 min en producción; relajado en `NODE_ENV=test`) → `authController.login` |
| `POST` | `/refresh` | `authController.refresh` (refresh por cookie httpOnly y/o body opcional) |
| `POST` | `/logout` | `authenticate` → `authController.logout` |

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

| Pieza | Ubicación | Notas |
|-------|-----------|--------|
| Layout dividido | [`frontend/src/shared/layouts/AuthLayout.tsx`](../frontend/src/shared/layouts/AuthLayout.tsx) | **Mobile-first:** en viewport pequeño el bloque de marca va arriba y el formulario abajo; desde **`lg:`** (1024px) se muestra reparto ~50/50 en fila. |
| Página de login | [`frontend/src/modules/auth/pages/LoginPage.tsx`](../frontend/src/modules/auth/pages/LoginPage.tsx) | Validación local, toggle de contraseña, **`POST`** a `VITE_API_BASE_URL/auth/login` con **`credentials: 'include'`** para la cookie de refresh, guardado de **`maps_access_token`** en `sessionStorage` o `localStorage` según «Recordarme». |
| Punto de entrada | [`frontend/src/main.tsx`](../frontend/src/main.tsx) | Monta actualmente **`<LoginPage />`**. |
| Estilos / tokens | [`frontend/tailwind.config.ts`](../frontend/tailwind.config.ts), [`frontend/index.html`](../frontend/index.html) | Paleta `maps.*`, fuente **Manrope** vía Google Fonts. |

La etiqueta del formulario sigue el copy de Figma («Correo electrónico»); el backend espera el campo **`usuario`**, por lo que el valor enviado puede ser nombre de usuario (p. ej. seed `admin`) o un identificador con formato correo si el negocio lo define así.

---

## Cómo probar (guía para el equipo)

### 1. Prerrequisitos

- Node.js LTS (≥ 20 recomendado).
- PostgreSQL accesible (local o Docker según [`docker-compose.yml`](../docker-compose.yml) del repo).
- Archivos **`.env`** en backend y frontend (copiar desde `.env.example`).

**Backend** — variables relevantes validadas en [`loadEnv()`](../backend/src/config/env.ts):

- `DATABASE_URL`
- `JWT_SECRET` y `REFRESH_SECRET` (mínimo 32 caracteres cada uno)
- `JWT_EXPIRES_IN`, `REFRESH_EXPIRES_IN`
- `FRONTEND_ORIGIN` (debe coincidir con el origen del Vite dev server, p. ej. `http://localhost:5173`)

**Frontend** — [`frontend/.env.example`](../frontend/.env.example):

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### 2. Migraciones y seed

Desde la carpeta **`backend/`**:

```bash
npm install
npx prisma migrate dev
npm run db:seed
```

El seed ([`backend/prisma/seed.ts`](../backend/prisma/seed.ts)) crea usuarios de prueba, entre otros:

| `usuario`   | `password`   | `rol`        |
|-------------|--------------|--------------|
| `admin`     | `Admin1234!` | `ADMIN`      |
| `superadmin`| `Super1234!` | `SUPERADMIN` |

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
3. Comprobar en DevTools → **Application** → cookies del sitio del API (mismo sitio si hay proxy; con orígenes distintos la cookie queda bajo el host del API) y **Storage** → `sessionStorage` o `localStorage` → clave **`maps_access_token`** según «Recordarme».

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

## Colaboración y siguientes pasos sugeridos

- Enlazar **«Solicitar Acceso»** y **«Contactar soporte»** a rutas o URLs reales cuando existan.
- Sustituir assets remotos de Figma por archivos estáticos en `frontend/public` para entornos productivos.
- Integrar **React Router** y pantallas post-login cuando la siguiente etapa lo defina, reutilizando `maps_access_token` y la cookie `maps_refresh` para **`POST /api/v1/auth/refresh`**.

---

*Documento generado para alinear al equipo en la etapa Auth — Backend y UI responsive. Para dudas de arquitectura global, consultar el README en la raíz del repositorio.*
