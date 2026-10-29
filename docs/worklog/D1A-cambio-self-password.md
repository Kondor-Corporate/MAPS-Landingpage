# D1A — Cambio self-service de contraseña en Auth

Documentación de la feature D1A dentro del proyecto MAPS Asesores.
Complementa el [índice de docs](../README.md) y el
[README raíz](../../README.md).

**Identificador:** D1A (no es un ticket `MAPS-XXX`; la rama es `feat/d1a-admin-self-password`). No reutiliza IDs históricos 015–018.

**Estado:** HECHO — mergeado en `development`. QA manual correcto en PRODUCTOR, ADMIN y SUPERADMIN.

---

## Objetivo

El self-service de contraseña nació en MAPS-016 acotado al productor (`PATCH /producers/me/password`, lógica en el dominio Productor). ADMIN y SUPERADMIN no podían cambiar su propia contraseña desde Mi perfil.

D1A mueve ese flujo a Auth: cualquier `Usuario` autenticado cambia su contraseña con las mismas reglas de seguridad. No agrega CRUD de administradores (D1B), logout de producto (D2) ni runner de tests frontend (D5).

---

## Problema original

- Solo el productor tenía self-service, y vivía en `producersService` / `producersController`.
- Admin y Superadmin veían `/admin/mi-perfil` sin poder actualizar su contraseña.
- Reusar `/producers/me/password` para admins mezclaba dominios y roles.
- Hacía falta revocar sesiones de forma consistente (`tokenVersion` + `SesionToken` + cookie refresh) y un limiter compartido, no por IP.

---

## Decisión

Mover el cambio self-service al módulo Auth.

- Endpoint canónico: `PATCH /api/v1/auth/me/password`.
- Cadena: `authenticate` → `passwordChangeLimiter` → `validate(changeMyPasswordSchema)` → `authController.changeMyPassword`.
- Schema genérico en `backend/src/validations/auth.schema.ts`.
- Lógica única en `authService.changeMyPassword`.
- Formulario y cliente HTTP en `frontend/src/modules/auth/`.

`PATCH /api/v1/producers/me/password` queda **solo como alias temporal compatible para `PRODUCTOR`**. ADMIN/SUPERADMIN reciben 403 en el alias y deben usar el canónico. Canónico y alias importan **la misma instancia** `passwordChangeLimiter` (mismo cupo/store). La key del limiter es `req.user.sub`, no la IP.

El reset admin `PATCH /producers/:id/password` no se tocó: sigue siendo recuperación de un productor, no self-service.

---

## Cambios implementados

### 1. Backend Auth — endpoint canónico y transacción

**Archivos:**

- `backend/src/api/v1/routes/auth.routes.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/validations/auth.schema.ts`
- `backend/src/middlewares/passwordChangeLimiter.ts`

`authService.changeMyPassword`:

1. Verifica la contraseña actual (`bcrypt.compare`). Si falla: `400 Contraseña actual incorrecta` (no 401).
2. Recién después rechaza `newPassword === currentPassword`.
3. Hashea con bcrypt coste 12.
4. En **una** transacción: `passwordHash`, `tokenVersion++`, `sesionToken.deleteMany`.

El controller limpia la cookie `maps_refresh` **solo** si el service no lanza.

---

### 2. Alias temporal en Productores

**Archivos:**

- `backend/src/api/v1/routes/producers.routes.ts`

Misma cadena de limiter + schema + `authController.changeMyPassword`, precedida por `authenticate` + `authorize(PRODUCTOR)`. Se eliminó `changeMyPassword` de `producersService` y `producersController`. El schema ya no vive en `producerProfile.schema.ts`.

---

### 3. Frontend compartido

**Archivos:**

- `frontend/src/modules/auth/components/ChangePasswordForm.tsx` (movido desde intranet)
- `frontend/src/modules/auth/services/auth.service.ts` → `PATCH /auth/me/password`
- `frontend/src/modules/auth/types.ts`
- `frontend/src/modules/intranet/pages/ProducerProfileViewPage.tsx`
- `frontend/src/modules/admin/pages/AdminProfilePage.tsx`

