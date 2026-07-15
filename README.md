# MAPS Asesores

Portal web, intranet y panel administrativo para la gestion de productores de seguros de MAPS Asesores.

El sistema se organiza en tres zonas:

| Zona | Audiencia | Descripcion |
|------|-----------|-------------|
| Web publica | Visitantes anonimos | Landing institucional, mapa de asesores y perfil publico de productor |
| Intranet | Productores autenticados | Dashboard, biblioteca digital y gestion de perfil propio |
| Admin / SuperAdmin | Administradores | Gestion de productores, biblioteca y secciones administrativas |

Fuera de alcance actual: ecommerce y cotizador.

---

## Estado actual

| Modulo | Estado | Backend/API |
|--------|--------|-------------|
| Auth y routing | Implementado | `/api/v1/auth` |
| Productores admin | Implementado | `/api/v1/producers` |
| Perfil productor | Implementado | `/api/v1/producers/me`, `/api/v1/producers/by-slug/:slug` |
| Mapa publico | Implementado | `/api/v1/producers/map` |
| Biblioteca digital | Implementado para ramos | `/api/v1/library/ramos` |
| Noticias | Implementado | `/api/v1/news` |
| Landing publica | Parcial | TeamSection mock; CTA/contacto sin accion real |
| Portal SELF | Pendiente / deshabilitado | Sin URL configurada (`SELF_PORTAL_URL = null`) |
| Admins | UI/ruta existente | API pendiente |
| E2E browser | Pendiente | N/A |

Los documentos historicos en `docs/tdd/` y `docs/worklog/` explican como se llego a este estado, pero no reemplazan esta tabla ni la documentacion viva en `docs/`.

---

## Stack

### Frontend

- React 18.
- Vite.
- TypeScript.
- Tailwind CSS.
- React Router.
- Zustand.
- Axios.
- MapLibre/react-map-gl.

### Backend

- Node.js 20+.
- Express.
- TypeScript.
- Prisma.
- PostgreSQL.
- Zod.
- JWT + refresh token en cookie httpOnly.
- Vitest + Supertest.

### Infra local

- Docker Compose.
- PostgreSQL 16.
- Backend Node en contenedor.
- Frontend Vite dev server en contenedor.

---

## Requisitos

- Docker Desktop.
- Node.js 20+ si vas a correr comandos fuera de Docker.
- npm.

Verificar:

```bash
node -v
npm -v
docker -v
docker compose version
```

---

## Onboarding post-clone

Flujo minimo recomendado tras clonar el repo (sin levantar servicios todavia):

```bash
cd backend
npm install
npm run prisma:generate

cd ../frontend
npm install
```

**Importante:** el backend usa tipos generados por Prisma. Si `npm run typecheck` o `npm run build` fallan con errores de `@prisma/client` o campos del schema inexistentes, correr **`npm run prisma:generate`** en `backend/` antes de reintentar. Esto ocurre tipicamente tras un `git pull` que trae cambios en `schema.prisma` o en un clone fresco donde el client aun no se genero.

No se usa `postinstall` automatico en el repo: CI y Docker ya invocan Prisma de forma explicita; un hook global podria interferir con builds parciales o contenedores sin schema copiado aun.

Variables opcionales para desarrollo local sin Docker Compose completo:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**Nunca commitees archivos `.env` con credenciales reales.** Solo se versionan las plantillas `.env.example`.

---

## Setup recomendado: Docker desarrollo

El compose actual es **solo desarrollo**. No incluye TLS, reverse proxy productivo ni migraciones/seed automaticos al arrancar.

### Primera vez o reset completo

Desde la raiz del repo:

```bash
docker compose up -d --build
```

Esperar a que `db` y `backend` reporten healthy (`docker compose ps`). Luego **aplicar schema y datos demo** (obligatorio en primera corrida o tras `docker compose down -v`):

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

Script helper opcional (mismos pasos):

