# Testing

Estrategia de pruebas y verificaciones del proyecto MAPS Asesores.

Este documento describe el estado **actual y ejecutable**. Si se agregan runners o niveles nuevos, actualizarlo en el mismo PR.

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
npm run test:typecheck
npm run lint
npm test
npm run test:coverage
npm run test:e2e
npm run test:watch
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
| 1 | Frontend responde | Abrir `http://127.0.0.1:5173` (URL canonica local) |
| 2 | Backend health | `GET http://127.0.0.1:3000/api/v1/health` → 200 |
| 3 | DB conectada | Health OK + login no falla por error de conexion |
| 4 | Login admin seed | `admin` / `Admin1234!` → dashboard admin |
| 5 | Mapa publico | `/#mapa` muestra marcadores (requiere seed) |
| 6 | Noticias | Home lista noticias desde API |
| 7 | Biblioteca demo | Login productor → `/intranet/biblioteca`; URLs `EXAMPLE` no clicables |

Si el health responde pero login o listados fallan con errores SQL, probablemente faltaron `migrate deploy` y/o `db:seed`.

No mezclar `localhost` y `127.0.0.1` al abrir el frontend: las cookies de refresh no se comparten entre ambos hosts.

---

## Backend

Stack ejecutable:

- Vitest (`npm test` / `npm run test:watch`).
- Supertest contra la app Express via `createApp()`.
- PostgreSQL real via `DATABASE_URL`.

Hay suites de integracion (auth, productores, perfil, mapa, noticias, geocode, middlewares) y suites unitarias (storage/GCS, env, bootstrap, schemas). La lista de archivos cambia con cada feature: **no tratar este documento como inventario**. La fuente es `backend/tests/` y el comando `npm test`.

```bash
cd backend
npm test
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

Stack ejecutable:

- Vitest con entorno jsdom.
- React Testing Library, DOM Testing Library y `user-event`.
- `jest-dom` para matchers del DOM.
- MSW para simular la frontera HTTP sin mockear implementaciones internas.

Comandos:

```bash
cd frontend
npm run typecheck
npm run test:typecheck
npm run lint
npm test
npm run test:coverage
npm run test:watch
npm run build
```

El typecheck de produccion y el de tests son gates separados. Los tests importan
explicitamente las APIs de Vitest; no se habilitan globals.

`npm test` corre la suite sin coverage. `npm run test:coverage` usa `@vitest/coverage-v8`
con `include: ['src/**/*.{ts,tsx}']` (Vitest 4 no usa `all: true`) para incluir también
archivos productivos no importados por tests, y **sin thresholds**. En local se pueden
correr ambos; en CI solo `test:coverage` para no duplicar la suite. El HTML queda en
`frontend/coverage/index.html`.

Principios:

- Probar comportamiento visible y flujos de usuario mediante roles, labels y nombres accesibles.
- Usar MSW para red; reservar mocks de modulos para boundaries que no aportan valor en jsdom.
- Mantener MapLibre/WebGL fuera de jsdom mediante mocks minimos del boundary.
- Evitar snapshots masivos, sleeps arbitrarios, selectores CSS fragiles y detalles de implementacion.

---

## CI

Workflow: `.github/workflows/ci.yml` (Node 22).

Los jobs de backend y frontend son independientes y corren en paralelo.
El job `e2e` espera a ambos (`needs: [backend, frontend]`).

Backend: `npm ci` → Prisma migrate/seed → typecheck → lint → build → `npm test`.

Frontend: `npm ci` → typecheck de produccion → typecheck de tests → lint →
`npm run test:coverage` → build.

E2E: Postgres efimero → backend migrate/seed/start → Playwright Chromium contra
Vite en `http://127.0.0.1:5173`. No apunta a staging ni a secretos GCP.

---

## E2E

Playwright (Chromium) con full-stack local. No mockea la API. No usa staging.

Host canonico: `http://127.0.0.1:5173`. Playwright levanta el frontend con Vite
dev y `VITE_API_BASE_URL=/api/v1` (proxy `/api` → backend `:3000`).

Receta local (backend y Postgres ya disponibles, con migrate + seed):

```bash
# terminal 1 — PostgreSQL (p. ej. docker compose up -d db)
# terminal 2 — backend
cd backend
npx prisma migrate deploy
npm run db:seed
npm run dev

# terminal 3 — smokes (webServer de Playwright levanta el frontend)
cd frontend
npx playwright install chromium
npm run test:e2e
```

Si el frontend ya corre en `127.0.0.1:5173`, Playwright reutiliza ese server fuera de CI.

---

## Checklist de testing para PRs

Elegir segun alcance:

- Cambios backend: typecheck, lint, build y tests backend.
- Cambios frontend: typecheck de produccion y tests, lint, tests/coverage y build frontend.
- Cambios de auth, routing o superficies publicas: smokes Playwright (`npm run test:e2e`) con stack local.
- Cambios de schema Prisma: migracion, `migrate deploy` y seed.
- Cambios Docker: `docker compose up -d --build` y healthchecks.
- Cambios UI: verificacion manual en navegador y captura si corresponde.

Si una verificacion no se puede ejecutar, explicarlo en la descripcion del PR.
