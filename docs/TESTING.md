# Testing

Estrategia de pruebas y verificaciones del proyecto MAPS Asesores.

Este documento describe el estado actual. Si se agregan nuevos niveles de prueba, actualizarlo en el mismo PR.

---

## Resumen de comandos

Backend (desde `backend/`; ejecutar `npm run prisma:generate` tras clone o cambios de schema):

```bash
cd backend
npm run prisma:generate
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

Docker desarrollo (primera vez incluye migrate + seed):

```bash
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
docker compose ps
```

Script helper: `./scripts/docker-dev-init.sh` o `.\scripts\docker-dev-init.ps1` (ver README raiz).

---

## Verificacion rapida manual (sin E2E)

Checklist orientativo tras levantar el entorno local o Docker:

| # | Verificacion | Como |
|---|--------------|------|
| 1 | Frontend responde | Abrir `http://localhost:5173` |
| 2 | Backend health | `GET http://localhost:3000/api/v1/health` → 200 |
| 3 | DB conectada | Health OK + login no falla por error de conexion |
| 4 | Login admin seed | `admin` / `Admin1234!` → dashboard admin |
| 5 | Mapa publico | `/#mapa` muestra marcadores (requiere seed) |
| 6 | Noticias | Home lista noticias desde API |
| 7 | Biblioteca demo | Login productor → `/intranet/biblioteca`; URLs `EXAMPLE` no clicables |

Si el health responde pero login o listados fallan con errores SQL, probablemente faltaron `migrate deploy` y/o `db:seed`.

---

## Backend

Stack:

- Vitest.
- Supertest.
- Express app en memoria via `createApp()`.
- PostgreSQL real via `DATABASE_URL`.

Tests principales:

| Archivo | Cobertura |
|---------|-----------|
| `backend/tests/auth.integration.test.ts` | Login, refresh, logout y errores auth |
| `backend/tests/producers.integration.test.ts` | CRUD admin de productores, permisos y validaciones |
| `backend/tests/producersProfile.integration.test.ts` | Perfil productor, slug y datos de perfil |
| `backend/tests/producersMap.integration.test.ts` | API publica de mapa |
| `backend/tests/authorize-validate.middleware.test.ts` | Middlewares RBAC y Zod |

Comando:

```bash
cd backend
npm test
```

Modo watch:

```bash
cd backend
npm run test:watch
```

### Base de datos para tests

Los tests backend usan la base definida por `DATABASE_URL`.

En CI, GitHub Actions levanta un PostgreSQL efimero y ejecuta:

```bash
npx prisma migrate deploy
npx prisma db seed
npm test
```

En local, evitar correr tests contra una base con datos importantes. Para desarrollo, se recomienda usar la base Docker local y poder resetearla cuando sea necesario.

---

## Frontend

Stack:

- Vitest.
- React Testing Library donde aplica.
- Tests unitarios/de integracion de store, router, componentes y cliente HTTP.

Tests existentes:

| Carpeta | Cobertura |
|---------|-----------|
| `frontend/src/tests/store/` | Store de autenticacion |
| `frontend/src/tests/router/` | Guards y routing |
| `frontend/src/tests/lib/` | Cliente Axios e interceptores |
| `frontend/src/tests/components/` | Componentes/paginas relevantes |

Comandos de calidad:

```bash
cd frontend
npm run typecheck
npm run lint
npm run build
```

Si se agrega un script de test frontend formal, documentarlo aca y sumarlo al checklist de PR.

---

## CI

Workflow:

- `.github/workflows/ci.yml`

El pipeline ejecuta:

Backend:

1. `npm ci`
2. `npx prisma migrate deploy`
3. `npx prisma db seed`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run build`
7. `npm test`

Frontend:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`

---

## E2E

Estado actual: pendiente.

Cuando se incorpore E2E, la recomendacion es usar Playwright con un entorno aislado:

- Base de datos de test separada.
- Compose especifico o perfil de compose para E2E.
- Seed minimo y determinista.
- Limpieza de datos entre suites.
- Selectores accesibles (`getByRole`, `getByText`) antes que selectores fragiles.

Flujos candidatos:

- Login admin -> dashboard -> logout.
- Login productor -> intranet -> perfil propio.
- Admin crea productor -> aparece en listado.
- Productor publico aparece en mapa/perfil por slug.
- Biblioteca visible para productor y CRUD para admin.

---

## Checklist de testing para PRs

Elegir segun alcance:

- Cambios backend: typecheck, lint, build y tests backend.
- Cambios frontend: typecheck, lint y build frontend.
- Cambios de schema Prisma: migracion, `migrate deploy` y seed.
- Cambios Docker: `docker compose up -d --build` y healthchecks.
- Cambios UI: verificacion manual en navegador y captura si corresponde.

Si una verificacion no se puede ejecutar, explicarlo en la descripcion del PR.
