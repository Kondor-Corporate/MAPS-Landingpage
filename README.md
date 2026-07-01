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
| Noticias | UI/mock frontend | API pendiente |
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

<<<<<<< HEAD
Editá los archivos `.env` con los valores correspondientes.  
**Nunca commitees archivos `.env` con credenciales reales.** El `.env` real no se versiona; solo se versiona `.env.example`.

Variables que **deben estar presentes** en `backend/.env` para desarrollo local (incluidas en `.env.example`):

| Variable | Valor local recomendado | Propósito |
|----------|------------------------|-----------|
| `STORAGE_PROVIDER` | `local` | Guarda PDFs de certificaciones en `backend/uploads/certificaciones/` |
| `API_PUBLIC_URL` | `http://localhost:3000` | Base para construir URLs públicas de descarga de archivos |
| `NOMINATIM_USER_AGENT` | `maps-landingpage-dev/1.0 (contact@kondor.local)` | Identifica la app ante la API de geocoding de OpenStreetMap (ToS requerido) |
=======
Servicios:
>>>>>>> e51ccf2d84c255eb32d4631ce9a96533087a1a5d

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

CI ejecuta estas verificaciones en `.github/workflows/ci.yml` con PostgreSQL efimero.

Detalle: [`docs/TESTING.md`](./docs/TESTING.md).

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
- [`docs/modules/news.md`](./docs/modules/news.md): noticias y pendientes de API.
- [`docs/modules/admins.md`](./docs/modules/admins.md): administradores y pendientes de API.

---

## Convenciones rapidas

Rama de integracion: `development`.

Formato de commits y PRs:

```bash
tipo(scope): descripcion
```

Ejemplos:

```bash
feat(producers): add certification upload
fix(auth): handle expired refresh token
docs(readme): update docker setup
build(docker): add frontend dev target
```

Detalle: [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md).

---

## Variables de entorno

Backend local:

```env
<<<<<<< HEAD
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maps_asesores_dev"
```

Si en el futuro el backend corre dentro de Docker en la misma red Compose que `db`, usá host **`db`** y puerto **5432** en `DATABASE_URL`. Si otro Postgres local ocupa el `5432`, cambiá el mapeo en `docker-compose.yml` a `5433:5432` y actualizá la URL con `localhost:5433`.

Comandos útiles:

```bash
docker compose up -d        # levanta PostgreSQL
docker compose ps           # muestra estado del servicio
docker compose logs db      # muestra logs de PostgreSQL
docker compose down         # detiene y elimina el contenedor, conserva el volumen
docker compose down -v      # detiene y elimina también los datos del volumen

cd backend
npx prisma migrate dev      # aplica migraciones en desarrollo
npm run db:migrate          # alias del comando anterior
npm run db:seed             # carga datos iniciales
npm run prisma:studio       # abre Prisma Studio
```

pgAdmin es opcional y funciona solo como cliente visual. Para conectarlo:

- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: `postgres`
- Database: `maps_asesores_dev`

Troubleshooting:

- Si `5432` está ocupado por un Postgres nativo, desinstalalo o cambiá el mapeo en `docker-compose.yml` a `5433:5432` y actualizá `DATABASE_URL` con `localhost:5433`.
- `docker compose down -v` borra los datos persistidos en `pgdata`; usalo solo cuando quieras resetear la DB.
- Si existe una DB antigua con datos usando rol `PRODUCER`, revisar la migración hacia `PRODUCTOR` antes de migrar sobre datos reales.
- pgAdmin no es necesario para que el backend funcione; Prisma usa directamente `DATABASE_URL`.

---

## Estructura de carpetas

```
maps-asesores/
├── frontend/
│   ├── eslint.config.js
│   └── src/
│       ├── shared/          ← componentes, layouts, hooks, types, utils compartidos
│       ├── modules/
│       │   ├── public-web/  ← landing + perfil público
│       │   ├── intranet/    ← portal del productor
│       │   └── admin/       ← panel admin / superadmin
│       └── router/          ← React Router + guards de rol
│
├── backend/
│   ├── eslint.config.js
│   ├── tests/               ← Vitest + Supertest (p. ej. auth.integration.test.ts)
│   └── src/
│       ├── api/v1/routes/   ← definición de endpoints
│       ├── controllers/     ← capa HTTP (req → service → res)
│       ├── services/        ← lógica de negocio (usa Prisma)
│       ├── middlewares/     ← authenticate, authorize (RBAC), validate (Zod)
│       ├── validations/     ← Zod schemas por recurso
│       ├── types/           ← roles, augmentación Express
│       └── config/          ← env.ts (validación de variables al startup)
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
│
├── docker-compose.yml
├── .prettierrc.json
├── .prettierignore
├── backend/.env.example
├── frontend/.env.example
├── .gitignore
└── README.md
```

