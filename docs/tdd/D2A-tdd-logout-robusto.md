# D2A — TDD: Logout robusto

Documento de diseño técnico para endurecer `POST /api/v1/auth/logout` dentro del proyecto MAPS Asesores.

**Identificador:** D2A (no es un ticket `MAPS-XXX`; la rama es `fix/d2-auth-session-hardening`). No reutiliza IDs históricos 015–018. D2B (rate limiting de geocode) es otro integrante. D2C (refresh rotation / reuse detection) queda fuera de esta entrega.

**Estado:** HECHO — implementado y validado en rama `fix/d2-auth-session-hardening` (2026-09-03). QA manual aprobado; docs vivos actualizados.
**Autor:** equipo MAPS
**Revisores:** —
**Creado:** 2026-09-02
**Última actualización:** 2026-09-03

> TDD historico de diseno. El contrato vigente vive en `docs/modules/auth.md`, `docs/ARCHITECTURE.md` y `docs/worklog/D2A-logout-robusto.md`.

---

## Resumen

Hoy `POST /auth/logout` exige un access token válido (`authenticate`) y un refresh JWT que todavía pase `jwt.verify()`. Si el access expiró, falta la cookie o el refresh ya no verifica, el servidor responde `401`, no limpia `maps_refresh` y puede dejar la fila `SesionToken` viva. El usuario cree que cerró sesión.

D2A convierte el logout en una operación **idempotente** autenticada **solo por el refresh** (cookie httpOnly, o body si el transporte actual lo permite): validar firma JWT con `ignoreExpiration: true` y `typ === 'refresh'`, luego hashear y `deleteMany` por `tokenHash` solo si la validación pasa; siempre `200` + `clearCookie` en el camino feliz. Cierra únicamente esa sesión. No incrementa `tokenVersion`. El access ya emitido puede seguir válido hasta `JWT_EXPIRES_IN` (default 15m).

---

## Objetivo

- Un `POST /api/v1/auth/logout` sin `Authorization` y con cookie `maps_refresh` válida responde `200` y borra **solo** esa fila `SesionToken`.
- El mismo endpoint responde `200` y limpia la cookie si no hay token, si el token está corrupto, si ya fue revocado o si el JWT expiró.
- Otras sesiones del mismo usuario siguen vivas.
- `Usuario.tokenVersion` no cambia.
- El interceptor Axios no intenta `refresh → retry` ante un logout.
- `useLogout` sigue limpiando el store y yendo a `/login` aunque la red falle.
- Tests de integración backend cubren la matriz de esta entrega. No se crean tests frontend huérfanos (D5).

---

## Contexto

### Situación actual (releída en `fix/d2-auth-session-hardening`)

**Ruta** (`backend/src/api/v1/routes/auth.routes.ts`)

```text
POST /login              loginLimiter → authController.login
POST /refresh            authController.refresh          (sin authenticate)
POST /logout             authenticate → authController.logout
PATCH /me/password       authenticate → passwordChangeLimiter → validate → changeMyPassword
```

**Controller** (`backend/src/controllers/auth.controller.ts`)

- `resolveRefreshToken`: cookie `maps_refresh` primero; body `refreshToken` solo si `env.allowRefreshBody`.
- `allowRefreshBody`: `ALLOW_REFRESH_BODY=true` explícito, o `NODE_ENV !== 'production'` por defecto (`backend/src/config/env.ts`).
- Logout: parsea `logoutBodySchema` → exige `req.user` → exige refresh → `authService.logout(req.user.sub, refreshToken)` → `clearCookie` **solo si el service no lanza**.
- Refresh, en cambio, **sí** hace `clearCookie` en 401.

**Service** (`backend/src/services/auth.service.ts`)

- `hashToken`: SHA-256 hex, función local del módulo. No extraer a un helper global en D2A.
- `login`: crea `SesionToken` con el hash; no toca `tokenVersion`; permite N sesiones.
- `refresh`: `jwt.verify` + lookup por hash; emite access; **no rota**; no Set-Cookie.
- `logout(userSub, refreshToken)` hoy:
  1. `jwt.verify(REFRESH_SECRET)` — si falla → `401 Refresh token inválido o expirado`.
  2. Exige `typ === 'refresh'` y `sub`.
  3. `payload.sub === userSub` — si no → `403`.
  4. `findUnique({ tokenHash })` — si no hay fila o `usuarioId` no coincide → `401 Sesión no encontrada o ya revocada`.
  5. `delete` de esa fila.

**Cookie** (`backend/src/config/authCookies.ts`)

- Nombre `maps_refresh`.
- Set: `httpOnly`, `secure` solo en production, `sameSite: 'lax'`, `path: '/'`, `maxAge`.
- Clear: mismas flags **sin** `maxAge` (`getRefreshCookieClearOptions`). D2A no cambia estas opciones.