```bash
# Linux / macOS / Git Bash
./scripts/docker-dev-init.sh

# Windows PowerShell
.\scripts\docker-dev-init.ps1
```

Si el backend arranca pero las APIs devuelven errores de tablas inexistentes, la base quedo vacia: faltaron migrate/seed.

### Prisma Client dentro de Docker

El `Dockerfile` del backend ejecuta `npx prisma generate` en el stage de build. Tras cambios en `schema.prisma` en tu rama local, reconstruir:

```bash
docker compose up -d --build backend
```

Solo si hace falta regenerar sin rebuild completo:

```bash
docker compose exec backend npx prisma generate
```

### URLs y servicios

| Servicio | URL / acceso |
|----------|----------------|
| Frontend (Vite dev) | `http://127.0.0.1:5173` (**URL canónica para desarrollo y demo local**) |
| Backend API | `http://127.0.0.1:3000/api/v1` |
| Health API | `http://127.0.0.1:3000/api/v1/health` |
| PostgreSQL | `localhost:5432` (usuario/clave/DB: ver `docker-compose.yml`) |
| Uploads certificaciones (local) | Volumen Docker `backend_uploads` → `/app/uploads` en backend |

Puertos configurables via `.env` en la raiz: `FRONTEND_PORT`, `BACKEND_PORT`, `POSTGRES_PORT`.

> **Host canónico y autenticación:** abrir el frontend en `http://127.0.0.1:5173` cuando la API usa `http://127.0.0.1:3000/api/v1`. No mezclar `localhost` y `127.0.0.1`: aunque CORS permita ambos orígenes, el navegador los considera sitios distintos para cookies HttpOnly con `SameSite=Lax`. La navegación SPA puede funcionar desde `localhost`, pero el refresh de sesión al recargar una ruta protegida no enviará la cookie y redirigirá a `/login`.

### Comandos utiles

```bash
docker compose ps
docker compose logs backend
docker compose logs frontend
docker compose logs db
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
docker compose down
docker compose down -v
```

`docker compose down -v` borra volumenes (`pgdata`, `backend_uploads`, `frontend_node_modules`), incluyendo datos locales de PostgreSQL y archivos subidos.

### Verificacion rapida post-setup

1. `curl http://127.0.0.1:3000/api/v1/health` responde OK.
2. Frontend carga en `http://127.0.0.1:5173` sin error de red hacia la API.
3. Login admin seed: usuario `admin` / password `Admin1234!`.
4. Mapa publico (`/#mapa`) muestra productores del seed.
5. Noticias publicas cargan desde API (no mock).
6. Intranet productor (`user` / `User1234!`): biblioteca visible; links con URL `EXAMPLE` no son clicables (dato demo — ver nota PLACEHOLDER_DRIVE abajo).

Detalle de pruebas: [`docs/TESTING.md`](./docs/TESTING.md). Migraciones y seed: [`docs/MIGRATIONS.md`](./docs/MIGRATIONS.md).

---

## Setup alternativo: host local (sin contenedores backend/frontend)

Usar este flujo si queres correr backend y frontend en tu maquina y usar Docker solo para PostgreSQL (o una instancia local de Postgres).

1. Crear variables de entorno:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   En `backend/.env`, `DATABASE_URL` debe apuntar a `localhost:5432` (o el puerto mapeado si colisiona).

2. Levantar PostgreSQL:

   ```bash
   docker compose up -d db
   ```

3. Instalar dependencias y generar Prisma Client:

   ```bash
   cd backend
   npm install
   npm run prisma:generate

   cd ../frontend
   npm install
   ```

4. Migrar y seedear desde `backend/`:

   ```bash
   cd backend
   npx prisma migrate deploy
   npm run db:seed
   ```

   En desarrollo activo del schema, `npm run db:migrate` (`prisma migrate dev`) crea migraciones nuevas; para solo aplicar las existentes del repo, usar `migrate deploy`.

