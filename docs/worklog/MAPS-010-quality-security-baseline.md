# MAPS-010 — Quality & Security Baseline

Bitácora de cierre del epic **MAPS-010** (fases **010A**, **010B**, **010C**): baseline de calidad de código, endurecimiento de Express, tests ampliados en backend y CI mínima en GitHub Actions, **sin** nuevas features de producto (mapa, noticias, UI admin más allá de lo ya existente).

**Relación con diseño:** prospectiva y acceptance en [`docs/tdd/MAPS-010-tdd-quality-security-baseline.md`](../tdd/MAPS-010-tdd-quality-security-baseline.md) (TDD actualizado a estado **Implementado** y enlazado a este worklog).

**Complementa:** [README raíz](../../README.md), [`docs/README.md`](../README.md).

---

## Objetivo

Después de **MAPS-009** (API real de productores en admin), el repo necesitaba:

- Higiene reproducible (lint, formato, typecheck, documentación alineada con Docker/`DATABASE_URL`).
- Hardening baseline del servidor Express (cabeceras, límites, proxy, política de refresh, errores consistentes).
- Tests que cubran rutas admin críticas y middlewares compartidos, más un pipeline que falle el PR ante regresiones obvias.
- Todo ello **sin** ampliar alcance funcional acordado (sin E2E browser, sin Husky/commitlint, sin deploy).

---

## Contexto inicial

| Área | Antes de MAPS-010 |
|------|-------------------|
| Calidad | Sin ESLint/Prettier unificados por paquete ni scripts `typecheck`/`lint`/`format` documentados como estándar del repo. |
| Docs / DB | Riesgo de fricción entre puerto de Compose, `DATABASE_URL` de ejemplo y lo que corría en cada máquina. |
| Express | Sin `helmet`, límites de body explícitos ni `trust proxy` configurable; `errorHandler` y refresh en prod menos defendidos. |
| Tests | Integración principalmente de **auth**; sin cobertura sistemática de **productores** ni de **RBAC/validación** en middlewares. |
| CI | Sin workflow en `.github/workflows`. |

---

## MAPS-010A — Quality baseline

- **Docker y documentación:** `docker-compose.yml` con **`5432:5432`**; `README.md`, `docs/README.md` y `backend/.env.example` alineados (`localhost:5432`, notas para host `db` si el backend corre en la red Compose).
- **Gestor:** **npm** como camino documentado (`package-lock.json` en frontend y backend).
- **Prettier:** configuración en raíz (`.prettierrc.json`, `.prettierignore`) e ignores por paquete; scripts `format` / `format:check`.
- **ESLint:** `eslint.config.js` (flat config) en `frontend/` y `backend/` con `typescript-eslint` + `eslint-config-prettier`; en frontend, `eslint-plugin-react-hooks` y regla gradual de unused vars.
- **Scripts en ambos paquetes:** `typecheck`, `lint`, `lint:fix`, `format`, `format:check`.

---

## MAPS-010B — Security hardening (Express)

- **`helmet`** en `createApp` (CSP desactivada para API JSON; CORP `cross-origin` para no romper CORS con credenciales frente a Vite).
- **Límite de body** JSON y `urlencoded`: **1mb** (`REQUEST_BODY_LIMIT` en `backend/src/app.ts`).
- **`trust proxy`:** variable `TRUST_PROXY` parseada (`parseTrustProxy`) → `app.set('trust proxy', …)`.
- **Refresh en producción:** cookie httpOnly como camino principal; `body.refreshToken` solo si `allowRefreshBody` (por defecto desactivado en producción salvo `ALLOW_REFRESH_BODY=true`).
- **`errorHandler`:** respuestas consistentes `{ data, message, error }`; Zod 422, Prisma conocido (p. ej. P2002→409), JWT, payload grande 413, JSON inválido 400; sin detalles peligrosos en producción.
- **Rate limit** mantenido en **`POST /login`** con umbrales por entorno (desarrollo relajado, `test` muy alto, producción más estricto).

---

## MAPS-010C — Testing + CI