**Access / `authenticate`**

- Access: `{ sub, role, ver }`, TTL `JWT_EXPIRES_IN` default `15m`.
- `authenticate` no consulta `SesionToken`. Borrar la fila de refresh **no** invalida el access.

**Frontend**

- `useLogout` (`frontend/src/modules/auth/hooks/useLogout.ts`): `api.post('/auth/logout')` → `catch` vacío → `storeLogout()` → `navigate('/login', { replace: true })`.
- `api` adjunta Bearer y, ante 401 que no sea login/refresh, llama `refreshAccessToken` y reintenta (`frontend/src/lib/axios.ts`).
- `isAuthEndpoint` hoy: `/auth/login` y `/auth/refresh`. **`/auth/logout` no está excluido.**
- Por eso el Caso B de la SPA “funciona” a veces: logout 401 → refresh → retry logout. No es un contrato; si el refresh falla por red, el store se limpia y la fila server queda viva.

**Tests actuales de logout** (`backend/tests/auth.integration.test.ts`)

- `POST /logout — revoca sesión y limpia cookie`: manda Bearer + cookie, espera 200, luego refresh 401.
- `POST /logout — sin Authorization → 401`: **debe actualizarse** (pasará a 200).

**Revocación que D2A no toca**

D1A, alias `/producers/me/password`, reset admin, desactivar, cambio real de `usuario` ADMIN y bootstrap force siguen haciendo `tokenVersion++` + `sesionToken.deleteMany`. Logout **no** entra en ese patrón.

### Por qué ahora

El logout de producto es el único cierre de **una** sesión. Si no es robusto, un usuario que pulsa Salir con access vencido o cookie ausente deja un refresh utilizable hasta 30 días. D2C (rotation) no corrige eso y queda diferido. D2A es el arreglo mínimo antes de producción.

---

## Problema

1. Logout depende del access. Access expirado / ausente / inválido → `authenticate` 401 → el controller no corre.
2. Logout depende de `jwt.verify` del refresh. JWT expirado → 401 y la fila (cuyo hash sigue en BD) no se borra.
3. Sesión ya revocada o cookie corrupta → 401. Cookie **no** se limpia en ese path.
4. Sin cookie → 401. El servidor no puede borrar una fila que no sabe identificar; hoy además **falla** en vez de ser honesto e idempotente.
5. El interceptor trata un 401 de logout como “sesión a renovar”, acoplando logout a refresh.
6. El contrato documentado (`docs/modules/auth.md`) afirma que logout “requiere Bearer”. Eso es el bug, no la meta.

---

## Threat / risk concreto

D2A no “arregla” el robo de un refresh que el usuario nunca revoca. Eso es D2C (deuda).

El riesgo que **sí** cierra D2A:

- Usuario con Refresh A (legítimo o ya copiado) pulsa Salir.
- Access expirado o cookie en un estado sucio.
- Hoy: 401, fila A puede seguir en `sesion_token`.
- Un atacante que tenga A, o el propio browser en otro tab, sigue emitiendo access hasta 30d o hasta un evento D1A/D1B/reset/deactivate.

Severidad del hueco de logout (no del modelo de refresh): **P2**. El vector no es remoto anónimo; es “el cierre de sesión no cierra la sesión”. Impacto alto si A ya había salido del dispositivo (shared PC, Caso E).

CSRF: ver sección Seguridad. No se introduce token CSRF.

---

## Alcance

- Contrato de `POST /api/v1/auth/logout` únicamente.
- Backend: ruta, controller, `authService.logout`, tests `auth.integration.test.ts`.
- Frontend mínimo: excluir `/auth/logout` del interceptor de refresh. `useLogout` conserva su semántica.
- Docs vivos + worklog **en el PR de implementación**, no en esta etapa.

### Fuera de alcance

- D2B / rate limiting de geocode (`geocode.routes.ts`, controllers, lib, validations, limiter de geocode).
- D2C: refresh rotation, reuse detection, token families, `replacedBy`, `revokedAt`, grace period.
- Multi-tab locking (`BroadcastChannel`, `navigator.locks`).
- Cambiar `REFRESH_EXPIRES_IN` o TTL por rol.
- Rate limit de `/auth/refresh`.
- CSP, MFA, forgot-password, break-glass SUPERADMIN, login case-insensitive.
- Incrementar `tokenVersion` en logout.
- Denylist / `jti` de access / lookup de `SesionToken` en `authenticate`.
- Logout global (“cerrar todos los dispositivos”).
- CSRF token.
- Tests frontend huérfanos (D5).
- Prisma migrations, dependencias nuevas, `env.ts` (salvo que un hallazgo de implementación lo fuerce; no está previsto).

