# Administradores

Documentacion viva del modulo Administradores.

---

## Estado actual

| Area | Estado |
|------|--------|
| Ruta frontend `/admin/admins` | Existente |
| Acceso UI | Restringido a `SUPERADMIN` en router |
| API backend `/api/v1/admins` | Pendiente |
| CRUD administradores | Pendiente — no implementado (D1B, fuera de D1A) |
| Perfil admin `/admin/mi-perfil` | Implementado como pantalla informativa de la sesión + cambio de contraseña propia |
| Cambio de contraseña propia (ADMIN / SUPERADMIN) | Implementado (D1A) vía Auth: formulario compartido y `PATCH /api/v1/auth/me/password` |

---

## Backend

Ruta montada:

```text
/api/v1/admins
```

Estado:

- `adminsRouter` existe.
- No hay endpoints funcionales implementados en la ruta actual.
- El modelo base para administradores usa `Usuario` con rol `ADMIN` o `SUPERADMIN`.

Pendiente esperado:

- Definir contrato REST.
- Definir permisos `ADMIN` vs `SUPERADMIN`.
- Definir si un admin puede crear otros admins o solo superadmin.
- Definir cambio de estado activo/inactivo.
- CRUD y gestión de administradores (altas, edición, reset de password de **otro** admin). El cambio de **contraseña propia** ya está cubierto por Auth (D1A) y no forma parte de este CRUD.
- Agregar validaciones Zod del módulo admins.
- Agregar tests de integracion del módulo admins.

---

## Frontend

Rutas relacionadas:

```text
/admin/admins
/admin/mi-perfil
```

Archivos principales:

- `frontend/src/modules/admin/pages/AdminsPage.tsx`
- `frontend/src/modules/admin/pages/AdminProfilePage.tsx` (Mi perfil: datos de sesión + sección Seguridad)
- `frontend/src/modules/auth/components/ChangePasswordForm.tsx`
- `frontend/src/modules/auth/services/auth.service.ts`
- `frontend/src/router/index.tsx`

Regla actual del router:

- `/admin/admins` requiere `SUPERADMIN`.
- Las rutas generales de `/admin/*` requieren `ADMIN` o `SUPERADMIN`.

---

## Decisiones pendientes

Antes de implementar el modulo completo, definir:

- Si `ADMIN` puede gestionar administradores o solo `SUPERADMIN`.
- Campos editables de un administrador (CRUD; no confundir con el cambio de contraseña propia ya disponible).
- Flujo de creacion de **otros** administradores: password inicial, invitacion o reset (D1B).
- Auditoria: quien creo/modifico a quien.
- Si se requiere historial de actividad o last login visible.
- Si `/admin/mi-perfil` debe editar más datos de cuenta además de la contraseña propia. Hoy muestra usuario/rol y permite el cambio self-service.

---

## Verificacion actual

1. Login como `SUPERADMIN`.
2. Abrir `/admin/admins`.
3. Confirmar acceso a la pantalla.
4. Login como `ADMIN`.
5. Intentar `/admin/admins` y confirmar denegacion/redireccion.
6. Desde `/admin/mi-perfil` (ADMIN o SUPERADMIN), cambiar la contraseña propia. Debe pedir la actual, volver a `/login` y exigir la contraseña nueva.

---

## Pendientes conocidos

- API CRUD para administradores (D1B; no implementado).
- Integracion frontend con API de gestión de admins.
- Tests de permisos del CRUD de admins.
- Definir flujo operacional de altas y reset de password de **otro** administrador.
- Documentar contrato una vez definido.
