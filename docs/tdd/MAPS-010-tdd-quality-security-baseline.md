# MAPS-010 — TDD: Quality & Security Baseline

Documento de diseño técnico para establecer baseline de **calidad de código**, **seguridad en Express**, **tests ampliados** y **CI mínimo** tras MAPS-009, sin introducir nuevas features funcionales en dominio negocio.

**Estado:** **Implementado** (2026-05-14).  
**Worklog:** [`docs/worklog/MAPS-010-quality-security-baseline.md`](../worklog/MAPS-010-quality-security-baseline.md)  
**Autor:** (equipo)  
**Revisores:** —  
**Creado:** 2026-05-14  
**Última actualización:** 2026-05-14

### MAPS-010A — Lo aplicado en código (cierre técnico de fase)

- **Docker / docs:** `docker-compose.yml` pasa a mapeo **`5432:5432`**; `README.md`, `docs/README.md`, `backend/.env.example` alineados con `DATABASE_URL` en `localhost:5432` y notas para host `db:5432` si el backend corre en Docker y para cambiar el mapeo si hay conflicto de puerto.
- **Gestor:** documentación actualizada a **npm** (sin recomendar pnpm como camino principal).
- **Prettier:** `.prettierrc.json` y `.prettierignore` en la raíz; `.prettierignore` por paquete en `frontend/` y `backend/`; scripts `format` / `format:check`.
- **ESLint:** `eslint.config.js` por paquete (flat config), `typescript-eslint` + `eslint-config-prettier`; frontend añade `eslint-plugin-react-hooks` y regla gradual `@typescript-eslint/no-unused-vars` con `argsIgnorePattern: ^_`.
- **Scripts:** `typecheck`, `lint`, `lint:fix` en ambos paquetes.
- **Fuera de 010A (sin tocar):** ~~helmet~~ (ver **010B**), ~~rate limit global~~ (login limit ajustado en **010B**), refresh policy detallada (ver **010B**), trust proxy (ver **010B**), CI, tests nuevos, unificación 400/422.

### MAPS-010B — Express Security Hardening (cierre técnico)

- **`helmet`** en `createApp`: CSP desactivada (API JSON), `crossOriginResourcePolicy: cross-origin` para no romper CORS credenciales entre Vite y API.
- **Límite de body:** `express.json` y `express.urlencoded` con **`1mb`** (`REQUEST_BODY_LIMIT` en `backend/src/app.ts`).
- **`trust proxy`:** variable `TRUST_PROXY` (`false` default, `true`, o entero de saltos) parseada en `parseTrustProxy()` → `app.set('trust proxy', …)`.
- **Refresh en producción:** por defecto **solo cookie** (`allowRefreshBody` = false si `NODE_ENV=production` y no hay `ALLOW_REFRESH_BODY=true`). Desarrollo y `test`: body permitido por defecto (Supertest/Postman).
- **Cookies refresh:** sin cambio funcional; `httpOnly`, `sameSite: lax`, `secure` si producción (`authCookies.ts`).
- **`errorHandler`:** sin stack traces al cliente en producción; manejo explícito de **Zod** (422), **Prisma** conocido (P2002→409, P2025→404), **JWT** (jsonwebtoken), payload demasiado grande (413), JSON inválido (400); envelope `{ data, message, error }`.
- **Rate limiting:** `express-rate-limit` ya existía en `POST /login`; se mantiene **solo login**; desarrollo **500**/15 min, test alto, producción **10**/15 min. **No** se añadió limiter en `/refresh`: el token se valida con `REFRESH_SECRET` y sesión en BD; el riesgo principal en fuerza bruta sigue siendo contraseña en login (ya limitado). Reevaluar en 010C si hay tráfico anómalo.
- **Variables nuevas / documentadas:** `TRUST_PROXY`, `ALLOW_REFRESH_BODY` en `backend/.env.example`, `README.md` (referencia) y `docs/README.md` (auth).

### MAPS-010C — Testing + CI (cierre técnico)

