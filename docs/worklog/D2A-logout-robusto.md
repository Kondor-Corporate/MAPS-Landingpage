# D2A — Logout robusto

Documentación de la feature D2A dentro del proyecto MAPS Asesores.
Complementa el [índice de docs](../README.md) y el
[README raíz](../../README.md).

**Identificador:** D2A (no es un ticket `MAPS-XXX`; la rama es `fix/d2-auth-session-hardening`). D2B (rate limiting de geocode) y D2C (refresh rotation / reuse detection) son entregas distintas.

**Estado:** HECHO — implementación, revisión técnica y QA manual aprobados en rama `fix/d2-auth-session-hardening` (2026-09-03). Sin commit ni deploy a staging al cierre de este documento.

**TDD de diseño:** [`docs/tdd/D2A-tdd-logout-robusto.md`](../tdd/D2A-tdd-logout-robusto.md)

---

## Objetivo

Endurecer `POST /api/v1/auth/logout` para que cerrar sesión desde la UI (o vía API con solo la cookie refresh) revoque de verdad la sesion refresh actual, sea idempotente y no dependa del access token ni de `jwt.verify` con expiracion estricta.

D2A no implementa refresh rotation (D2C). No toca geocode ni rate limiting (D2B).

---

## Problema original

- Logout exigía `authenticate` (access token válido). Access expirado o ausente → `401`, cookie no limpiada, fila `SesionToken` podía quedar viva.
- El refresh expirado no se podía revocar si `jwt.verify` fallaba por `exp`.
- El interceptor Axios trataba `401` de logout como sesión a renovar (`refresh → retry logout`).
- Un body inválido podía bloquear logout con cookie válida si Zod corría antes de leer la cookie.

---

## Contrato implementado (`POST /api/v1/auth/logout`)

- **Sin** middleware `authenticate`. **Sin** access token como credencial.
- La sesion se identifica **solo** por el refresh del transporte actual.
- **Cookie `maps_refresh` tiene prioridad.** Si existe, el body se ignora por completo.
- **Body fallback** solo cuando no hay cookie **y** `allowRefreshBody` está habilitado (`NODE_ENV !== 'production'` por defecto, o `ALLOW_REFRESH_BODY=true` en producción).
- **Ausencia de refresh usable:** logout idempotente `200` + `clearCookie` (no borra filas desconocidas).
- **Refresh inválido/corrupto:** misma respuesta de éxito; no revela validez; no consulta BD si firma/tipo no pasan validación.
- **Antes de BD:** `jwt.verify(refreshToken, REFRESH_SECRET, { ignoreExpiration: true })` + `typ === 'refresh'`. Solo se ignora expiración para revocar refreshes legítimos expirados cuyo hash persiste.
- **Revocación:** SHA-256 → `SesionToken.deleteMany({ tokenHash })`. No incrementa `tokenVersion`. No cierra otras sesiones del usuario.
- **Logout repetido:** `200` idempotente.
- **Camino feliz:** siempre `clearCookie` de `maps_refresh`.
- **Fallo de revocación en BD:** `clearCookie` + `500` (`next(err)`). No se afirma revocación server-side; el navegador termina la sesión local.

**Limitación explícita:** un access token ya emitido sigue funcionando hasta su expiración natural (`JWT_EXPIRES_IN`, habitualmente ~15 min) mientras usuario/rol/`tokenVersion` sigan válidos. D2A no implementa denylist de access ni lookup de sesión por request.

---

## Cambios implementados

### Backend

| Archivo | Cambio |
|---------|--------|
| `backend/src/api/v1/routes/auth.routes.ts` | Quitado `authenticate` de `POST /logout` |
| `backend/src/controllers/auth.controller.ts` | Prioridad cookie > body; schema solo si body participa; `clearCookie` también en `catch` (500) |
| `backend/src/services/auth.service.ts` | `logout(refreshToken)`: verify con `ignoreExpiration`, gate `typ`, luego `deleteMany` por hash |
| `backend/src/validations/auth.schema.ts` | `logoutBodySchema`: `refreshToken: ""` → ausente (sin cambiar `refreshBodySchema`) |

### Frontend

| Archivo | Cambio |
|---------|--------|
| `frontend/src/lib/axios.ts` | `isAuthEndpoint` incluye `/auth/logout` |
| `frontend/src/modules/auth/hooks/useLogout.ts` | Comentarios alineados; semántica sin cambio: best-effort remoto + `finally` local |

### Tests

| Archivo | Cambio |
|---------|--------|
| `backend/tests/auth.integration.test.ts` | Matriz D2A: cookie/body, expirado, corrupto, multi-sesión, 500 BD, `expectLogoutOk` reforzado |

---

## Deuda D2C (no corregida)

El refresh token **sigue siendo reutilizable** hasta su expiración (`REFRESH_EXPIRES_IN`, default 30d) mientras la fila `SesionToken` exista y no haya logout ni revocación global.

**No** hay rotation, reuse detection, token families ni grace period. Esto **no** se describe como bug resuelto por D2A ni como innecesario: es **deuda de session hardening**, actualmente **diferida** porque una rotación correcta requiere diseño adicional (concurrencia multi-tab, token families/reuse detection, lost-response handling).

Detalle en `docs/modules/auth.md` (sección Deuda D2C).

---

## Validación D2A

Validación **local** en rama `fix/d2-auth-session-hardening`. No se afirma deploy a staging.

### Automatizada

| Comando | Resultado |
|---------|-----------|
| `backend` lint | OK |
| `backend` typecheck | OK |
| `backend` build | OK |
| `backend` tests | **252 passed** |
| `frontend` typecheck | OK |
| `frontend` lint | OK |
| `frontend` build | OK |
| `git diff --check` | OK |

### QA manual (aprobado)

| Caso | Resultado |
|------|-----------|
| Logout normal desde UI → login; cookie eliminada; hard refresh no restaura sesión | OK |
| Logout directo sin `Authorization`, solo cookie refresh → `200`; sesión no recuperable | OK |
| Segundo logout sin sesión → `200` idempotente | OK |
| Dos sesiones mismo usuario → logout de A no invalida B; hard refresh de B restaura su sesión | OK |

---

## Archivos del diff D2A (código + docs)

**Código:**

- `backend/src/api/v1/routes/auth.routes.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/validations/auth.schema.ts`
- `backend/tests/auth.integration.test.ts`
- `frontend/src/lib/axios.ts`
- `frontend/src/modules/auth/hooks/useLogout.ts`

**Documentación (este cierre):**

- `docs/modules/auth.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/tdd/D2A-tdd-logout-robusto.md` (estado → HECHO)
- `docs/worklog/D2A-logout-robusto.md` (este archivo)

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| D2B — rate limiting geocode | Fuera de alcance D2A |
| D2C — refresh rotation / reuse detection | Deuda diferida; ver arriba |
| D5 — runner tests frontend | Sin cambios D2A |
| E2E browser login → logout | Sigue pendiente en módulo Auth |

---

*Documento generado al cierre de D2A — logout robusto.*