---

## Contrato actual vs nuevo

| Dimensión | Hoy | D2A |
|-----------|-----|-----|
| Middleware | `authenticate` | **Sin** `authenticate` |
| Credencial de sesión | Access (`req.user.sub`) + refresh verificado | Solo el refresh del transporte actual |
| `jwt.verify` del refresh | Obligatorio (exp vigente) | **`jwt.verify` con `ignoreExpiration: true`** + `typ === 'refresh'` antes de BD; sin consulta si firma/tipo inválidos |
| Fila no encontrada / ya revocada | `401` | `200` |
| JWT expirado | `401`; fila intacta | `200`; `deleteMany` por hash si la fila existe |
| Cookie / token corrupto | `401` | `200`; 0 filas borradas |
| Sin cookie ni body usable | `401` | `200`; no se afirma que se borró una fila |
| Logout repetido | 2º → `401` | `200` |
| Cookie en la respuesta | Clear solo si 200 del service | **`200`:** always clearCookie. **`500` (fallo BD):** clearCookie + `next(err)` — el browser termina la sesión local aunque la revocación server-side falle |
| Body envelope éxito | `{ data: null, message: "Sesión cerrada", error: null }` | **Igual** |
| Status éxito | `200` | `200` |
| Otras sesiones | No se tocan (ya) | No se tocan |
| `tokenVersion` | No cambia (ya) | No cambia |
| Access residual | Hasta `JWT_EXPIRES_IN` | **Explícito y aceptado** |
| Body fallback | Cookie primero; body si `allowRefreshBody` | **Sin cambio de política** |
| Schema body | `logoutBodySchema` = `{ refreshToken?: string }` | Se mantiene; ver nota Zod abajo |

**Respuesta de éxito (único contrato feliz):**

```json
{
  "data": null,
  "message": "Sesión cerrada",
  "error": null
}
```

No revelar si el token correspondía a una sesión existente (ni en `message`, ni en `error`, ni en headers distintos).

**400:** solo si el body **participa** en la resolución del token (`cookie` ausente **y** `allowRefreshBody`) y no pasa `logoutBodySchema` (p. ej. `refreshToken` presente y vacío: `z.string().min(1)`). Con cookie presente, el body se **ignora** por completo — un `refreshToken: 123` no bloquea la cookie válida. En production con body fallback desactivado, el body se ignora aunque sea inválido.

---

## Diseño backend

### Ruta

```text
authRouter.post('/logout', authController.logout);
```

Quitar `authenticate`. No agregar `authorize`. No agregar rate limiter nuevo.

### `resolveRefreshToken`

Sin cambios de política:

1. Cookie `maps_refresh` si existe (string no vacío).
2. Si no, y `env.allowRefreshBody`, `req.body.refreshToken`.
3. Si no, `undefined`.

Production: cookie solamente, salvo `ALLOW_REFRESH_BODY=true`. Dev/test: body permitido. **No ampliar.**

### Controller `logout`

Orden:

1. Leer cookie `maps_refresh`.
2. **Cookie presente:** usar cookie; **no** validar ni leer `req.body.refreshToken`.
3. **Cookie ausente + `allowRefreshBody`:** `logoutBodySchema.safeParse(req.body)` — fallo → `400` (no es logout).
4. **Cookie ausente + `!allowRefreshBody`:** ignorar body; `refreshToken = undefined`.
5. Si hay token: `await authService.logout(refreshToken)` — el service **no** lanza por token inválido/ausente/ya revocado; **sí** puede lanzar por fallo real de BD.
6. **Camino feliz (`200`):**  
   `res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions(env))`  
   `res.json({ data: null, message: 'Sesión cerrada', error: null })`.
7. **Fallo de revocación en BD (Prisma, etc.):**  
   `res.clearCookie(...)` **y luego** `next(err)` → `500`. No fingir 200. `useLogout` ya limpia el store local; conservar la cookie permitiría que una recarga futura restaure la sesión.

Quitar el chequeo `if (!req.user)`. Quitar el 401 “Refresh token requerido”.

`clearCookie` usa **solo** `getRefreshCookieClearOptions`. No cambiar nombre, HttpOnly, Secure, SameSite, Path.

### Service `logout`

Firma: `logout(refreshToken: string): Promise<void>`.

Ya no recibe `userSub`. No usa access token ni `tokenVersion`.

```text
token recibido
  → jwt.verify(REFRESH_SECRET, { ignoreExpiration: true })
  → si firma/estructura inválida → return (sin BD)
  → si typ !== 'refresh' → return (sin BD)
  → hashToken (SHA-256 hex, función local existente)
  → prisma.sesionToken.deleteMany({ where: { tokenHash } })
```