- **Tests productores:** `backend/tests/producers.integration.test.ts` — 401 sin token, 403 como `PRODUCTOR`, 200 como `ADMIN`/`SUPERADMIN`, alta 201, duplicado 409, `whatsapp` estricto 422, PATCH datos, desactivar + refresh 401, listado `activo=false`.
- **Middlewares:** `backend/tests/authorize-validate.middleware.test.ts` — `authorize` (401/403/next) y `validate` (422 params/body, body parseado).
- **DB de test:** sin base dedicada; `tests/setup.ts` documenta uso de `DATABASE_URL` de `backend/.env` en local y variables del job en CI.
- **Scripts:** `npm test` (Vitest `run`) aglutina la suite; `test:watch` ya existía.
- **GitHub Actions:** `.github/workflows/ci.yml` — servicio Postgres, `prisma migrate deploy`, `db seed`, `typecheck` / `lint` / `build` / `test` backend y calidad frontend.
- **Docs:** `README.md` (tests + CI); este TDD actualizado.

---

## 1. Resumen

Hoy el proyecto carece de endurecimiento sistémico de Express, pipeline CI y tests de capa admin más allá de auth. Tras **MAPS-010A** (2026-05-14) ya hay **Prettier**, **ESLint** mínimo, scripts **`typecheck` / `lint` / `format`** y documentación alineada con **`5432:5432`** en Compose y **npm** como gestor. **MAPS-010B** (2026-05-14) añade **helmet**, límites de body, **trust proxy** configurable, política de refresh **cookie-first en producción**, `errorHandler` más robusto y rate limit de login menos agresivo en desarrollo. **MAPS-010C** (2026-05-14) incorpora tests de **productores**, **authorize** / **validate**, documentación de estrategia de DB de test y workflow **GitHub Actions** mínimo (sin deploy).

---

## 2. Objetivo

- Dejar el repo con **higiene reproducible**: un desarrollador clona, instala, corre `typecheck`, `lint` y builds **sin sorpresas de docs/DB**.
- Cerrar **huecos de seguridad baseline** en la app Express (cabeceras, límites, proxy, política de refresh en producción).
- **Automatizar verificación mínima** en GitHub Actions (sin deploy).
- Ampliar tests en backend (productores, `authorize`, `validate`) de forma **incremental** sin bloquear merges intermedios.
- **Documentar decisiones** (HTTP 400 vs 422, cookie-only refresh) para consistencia con frontend y clientes.

---

## 3. Contexto actual

### Situación relevada (post-auditoría MAPS-010)

| Tema                   | Estado                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Docker / Postgres**  | `docker-compose.yml` mapea **`5432:5432`**; docs y `backend/.env.example` usan `localhost:5432` en `DATABASE_URL`.                                                                                 |
| **Lint / formato**     | **ESLint** (flat) + **Prettier** en `frontend/` y `backend/`; scripts `lint`, `format`, etc.                                                                                                       |
| **Scripts calidad**    | `typecheck`, `lint`, `lint:fix`, `format`, `format:check` en ambos paquetes.                                                                                                                       |
| **Gestor de paquetes** | **npm** documentado; `package-lock.json` en frontend y backend.                                                                                                                                    |
| **TypeScript**         | `frontend/tsconfig.json` y `backend/tsconfig.json` usan `strict: true`. Frontend añade `noUnusedLocals` / `noUnusedParameters`; backend no.                                                        |
| **Express**            | `backend/src/app.ts`: **helmet** (CSP off, CORP cross-origin), CORS + cookies + **JSON/urlencoded límite 1mb**; **`trust proxy`** vía `TRUST_PROXY`. Rate limit en `POST /login` (relajado en dev).      |
| **Refresh token**      | Cookie httpOnly `maps_refresh` + body opcional solo si `allowRefreshBody` (prod: false por defecto; `ALLOW_REFRESH_BODY=true` para excepciones).                                                            |
| **Validación / HTTP**  | Middleware `backend/src/middlewares/validate.ts` responde **422**; `auth.controller` usa **400** para Zod manual en varios handlers. _(Unificación 422: pendiente 010B/PR futuro; fuera de 010A.)_ |
| **Tests**              | `backend/tests/*.test.ts` (Vitest + Supertest): auth, productores (integración admin), `authorize` / `validate` (middlewares). DB local vía `DATABASE_URL` de `backend/.env` o Postgres del job en CI. |
| **CI**                 | `.github/workflows/ci.yml`: Postgres servicio, `prisma migrate deploy` + seed, typecheck/lint/build/test backend y calidad frontend.                                                                 |
| **Riesgo producto**    | `DEFAULT_PRODUCER_PASSWORD` en `backend/src/config/env.ts` / `producers.service.ts` — contraseña inicial compartida por altas admin.                                                               |

### Por qué ahora

MAPS-009 integró productores a API real; el siguiente incremento natural es **reducir deuda técnica y superficie de riesgo** antes de nuevas historias funcionales, para que CI y revisiones detecten regresiones temprano.

