# Administradores

Documentacion viva del modulo Administradores.

---

## Estado actual

| Area | Estado |
|------|--------|
| Ruta frontend `/admin/admins` | Existente |
| Acceso UI | Restringido a `SUPERADMIN` en router |
| API backend `/api/v1/admins` | Pendiente |
| CRUD administradores | Pendiente o no consolidado |
| Perfil admin `/admin/mi-perfil` | UI/ruta existente, alcance a revisar |

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
- Definir actualizacion de password/perfil.
- Agregar validaciones Zod.
- Agregar tests de integracion.

---

## Frontend

Rutas relacionadas:

```text
/admin/admins
/admin/mi-perfil
```

Archivos principales:

- `frontend/src/modules/admin/pages/AdminsPage.tsx`
- `frontend/src/modules/admin/pages/AdminProfilePage.tsx`
- `frontend/src/router/index.tsx`

Regla actual del router:

- `/admin/admins` requiere `SUPERADMIN`.
- Las rutas generales de `/admin/*` requieren `ADMIN` o `SUPERADMIN`.

---

## Decisiones pendientes

Antes de implementar el modulo completo, definir:

- Si `ADMIN` puede gestionar administradores o solo `SUPERADMIN`.
- Campos editables de un administrador.
- Flujo de creacion: password inicial, invitacion o reset.
- Auditoria: quien creo/modifico a quien.
- Si se requiere historial de actividad o last login visible.
- Si `/admin/mi-perfil` edita datos reales o queda como pantalla informativa.

---

## Verificacion actual

1. Login como `SUPERADMIN`.
2. Abrir `/admin/admins`.
3. Confirmar acceso a la pantalla.
4. Login como `ADMIN`.
5. Intentar `/admin/admins` y confirmar denegacion/redireccion.

---

## Pendientes conocidos

- API CRUD para administradores.
- Integracion frontend con API.
- Tests de permisos.
- Definir flujo operacional de altas/cambios de password.
- Documentar contrato una vez definido.