- Validación criptográfica **antes** de PostgreSQL: un `maps_refresh` arbitrario no debe provocar `deleteMany`.
- Un refresh legítimo pero expirado **pasa** `ignoreExpiration` y puede eliminar su hash persistido.
- 0 o 1 fila (el hash es `@unique`). Ambas son éxito en el camino feliz.
- Un valor manipulado o JWT con firma inválida → 0 consultas BD → éxito idempotente en controller.
- Quien posee el refresh ya posee la credencial de esa sesión; no hay que “autenticarlo” de nuevo para destruirla.

No usar `delete` + `findUnique` + throw. `deleteMany` es la operación idempotente.

No incrementar `tokenVersion`. No `deleteMany` por `usuarioId`.

### `hashToken`

Reutilizar la función local de `auth.service.ts`. No extraer a `lib/` ni tocarla en D1A/D1B/producers.

### Modelo de datos

`N/A`. `SesionToken` actual alcanza:

```text
id, usuarioId, tokenHash @unique, expiresAt, createdAt
```

Sin migración.

### Access residual (contrato de producto)

Tras un logout 200:

- El access emitido **antes** del logout sigue pasando `authenticate` mientras el JWT no expire, el usuario siga `activo`, el `rol` coincida y `ver === tokenVersion`.
- Ventana máxima: `JWT_EXPIRES_IN` (default **15m**).
- Esto es **aceptado**. No se mitiga en D2A con `tokenVersion++` (cerraría otros dispositivos), denylist, `jti` de access ni lookup de sesión por request.

Documentar en `docs/modules/auth.md` al implementar, con esta frase o equivalente:

> Logout no invalida el access token ya emitido. Ese JWT puede usarse hasta su expiración natural (`JWT_EXPIRES_IN`, default 15m). Para invalidar access de inmediato en todas las sesiones usar cambio de contraseña, reset administrativo o desactivar la cuenta.

---

## Diseño frontend

### Interceptor (`frontend/src/lib/axios.ts`)

Problema: `POST /auth/logout` no está en `isAuthEndpoint`. Un 401 (hoy real; mañana no debería ocurrir) dispara:

```text
logout 401 → refreshAccessToken → retry logout
```

Cambio mínimo y coherente: **incluir `/auth/logout` en `isAuthEndpoint`**.

```ts
function isAuthEndpoint(url?: string) {
  return (
    url?.includes('/auth/login') ||
    url?.includes('/auth/refresh') ||
    url?.includes('/auth/logout')
  );
}
```

Tras D2A el logout es 200, así que el retry no debería dispararse. La exclusión evita acoplar logout a refresh si aparece un 401 residual (proxy, 401 viejo cacheado, error de red mal clasificado).

No usar un segundo cliente Axios ni mover logout a `refreshClient` salvo que `isAuthEndpoint` resulte insuficiente en implementación. Preferir el cambio de una función.

No alterar `isInvalidRefreshError`, `endSessionOnce` ni `refreshLock`.

### `useLogout`

Sin cambio de semántica:

1. Intentar `api.post('/auth/logout')` (credentials ya van; cookie httpOnly viaja sola; no hace falta Bearer).
2. `catch`: no bloquear.
3. `finally`: `storeLogout()` + `navigate('/login', { replace: true })`.

El logout **local no depende de la red**. No esperar 200 para limpiar el store.

### Guards / store / AuthInitializer

Sin cambios. D1A sigue sin llamar `useLogout`.

### Tests frontend

No crear `useLogout.test.ts` ni tocar `axios.test.ts` como suite huérfana. D5 sigue pendiente. Si al implementar se actualiza un test FE existente que asuma 401 de logout, hacerlo; no inventar runner.

---

## Seguridad

### Qué protege D2A

- Cerrar **esta** sesión refresh aunque el access haya muerto.
- Limpiar cookie en todos los desenlaces de logout (200 y 500 por fallo BD).
- No filtrar “esta cookie era válida / no lo era”.
- No dar a un token basura la capacidad de cerrar **otras** sesiones (validación previa + hash no matchea).
- Evitar abuso de BD: tokens arbitrarios no provocan `deleteMany` sin pasar `jwt.verify(..., { ignoreExpiration: true })` y `typ === 'refresh'`.

### Qué no protege D2A

- Un access residual de hasta ~15m.
- Un Refresh A robado si el usuario **nunca** hace logout de esa cookie (D2C).
- XSS en origen MAPS (puede disparar logout o pedir refresh con `withCredentials`).

### CSRF

Hechos, no slogans:

- `maps_refresh` es `SameSite=Lax`. Un POST cross-site **normalmente no incluye** esa cookie.
- CORS con `credentials: true` y allowlist `FRONTEND_ORIGIN` no es la defensa primaria contra CSRF (un form clásico no pasa por CORS). No documentar CORS como “anti-CSRF”.
- Un CSRF de logout que **sí** lograra mandar la cookie solo **cierra** esa sesión; no toma el access ni el refresh.
- D2A **no** introduce CSRF token.

Quitar `authenticate` no abre un takeover. El access nunca viajó en cookie.

### Body fallback

Sin cambio. En production el default sigue siendo cookie only. Tests/dev pueden mandar `{ refreshToken }` como hoy. No loguear el token.

### Validación criptográfica antes de BD

Justificación aprobada:

- Impide que cualquier string en cookie/body provoque `deleteMany` contra PostgreSQL.
- `ignoreExpiration: true` permite borrar filas cuyo JWT ya expiró (el hash no depende de `exp`).
- Un valor manipulado o firma inválida no llega a BD.
- Quien envía un refresh legítimo (cookie o body permitido) ya tiene esa credencial.
- Exigir expiración vigente **impide** la revocación de sesiones expiradas en JWT pero aún persistidas — por eso `ignoreExpiration`.

---

## Matriz de escenarios

| Caso | Token presente | Server | Cookie respuesta | Otras sesiones | Access viejo | `tokenVersion` |
|------|----------------|--------|------------------|----------------|--------------|----------------|
| A — refresh válido, con o sin Bearer | Cookie o body | `deleteMany` 1 fila; 200 | Clear | Intactas | Válido hasta TTL | Igual |
| B — access expirado / inválido / ausente + refresh válido | Cookie | Igual que A | Clear | Intactas | N/A o residual | Igual |
| C — refresh ya revocado, cookie presente | Cookie (JWT puede seguir verificando) | 0 filas; 200 | Clear | Intactas | Residual si existía | Igual |
| D — refresh JWT expirado, hash aún en BD | Cookie/body | Borra esa fila; 200 | Clear | Intactas | Residual | Igual |
| D′ — JWT expirado, fila ya no está | Cookie | 0 filas; 200 | Clear | Intactas | — | Igual |
| E — sin cookie ni body usable | No | **No** borra una fila desconocida; 200 | Clear (no-op útil) | Intactas | Residual si existía | Igual |
| F — cookie/token corrupto | Valor basura | Sin BD; 0 filas; 200 | Clear | Intactas | Residual | Igual |
| G — logout ×2 | 1º cookie; 2º ausente o ya limpia | 200 y 200 | Clear ambas | Intactas | Residual | Igual |
| H — 2 devices, cierra uno | Cookie de ese browser | Borra solo ese hash | Clear en ese browser | La otra refresh sigue 200 | Access de H sigue ~15m | Igual |

**Limitación del Caso E (documentar en módulo Auth al implementar, sin eufemismos):**

Si no hay refresh en cookie ni body permitido, el servidor **no puede identificar** qué `SesionToken` borrar. Responde 200 e intenta `clearCookie`. **No garantiza** que exista o se haya eliminado una fila. **No** se “resuelve” con `deleteMany` por usuario: eso cerraría otros dispositivos y contradice la semántica aprobada.

---

## Estrategia de tests

### Backend — extender `backend/tests/auth.integration.test.ts`

Runner existente (Vitest + Supertest + Postgres). No crear archivo nuevo salvo que la suite se vuelva ilegible; el default es el archivo actual.

Estilo: `request.agent`, seed `admin` / usuarios temporales con `try/finally` como D1A, `REFRESH_COOKIE_NAME`, `prisma.sesionToken` / `tokenVersion` para aserciones.

**Actualizar**

| Test actual | Cambio |
|-------------|--------|
| `POST /logout — sin Authorization → 401` | Esperar **200**, `Sesión cerrada`, `Set-Cookie` de clear, y refresh posterior **401** (la cookie del agent se usó y se revocó) |
| `POST /logout — revoca sesión y limpia cookie` | Puede quedarse (Bearer extra es irrelevante). Añadir variante **sin** `Authorization` como caso canónico |

**Cobertura nueva (mínima)**