> Ver la propuesta completa en la documentación de arquitectura del equipo.

---

## Calidad de código (MAPS-010A)

Herramientas mínimas en **`frontend/`** y **`backend/`**:

| Comando                | Descripción                  |
| ---------------------- | ---------------------------- |
| `npm run typecheck`    | `tsc --noEmit`               |
| `npm run lint`         | ESLint                       |
| `npm run lint:fix`     | ESLint con `--fix`           |
| `npm run format`       | Prettier — escribe archivos  |
| `npm run format:check` | Prettier — solo verificación |

Ejecutarlos dentro de cada carp (`cd frontend` o `cd backend`). La migración a **pnpm** u otro gestor queda fuera de MAPS-010.

---

## Convenciones del equipo

### Branching y PRs

```
main          ← producción (solo se toca via PR desde development)
development   ← integración continua
feature/*     ← desarrollo de funcionalidades (ej: feature/producer-crud)
fix/*         ← correcciones puntuales
```

- Todo el trabajo se hace en ramas `feature/*` o `fix/*`
- Se abre un **Pull Request** hacia `development`
- Merge strategy: **Squash & Merge** (un commit limpio por feature)
- `main` solo recibe PRs desde `development` (releases)

### Nombrado de archivos

| Tipo                  | Convención            | Ejemplo                 |
| --------------------- | --------------------- | ----------------------- |
| Componentes React     | PascalCase            | `ProducerTable.tsx`     |
| Hooks                 | camelCase con `use`   | `useProducerFilters.ts` |
| Servicios/Controllers | camelCase + sufijo    | `producers.service.ts`  |
| Schemas Zod           | camelCase + `.schema` | `producer.schema.ts`    |
| Variables de entorno  | SCREAMING_SNAKE_CASE  | `DATABASE_URL`          |

### API

- Todos los endpoints bajo `/api/v1/`
- Respuestas JSON con estructura consistente:
  ```json
  { "data": ..., "message": "...", "error": null }
  ```
- Errores de validación devuelven `400` con detalle del campo
- Autenticación via header `Authorization: Bearer <token>`

---

## Variables de entorno — referencia

> **El archivo `.env` real no se versiona.** Solo existe `backend/.env.example` y `frontend/.env.example` como plantillas. Al hacer setup local, copiar las plantillas (`cp backend/.env.example backend/.env`) y completar los valores reales. Nunca commitear archivos `.env` con credenciales.

### `backend/.env.example`

Fuente de verdad de todas las variables del backend. Copiar a `backend/.env` antes de correr el proyecto.

```env
# Runtime
=======
>>>>>>> e51ccf2d84c255eb32d4631ce9a96533087a1a5d
NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maps_asesores_dev"
JWT_SECRET=dev_access_secret_change_me_32_chars_minimum
REFRESH_SECRET=dev_refresh_secret_change_me_32_chars_minimum
DEFAULT_PRODUCER_PASSWORD=Dev_DefaultProducer_12chars
<<<<<<< HEAD

# Storage de certificaciones (PDF)
# local  → guarda archivos en backend/uploads/certificaciones/ (desarrollo y CI)
# s3     → bucket S3-compatible (producción)
STORAGE_PROVIDER=local

# URL pública base del backend; se usa para construir las URLs de descarga de certificaciones.
# En desarrollo: http://localhost:3000
# En producción: https://tu-dominio.com
# Sin esta variable, las URLs de descarga devuelven "undefined/uploads/..."
API_PUBLIC_URL=http://localhost:3000

# User-Agent enviado a Nominatim (geocoding server-side) en nombre de la aplicación.
# Requerido por los ToS de OpenStreetMap. El backend (backend/src/lib/geocode.ts) la consume
# para todas las llamadas al endpoint de geocoding; el browser nunca llama a Nominatim directamente.
NOMINATIM_USER_AGENT=maps-landingpage-dev/1.0 (contact@kondor.local)
=======
STORAGE_PROVIDER=local
API_PUBLIC_URL=http://localhost:3000
>>>>>>> e51ccf2d84c255eb32d4631ce9a96533087a1a5d
```

Frontend local:

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
