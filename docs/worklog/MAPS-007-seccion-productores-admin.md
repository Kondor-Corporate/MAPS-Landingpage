# MAPS-007 — Sección Productores en panel Admin

> **Actualización MAPS-009:** el mock (`useProducers`, `producersMock`) fue **eliminado**; el panel admin de productores consume la **API real** (`useAdminProducers`, `producers.service.ts`). Esta bitácora describe la **entrega MAPS-007** (solo UI mock). Para el estado cerrado véase [`docs/worklog/MAPS-009-admin-api-productores.md`](../worklog/MAPS-009-admin-api-productores.md).

Documentación de la feature **Listado y gestión de productores en el panel Admin / SuperAdmin** dentro del proyecto MAPS Asesores. Complementa el [README técnico](./README.md) y el [README raíz](../README.md).

---

## Objetivo

Implementar las dos vistas de productores del panel administrativo (`/admin/productores` y `/admin/inactivos`) con fidelidad a los diseños de Figma (nodos `85:986` y `85:980`), reemplazando los stubs `Sección en construcción` que existían desde la etapa de scaffolding.

La feature deja operativa toda la capa de UI: listado, búsqueda, filtros, paginación, modales de alta / edición / vista / confirmación, y soporte para los dos roles habilitados (ADMIN y SUPERADMIN). Backend real queda fuera de scope (ver "Pendientes").

---

## Cambios implementados

### 1. Tipos y datos mock

**Archivos:**

- `frontend/src/modules/admin/types/producer.ts`
- `frontend/src/modules/admin/data/producersMock.ts`

Se define el tipo `Producer` (id, nombre, avatarUrl, estado `'ACTIVO' | 'INACTIVO'`, dni, email, telefono, sucursal, fechaAlta, ultimaActividad) y el tipo derivado `ProducerInput` para alta/edición.

`producersMock.ts` provee 25 productores de ejemplo (mix activos/inactivos, fechas relativas calculadas en runtime con un helper `isoDaysAgo`) y exporta `SUCURSALES_OPTIONS` para los selectores de filtro y form.

Se trabaja con mock porque el backend (`backend/src/controllers/producers.controller.ts`) sigue siendo stub. Cuando esté listo, se reemplaza el store por `axios` sin tocar la UI.

---

### 2. Store de productores y hook de filtros

**Archivos:**

- `frontend/src/modules/admin/hooks/useProducers.ts`
- `frontend/src/modules/admin/hooks/useProducerFilters.ts`

`useProducers` es un store Zustand con la lista en memoria y CRUD: `addProducer`, `updateProducer`, `setEstado`, `removeProducer`. Cada operación actualiza `ultimaActividad`. Generación de IDs con `Date.now()` + random.

`useProducerFilters` reemplaza el stub que devolvía `{}`. Expone `search`, `filters` (estado / sucursal / rango fecha alta / última actividad), `setFilter`, `reset`, `apply(producers)` (función pura) y `activeCount` (cantidad de filtros activos para el badge).

---

### 3. Sub-componentes UI (nuevos)

**Archivos:**

- `frontend/src/modules/admin/components/ProducerStatusBadge.tsx`
- `frontend/src/modules/admin/components/SearchPillInput.tsx`
- `frontend/src/modules/admin/components/ProducerActionsMenu.tsx`
- `frontend/src/modules/admin/components/ProducersPagination.tsx`
- `frontend/src/modules/admin/components/ProducersGreeting.tsx`
- `frontend/src/modules/admin/components/ProducersToolbar.tsx`

`ProducerStatusBadge` — pill `Activo` (emerald) / `Inactivo` (rose).
`SearchPillInput` — input redondeado con icono `Menu` izquierda y `Search` derecha (matchea el Figma).
`ProducerActionsMenu` — link "Ver Perfil" + kebab `⋮` con dropdown (Ver / Editar / Desactivar | Reactivar). Click-outside y `Escape` cierran el menú.
`ProducersPagination` — paginado con elipsis inteligente + selector de filas por página (8/16/32) + indicador "Mostrando X–Y de Z".
`ProducersGreeting` — "Hola, {Admin|SuperAdmin} 👋" + bajada + chip total con icono `Users2`.
`ProducersToolbar` — título "Listado de Productores" + `SearchPillInput` (centro) + `Filtrar` (con badge de filtros activos) + `+ Nuevo Productor`.

---

### 4. Tabla y orquestador

**Archivos:**

- `frontend/src/modules/admin/components/ProducerTable.tsx` (rellenado, antes era `null`)
- `frontend/src/modules/admin/components/ProducersDashboard.tsx` (nuevo)

`ProducerTable` — tabla `<table>` desktop con columnas NOMBRE / ESTADO / DNI / ÚLTIMA ACTIVIDAD / ACCIONES; cards apiladas en `<lg`. Empty state propio con icono `Inbox` cuando `producers.length === 0`. Header con `bg-maps-surface` y filas con `hover:bg-maps-surface/60`.

`ProducersDashboard` — orquestador parametrizado por `scope: 'all' | 'active' | 'inactive'`. Hace el `useMemo` de scoping → filtrado → paginado, y maneja los 4 modales (filter, form crear, form editar, view, confirm desactivar/reactivar).