| Caso | Esperado |
|------|----------|
| Logout con refresh válido (cookie) y **sin** `Authorization` | `200` + envelope; refresh 401 |
| Access expirado (Bearer firmado con `exp` pasado) + cookie válida | `200`; fila de ese hash ausente |
| Refresh válido se elimina | `prisma.sesionToken.findUnique({ tokenHash })` → `null` |
| Dos logins del mismo usuario; logout de uno | Refresh del agent 1 → 401; refresh del agent 2 → 200 |
| Logout repetido (mismo agent, dos POST) | ambos `200` |
| Refresh ya revocado (cookie todavía enviada o body del JWT viejo) | `200` |
| Refresh expirado con hash persistido | Firmar JWT refresh con `expiresIn` pasado / `0s`, insertar `SesionToken` con su hash, POST logout (cookie o body) → `200` y fila eliminada. **No** exigir que `jwt.verify` pase |
| Refresh corrupto (`not.a.jwt` en cookie o body permitido) | `200`; no borrar filas de otras sesiones |
| Sin cookie ni body | `200` + clearCookie; no borrar filas de un usuario que no se puede identificar (usar un user temporal con sesión y un `request` **sin** agent/cookie) |
| `Set-Cookie` de clear en **todos** los 200 de logout | `maps_refresh` vacío / expirado; flags alineadas a `getRefreshCookieClearOptions` (HttpOnly, Path=/, SameSite) |
| Body fallback dev/test | Extraer JWT de Set-Cookie de login, `POST /logout` **sin** cookie + `{ refreshToken }` → `200` y hash ausente (igual que refresh body actual) |
| Cookie A + body B (cookie gana) | Revoca solo A; B permanece |
| Cookie A + body inválido (`refreshToken: 123`) | Body ignorado; revoca A; `200` |
| `allowRefreshBody=false`, sin cookie, body inválido | Body ignorado; `200` idempotente; sesiones intactas |
| Refresh corrupto | `200`; `deleteMany` **no** invocado |
| Refresh expirado legítimo | `jwt.verify` normal falla; `ignoreExpiration` pasa; hash eliminado |
| Fallo real de BD en `deleteMany` | `500` + `Set-Cookie` de clear (`maps_refresh=;` + expiración) |
| Access emitido **antes** del logout | `GET` protegido (`/api/v1/producers` o `/producers/me` según rol) con ese Bearer → **200** |
| `tokenVersion` antes/después del logout | Igual |
| Bearer de **otro** usuario + cookie de A (si se envía Bearer de más) | Sigue 200; solo se toca el hash de la cookie. No 403 |

No afirmar en tests que el Caso E “revocó la sesión del usuario”: el request sin cookie no debe haber borrado la fila del temporal.

`PATCH /me/password` y suites D1B/productores **no se reescriben** salvo que un expect de logout 401 quede embebido (hoy no).

### Frontend

No hay runner. D2A **no** agrega `vitest` FE. QA de interceptor = checklist manual (Network: un solo `POST /auth/logout`, sin `/auth/refresh` encadenado).

---

## Archivos previstos (implementación, no esta etapa)

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| Ruta | `backend/src/api/v1/routes/auth.routes.ts` | Quitar `authenticate` de `/logout` |
| Controller | `backend/src/controllers/auth.controller.ts` | Logout idempotente; always clearCookie |
| Service | `backend/src/services/auth.service.ts` | `logout`: verify + hash + `deleteMany`; sin `userSub` |
| Schema | `backend/src/validations/auth.schema.ts` | Solo si hace falta tratar `''` como ausente |
| Tests | `backend/tests/auth.integration.test.ts` | Actualizar 401; matriz D2A |
| Interceptor | `frontend/src/lib/axios.ts` | `isAuthEndpoint` incluye `/auth/logout` |
| Hook | `frontend/src/modules/auth/hooks/useLogout.ts` | Sin cambio de semántica (revisar comentarios) |
| Módulo vivo | `docs/modules/auth.md` | Contrato logout + access residual + Caso E + CSRF |
| Arquitectura / changelog | `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md` | Al cierre |
| Worklog | `docs/worklog/D2A-logout-robusto.md` | Al cierre |

**No previstos:** `authenticate.ts`, `authCookies.ts` (solo se **llama** clear), `env.ts`, `package.json`, Prisma, geocode.\*, `passwordChangeLimiter.ts`, admins/producers services.

---

## Decisiones técnicas tomadas

- Identificador D2A; rama `fix/d2-auth-session-hardening`.
- Logout cierra **solo** la sesión refresh actual.
- Sin `authenticate`. El refresh es la credencial.
- `jwt.verify(REFRESH_SECRET, { ignoreExpiration: true })` + `typ === 'refresh'` **antes** de BD; sin consulta si inválido.
- Siempre `200` + envelope fijo en camino feliz, salvo 400 de schema (solo cuando body participa) o 500 real de BD.
- `clearCookie` en `200` y en `500` por fallo BD (terminar sesión local del navegador).
- Sin `tokenVersion++`. Sin logout global.
- Access residual ~15m **aceptado** y documentado.
- Body fallback: política actual, sin ampliar.
- Interceptor: extender `isAuthEndpoint`.
- `useLogout`: best-effort remoto + logout local incondicional.
- Sin CSRF token.
- Sin migración, sin deps, sin TDD de tests FE.
- D2C se registra como **deuda**, no como vulnerabilidad que D2A cierre.
- Un PR de implementación en esta rama (código + docs vivos + worklog), después de este TDD.