- **Tests de integración — productores:** `backend/tests/producers.integration.test.ts` (401 sin token, 403 con rol `PRODUCTOR`, 200 con `ADMIN`/`SUPERADMIN`, alta 201, email duplicado 409, campo no permitido tipo `whatsapp` → 422, PATCH de datos, desactivación + revocación de sesión vía refresh 401, listado `activo=false`).
- **Tests de middlewares:** `backend/tests/authorize-validate.middleware.test.ts` (`authorize`: 401/403/`next`; `validate`: 422 en params/body, body parseado en `next`).
- **Estrategia DB:** `backend/tests/setup.ts` carga `backend/.env`; **no** hay base de test dedicada en esta fase: localmente se usa el mismo `DATABASE_URL` de desarrollo; en CI el workflow exporta `DATABASE_URL` al servicio Postgres del job.
- **Workflow:** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — checkout, Node 20, `npm ci` en backend y frontend, `prisma migrate deploy` + `prisma db seed`, luego `typecheck` / `lint` / `build` / `npm test` en backend y calidad (`typecheck`, `lint`, `build`) en frontend. **Sin** deploy.

---

## Herramientas agregadas (resumen)

| Herramienta | Uso en MAPS-010 |
|---------------|-----------------|
| ESLint 9 (flat config) | Lint en `frontend/` y `backend/`. |
| typescript-eslint | Reglas TypeScript en ambos paquetes. |
| Prettier 3 | Formato único; `eslint-config-prettier` evita choques. |
| eslint-plugin-react-hooks | Frontend. |
| helmet | Hardening HTTP en Express. |
| Vitest + Supertest | Ya en uso para auth; extendido con nuevos tests (010C). |
| GitHub Actions | CI en `ubuntu-latest` + Postgres servicio. |

---

## Dependencias agregadas o consolidadas en `package.json`

Referencias al estado del repo tras MAPS-010 (versiones según `package-lock.json`).

### Backend — `dependencies`

- **`helmet`** — cabeceras HTTP (010B).

*(Otras deps como `express-rate-limit` pueden haber sido ajustadas en la misma época; el foco de negocio de 010B en runtime nuevo es `helmet`.)*

### Backend — `devDependencies`

- **`@eslint/js`**, **`eslint`**, **`typescript-eslint`**, **`eslint-config-prettier`**, **`globals`** — toolchain ESLint (010A).
- **`prettier`** — formato (010A).
- **`vitest`**, **`supertest`**, **`@types/supertest`** — tests (auth previo + 010C).

### Frontend — `devDependencies`

- **`@eslint/js`**, **`eslint`**, **`typescript-eslint`**, **`eslint-config-prettier`**, **`globals`**, **`eslint-plugin-react-hooks`** — toolchain ESLint (010A).
- **`prettier`** — formato (010A).

---

## Scripts agregados (o relevantes al cierre)

### Backend

| Script | Comando |
|--------|---------|
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint .` |
| `lint:fix` | `eslint . --fix` |
| `format` | `prettier --write .` |
| `format:check` | `prettier --check .` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |

### Frontend

| Script | Comando |
|--------|---------|
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint .` |
| `lint:fix` | `eslint . --fix` |
| `format` | `prettier --write .` |
| `format:check` | `prettier --check .` |

---

## Tests agregados o cubiertos por MAPS-010C

| Archivo | Contenido |
|---------|-----------|
| `backend/tests/producers.integration.test.ts` | Integración HTTP `/api/v1/producers` (authz, validación, CRUD admin relevante, sesiones al desactivar). |
| `backend/tests/authorize-validate.middleware.test.ts` | Contrato de `authorize` y `validate` con mocks ligeros. |
| `backend/tests/auth.integration.test.ts` | Preexistía; se mantiene como baseline de `/api/v1/auth`. |

Suite ejecutable con **`npm test`** en `backend/` (requiere Postgres, migraciones y seed en local; CI hace migrate + seed antes de tests).

---

## Workflow CI creado

- **Ruta:** `.github/workflows/ci.yml`.
- **Disparadores:** `push` y `pull_request` en ramas habituales (`main`, `master`, `development`).
- **Servicio:** PostgreSQL 16 (Alpine) en el job.
- **Variables:** `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, `DEFAULT_PRODUCER_PASSWORD`, `FRONTEND_ORIGIN`, `NODE_ENV=test`, etc., definidas en el workflow para un entorno reproducible.

---

## Comandos de verificación (local)

```bash
# Backend (desde backend/; DB levantada, migrate + seed)
npm run lint
npm run typecheck
npm run build
npm test

