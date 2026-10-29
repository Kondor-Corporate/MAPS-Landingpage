# D1B — Gestión de Administradores

Documentación de la feature D1B dentro del proyecto MAPS Asesores.
Complementa el [índice de docs](../README.md) y el
[README raíz](../../README.md).

**Identificador:** D1B (no es un ticket `MAPS-XXX`; la rama es `feat/d1b-admin-management`). No reutiliza IDs históricos 015–018 ni MAPS-016 (ese ID en el repo es credenciales de productores).

**Estado:** Implementado en `feat/d1b-admin-management`. QA funcional y polish visual correctos. Pendiente de merge.

**TDD:** [`docs/tdd/D1B-tdd-gestion-administradores.md`](../tdd/D1B-tdd-gestion-administradores.md)

---

## Objetivo

Habilitar gestión operativa de cuentas `ADMIN` por `SUPERADMIN`.

Antes de D1B, `/admin/admins` era un placeholder y `/api/v1/admins` un stub (`501`). El self-service D1A cubre la contraseña **propia**; no alcanza para dar de alta, desactivar o resetear a **otro** administrador.

---

## Decisiones

- Recurso: `Usuario`. Sin tabla `Admin` y sin migración Prisma.
- Solo es administrable `rol = ADMIN`.
- `SUPERADMIN` queda fuera del CRUD de esta API y de esta pantalla.
- La app no crea, promueve, degrada, desactiva, resetea ni elimina SUPERADMIN.
- Normalmente hay un SUPERADMIN funcional (seed / bootstrap GCP). **No** hay constraint física de cantidad.
- Sin delete físico. Sin edición de rol.
- Break-glass SUPERADMIN en GCP: fuera de D1B; no se implementó en la aplicación.
- D1A sigue siendo el cambio de contraseña propia.

---

## Cambios implementados

### 1. Backend — `/api/v1/admins`

**Archivos:**

- `backend/src/api/v1/routes/admins.routes.ts`
- `backend/src/controllers/admins.controller.ts`
- `backend/src/services/admins.service.ts`
- `backend/src/validations/admin.schema.ts`

Cadena: `authenticate` → `authorize(Rol.SUPERADMIN)` → `validate` → controller → service. Anónimo `401`; `PRODUCTOR`/`ADMIN` `403`.

| Método | Ruta | Notas |
|--------|------|--------|
| `GET` | `/admins` | Lista solo `ADMIN`. Query opcional `activo`. Orden `id desc` |
| `POST` | `/admins` | `{ usuario, password, confirmPassword }`. Alta siempre `rol=ADMIN`, `activo=true`, `creadoPorId` del caller |
| `PATCH` | `/admins/:id` | `{ usuario }` |
| `PATCH` | `/admins/:id/activo` | `{ activo }` |
| `PATCH` | `/admins/:id/password` | `{ newPassword, confirmPassword }` |

`:id` = `Usuario.id` entero (`adminIdParamSchema`). Rutas `/activo` y `/password` **antes** de `PATCH /:id`. No hay `GET /:id` ni `DELETE`.

**Reglas de seguridad:**

- Target inexistente o `rol ≠ ADMIN` → `404 Administrador no encontrado`.
- `usuario` trim, sin espacios, minúsculas, 3–191, no-email-required. Colisión global → `409`.
- Cambio real de usuario, desactivar y reset: `tokenVersion++` + `sesionToken.deleteMany` del objetivo. No se limpia la cookie del SUPERADMIN.
- Mismo usuario normalizado o mismo `activo`: `200` sin writes de sesión.
- Reactivar no revive tokens.
- Reset sin `passwordChangeLimiter`. bcrypt 12. `passwordSchema` compartido.
- DTO mínimo: `id`, `usuario`, `activo`, `lastLoginAt`, `createdAt`. Sin `rol`, hashes ni `creadoPor`.

No se extrajo un helper genérico de revocación (radio de D1A/Productores).

---

### 2. Frontend — `/admin/admins`

**Archivos:**

- `frontend/src/modules/admin/pages/AdminsPage.tsx`
- `frontend/src/modules/admin/components/AdminsDashboard.tsx`
- `frontend/src/modules/admin/components/SuperadminAccountCard.tsx`
- `frontend/src/modules/admin/components/AdminsToolbar.tsx`
- `frontend/src/modules/admin/components/AdminTable.tsx`
- `frontend/src/modules/admin/components/AdminActionsMenu.tsx`
- `frontend/src/modules/admin/components/AdminStatusBadge.tsx`
- `frontend/src/modules/admin/components/AdminFormModal.tsx`
- `frontend/src/modules/admin/components/AdminStatusConfirmModal.tsx`
- `frontend/src/modules/admin/components/AdminResetPasswordModal.tsx`
- `frontend/src/modules/admin/hooks/useAdminAdmins.ts`
- `frontend/src/modules/admin/services/admins.service.ts`
- `frontend/src/modules/admin/types/admin.ts`

Una sola pantalla. Router/sidebar/`RoleGuard` no se tocaron (ya eran SUPERADMIN).