---

## Alternativas consideradas

### A — Mantener `authenticate` y “arreglar” el Caso B solo en el FE

- **Qué era:** el interceptor refresca y reintenta logout.
- **Por qué se descartó:** la API cruda sigue rota; si el refresh falla, la fila queda; acopla logout a mint de access.

### B — `jwt.verify` con expiración estricta y luego hash

- **Qué era:** exigir firma/exp vigentes para borrar.
- **Por qué se descartó:** un refresh expirado no puede limpiarse; contradice el objetivo.

### B′ — Solo SHA-256 sin validación previa (revisión pre-QA)

- **Qué era:** hashear cualquier string y `deleteMany` sin verificar firma.
- **Por qué se descartó:** abuso de BD — cualquier `maps_refresh` arbitrario provoca consulta PostgreSQL.
- **Reemplazo:** `jwt.verify` con `ignoreExpiration: true` + `typ === 'refresh'` antes de tocar BD.

### C — Incrementar `tokenVersion` en logout

- **Pros:** access muere ya.
- **Contras:** cierra **todos** los devices. Rompe H.
- **Descartado.**

### D — Denylist / `jti` de access / lookup de sesión en `authenticate`

- **Descartado:** desproporcionado para 15m.

### E — Sin cookie → `deleteMany` por usuario

- **Descartado:** logout global encubierto. El servidor no sabe de quién es el request.

### F — CSRF token en D2A

- **Descartado:** Lax + POST; efecto de un CSRF exitoso = cerrar sesión, no hijack.

---

## Plan de implementación (siguiente etapa, no ahora)

Todo D2A de código vive en `fix/d2-auth-session-hardening` y cierra en **un PR** distinto de esta etapa de TDD si el equipo mergea el TDD solo; si no, TDD + código en el mismo PR. Orden de trabajo:

### Fase 1 — Backend
- [ ] Quitar `authenticate` de la ruta logout
- [ ] Reescribir `authService.logout` (hash + `deleteMany`, sin verify)
- [ ] Controller: always clear + 200
- [ ] Actualizar y ampliar `auth.integration.test.ts`
- [ ] `npm test` en backend

### Fase 2 — Frontend
- [ ] `isAuthEndpoint` + `/auth/logout`
- [ ] Revisar comentario de `useLogout`
- [ ] Typecheck/lint frontend

### Fase 3 — Docs vivos y worklog
- [ ] `docs/modules/auth.md` — logout, residual 15m, Caso E, CSRF, deuda D2C
- [ ] `docs/ARCHITECTURE.md` / `CHANGELOG.md`
- [ ] Worklog `docs/worklog/D2A-logout-robusto.md`
- [ ] Este TDD → **Implementado**

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Tests/clientes que esperan 401 sin Bearer | Alta (esta repo) | Bajo | Actualizar el test; no hay consumidores externos documentados |
| Zod `refreshToken: ""` + cookie válida → 400 | Baja | Bajo | Normalizar `''` a ausente; cookie gana en `resolveRefreshToken` |
| Alguien interpreta 200 sin cookie como “sesión server muerta” | Media | Medio | Texto explícito del Caso E en Auth vivo |
| Conflicto de merge con rate-limit de geocode | Media | Bajo | No tocar `env.ts` / `package.json` / geocode; `CHANGELOG` con cuidado |
| Access residual mal entendido como bug | Media | Bajo | Documentar 15m; QA no debe exigir 401 inmediato del access |

---

## Plan de rollout / QA

- Feature flag: no.
- Migraciones: no.
- Variables de entorno nuevas: no.
- Deploy: backend y frontend juntos. Un backend D2A con FE viejo es compatible (`useLogout` ya ignora errores). Un FE D2A con backend viejo: logout sin Bearer sigue 401; el store se limpia igual (peor en server, igual que hoy).
- Rollback: revertir el PR.
- Comunicación: ninguna visible salvo que Salir deje de “fallar” en red.

### Checklist QA manual

1. Login → Salir con access fresco → 200, cookie limpia, refresh 401, **otro device** (segundo login previo) sigue dentro.
2. Esperar a que el access expire (o firmar uno corto en test) → Salir → 200, sin `/auth/refresh` previo en Network.
3. Salir dos veces seguidas → ambos 200; UI en `/login`.
4. DevTools: borrar `maps_refresh` → Salir → 200 local; **no** afirmar que la fila server de otro browser cayó.
5. Tras logout, llamar una API con el access viejo (si se copió): puede ser 200 hasta ~15m. No reportar como bug de D2A.
6. D1A / reset / desactivar siguen cerrando **todas** las sesiones del objetivo.
7. Geocode y su limiter no se ejercitan como parte de D2A (regresión ajena).