5. Levantar servicios:

   ```bash
   # terminal 1 — backend (puerto 3000)
   cd backend
   npm run dev

   # terminal 2 — frontend (puerto 5173)
   cd frontend
   npm run dev -- --host 127.0.0.1
   ```

Frontend local usa `VITE_API_BASE_URL=http://127.0.0.1:3000/api/v1` (ver `frontend/.env.example`).

> **Navegador vs Docker:** el frontend en Compose corre en un contenedor, pero las llamadas HTTP las hace el **navegador de tu máquina**. Por eso `VITE_API_BASE_URL` debe apuntar al backend publicado en el host (`127.0.0.1:3000`), no al nombre de servicio `backend`. En Windows, `127.0.0.1` suele ser más confiable que `localhost` (evita cuelgues por resolución IPv6) y mantiene frontend/API bajo el mismo host para que el refresh cookie funcione en reload.

---

## Usuarios seed

El seed crea usuarios de prueba, entre otros:

| Usuario | Password | Rol |
|---------|----------|-----|
| `admin` | `Admin1234!` | `ADMIN` |
| `superadmin` | `Super1234!` | `SUPERADMIN` |
| `user` | `User1234!` | `PRODUCTOR` |

El productor demo puede tener perfil y slug segun `backend/prisma/seed.ts`.

---

## Calidad y tests

Backend:

```bash
cd backend
npm run typecheck
npm run lint
npm run build
npm test
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run lint
npm run build
```

CI ejecuta typecheck, lint y build en frontend y backend; tests solo en backend (con PostgreSQL efimero). Ver [`docs/TESTING.md`](./docs/TESTING.md).

---

## Estructura

```text
MAPS-Landingpage/
  backend/
    prisma/
    src/
    tests/
    Dockerfile
  frontend/
    src/
    public/
    Dockerfile
    nginx.conf
  docs/
    modules/
    tdd/
    worklog/
  scripts/
    docker-dev-init.sh
    docker-dev-init.ps1
  docker-compose.yml
```

Arquitectura completa: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Documentacion

- [`docs/README.md`](./docs/README.md): indice de documentacion.
- [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md): ramas, commits, PRs y definition of done.
- [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md): TDDs, work-logs y fuentes de verdad.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md): arquitectura viva.
- [`docs/TESTING.md`](./docs/TESTING.md): testing y CI.
- [`docs/MIGRATIONS.md`](./docs/MIGRATIONS.md): Prisma, migraciones y seed.
- [`docs/CHANGELOG.md`](./docs/CHANGELOG.md): cambios relevantes.
- [`docs/modules/auth.md`](./docs/modules/auth.md): auth, routing y roles.
- [`docs/modules/producers.md`](./docs/modules/producers.md): productores, perfiles, mapa y certificaciones.
- [`docs/modules/library.md`](./docs/modules/library.md): biblioteca digital.
- [`docs/modules/public-web.md`](./docs/modules/public-web.md): landing, mapa publico y perfil publico.
- [`docs/modules/news.md`](./docs/modules/news.md): noticias, API e integracion admin/publico/intranet.
- [`docs/modules/admins.md`](./docs/modules/admins.md): administradores y pendientes de API.

---

## Convenciones rapidas

Rama de integracion: `development`.

Formato de commits y PRs:

```bash
tipo(scope): descripcion
```

Detalle: [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md).

---

## Variables de entorno

> **El archivo `.env` real no se versiona.** Solo existen `backend/.env.example` y `frontend/.env.example` como plantillas. Copiar las plantillas y completar los valores reales. Nunca commitear credenciales.