- **Cuenta principal:** auth store; sin acciones; no usa `GET /admins`.
- **Toolbar:** búsqueda por usuario (pill propio, no `SearchPillInput`), segmented Todos/Activos/Inactivos, alta.
- Filtros y paginación **client-side** sobre `GET /admins` sin query. `TablePagination` 8/16/32.
- Tabla desktop y cards mobile. IDs `number`.
- Modales: alta (usuario + password + confirmación), edición (solo usuario + aviso si el valor normalizado cambió), confirmar activo, reset (nueva + confirmación, sin password actual).
- Hook: refetch tras create/update/setActivo; reset no refetch. 409 de duplicado en el modal.
- Toast: `MapsFeedbackToast` (primitiva de Noticias), 3200 ms, timer cancelable, reduced-motion. Highlight breve de fila/card si sigue visible.

---

### 3. Tests backend

**Archivo:** `backend/tests/admins.integration.test.ts`

Cubre RBAC, listado solo ADMIN, unicidad exacta y casing histórico, 404 de PRODUCTOR/SUPERADMIN en mutaciones, no-ops de `tokenVersion`, revocación access+refresh.

No se agregó suite frontend (D5).

---

## Estado del sistema tras D1B

```
GET    /api/v1/admins
POST   /api/v1/admins
PATCH  /api/v1/admins/:id
PATCH  /api/v1/admins/:id/activo
PATCH  /api/v1/admins/:id/password

PATCH  /api/v1/auth/me/password     → D1A, contraseña propia (sin cambios)
```

| Caso | Comportamiento |
|------|----------------|
| UI `/admin/admins` | Solo SUPERADMIN |
| `GET /admins` | Solo filas `ADMIN`; sin `rol` en el DTO |
| Alta | ADMIN activo; sin `Productor` |
| Edición de `usuario` (valor distinto) | Persiste normalizado; revoca sesiones del objetivo |
| Desactivar | Pierde acceso; revoca sesiones |
| Reactivar | Login nuevo; tokens viejos siguen inválidos |
| Reset | Password anterior inválida; revoca sesiones |
| No-op usuario/activo | `200` sin tocar sesiones |
| SUPERADMIN | Fuera del CRUD; card informativa en la UI |

---

## Validación automatizada

### Backend

| Comando | Resultado |
|---------|-----------|
| lint | OK |
| typecheck | OK |
| build | OK |
| tests | 16 files / 214 tests passed |

### Frontend

| Comando | Resultado |
|---------|-----------|
| typecheck | OK |
| lint | OK |
| build | OK |

Único warning de build registrado: chunk de MapLibre por encima de 500 kB. Preexistente; no es un fallo D1B.

No hay runner frontend operativo; no se agregó suite huérfana.

---

## QA manual

Se validó el flujo integrado de D1B (funcional + polish visual) sobre la implementación de esta rama. No se registra ambiente de staging/producción ni fecha de sesión de QA más allá del cierre de la feature.

| Flujo | Resultado |
|-------|-----------|
| Acceso SUPERADMIN a `/admin/admins` | Correcto |
| Aislamiento ADMIN / PRODUCTOR (sin ítem, unauthorized) | Correcto |
| Listado, filtros, responsive tabla/cards | Correcto |
| Alta | Correcto |
| Edición de usuario | Correcto |
| Revocación de sesiones (cambio de usuario, desactivar, reset) | Correcto |
| Activar / desactivar | Correcto |
| Reset de contraseña | Correcto |
| D1A (contraseña propia) sin regresión | Correcto |
| Feedback visual final (toast + highlight) | Correcto |

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| Cinco endpoints con authenticate + authorize SUPERADMIN + validate | Código + `admins.integration.test.ts` |
| 401 anónimo; 403 PRODUCTOR/ADMIN | Tests de integración |
| Listado solo ADMIN; SUPERADMIN no operable | Tests + UI card aparte |
| Alta ADMIN activa, `creadoPorId` en DB, sin Productor | Tests |
| 409 unicidad exacta y casing histórico | Tests |
| 404 target no-ADMIN | Tests |
| Revocación en cambio de usuario, desactivar y reset; no-ops idempotentes | Tests |
| DTO sin secretos ni `rol` | Tests |
| Pantalla operativa, sin placeholder | Código + QA |
| Sin migración Prisma, sin dependencias nuevas, sin runner FE | Rama |

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Break-glass SUPERADMIN en GCP | Procedimiento operativo; no vive en esta app |
| Login case-sensitive / identidad global | Auth persiste minúsculas en D1B; login sigue match exacto |
| Helper compartido de revocación | `revokeUsuarioSessions` no se extrajo a propósito |
| Frontend test runner (D5) | No se instaló ni cableó en D1B |
| Forgot-password, MFA, auditoría rica | Fuera de alcance del TDD |
| Constraint DB de un solo SUPERADMIN | Negocio pidió no imponerla |
| Unificar revocación al editar email de productor | Dominio Productores; D1B no lo tocó |

---

*Documento generado en la feature D1B — gestión de administradores.*
