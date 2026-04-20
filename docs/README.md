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


---

## Cómo probar (guía para el equipo)

### 1. Prerrequisitos

- Node.js LTS (≥ 20 recomendado).
- PostgreSQL accesible
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

## Próxima etapa: qué debería hacerse a continuación

Con el **login funcional** (API + pantalla), el siguiente trabajo prioriza **cerrar el flujo de sesión en el cliente** y **dar destino al usuario según su rol**. La lista está ordenada por dependencias: conviene avanzar de arriba hacia abajo salvo que el producto defina otro foco (p. ej. solo landing pública).

### 1. Enrutamiento en el frontend (bloqueante para el resto)

| Acción | Detalle |
|--------|---------|
| Añadir **React Router** | Instalar `react-router-dom` y definir rutas públicas vs. protegidas. |
| Cambiar el punto de entrada | Sustituir el montaje directo de `<LoginPage />` en [`frontend/src/main.tsx`](../frontend/src/main.tsx) por un árbol con **`<BrowserRouter>`** y el router principal. |
| Activar los stubs existentes | Implementar [`frontend/src/router/AppRouter`](../frontend/src/router/index.tsx), [`PublicRoutes.tsx`](../frontend/src/router/PublicRoutes.tsx), [`ProtectedRoutes.tsx`](../frontend/src/router/ProtectedRoutes.tsx) y [`RoleGuard.tsx`](../frontend/src/router/RoleGuard.tsx) para redirigir según autenticación y `user.rol` (`PRODUCER`, `ADMIN`, `SUPERADMIN`). |

**Rutas mínimas sugeridas:** `/login` (o `/`), `/intranet/...`, `/admin/...`, y en su momento `/` o `/inicio` para la web pública.

### 2. Capa de autenticación en el cliente

| Acción | Detalle |
|--------|---------|
| **Contexto o hook** (`useAuth`) | Estado: usuario actual, token de acceso, `login`, `logout`, `refresh`. Leer `maps_access_token` de `sessionStorage` / `localStorage` al iniciar la app. |
| **Refresh automático** | Ante `401` en peticiones autenticadas, llamar **`POST /api/v1/auth/refresh`** con **`credentials: 'include'`** (cookie `maps_refresh`), guardar el nuevo `accessToken` y reintentar la petición una vez. |
| **Logout** | Llamar **`POST /api/v1/auth/logout`** con `Authorization: Bearer` y limpiar almacenamiento local + redirigir a `/login`. |

Referencia de API: [`backend/src/api/v1/routes/auth.routes.ts`](../backend/src/api/v1/routes/auth.routes.ts).

### 3. Experiencia post-login

| Acción | Detalle |
|--------|---------|
| **Redirección por rol** | Tras login exitoso en [`LoginPage.tsx`](../frontend/src/modules/auth/pages/LoginPage.tsx), navegar al dashboard que corresponda (productor vs. admin) en lugar de solo mostrar un mensaje de éxito. |
| **Layouts reales** | Completar [`AppLayout.tsx`](../frontend/src/shared/layouts/AppLayout.tsx) (intranet/admin) con cabecera o sidebar placeholder para validar navegación. |
| **Páginas stub** | Sustituir `return null` en [`DashboardPage`](../frontend/src/modules/intranet/pages/DashboardPage.tsx), [`admin/DashboardPage`](../frontend/src/modules/admin/pages/DashboardPage.tsx), etc., por pantallas mínimas (“en construcción”) para probar el circuito completo. |

### 4. Ajustes puntuales del login y assets

| Acción | Detalle |
|--------|---------|
| Enlaces del formulario | Definir destino real para **«Solicitar Acceso»**, **«¿Olvidaste tu contraseña?»** y **«Contactar soporte»** (rutas internas o URLs externas). |
| Logo e imágenes | Copiar assets de Figma a `frontend/public` y referenciarlos por ruta local (evita URLs temporales del MCP de Figma en producción). |

### 5. Web pública e intranet (prioridad según negocio)

| Ámbito | Ubicación en código | Notas |
|--------|---------------------|--------|
| Landing / mapa / noticias | [`frontend/src/modules/public-web/`](../frontend/src/modules/public-web/) | Componentes y páginas hoy en stub; alineados al diseño **Maps-Pagina-Web** (Figma). |
| Productor | [`frontend/src/modules/intranet/`](../frontend/src/modules/intranet/) | Conectar con endpoints ya definidos en el backend (`/producers`, `/library`, `/news`, etc.) según el README raíz. |
| Administración | [`frontend/src/modules/admin/`](../frontend/src/modules/admin/) | Misma idea: UI sobre rutas existentes con `authenticate` + `authorize`. |

### 6. Calidad y entornos

| Acción | Detalle |
|--------|---------|
| **Pruebas E2E** | Valorar **Playwright** (o similar): flujo login → pantalla protegida → logout. |
| **CORS y cookies** | Confirmar que `FRONTEND_ORIGIN` en backend coincide con la URL real del frontend en cada entorno; en producción, revisar `secure` en cookies y HTTPS. |
| **Documentación** | Actualizar el [README raíz](../README.md) cuando React Router y el cliente HTTP estén efectivamente en `package.json`, para que el stack documentado coincida con el código. |

### Resumen en una frase

**Implementar router + guards + refresh en cliente + redirección por rol y una pantalla mínima por zona** desbloquea al equipo para trabajar en paralelo en landing pública, intranet y admin sin rehacer el login.

---

*Documento para alinear al equipo en la etapa Auth — Backend y UI responsive. Para arquitectura global y convenciones, ver el README en la raíz del repositorio.*