---

## Criterios de aceptación

- `POST /api/v1/auth/logout` no usa `authenticate`.
- Sin `Authorization` + cookie válida → `200`, hash ausente, cookie cleared.
- Access expirado/ausente no impide el 200 ni el delete.
- Otras `SesionToken` del mismo `usuarioId` permanecen.
- Logout repetido, ya revocado, JWT expirado (con hash persistido), corrupto, sin cookie/body → `200` + envelope fijo.
- `tokenVersion` invariante.
- Access pre-logout sigue válido en `authenticate` hasta su `exp`.
- Body fallback dev/test intacto; production sigue cookie-only por defecto.
- Flags de cookie de clear idénticas a `getRefreshCookieClearOptions`.
- `isAuthEndpoint` incluye logout; un 401 de logout no dispara refresh (defensa; el happy path es 200).
- `useLogout` limpia store y navega aunque falle la red.
- `npm test` backend verde.
- Sin migración, sin deps, sin geocode, sin D2C.
- Módulo Auth documenta residual 15m, Caso E y CSRF con la precisión de este TDD.

---

## Deuda D2C (no corregida)

D2A **no** introduce rotation ni reuse detection. El modelo sigue siendo:

- Un refresh JWT reutilizable hasta `REFRESH_EXPIRES_IN` (default 30d).
- Mismo A puede mintear access ilimitados.
- Robo de A no se detecta si el usuario no hace logout de **esa** cookie ni un evento de revocación global (password / reset / deactivate / cambio de usuario ADMIN).

Registrar en `docs/modules/auth.md` y `CHANGELOG` (al implementar) como **deuda de hardening de sesión**, no como “vulnerabilidad cerrada por D2A”.

Candidatos posteriores (fuera de esta entrega): TTL más corto, TTL por rol, rotation, rotation + reuse detection + lock multi-tab. Ninguno se diseña aquí.

---

## Dudas reales

Ninguna bloquea implementar D2A. Cerradas por este TDD:

- ¿200 vs 204? → **200** + envelope actual (el FE y los tests ya lo usan).
- ¿Bearer de más? → se ignora; no 403.
- ¿`refreshToken: ""`? → tratarlo como ausente si estorba; no 401.

Pendientes de **producto**, no de D2A:

- ¿Acortar `REFRESH_EXPIRES_IN` o TTL privilegiado (opción 5 del audit)? Fuera de alcance; decidir en D2C / hardening posterior.
- ¿Listar sesiones / “cerrar otros dispositivos”? No existe UI. No se inventa aquí.

---

## Conflictos con trabajo paralelo (D2B geocode)

| Archivo | Este TDD lo toca | Riesgo |
|---------|------------------|--------|
| `auth.routes.ts` / controller / service / schema Auth | Sí | Sin riesgo (geocode no debería editarlos) |
| `axios.ts` / `useLogout.ts` | Sí | Sin riesgo |
| `auth.integration.test.ts` | Sí | Sin riesgo |
| `geocode.*` / limiter geocode | No | No tocar |
| `env.ts` | No previsto | Posible conflicto si el otro PR suma keys |
| `package.json` / lock | No | Posible conflicto |
| `docs/CHANGELOG.md` | Al implementar | Conflicto probable |
| `docs/ARCHITECTURE.md` / `docs/modules/auth.md` | Al implementar | Posible conflicto |
| `app.ts` | No | Posible si el otro PR toca CORS/helmet |

---

## Referencias

- **Figma:** N/A
- **Tickets / bloque:** D2A (`fix/d2-auth-session-hardening`)
- **Audit previo:** conversación D2A/D2C (solo lectura) sobre `development` @ `1ae2db5`
- **TDD de estilo:** `docs/tdd/D1B-tdd-gestion-administradores.md`, plantilla `docs/tdd/_TEMPLATE-tdd.md`
- **Worklog previo:** `docs/worklog/D1A-cambio-self-password.md`
- **Módulo vivo:** `docs/modules/auth.md` (actualizar al implementar)
- **Código de referencia:** `auth.routes.ts`, `auth.controller.ts` (`resolveRefreshToken`, `logout`), `auth.service.ts` (`hashToken`, `logout`, `refresh`), `authCookies.ts`, `authenticate.ts`, `frontend/src/lib/axios.ts`, `useLogout.ts`, `backend/tests/auth.integration.test.ts`
- **Work-log de implementación:** `docs/worklog/D2A-logout-robusto.md` (cuando exista)