# Frontend (desde frontend/)
npm run lint
npm run typecheck
npm run build
```

En CI, el workflow encadena instalación, migraciones, seed y los mismos chequeos.

---

## Decisiones tomadas

1. **Fases 010A → 010B → 010C** en ese orden para no mezclar rotura de contrato auth/prod con primer pipeline.
2. **npm** como gestor documentado hasta una migración explícita futura.
3. **Puerto Postgres por defecto** `5432` en host, alineado con Compose `5432:5432`.
4. **ESLint/Prettier por paquete** (no config monolítica en raíz del lint).
5. **Refresh:** cookie-first en producción; body opcional solo con flag explícito cuando haga falta.
6. **Tests de integración** contra app real (`createApp` + Supertest) y **middlewares** con mocks mínimos.
7. **CI mínima** sin audit obligatorio, sin E2E, sin deploy (acorde al TDD).
8. **Sin Husky / commitlint** en MAPS-010; el gate principal es GitHub Actions.

---

## Riesgos residuales

| Riesgo | Nota |
|--------|------|
| `DEFAULT_PRODUCER_PASSWORD` | Contraseña inicial compartida en altas admin; historia de invitación / primer login sigue siendo deuda de producto/seguridad. |
| DB de tests = DB de dev (local) | Los tests de integración escriben datos; se mitiga con datos únicos y CI con base efímera. |
| 400 vs 422 en algunos handlers de auth | Middleware `validate` y `errorHandler` usan 422; validación manual puntual en auth puede seguir en 400 hasta un ticket de unificación. |
| `helmet` / CORS | Si cambia el origen o hay nuevos clientes, revisar opciones y `FRONTEND_ORIGIN`. |

---

## Pendientes fuera de alcance (documentados en el TDD)

| Pendiente | Detalle |
|-----------|---------|
| Husky, lint-staged, commitlint | Evaluar cuando CI esté estable y el equipo quiera hooks locales. |
| Playwright / Cypress | E2E no incluido en MAPS-010. |
| Unificación estricta 400 → 422 en auth | Ticket / PR dedicado si se alinea contrato con frontend. |
| Migración a pnpm | Fuera de MAPS-010. |
| `npm audit` / `--force` | No parte del alcance; no forzar fixes agresivos. |
| Frontend unit tests en CI | Vitest + Testing Library en el frontend: decidido fuera de este epic (ver preguntas abiertas del TDD). |
| Deploy / infra cloud | No incluido. |
| Reemplazo de `DEFAULT_PRODUCER_PASSWORD` por flujo de invitación | Historia de producto aparte. |

---

## Criterios de aceptación (checklist de cierre MAPS-010)

| Criterio | Estado |
|----------|--------|
| Docs y `.env.example` coherentes con Postgres local (`5432`) | Cumplido (010A). |
| `typecheck`, `lint`, `format:check` en frontend y backend | Cumplido (010A). |
| `helmet` + límite de body en Express | Cumplido (010B). |
| Refresh cookie-first en prod + flag `ALLOW_REFRESH_BODY` | Cumplido (010B). |
| Tests productores + `authorize` + `validate` | Cumplido (010C). |
| GitHub Actions sin deploy | Cumplido (010C). |
| Worklog final MAPS-010 | Este documento. |

---

## Desviaciones respecto al TDD

- **Job opcional `npm audit`:** no se añadió al workflow (el TDD lo marcaba como opcional); se puede incorporar después como paso informativo.
- **Badge de CI en README:** dejado como opcional en el TDD.

---

## Referencias cruzadas

- **TDD (implementado):** [`docs/tdd/MAPS-010-tdd-quality-security-baseline.md`](../tdd/MAPS-010-tdd-quality-security-baseline.md)
- **Convenciones docs:** [`docs/CONVENTIONS.md`](../CONVENTIONS.md)
- **CI:** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

---

*Worklog de cierre — MAPS-010 Quality & Security Baseline — 2026-05-14.*