---

### 5. Modales rellenados (eran stubs `null`)

**Archivos:**

- `frontend/src/modules/admin/components/ProducerFormModal.tsx`
- `frontend/src/modules/admin/components/ProducerViewModal.tsx`
- `frontend/src/modules/admin/components/ProducerFilterModal.tsx`
- `frontend/src/modules/admin/components/DeactivateConfirmModal.tsx`

Todos usan el `Modal` compartido (`frontend/src/shared/components/Modal.tsx`).

`ProducerFormModal` — soporta `mode: 'create' | 'edit'`. Validación inline (nombre requerido, DNI 7–9 dígitos, email regex, teléfono requerido). En modo edit precarga el producer.

`ProducerViewModal` — header con gradiente `from-maps-brand-soft via-white`, avatar grande, badge, DNI; grid de campos (email, teléfono, sucursal, DNI, alta, última actividad) con icons `lucide-react`; footer con botón "Editar".

`ProducerFilterModal` — estado / sucursal / rango fecha de alta / última actividad. Acepta `hideEstado` para ocultar el selector cuando el scope ya está fijado (vista de inactivos).

`DeactivateConfirmModal` — polivalente con `mode: 'deactivate' | 'reactivate'`. Color CTA rojo en deactivate, teal en reactivate.

---

### 6. Páginas (reemplazo de stubs)

**Archivos:**

- `frontend/src/modules/admin/pages/ProducersPage.tsx`
- `frontend/src/modules/admin/pages/InactiveProducersPage.tsx`

Ambas se reducen a un wrapper de una línea sobre `ProducersDashboard`:

```tsx
// antes
export function ProducersPage() {
  return (
    <div className="flex flex-col gap-2 px-8 py-6">
      <h1 className="text-3xl font-bold text-maps-heading">Productores</h1>
      <p className="text-maps-body">Sección en construcción.</p>
    </div>
  );
}

// después
export function ProducersPage() {
  return <ProducersDashboard scope="all" />;
}
```

`InactiveProducersPage` ídem con `scope="inactive"`.

---

### 7. Shared utils colaterales

**Archivos nuevos:**

- `frontend/src/shared/utils/initials.ts`
- `frontend/src/shared/utils/relativeTime.ts`
- `frontend/src/shared/components/Avatar.tsx`

**Archivo modificado:**

- `frontend/src/shared/layouts/AppSidebar.tsx`

`getInitials` se extrajo del `AppSidebar` a `shared/utils/initials.ts` para que el `Avatar` también lo use. `AppSidebar` se refactorizó para importarlo del nuevo módulo en vez de tenerlo local.

`relativeTimeFromNow` formatea fechas en español argentino: `Hoy, 10:45 AM` / `Ayer` / `2 horas` / `3 días` / `12 mar` (fechas más antiguas).

`Avatar` reemplaza la duplicación que iba a aparecer entre tabla, modal de view y sidebar: imagen con fallback a iniciales sobre `bg-maps-brand-soft`. Tamaños `sm | md | lg | xl`.

---

## Estado del sistema tras MAPS-007 (sección Productores)

### Rutas habilitadas

```
/admin/productores   → ProducersPage         scope='all'         RoleGuard(['ADMIN','SUPERADMIN'])
/admin/inactivos     → InactiveProducersPage scope='inactive'    RoleGuard(['ADMIN','SUPERADMIN'])
```

`router/index.tsx` no se modificó — las rutas y guards ya estaban definidos desde MAPS-004; lo único que cambió es que ahora rinden la UI real en lugar de los stubs.

### Estado de los stubs anteriores

| Archivo | Antes | Después |
|---------|-------|---------|
| `ProducersPage.tsx` | `<h1>Productores</h1> Sección en construcción` | `<ProducersDashboard scope="all" />` |
| `InactiveProducersPage.tsx` | Idem inactivos | `<ProducersDashboard scope="inactive" />` |
| `ProducerTable.tsx` | `return null` | Tabla desktop + cards mobile + empty state |
| `ProducerFilterModal.tsx` | `return null` | Filtros estado/sucursal/fechas |
| `ProducerFormModal.tsx` | `return null` | Form crear/editar con validación |
| `ProducerViewModal.tsx` | `return null` | Vista detalle del productor |
| `DeactivateConfirmModal.tsx` | `return null` | Confirmación deactivate/reactivate |
| `useProducerFilters.ts` | `return {}` | Hook completo con search + filters + apply |

### Decisiones de UI vs. el Figma

