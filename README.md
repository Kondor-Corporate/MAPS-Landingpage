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

## Setup recomendado: Docker desarrollo

Desde la raiz del repo:

```bash
docker compose up -d --build
```

Aplicar migraciones y seed:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

Editar los archivos `.env` con los valores correspondientes si hace falta.  
**Nunca commitees archivos `.env` con credenciales reales.** El `.env` real no se versiona; solo se versiona `.env.example`.

Servicios:

| Servicio | URL |
|----------|-----|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:3000` |
| Health API | `http://localhost:3000/api/v1/health` |
| PostgreSQL | `localhost:5432` |

Comandos utiles:

```bash
docker compose ps
docker compose logs backend
docker compose logs frontend
docker compose logs db
docker compose down
docker compose down -v
```

`docker compose down -v` borra los volumenes, incluyendo datos locales de PostgreSQL.

---

## Setup alternativo: host local

Usar este flujo si queres correr backend/frontend directamente en tu maquina y solo usar Docker para PostgreSQL.

1. Crear variables de entorno:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. Levantar PostgreSQL:

   ```bash
   docker compose up -d db
   ```

3. Instalar dependencias:

   ```bash
   cd backend
   npm install

   cd ../frontend
   npm install
   ```

4. Migrar y seedear desde `backend/`:

   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```

5. Levantar servicios:

   ```bash
   # terminal 1
   cd backend
   npm run dev

   # terminal 2
   cd frontend
   npm run dev
   ```

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
| `REFRESH_SECRET` | Firma del refresh token. Minimo 32 caracteres en produccion. |
| `STORAGE_PROVIDER` | `local` (disco en `backend/uploads/certificaciones/`) o `s3` (produccion). |
| `API_PUBLIC_URL` | Base publica del backend para URLs de descarga de certificaciones (ej. `http://localhost:3000`). |
| `NOMINATIM_USER_AGENT` | Identificacion de la app ante Nominatim (ToS de OpenStreetMap). Usado por geocoding server-side. |
| `DEFAULT_PRODUCER_PASSWORD` | Solo para `prisma/seed.ts`. El alta real de productores exige `password` individual (MAPS-016). |

Ejemplo minimo (ver `backend/.env.example` para el listado completo):

```env
NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
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
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

En Docker desarrollo, `docker-compose.yml` define defaults equivalentes. Sobreescribir secretos y origenes via `.env` o variables de entorno cuando corresponda.

---

## Notas

- Las migraciones no se ejecutan automaticamente al arrancar el backend; correrlas explicitamente.
- El compose actual esta orientado a desarrollo, no produccion.
- El frontend corre con Vite dev server en Docker; el Dockerfile conserva stages de build/runner para una variante estatica futura.
- Los TDDs y work-logs son historicos; para estado actual usar este README y `docs/`.