---

## 4. Alcance

### MAPS-010A — Environment & Quality Baseline

- Alinear **documentación y ejemplos `.env`** con el puerto host real del servicio `db` en Compose (ver decisión §6.1).
- Introducir **ESLint + Prettier** mínimos en `frontend/` y `backend/` (reglas graduales; evitar “big bang” de miles de warnings).
- Añadir scripts `typecheck`, `lint`, `lint:fix`, `format` (y opcional `format:check`) en cada `package.json`.
- Actualizar **README** / `docs/README.md` para reflejar gestor **npm** hasta una migración explícita futura.
- ~~Estándarizar **códigos de validación** (400 vs 422)~~ — **diferido** fuera de 010A (sin cambiar contrato API en esta fase).

### MAPS-010B — Express Security Hardening

- Integrar **`helmet`** con configuración acorde a SPA + cookies (ajustes si rompe dev local).
- Configurar **límite de tamaño** en `express.json()` (valor acordado en §12 si no hay default de producto).
- **`trust proxy`**: documentar y configurar según entorno (local vs detrás de reverse proxy); relacionar con rate limit por IP futuro.
- **Producción: refresh cookie-only** — deshabilitar o rechazar `body.refreshToken` en `NODE_ENV === 'production'` (o flag explícito `ALLOW_REFRESH_BODY`, default `false` en prod), manteniendo body en `development`/`test` para Supertest/Postman si el equipo lo necesita.
- No expandir CSP compleja en esta fase salvo que `helmet` requiera ajuste mínimo documentado.

### MAPS-010C — Testing + CI

- Tests de integración **productores** (`/api/v1/producers`): happy paths + 401/403/404/409 según casos disponibles.
- Tests unitarios o de contrato ligeros para **`authorize`** y **`validate`** (mock de `req/res/next`).
- **GitHub Actions**: workflow mínimo (install → typecheck → lint → build backend → build frontend → `npm test` backend). Sin deploy.
- Job opcional: `npm audit` informativo o con umbral (no `--force`).

---

## 5. Fuera de alcance

- **Husky**, **lint-staged**, **commitlint** (evaluar tras CI estable).
- **TanStack Query** y refactors grandes de data fetching.
- **`npm audit fix --force`** y upgrades major no planificados (p. ej. salto de Vite mayor que rompa build).
- **Playwright / Cypress** E2E completo.
- **Migración pnpm** en este ticket (puede ser MAPS futuro con PR dedicado).
- **Reemplazo del modelo `DEFAULT_PRODUCER_PASSWORD`** por invitaciones / primer login (historia de producto/seguridad aparte; aquí solo documentar riesgo y posible hardening mínimo si negocio lo pide).
- **Cambios funcionales** en mapa, noticias, intranet, nuevos endpoints de negocio.
- **Deploy**, infra cloud, secret scanning avanzado.

---

## 6. Decisiones propuestas

1. **Gestor:** **npm** mientras existan `package-lock.json` en frontend y backend — **aplicado en 010A** (README y `docs/README.md`).
2. **Puerto Postgres:** host **`localhost:5432`** con mapeo por defecto **`5432:5432`** en Compose — **aplicado en 010A**; nota en README si se cambia el mapeo por conflicto de puerto; backend en Docker futuro: host **`db`**, puerto **5432**.
3. **ESLint/Prettier:** configuración mínima — **aplicado en 010A** (`eslint.config.js` por paquete, Prettier en raíz + ignores locales).
4. **400 vs 422:** pendiente (**no** en 010A; ver 010B o PR dedicado).
5. **Refresh en producción:** **solo cookie** httpOnly; rechazar body en prod (mensaje claro 400/401 según diseño).
6. **trust proxy:** `false` en local; en producción detrás de proxy, `app.set('trust proxy', n)` documentado en README (n según proveedor).
7. **CI:** una workflow con jobs o matrix; falla el PR si typecheck/lint/build/test fallan.
8. **No Husky en MAPS-010** — el gate principal es CI.
9. **`DEFAULT_PRODUCER_PASSWORD`:** no eliminar en 010; opcionalmente añadir advertencia en README/TDD hacia historia de “invitación al primer acceso”.

### Alternativas breves (descartadas para este TDD)

**Nota:** MAPS-010A cambió el mapeo del servicio `db` de `5433:5432` a **`5432:5432`** para alinear Compose y documentación.