| Diseño | Implementación | Razón |
|--------|----------------|-------|
| 1284 productores en chip pero sin paginar | Se agregó `ProducersPagination` (8/16/32 filas) | El listado completo es invisible sin paginar |
| Acciones por fila: "Ver Perfil" + íconos `eye/pencil/trash` separados | Único kebab `⋮` con dropdown que reemplaza los íconos sueltos | Evita doble entry-point al perfil; menos ruido visual |
| Botón "+ Nuevo Productor" presente en vista de inactivos | Se mantuvo pero con `title` aclaratorio "Crear nuevo productor (quedará Activo)" | Coherencia visual con la otra vista; tooltip aclara el efecto |
| Sin estados vacío / sin filtros aplicados | Se agregó empty state con icono `Inbox` | UX necesaria cuando filtros no matchean |
| Solo desktop | Degradación a cards apiladas en `<lg` | Fast-path responsive |

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| `npx tsc --noEmit` pasa limpio | Exit 0 |
| `npm run dev` levanta sin errores | Vite ready en `http://localhost:5173/` |
| `/admin/productores` rinde el listado real (no el stub) | `<ProducersDashboard scope="all" />` |
| `/admin/inactivos` rinde solo productores inactivos | `<ProducersDashboard scope="inactive" />` |
| Búsqueda en vivo por nombre / DNI / email | `useProducerFilters.search` filtra sobre `${nombre} ${dni} ${email}` |
| Modal de filtros aplica/limpia y refleja en tabla | `setFilter` + `reset` |
| Alta de productor desde "+ Nuevo Productor" | `useProducers.addProducer` |
| Edición desde kebab → form precargado | `useProducers.updateProducer` |
| Desactivar mueve el productor a `/admin/inactivos` | `useProducers.setEstado` |
| Reactivar desde `/admin/inactivos` lo devuelve a activos | Mismo `setEstado`, kebab muestra "Reactivar" cuando `estado === 'INACTIVO'` |
| Paginación cambia páginas y filas por página | `ProducersPagination` |
| Empty state con filtros sin resultados | Tabla muestra card "Sin resultados" |
| Responsive `<lg` en cards | Tabla degrada a `<ul>` |
| Sidebar no rompe tras refactor `getInitials` | `AppSidebar` importa de `shared/utils/initials` |

---

## Pruebas manuales recomendadas

```
1. Login con superadmin / Super1234! → redirige a /admin/dashboard
   → navegar a /admin/productores
   → debería aparecer el header "Hola, SuperAdmin 👋", chip total, toolbar y tabla con 25 productores

2. Búsqueda
   → escribir "carlos" en el search → la tabla filtra a "Carlos Gomez"
   → escribir "12345678" (DNI) → matchea por DNI también
   → limpiar → vuelven todas las filas

3. Filtros
   → click "Filtrar" → modal abre → cambiar Estado a "Inactivo" + Sucursal a "Córdoba" → Aplicar
   → tabla muestra solo inactivos de Córdoba; badge en "Filtrar" muestra "2"
   → reabrir modal → "Limpiar filtros" → tabla vuelve completa

4. Alta
   → click "+ Nuevo Productor" → completar form → Crear
   → el nuevo productor aparece en la fila 1 con estado Activo

5. Edición
   → kebab de cualquier fila → "Editar" → cambiar nombre → Guardar
   → la fila refleja el cambio inmediatamente

6. Desactivar
   → kebab de un productor activo → "Desactivar" → confirmar
   → la fila desaparece de /admin/productores
   → navegar a /admin/inactivos → la fila aparece allí

7. Reactivar
   → desde /admin/inactivos → kebab de un productor → "Reactivar" → confirmar
   → la fila vuelve a /admin/productores

8. Paginación
   → cambiar "Filas: 8 → 16" → muestra hasta 16 filas
   → click ChevronRight → avanza de página

9. Roles
   → login con admin / Admin1234! → mismas vistas funcionan igual
   → login con productor → /admin/productores debe redirigir a /unauthorized

10. Responsive
    → DevTools < lg → la tabla colapsa a cards
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Backend real MAPS-009 | Ver [`docs/worklog/MAPS-009-admin-api-productores.md`](../worklog/MAPS-009-admin-api-productores.md) y [`docs/tdd/MAPS-009-tdd-admin-api-productores.md`](../tdd/MAPS-009-tdd-admin-api-productores.md). |
| Persistencia | El store es 100% en memoria; al refrescar se pierden cambios. Pasa con backend real. |
| Tests | El proyecto no tiene setup de testing aún. Pendiente para una feature futura (Vitest para unit + Playwright para E2E). |
| Toast / feedback post-acción | Hoy los modales se cierran sin notificación. Sumar un sistema de toasts compartido. |
| Export CSV / Excel | Pedido típico de un panel admin, no estaba en el Figma. |
| Búsqueda y paginación server-side | Hoy son client-side sobre el array completo. Cuando haya 1000+ productores se vuelve necesario mover al backend. |
| Avatares reales | Hoy se usa `pravatar.cc` como placeholder; debería migrar a almacenamiento propio (S3 / Cloudinary). |
| Validaciones más ricas | Email único, DNI único contra backend; longitud y formato de teléfono regional. |
| Skeleton de carga | El render es síncrono porque la data es local; cuando entre la llamada async, sumar skeletons en `ProducerTable`. |
| Tooltip / sidebar collapse | El Figma sugiere un botón de colapso del sidebar (icono al lado del logo M). No se implementó porque cambia el `AppSidebar` que es transversal a todas las pantallas — merece su propio ticket. |

---

*Documento generado en la feature MAPS-007 — Sección Productores en panel Admin.*