### Backend (`backend/.env`)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Conexion PostgreSQL. Host `db` si el backend corre en Docker Compose; `localhost` si corre en el host contra el contenedor `db`. |
| `JWT_SECRET` | Firma del access token. Minimo 32 caracteres en produccion. |
| `JWT_EXPIRES_IN` | Duracion del access token (ej. `15m`). |
| `REFRESH_SECRET` | Firma del refresh token. Minimo 32 caracteres en produccion. |
| `REFRESH_EXPIRES_IN` | Duracion del refresh token (ej. `30d`). |
| `STORAGE_PROVIDER` | `local` (disco en `backend/uploads/certificaciones/`) o `s3` (produccion). |
| `API_PUBLIC_URL` | Base publica del backend para URLs de descarga de certificaciones (ej. `http://localhost:3000`). |
| `NOMINATIM_USER_AGENT` | Identificacion de la app ante Nominatim (ToS de OpenStreetMap). Usado por geocoding server-side. |
| `DEFAULT_PRODUCER_PASSWORD` | Solo para `prisma/seed.ts`. El alta real de productores exige `password` individual (MAPS-016). |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_BASE_URL` | Solo si `STORAGE_PROVIDER=s3`. Ver `backend/.env.example`. |

Ejemplo minimo (ver `backend/.env.example` para el listado completo):

```env
NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maps_asesores_dev"
JWT_SECRET=dev_access_secret_change_me_32_chars_minimum
REFRESH_SECRET=dev_refresh_secret_change_me_32_chars_minimum
DEFAULT_PRODUCER_PASSWORD=Dev_DefaultProducer_12chars
STORAGE_PROVIDER=local
API_PUBLIC_URL=http://localhost:3000
NOMINATIM_USER_AGENT=maps-landingpage-dev/1.0 (contact@kondor.local)
```

Notas de `DATABASE_URL`:

- Si el backend corre dentro de Docker en la misma red Compose que `db`, usar host **`db`** y puerto **5432**.
- Si otro Postgres local ocupa el `5432`, cambiar el mapeo en `docker-compose.yml` a `5433:5432` y actualizar la URL con `localhost:5433`.

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://127.0.0.1:3000/api/v1
```

En Docker desarrollo, `docker-compose.yml` define el mismo default. Si tenés un `frontend/.env` local con `localhost`, actualizalo a `127.0.0.1` (no se versiona). Abrí también el frontend con `http://127.0.0.1:5173`; usar `localhost:5173` contra una API en `127.0.0.1` rompe el refresh cookie al recargar rutas protegidas. En producción, reconstruir el frontend con la URL pública real de la API.

`FRONTEND_ORIGIN` (backend) acepta una o varias URLs separadas por coma para CORS. En `development`/`test`, si solo indicás `http://localhost:5173`, el backend también permite `http://127.0.0.1:5173` (y viceversa). Esto evita bloqueos CORS, pero no vuelve equivalentes ambos hosts para cookies: la URL canónica local sigue siendo `http://127.0.0.1:5173`.

---

## Notas

- Las migraciones no se ejecutan automaticamente al arrancar el backend; correrlas explicitamente tras `docker compose up`.
- Tras `docker compose up` sin migrate/seed, la DB puede quedar vacia y las APIs fallaran hasta ejecutar los comandos documentados arriba.
- El compose actual esta orientado a desarrollo, no produccion.
- El frontend en Docker usa el target `dev` (Vite con hot reload y volumen montado). El backend en Docker corre la imagen compilada (`node dist/server.js`); cambios en codigo backend requieren `docker compose up -d --build backend`.
- El Dockerfile del frontend conserva stages `build`/`runner` (nginx puerto 8080) para una variante estatica futura; el compose actual no los usa.
- Los TDDs y work-logs son historicos; para estado actual usar este README y `docs/`.

### Dato demo: PLACEHOLDER_DRIVE (biblioteca)

El seed define `PLACEHOLDER_DRIVE = https://drive.google.com/drive/folders/EXAMPLE` para algunos ramos de biblioteca. Es **contenido demo pendiente**, no un link productivo. La UI del productor (MAPS-017 Fase B) evita ofrecer URLs con `EXAMPLE` como enlaces clicables. Para una demo con acceso real a documentos, reemplazar esas URLs desde admin biblioteca o actualizar el seed cuando existan carpetas Drive definitivas.
