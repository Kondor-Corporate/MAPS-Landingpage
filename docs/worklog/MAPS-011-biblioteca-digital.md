# MAPS-011 - Biblioteca Digital - UI productores y gestion admin

Work-log historico de la primera implementacion de Biblioteca Digital en frontend.

> Nota de vigencia: este documento describe la version UI con datos mock/store local. La persistencia real y la integracion con API fueron implementadas despues en MAPS-012. Para el estado actual del sistema, consultar `docs/modules/` y `docs/ARCHITECTURE.md`.

---

## Objetivo

Reemplazar el stub de Biblioteca Digital por una experiencia usable para:

- Productores en `/intranet/biblioteca`.
- Administradores en `/admin/biblioteca`.

La entrega se centro en UI, estructura de componentes y flujo de gestion en cliente. La API real quedo fuera de alcance y fue abordada en MAPS-012.

---

## Cambios implementados

### Tipos y datos locales

- Se agregaron tipos de biblioteca/ramos en frontend.
- Se definio un set inicial de ramos principales y secundarios.
- La informacion se manejo con mock/local store en cliente.

### Vista productor

Archivos principales:

- `frontend/src/modules/intranet/pages/DigitalLibraryPage.tsx`
- `frontend/src/modules/intranet/components/LibraryHero.tsx`
- `frontend/src/modules/intranet/components/LibraryRamosSection.tsx`
- `frontend/src/modules/intranet/components/LibraryRamoCard.tsx`
- `frontend/src/modules/intranet/components/LibrarySecondarySection.tsx`

La vista muestra:

- Hero de Biblioteca Digital.
- Grilla de ramos principales.
- Seccion de categorias secundarias.
- Acciones para abrir contenido externo cuando hay URL disponible.

### Vista admin

Archivos principales:

- `frontend/src/modules/admin/pages/LibraryManagementPage.tsx`
- `frontend/src/modules/admin/components/LibraryManagementDashboard.tsx`
- `frontend/src/modules/admin/components/LibraryRamoTable.tsx`
- `frontend/src/modules/admin/components/LibraryRamoFormModal.tsx`
- `frontend/src/modules/admin/components/LibraryRamoDeleteModal.tsx`

La vista admin permitia desde cliente:

- Crear ramos.
- Editar ramos.
- Activar/desactivar ramos.
- Eliminar ramos.
- Ver tabla de gestion.

---

## Estado del sistema tras MAPS-011

| Area | Estado en MAPS-011 |
|------|--------------------|
| `/intranet/biblioteca` | UI implementada con datos locales |
| `/admin/biblioteca` | UI de gestion implementada con estado local |
| API biblioteca | Pendiente |
| Persistencia PostgreSQL | Pendiente |
| RBAC backend para biblioteca | Pendiente |

---

## Supersesion por MAPS-012

MAPS-012 reemplazo el flujo local/mock por integracion real:

- API `/api/v1/library/ramos`.
- Persistencia en PostgreSQL.
- CRUD admin.
- Lectura para productor.
- Validaciones y RBAC en backend.

Referencia: [`MAPS-012-biblioteca-digital-api.md`](./MAPS-012-biblioteca-digital-api.md).

---

## Pendientes fuera de MAPS-011

- API real de biblioteca.
- Persistencia de ramos.
- URLs reales de Drive o repositorio documental.
- Busqueda/paginacion server-side.
- Tabla `Recurso` para multiples recursos por ramo.
