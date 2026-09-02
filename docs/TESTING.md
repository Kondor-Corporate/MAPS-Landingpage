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

Frontend (calidad; **no hay runner de tests**):

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

**No hay runner operativo.** `frontend/package.json` no declara script `test` ni dependencias de Vitest / React Testing Library.

Existen archivos `frontend/src/tests/**/*.test.*`. Son fundacion de tests, no una suite ejecutable. No afirmar que Vitest o RTL corren en local ni en CI.

Calidad que si se ejecuta:

```bash
cd frontend
npm run typecheck
npm run lint
npm run build
```

Activar el runner, cablear CI y decidir el destino de esos archivos queda en **D5** (testing / deuda). No se instalo en D1A.

---

## CI

Workflow: `.github/workflows/ci.yml` (Node 22).

Backend: `npm ci` → Prisma migrate/seed → typecheck → lint → build → `npm test`.

Frontend: `npm ci` → typecheck → lint → build. **Sin** `npm test`.

---

## E2E

Estado actual: pendiente.

Cuando se incorpore, la recomendacion es Playwright con entorno aislado (DB de test, seed minimo, limpieza entre suites, selectores accesibles). Flujos candidatos: login admin/productor, CRUD productor, mapa/perfil, biblioteca, noticias.

---

## Checklist de testing para PRs

Elegir segun alcance:

- Cambios backend: typecheck, lint, build y tests backend.
- Cambios frontend: typecheck, lint y build frontend (no hay `npm test` frontend).
- Cambios de schema Prisma: migracion, `migrate deploy` y seed.
- Cambios Docker: `docker compose up -d --build` y healthchecks.
- Cambios UI: verificacion manual en navegador y captura si corresponde.

Si una verificacion no se puede ejecutar, explicarlo en la descripcion del PR.