| Alternativa                                     | Motivo de descarte en MAPS-010                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| Solo documentar puerto sin tocar `.env.example` | Deja onboarding roto por defecto.                                       |
| ESLint “strict max” día uno                     | Ruido masivo; mejor reglas graduales o `warn` inicial donde haga falta. |

---

## 7. Fases de implementación

### Fase 010A — Environment & Quality Baseline

1. ~~Alinear puerto Compose y docs (`5432:5432`, `DATABASE_URL` `localhost:5432`)~~ (**hecho 2026-05-14**).
2. ~~Prettier + ignore + scripts format~~ (**hecho**).
3. ~~ESLint por paquete + scripts lint~~ (**hecho**).
4. ~~Scripts `typecheck`~~ (**hecho**).
5. Unificar validación **422** en auth: **pendiente** (fuera de 010A por acuerdo de alcance).

### Fase 010B — Express Security Hardening

1. ~~`helmet()` en `createApp`; probar login + CORS + cookies en dev.~~ (**hecho 2026-05-14**)
2. ~~`express.json({ limit: '1mb' })` documentado + `urlencoded` acotado.~~ (**hecho**)
3. ~~`trust proxy` según §6.~~ (**hecho**)
4. ~~Guard en `resolveRefreshToken`: producción cookie-only salvo flag.~~ (**hecho**)
5. ~~`errorHandler`: Zod/Prisma/JWT/payload/JSON inválido.~~ (**hecho**)
6. Tests: sin nuevos en 010B (acuerdo de alcance); comportamiento actual cubierto por `auth.integration.test.ts` en `NODE_ENV=test`.

### Fase 010C — Testing + CI

1. ~~Nuevo archivo(s) de test productores (mismo patrón que `auth.integration.test.ts`: app real + agent si cookies).~~ (**hecho 2026-05-14**)
2. ~~Tests `authorize` / `validate`.~~ (**hecho**)
3. ~~`.github/workflows/ci.yml` con pasos acordados (install → migrate → seed → calidad backend/frontend).~~ (**hecho**)
4. Badge opcional en README (diferible).

**Orden recomendado:** **010A → 010B → 010C**. 010A desbloquea confianza en scripts y docs; 010B toca contrato auth en prod; 010C asume lint/typecheck estables para no complicar el primer workflow.

---

## 8. Herramientas a instalar / configurar

| Herramienta                                        | Dónde      | Notas                                                      |
| -------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| `eslint`, `typescript-eslint`, plugins React/hooks | `frontend` | Config mínima compatible Vite + TS.                        |
| `eslint`, `typescript-eslint`                      | `backend`  | Reglas razonables para Node + ESM.                         |
| `prettier`, `eslint-config-prettier`               | ambos      | Un solo estilo; ignorar `dist/`, `node_modules/`.          |
| `helmet`                                           | `backend`  | Dependencia runtime.                                       |
| GitHub Actions                                     | repo       | Runner `ubuntu-latest`, Node LTS alineado a README (≥ 20). |

_(Versiones exactas se fijan al implementar; sin `--force` en audit.)_

---

## 9. Scripts esperados

### Backend

| Script         | Comando orientativo                                 |
| -------------- | --------------------------------------------------- |
| `typecheck`    | `tsc --noEmit`                                      |
| `lint`         | `eslint .` (o paths acotados)                       |
| `lint:fix`     | `eslint . --fix`                                    |
| `format`       | `prettier --write .`                                |
| `format:check` | `prettier --check .`                                |
| _(existentes)_ | `dev`, `build`, `start`, `test`, `prisma:*`, `db:*` |

### Frontend

| Script         | Comando orientativo                                           |
| -------------- | ------------------------------------------------------------- |
| `typecheck`    | `tsc --noEmit` (o `tsc -b` si se unifica con `tsconfig.node`) |
| `lint`         | `eslint src`                                                  |
| `lint:fix`     | `eslint src --fix`                                            |
| `format`       | `prettier --write .`                                          |
| `format:check` | `prettier --check .`                                          |
| _(existentes)_ | `dev`, `build`, `preview`                                     |

### CI

Secuencia local/CI: `npm ci` → migraciones + seed donde aplique → `npm run typecheck` → `npm run lint` → `npm run build` → `npm test` (backend). El repo incluye **`.github/workflows/ci.yml`** con Postgres de servicio y la misma secuencia para PR/push.

---

## 10. Riesgos

