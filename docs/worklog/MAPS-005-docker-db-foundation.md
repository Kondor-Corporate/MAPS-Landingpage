# MAPS-005 — Docker DB Foundation

Documento de estabilización para el entorno local de base de datos del proyecto MAPS Asesores.

## Objetivo

Dejar documentado y alineado el uso de Docker Compose para levantar PostgreSQL en desarrollo, sin dockerizar backend ni frontend.

## Alcance

- Docker se usa solo para PostgreSQL local.
- Backend Node.js + Express + TypeScript corre en host con `npm run dev`.
- Frontend React + Vite corre en host con `npm run dev`.
- Prisma usa `DATABASE_URL` desde variables de entorno.
- pgAdmin puede usarse como cliente visual, pero no es dependencia del sistema.

Fuera de alcance:

- Dockerfile de backend.
- Dockerfile de frontend.
- Dockerizar servicios de aplicación.
- Cambios en auth, routing o lógica de negocio.
- Cambios en migraciones históricas, salvo revisión explícita posterior.

## Decisiones tomadas

- La base oficial de desarrollo es `maps_asesores_dev`.
- El usuario local de desarrollo es `postgres`.
- La password local de desarrollo es `postgres`.
- El puerto host estándar es `5432`.
- El volumen Docker `pgdata` conserva datos entre reinicios.
- El backend local usa `localhost` en `DATABASE_URL` porque corre fuera de Docker.
- Si el backend se dockeriza en el futuro, `DATABASE_URL` debería usar el host `db`.

## Estado actual

`docker-compose.yml` define un único servicio:

- Servicio: `db`
- Imagen: `postgres:16-alpine`
- Container: `maps-asesores-db`
- Puerto: `5432:5432`
- DB: `maps_asesores_dev`
- User: `postgres`
- Password: `postgres`
- Volumen: `pgdata:/var/lib/postgresql/data`
- Healthcheck: `pg_isready -U postgres -d maps_asesores_dev`

Prisma está configurado con:

- Provider: `postgresql`
- URL: `env("DATABASE_URL")`
- Migraciones: `backend/prisma/migrations`
- Seed: `backend/prisma/seed.ts`

## Variables de entorno

El archivo `backend/.env.example` queda alineado con Docker:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maps_asesores_dev"
```

También incluye las variables requeridas por `backend/src/config/env.ts`:

- `NODE_ENV`
- `PORT`
- `FRONTEND_ORIGIN`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `REFRESH_SECRET`
- `REFRESH_EXPIRES_IN`

Los secrets del ejemplo tienen longitud suficiente para pasar la validación local, pero deben cambiarse en producción.

## Cómo levantar la DB

Desde la raíz del repo:

```bash
docker compose up -d
docker compose ps
docker compose logs db
```

Esto levanta PostgreSQL en `localhost:5432` y crea la base `maps_asesores_dev` si el volumen está vacío.

## Cómo migrar

Desde `backend/`:

```bash
npm install
npx prisma migrate dev
```

También existe el alias:

```bash
npm run db:migrate
```

## Cómo seedear

Desde `backend/`:

```bash
npm run db:seed
```

El seed actual crea usuarios de desarrollo como `admin` y `superadmin`.

## Cómo resetear la DB

Para detener PostgreSQL conservando datos:

```bash
docker compose down
```

Para borrar completamente la DB local y el volumen:

```bash
docker compose down -v
```

Advertencia: `docker compose down -v` elimina `pgdata`; todos los datos locales se pierden.

Después de resetear:

```bash
docker compose up -d
cd backend
npm run db:migrate
npm run db:seed
```

## Cómo conectar pgAdmin

pgAdmin es opcional. Para conectarlo al PostgreSQL de Docker:

- Host: `localhost`
- Port: `5432`
- Maintenance database / Database: `maps_asesores_dev`
- User: `postgres`
- Password: `postgres`

El backend no depende de pgAdmin. Prisma se conecta directamente usando `DATABASE_URL`.

## Backend local vs backend en Docker futuro

Backend local:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maps_asesores_dev"
```

Backend dentro de Docker, si se implementa más adelante:

```env
DATABASE_URL="postgresql://postgres:postgres@db:5432/maps_asesores_dev"
```

La diferencia es el host: `localhost` apunta al equipo local; `db` apunta al servicio dentro de la red de Docker Compose.

## Scripts relevantes

Desde `backend/`:

- `npm run prisma:generate`: genera Prisma Client.
- `npm run prisma:migrate`: ejecuta `prisma migrate dev`.
- `npm run db:migrate`: alias de `prisma migrate dev`.
- `npm run db:seed`: ejecuta `prisma db seed`.
- `npm run prisma:studio`: abre Prisma Studio.

## Riesgos y troubleshooting

- Si `docker compose up -d` falla por puerto ocupado, probablemente hay un PostgreSQL local usando `5432`.
- Si se cambia el puerto host en `docker-compose.yml`, también debe cambiarse `DATABASE_URL`.
- Si `backend/.env` apunta a otra DB, el backend no usará la DB oficial de Docker aunque el contenedor esté levantado.
- `docker compose down` conserva datos; `docker compose down -v` los borra.
- Si existen datos antiguos con rol `PRODUCER`, revisar la migración hacia `PRODUCTOR` antes de migrar sobre una DB con datos reales.
- Si Prisma falla por conexión, verificar primero `docker compose ps`, `docker compose logs db` y el valor real de `DATABASE_URL`.

## Pendientes fuera de alcance

- Decidir si se requiere un seed de usuario `PRODUCTOR` para flujos de intranet.
- Definir estrategia de DB para CI.
- Evaluar Dockerfile de backend solo cuando haya necesidad real de homogeneizar runtime.
- Evaluar Dockerfile de frontend solo para build/deploy, no para desarrollo local inicial.
- Revisar migraciones históricas antes de aplicarlas sobre bases con datos productivos o importados.