Tras éxito: el modal muestra “Contraseña actualizada” y “Redirigiendo al inicio de sesión…” (~1400 ms, sin poder cerrar ni reenviar). Recién entonces `onSaved()` hace `useAuthStore.logout()` (solo store) + `navigate('/login')`. Ningún flujo nuevo llama `POST /auth/logout` ni `useLogout` (ese hook sigue en el sidebar para logout explícito).

El `onClose` que recibe `Modal` es un callback estable (`useCallback` + refs): escribir en los campos no recrea la referencia ni dispara el efecto de foco del modal (el botón cerrar dejaba de robar el foco a cada letra).

---

### 4. Tests backend

**Archivos:**

- `backend/tests/auth.integration.test.ts` — PRODUCTOR, ADMIN y SUPERADMIN temporales (`try/finally` + cleanup de sesión, productor y usuario).
- `backend/tests/producers.integration.test.ts` — alias: 200 para productor; 403 para ADMIN y SUPERADMIN.

---

## Estado del sistema tras D1A

```
PATCH /api/v1/auth/me/password          → canónico, cualquier Usuario autenticado
PATCH /api/v1/producers/me/password     → alias temporal, solo PRODUCTOR
PATCH /api/v1/producers/:id/password    → reset admin (sin cambios, fuera de D1A)
```

| Caso | Comportamiento |
|------|----------------|
| Sin token | 401 |
| Contraseña actual incorrecta | 400 (sesión sigue vigente) |
| Nueva igual a actual | 400 |
| Política / confirmación | 422 |
| Éxito | 200; cookie refresh limpiada; `tokenVersion++`; `SesionToken` vacíos; el modal muestra confirmación ~1400 ms y recién entonces se limpia el store y se va a `/login` |

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| Canónico con authenticate → limiter → validate → controller | Código + tests de integración |
| PRODUCTOR, ADMIN y SUPERADMIN en `/auth/me/password` | `auth.integration.test.ts` |
| Alias solo PRODUCTOR; ADMIN/SUPERADMIN 403 | `producers.integration.test.ts` |
| Limiter compartido, key = `req.user.sub` | Misma instancia exportada; `passwordChangeLimiter.ts` |
| Sin lógica duplicada en producers service/controller | Grep |
| Cookie refresh solo tras éxito | Controller |
| Frontend canónico `/auth/me/password`, form compartido, cleanup local | Páginas de perfil |
| Sin refs a `modules/intranet/components/ChangePasswordForm` | Grep |

---

## Pruebas manuales recomendadas

```
1. Login como productor seed → /intranet/mi-perfil → Cambiar contraseña
   → se puede escribir sin perder foco; éxito muestra “Contraseña actualizada” y recién después vuelve a /login; la anterior falla; la nueva entra

2. Login como ADMIN → /admin/mi-perfil → Cambiar contraseña
   → mismo formulario y mismo resultado (re-login)

3. Login como SUPERADMIN → mismo flujo en /admin/mi-perfil

4. ADMIN autenticado llama PATCH /api/v1/producers/me/password
   → 403; debe usar /auth/me/password
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| D1B — CRUD de administradores | Altas, edición, reset de password de **otro** admin. No mezclar con self-service. |
| D2 — logout de producto | El cambio de password no usa `POST /auth/logout`; el logout explícito del sidebar no se tocó. |
| D5 — runner de tests frontend | El test de `ChangePasswordForm` existe pero Vitest FE no está cableado; no se instaló en D1A. |
| Invitación / forgot-password público | Sigue fuera de alcance (ya lo era en MAPS-016). |
| Quitar el alias `/producers/me/password` | Compatibilidad temporal; retirar cuando no haya clientes del path viejo. |

---

*Documento generado en la feature D1A — cambio self-service de contraseña.*
