# Administradores

Documentación viva del módulo Administradores.

Complementa el [TDD D1B](../tdd/D1B-tdd-gestion-administradores.md) y el
[worklog D1B](../worklog/D1B-gestion-administradores.md). El cambio de contraseña
**propia** vive en Auth ([D1A](../worklog/D1A-cambio-self-password.md)).

---

## Estado actual

| Área | Estado |
|------|--------|
| Ruta frontend `/admin/admins` | Implementada — pantalla operativa (D1B) |
| Acceso UI | Exclusivo `SUPERADMIN` (`RoleGuard` + ítem de sidebar) |
| API backend `/api/v1/admins` | Implementada — cinco endpoints, solo `SUPERADMIN` |
| Colección administrable | Solo `Usuario` con `rol = ADMIN`. Sin tabla `Admin` |
| SUPERADMIN | Fuera del CRUD. Card informativa “Cuenta principal” (auth store) |
| Perfil `/admin/mi-perfil` | Informativo de sesión + cambio de contraseña propia (D1A) |
| Delete físico / edición de rol | No existen |
| Break-glass SUPERADMIN (GCP) | Fuera de D1B; no implementado en esta app |

---

## Modelo y reglas de negocio

El recurso es `Usuario`. No hay entidad `Admin` ni migración Prisma.

- La aplicación **no** crea, promueve, degrada, desactiva, resetea ni elimina cuentas `SUPERADMIN`.
- Normalmente hay **un** SUPERADMIN funcional (seed local / bootstrap GCP). **No** hay constraint física de cantidad en la base.
- D1B opera exclusivamente `rol = ADMIN`: alta, edición de `usuario`, activar/desactivar, reset administrativo de password.
- Un `ADMIN` no tiene fila `Productor`.
- No hay delete físico. No hay cambio de rol desde la UI ni la API.
- D1A (`PATCH /api/v1/auth/me/password`) sigue siendo el cambio de **contraseña propia** (pide la actual). El reset D1B es de **otro** ADMIN y no pide la actual.
- Provisionamiento del SUPERADMIN: seed / job bootstrap GCP. El procedimiento break-glass queda **fuera de D1B**.

---

## Backend

Base: `/api/v1/admins`.

Cadena: `authenticate` → `authorize(Rol.SUPERADMIN)` → `validate` → controller → `adminsService` → Prisma.

Anónimo → `401`. `PRODUCTOR` y `ADMIN` → `403`.

| Método | Ruta | Body / query | Respuesta |
|--------|------|----------------|-----------|
| `GET` | `/admins` | Query opcional `activo=true\|false` | `200 { data: AdminDto[], message: 'OK' }` |
| `POST` | `/admins` | `{ usuario, password, confirmPassword }` (strict) | `201 { data, message: 'Administrador creado' }` |
| `PATCH` | `/admins/:id` | `{ usuario }` | `200 { data, message: 'Administrador actualizado' }` |
| `PATCH` | `/admins/:id/activo` | `{ activo }` | `200` desactivado / reactivado |
| `PATCH` | `/admins/:id/password` | `{ newPassword, confirmPassword }` | `200 { data: null, message: 'Contraseña restablecida' }` |

No hay `GET /admins/:id` ni `DELETE`.

`:id` = `Usuario.id` (`Int`). No UUID.

### AdminDto

```ts
{
  id: number;
  usuario: string;
  activo: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
```

No viajan: `rol`, `updatedAt`, `creadoPor`, `passwordHash`, `tokenVersion`, sesiones, `Productor`.

Alta: persiste `rol = ADMIN`, `activo = true`, `creadoPorId` = SUPERADMIN caller (en DB, no en el DTO).

`usuario`: trim, sin espacios internos, minúsculas, 3–191, no se exige email. Unicidad global (cualquier rol) → `409 El usuario ya está registrado` (chequeo Prisma insensitive + `P2002`).

`:id` no entero → `422`. Inexistente o `rol ≠ ADMIN` → `404 Administrador no encontrado`.

### Sesiones

Cambio **real** de `usuario`, desactivar (`true → false`) y reset: transacción `tokenVersion++` + `sesionToken.deleteMany` del objetivo. No se limpia la cookie del SUPERADMIN caller.

Mismo `usuario` normalizado o mismo `activo` pedido: `200` **no-op** (sin writes de sesión).

Reactivar: solo `activo = true`. No restaura tokens viejos.

Reset: no usa `passwordChangeLimiter`. bcrypt coste **12**. Política compartida (`passwordSchema`).

El frontend de D1B llama `GET /admins` **sin** query; el filtro `?activo=` existe para tests y usos recortados.

Archivos: `backend/src/api/v1/routes/admins.routes.ts`, `controllers/admins.controller.ts`, `services/admins.service.ts`, `validations/admin.schema.ts`. Tests: `backend/tests/admins.integration.test.ts`.

---

## Frontend

Ruta: `/admin/admins` (una sola pantalla; no hay `/admin/admins/inactivos`).

Router y sidebar ya restringían a `SUPERADMIN`; D1B no cambió permisos.

### Cuenta principal

Card informativa **arriba** del listado, datos del auth store (`usuario`, `rol`). Texto: Cuenta principal / usuario de sesión / Superadministrador / Activo. Sin editar, reset, desactivar ni menú. No consulta `GET /admins`. Otros SUPERADMIN (si existieran) no aparecen.

### Listado

`AdminsDashboard`: búsqueda y filtro Todos/Activos/Inactivos **client-side**; paginación `TablePagination` 8/16/32; tabla desktop + cards mobile.

Columnas: Usuario, Estado, Último acceso (`relativeTimeFromNow` o **Nunca**), Creado, Acciones.

Menú: Editar usuario, Restablecer contraseña, Desactivar/Reactivar. Sin ver perfil, eliminar ni cambiar rol.

Componentes propios `Admin*` (no se reutilizan `ProducerTable` / `ProducerFormModal` / etc.). Primitivas shared: `Modal`, `PasswordField`, `TablePagination`, `getApiErrorMessage`, `passwordPolicyError`, `MapsFeedbackToast`.

Hook `useAdminAdmins`: create/update/setActivo refetchean el listado; reset no. IDs `number`.

Feedback de éxito: toast flotante (textos fijos: Administrador creado / Usuario actualizado / Administrador desactivado / Administrador reactivado / Contraseña restablecida) y highlight breve de fila/card si sigue visible.

Archivos principales:

- `frontend/src/modules/admin/pages/AdminsPage.tsx`
- `frontend/src/modules/admin/components/AdminsDashboard.tsx`
- `frontend/src/modules/admin/hooks/useAdminAdmins.ts`
- `frontend/src/modules/admin/services/admins.service.ts`
- `frontend/src/modules/admin/types/admin.ts`

---

## Verificación

1. Login `SUPERADMIN` → `/admin/admins`: card propia + listado de ADMIN.
2. Login `ADMIN` o `PRODUCTOR` → no ven el ítem; `/admin/admins` → unauthorized.
3. Alta, edición de usuario, activar/desactivar y reset contra el contrato de arriba.
4. `/admin/mi-perfil` sigue cambiando solo la contraseña propia (D1A).

---

## Pendientes fuera de D1B

- Break-glass SUPERADMIN en GCP (no está en esta app).
- Login case-sensitive vs `usuario` persistido en minúsculas (Auth).
- Helper compartido `revokeUsuarioSessions` (Auth / Productores / Admins).
- Runner de tests frontend (D5).
- Forgot-password, MFA, auditoría rica, constraint DB de un solo SUPERADMIN.
