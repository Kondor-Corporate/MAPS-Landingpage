# Biblioteca Digital

Documentacion viva del modulo Biblioteca Digital.

Historial relacionado:

- UI inicial con mock/store local: `docs/worklog/MAPS-011-biblioteca-digital.md`.
- API e integracion real: `docs/worklog/MAPS-012-biblioteca-digital-api.md`.

---

## Estado actual

| Area | Estado |
|------|--------|
| Vista productor `/intranet/biblioteca` | Implementada |
| Vista admin `/admin/biblioteca` | Implementada |
| API `/api/v1/library/ramos` | Implementada |
| Persistencia PostgreSQL | Implementada |
| RBAC backend | Implementado |
| Tabla `Recurso` | Pendiente |
| URLs reales definitivas | Pendiente operacional |

---

## Modelo de datos

Prisma:

- `Biblioteca`
- `Ramo`
- `Recurso`
- enum `RamoTipo`

`Ramo` representa las categorias visibles en la biblioteca.

Campos principales:

| Campo | Uso |
|-------|-----|
| `nombre` | Nombre visible del ramo |
| `descripcion` | Texto descriptivo |
| `icono` | Clave de icono usada por UI |
| `gdriveUrl` | Link externo al contenido |
| `tipo` | `PRINCIPAL` o `SECUNDARIO` |
| `activo` | Control de visibilidad para productores |
| `orden` | Orden de presentacion |

Actualmente el contenido documental esta modelado como URL por ramo. La tabla `Recurso` existe en Prisma pero no es el flujo principal de UI.

---

## Backend

Rutas montadas bajo:

```text
/api/v1/library/ramos
```

| Metodo | Ruta | Roles | Descripcion |
|--------|------|-------|-------------|
| `GET` | `/library/ramos` | `PRODUCTOR`, `ADMIN`, `SUPERADMIN` | Lista ramos |
| `GET` | `/library/ramos/:id` | `ADMIN`, `SUPERADMIN` | Obtiene detalle admin |
| `POST` | `/library/ramos` | `ADMIN`, `SUPERADMIN` | Crea ramo |
| `PATCH` | `/library/ramos/:id` | `ADMIN`, `SUPERADMIN` | Actualiza ramo |
| `PATCH` | `/library/ramos/:id/activo` | `ADMIN`, `SUPERADMIN` | Activa/desactiva ramo |
| `DELETE` | `/library/ramos/:id` | `ADMIN`, `SUPERADMIN` | Elimina ramo |

Reglas:

- `PRODUCTOR` solo puede listar ramos activos.
- `ADMIN` y `SUPERADMIN` pueden listar activos/inactivos y mutar ramos.
- Nombre duplicado dentro de la biblioteca devuelve conflicto.
- `gdriveUrl` debe ser HTTPS valido.

Archivos principales:

- `backend/src/api/v1/routes/library.routes.ts`
- `backend/src/controllers/library.controller.ts`
- `backend/src/services/library.service.ts`
- `backend/src/validations/library.schema.ts`

---

## Frontend

### Intranet productor

Ruta:

```text
/intranet/biblioteca
```

Archivos principales:

- `frontend/src/modules/intranet/pages/DigitalLibraryPage.tsx`
- `frontend/src/modules/intranet/hooks/useLibraryRamos.ts`
- `frontend/src/modules/intranet/components/LibraryRamosSection.tsx`
- `frontend/src/modules/intranet/components/LibraryRamoCard.tsx`
- `frontend/src/modules/intranet/components/LibrarySecondarySection.tsx`

Comportamiento:

- Carga ramos desde API.
- Muestra principales como cards.
- Muestra secundarios como accesos/pills.
- Productor ve solo activos.

### Admin

Ruta:

```text
/admin/biblioteca
```

Archivos principales:

- `frontend/src/modules/admin/pages/LibraryManagementPage.tsx`
- `frontend/src/modules/admin/hooks/useAdminLibrary.ts`
- `frontend/src/modules/admin/services/library.service.ts`
- `frontend/src/modules/admin/components/LibraryManagementDashboard.tsx`
- `frontend/src/modules/admin/components/LibraryRamoTable.tsx`
- `frontend/src/modules/admin/components/LibraryRamoFormModal.tsx`
- `frontend/src/modules/admin/components/LibraryRamoDeleteModal.tsx`

Comportamiento:

- Lista ramos.
- Crea/edita ramos.
- Activa/desactiva.
- Elimina.
- Refresca datos desde API.

---

## Verificacion manual

Flujo productor:

1. Login como `PRODUCTOR`.
2. Abrir `/intranet/biblioteca`.
3. Confirmar que se muestran solo ramos activos.
4. Abrir un link de contenido.

Flujo admin:

1. Login como `ADMIN` o `SUPERADMIN`.
2. Abrir `/admin/biblioteca`.
3. Crear un ramo.
4. Editar URL/descripcion.
5. Desactivar y confirmar que no aparece para productor.
6. Eliminar si corresponde.

API:

```bash
curl http://localhost:3000/api/v1/library/ramos \
  -H "Authorization: Bearer TOKEN"
```

---

## Pendientes conocidos

- Definir URLs reales de Drive/repositorio documental.
- Evaluar uso de `Recurso` para multiples links/archivos por ramo.
- Evaluar busqueda/paginacion server-side si crece el catalogo.
- Evaluar drag-and-drop de orden.
- E2E para productor/admin.