| Riesgo                                                   | Prob. | Impacto | Mitigación                                                                         |
| -------------------------------------------------------- | ----- | ------- | ---------------------------------------------------------------------------------- |
| `helmet` rompe CORS/cookies o recursos en dev            | Media | Medio   | Ajustar opciones documentadas; probar login + refresh.                             |
| ESLint revela deuda masiva                               | Alta  | Medio   | Fases: `warn` → `error`, o `--max-warnings` acotado con plan de bajar.             |
| Cambio 422 en auth rompe frontend si asumía 400          | Media | Medio   | Buscar manejo de status en front; actualizar en mismo PR.                          |
| Cookie-only refresh en prod rompe cliente que usaba body | Baja  | Alto    | Confirmar que SPA solo usa cookie; documentar breaking change si hubo API externa. |
| Tests productores requieren DB + seed                    | Media | Medio   | Patrón `tests/setup.ts` + `DATABASE_URL` local o CI; README y comentario en `setup.ts` documentan el alcance. |

---

## 11. Criterios de aceptación

- [x] Documentación y `backend/.env.example` coherentes con **puerto host PostgreSQL** del `docker-compose` vigente (`5432:5432`).
- [x] `npm run typecheck`, `lint` y `format:check` pasan en frontend y backend en limpio (o lista explícita de excepciones aprobadas y fecha límite).
- [x] `helmet` y límite de JSON activos en `createApp`.
- [x] En **producción**, refresh vía body deshabilitado por defecto; flag `ALLOW_REFRESH_BODY=true` para excepciones.
- [ ] Validación Zod unificada a **422** (o documento de excepción firmado en §12). *(Parcial: middleware `validate` usa 422; `errorHandler` global Zod→422; auth sigue respondiendo 400 en `safeParse` manual — 010C / PR dedicado.)*
- [x] Tests: productores + `authorize` + `validate` en verde (con DB y seed).
- [x] GitHub Actions ejecuta pipeline mínimo sin deploy; badge opcional.
- [x] No se añade Husky, TanStack Query, ni `npm audit fix --force` en el alcance de MAPS-010.
- [x] **Work-log** [`docs/worklog/MAPS-010-quality-security-baseline.md`](../worklog/MAPS-010-quality-security-baseline.md) creado al cierre.

---

## 12. Preguntas abiertas

- [x] **Límite de body:** **1mb** JSON y urlencoded (`MAPS-010B`), acotando payloads accidentales; revisar si noticias/adjuntos futuros requieren subida aparte.
- [ ] **422 en login:** ¿se prefiere conservar **400** en `POST /login` por convención común de “bad request” o alinear todo a 422?
- [x] **`trust proxy` en staging/prod:** variable **`TRUST_PROXY`** (`false` / `true` / saltos `1`, `2`, …) documentada en `backend/.env.example`; ajustar según proveedor real.
- [x] **`ALLOW_REFRESH_BODY`:** variable explícita opcional; default inferido de `NODE_ENV` (false en producción si se omite).
- [ ] **ESLint en raíz vs por paquete:** resuelto en 010A como **config por paquete** (`frontend/` y `backend/`).
- [ ] **Frontend tests en CI:** ¿incluir Vitest + Testing Library en MAPS-010C o ticket siguiente?
- [ ] **`DEFAULT_PRODUCER_PASSWORD`:** ¿negocio exige ticket de invitaciones antes de go-live público?

---

## 13. Worklog de cierre

Implementación cerrada con bitácora retrospectiva:

- **[`docs/worklog/MAPS-010-quality-security-baseline.md`](../worklog/MAPS-010-quality-security-baseline.md)** — objetivo, contexto inicial, 010A/B/C, herramientas y dependencias, scripts, tests, CI, verificación, decisiones, riesgos, pendientes y desviaciones frente a este TDD.

*(Enlaces a PRs/commits específicos: añadir cuando se consoliden en el remoto.)*

---

## Referencias

- Worklog (cierre): [`docs/worklog/MAPS-010-quality-security-baseline.md`](../worklog/MAPS-010-quality-security-baseline.md)
- Plantilla: [`docs/tdd/_TEMPLATE-tdd.md`](_TEMPLATE-tdd.md)
- Convenciones docs: [`docs/CONVENTIONS.md`](../CONVENTIONS.md)
- Auditoría previa (contexto): hallazgos MAPS-010 Quality & Security Audit (chat interno / notas de equipo)
- Código relevante: `backend/src/app.ts`, `backend/src/controllers/auth.controller.ts`, `backend/src/middlewares/validate.ts`, `docker-compose.yml`, `README.md`
