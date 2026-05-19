# MAPS-010 — Biblioteca Digital — Vista Productores + Gestión Admin

Documentación de la feature Biblioteca Digital (UI + mock) dentro del proyecto MAPS Asesores. Complementa el [TDD](../tdd/MAPS-011-tdd-biblioteca-digital.md) y el [README raíz](../../README.md).

> **Backend / API:** diseño e implementación planificada en [MAPS-012 — TDD](../tdd/MAPS-012-tdd-biblioteca-digital-api.md) y [work-log MAPS-012](./MAPS-012-biblioteca-digital-api.md).

---

## Objetivo

Dar operatividad completa a la sección "Biblioteca Digital", la última entrada del sidebar marcada "En construcción" para los tres roles del sistema. Se implementan dos superficies: una vista de solo lectura para productores (`/intranet/biblioteca`) con ramos de seguros organizados en grilla y pills, y un panel de gestión CRUD para ADMIN/SUPERADMIN (`/admin/biblioteca`) que permite mantener los ramos y sus links a Google Drive actualizados sin necesidad de deploy.

---

## Cambios implementados

### 1. Tipos y constantes de biblioteca

**Archivo:** `frontend/src/modules/admin/types/library.ts`

Tipo central `Ramo` con campos `id`, `nombre`, `descripcion`, `icono` (clave de un enum fijo `RamoIcono`), `gdriveUrl`, `tipo` (PRINCIPAL | SECUNDARIO), `orden`, `activo`, `creadoEn` y `modificadoEn`. `RamoInput` es `Omit<Ramo, 'id' | 'creadoEn' | 'modificadoEn'>` siguiendo el mismo patrón que `NewsInput`.

```typescript
// antes: archivo inexistente

// después
export type RamoTipo = 'PRINCIPAL' | 'SECUNDARIO';

export type Ramo = {
  id: string;
  nombre: string;
  descripcion: string;
  icono: RamoIcono;
  gdriveUrl: string;
  tipo: RamoTipo;
  orden: number;
  activo: boolean;
  creadoEn: string;
  modificadoEn: string;
};
```

El campo `tipo` distingue entre ramos que se muestran en la grilla principal (PRINCIPAL) y los que aparecen como pills de categorías adicionales (SECUNDARIO). Esta distinción es visual y de negocio, por eso se tipifica explícitamente en lugar de derivarla del `orden`.

---

### 2. Mock data inicial

**Archivo:** `frontend/src/modules/admin/data/libraryMock.ts`

16 ramos de ejemplo: 8 PRINCIPAL (Automotores, Salud, Incendio, Integral Comercio, Movilidad, Cyber Risk, Caución Alquier, Campañas) y 8 SECUNDARIO (Autos Clásicos, ART, Accidentes Personales, Vida Colectivo, Responsabilidad Civil, Transporte, Seguros de Retiro, Embarcaciones). Todos activos. `gdriveUrl` apunta a `"https://drive.google.com/drive/folders/EXAMPLE"` como placeholder editable.

---

### 3. Store Zustand `useLibraryStore`

**Archivo:** `frontend/src/modules/admin/hooks/useLibraryStore.ts`

Store en memoria con estado `ramos: Ramo[]` inicializado con el mock e inicializacion lazy. Acciones:

- `addRamo(input: RamoInput)` — genera id con `crypto.randomUUID()`, setea `creadoEn` y `modificadoEn`.
- `updateRamo(id, input)` — actualiza solo los campos recibidos, actualiza `modificadoEn`.
- `toggleActivo(id)` — invierte el flag `activo` y actualiza `modificadoEn`.
- `removeRamo(id)` — elimina el ramo del array.

```typescript
// patrón seguido de useNewsStore (MAPS-007)
const useLibraryStore = create<LibraryStore>((set) => ({
  ramos: libraryMock,
  addRamo: (input) =>
    set((s) => ({
      ramos: [
        ...s.ramos,
        { ...input, id: crypto.randomUUID(), creadoEn: now(), modificadoEn: now() },
      ],
    })),
  // ...
}));
```

---

### 4. Vista productores — `DigitalLibraryPage` y componentes de intranet

**Archivos:**

- `modules/intranet/pages/DigitalLibraryPage.tsx`
- `modules/intranet/components/LibraryHero.tsx`
- `modules/intranet/components/LibraryRamosSection.tsx`
- `modules/intranet/components/LibraryRamoCard.tsx`
- `modules/intranet/components/LibraryCard.tsx`
- `modules/intranet/components/LibraryCategoryGrid.tsx`
- `modules/intranet/components/LibrarySecondarySection.tsx`

```tsx
// antes — DigitalLibraryPage.tsx
export function DigitalLibraryPage() {
  return (
    <div className="flex flex-col gap-2 px-8 py-6">
      <h1 className="text-3xl font-bold text-maps-heading">Biblioteca Digital</h1>
      <p className="text-maps-body">Sección en construcción.</p>
    </div>
  );
}

// después
export function DigitalLibraryPage() {
  return (
    <div className="flex flex-col">
      <LibraryHero />
      <LibraryRamosSection />
      <LibrarySecondarySection />
    </div>
  );
}
```

**`LibraryHero`** — banner con degradado azul (`from-blue-600 to-blue-400`), chip "Recursos para Productores", título "Biblioteca Digital" en blanco y subtítulo.

**`LibraryRamoCard`** — card blanca con borde `maps-border`, icono SVG en recuadro `maps-brand-soft`, nombre en negrita, descripción en `maps-muted`, botón "Explorar contenido" que abre `gdriveUrl` en nueva pestaña. Si `gdriveUrl` está vacío el botón queda deshabilitado.

**`LibraryCategoryGrid`** — reemplaza el stub `return null`. Grilla `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, recibe `ramos: Ramo[]` por prop y renderiza un `LibraryRamoCard` por elemento.

**`LibraryCard`** — stub reemplazado: ahora reexporta `LibraryRamoCard` para mantener compatibilidad con cualquier import existente.

**`LibrarySecondarySection`** — fondo azul oscuro, encabezado "Explorar más categorías", bajada descriptiva y fila de pills (`<button>` con `border border-white/40 rounded-full`) que abren `gdriveUrl` en nueva pestaña. Consume ramos `tipo === 'SECUNDARIO' && activo === true` del store.

---

### 5. Vista admin — `LibraryManagementPage` y componentes de gestión

**Archivos:**

- `modules/admin/pages/LibraryManagementPage.tsx`
- `modules/admin/components/LibraryManagementDashboard.tsx`
- `modules/admin/components/LibraryHeader.tsx`
- `modules/admin/components/LibraryToolbar.tsx`
- `modules/admin/components/LibraryRamoTable.tsx`
- `modules/admin/components/LibraryRamoFormModal.tsx`
- `modules/admin/components/LibraryRamoDeleteModal.tsx`
- `modules/admin/components/LibraryRamoStatusBadge.tsx`
- `modules/admin/components/LibraryRamoTipoBadge.tsx`

**`LibraryManagementDashboard`** — orquestador que aloja el estado de los modales (`formModal: { open, mode, ramo }` y `deleteModal: { open, ramo }`). Pasa handlers a `LibraryToolbar`, `LibraryRamoTable`, `LibraryRamoFormModal` y `LibraryRamoDeleteModal`.

**`LibraryRamoTable`** — tabla con columnas Nombre | Tipo | Descripción | Link Drive | Estado | Acciones. El link Drive se trunca a 40 caracteres con tooltip del URL completo. Acciones: editar (lápiz) abre el form modal en modo edición; toggle (ojo) llama `toggleActivo`; eliminar (basura) abre el modal de confirmación.

**`LibraryRamoFormModal`** — reutiliza `Modal` de `shared/components/Modal.tsx`. Formulario con estado local (`useState`). Campos: nombre (input), descripción (textarea), icono (select con preview del SVG), URL Drive (input con validación `https://`), tipo (radio), orden (number input), activo (toggle checkbox). El mismo modal se usa para crear y editar; en modo edición se hidrata con los valores del ramo seleccionado.

**`LibraryRamoDeleteModal`** — texto de confirmación con el nombre del ramo interpolado. Botón "Eliminar" llama `removeRamo(ramo.id)` del store y cierra el modal.

**`LibraryRamoStatusBadge`** — pill verde emerald para `activo = true`, gris para `activo = false`. Patrón idéntico a `NewsStatusBadge`.

**`LibraryRamoTipoBadge`** — pill azul para PRINCIPAL, violeta para SECUNDARIO.

---

### 6. Actualización del router

**Archivo:** `frontend/src/router/index.tsx`

```tsx
// antes
{ path: 'biblioteca', element: <DigitalLibraryPage /> }
// (dentro de adminBranch)

// después
{ path: 'biblioteca', element: <LibraryManagementPage /> }
```

La ruta `/intranet/biblioteca` no se modifica. Solo se actualiza la entrada dentro de `adminBranch` para que ADMIN/SUPERADMIN vean el panel de gestión en lugar de la vista de productores.

---

## Estado del sistema tras MAPS-010

### Routing

```
/intranet/biblioteca  → DigitalLibraryPage    [RoleGuard: PRODUCTOR]
                          ├── LibraryHero
                          ├── LibraryRamosSection  (ramos PRINCIPAL activos)
                          └── LibrarySecondarySection  (ramos SECUNDARIO activos)

/admin/biblioteca     → LibraryManagementPage  [RoleGuard: ADMIN | SUPERADMIN]
                          └── LibraryManagementDashboard
                                ├── LibraryHeader
                                ├── LibraryToolbar
                                ├── LibraryRamoTable
                                ├── LibraryRamoFormModal
                                └── LibraryRamoDeleteModal
```

### Permisos por rol

| Acción | PRODUCTOR | ADMIN | SUPERADMIN |
|--------|-----------|-------|------------|
| Ver biblioteca (ramos activos) | ✓ | ✓ | ✓ |
| Explorar contenido (abrir Drive) | ✓ | ✓ | ✓ |
| Crear ramo | ✗ | ✓ | ✓ |
| Editar ramo / URL Drive | ✗ | ✓ | ✓ |
| Activar / desactivar ramo | ✗ | ✓ | ✓ |
| Eliminar ramo | ✗ | ✓ | ✓ |

### Estructura de archivos nuevos

```
frontend/src/
├── modules/
│   ├── admin/
│   │   ├── components/
│   │   │   ├── LibraryHeader.tsx
│   │   │   ├── LibraryManagementDashboard.tsx
│   │   │   ├── LibraryRamoDeleteModal.tsx
│   │   │   ├── LibraryRamoFormModal.tsx
│   │   │   ├── LibraryRamoStatusBadge.tsx
│   │   │   ├── LibraryRamoTable.tsx
│   │   │   ├── LibraryRamoTipoBadge.tsx
│   │   │   └── LibraryToolbar.tsx
│   │   ├── data/
│   │   │   └── libraryMock.ts
│   │   ├── hooks/
│   │   │   └── useLibraryStore.ts
│   │   ├── pages/
│   │   │   └── LibraryManagementPage.tsx
│   │   └── types/
│   │       └── library.ts
│   └── intranet/
│       ├── components/
│       │   ├── LibraryCard.tsx          (modificado — era stub)
│       │   ├── LibraryCategoryGrid.tsx  (modificado — era stub)
│       │   ├── LibraryHero.tsx
│       │   ├── LibraryRamoCard.tsx
│       │   ├── LibraryRamosSection.tsx
│       │   └── LibrarySecondarySection.tsx
│       └── pages/
│           └── DigitalLibraryPage.tsx   (modificado — era stub)
└── router/
    └── index.tsx                        (modificado — ruta admin biblioteca)
```

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| `/intranet/biblioteca` renderiza sin errores de consola para el rol PRODUCTOR | Verificado (build + implementación) |
| Los ramos PRINCIPAL activos aparecen en grilla de 4 columnas en desktop | Verificado (`lg:grid-cols-4`) |
| Los ramos SECUNDARIO activos aparecen como pills en la sección inferior | Verificado |
| El botón "Explorar contenido" abre `gdriveUrl` en nueva pestaña | Verificado (`target="_blank"`) |
| Un ramo sin `gdriveUrl` muestra el botón deshabilitado | Verificado |
| `/admin/biblioteca` renderiza el panel de gestión para ADMIN/SUPERADMIN | Verificado (`LibraryManagementPage`) |
| Un admin puede crear un ramo nuevo desde el modal | Verificado (store Zustand) |
| Un admin puede editar el nombre y la URL Drive de un ramo existente | Verificado |
| Un admin puede desactivar un ramo (toggle) y desaparece de la vista de productores | Verificado |
| Un admin puede eliminar un ramo con confirmación | Verificado |
| El rol PRODUCTOR que intenta acceder a `/admin/biblioteca` redirige a `/unauthorized` | Verificado (`RoleGuard` existente) |

---

## Pruebas manuales recomendadas

```
1. Flujo productor — explorar contenido
   → Loguear como PRODUCTOR
   → Ir a /intranet/biblioteca
   → Verificar hero azul con título "Biblioteca Digital"
   → Verificar grilla de ramos PRINCIPAL (4 columnas en desktop)
   → Click en "Explorar contenido" de cualquier ramo
   → Debe abrir Google Drive en nueva pestaña
   → Verificar pills de ramos SECUNDARIO en sección inferior azul

2. Flujo admin — crear ramo
   → Loguear como ADMIN
   → Ir a /admin/biblioteca
   → Click en "Nuevo Ramo"
   → Completar nombre, descripción, URL Drive válida (https://...), tipo PRINCIPAL, orden 9
   → Guardar
   → Verificar que el ramo aparece en la tabla
   → Ir a /intranet/biblioteca y verificar que el ramo nuevo aparece en la grilla

3. Flujo admin — editar URL Drive
   → En la tabla, click en el ícono de lápiz de cualquier ramo
   → Cambiar el campo "URL Google Drive"
   → Guardar
   → Verificar que la nueva URL se refleja en la tabla y en la vista de productores

4. Flujo admin — desactivar ramo
   → Click en el ícono de ojo de un ramo activo
   → Verificar que el badge cambia a "Inactivo"
   → Ir a /intranet/biblioteca
   → Verificar que el ramo desactivado NO aparece

5. Flujo admin — eliminar ramo
   → Click en el ícono de basura de cualquier ramo
   → Verificar modal de confirmación con el nombre del ramo
   → Confirmar eliminación
   → Verificar que desaparece de la tabla y de la vista de productores

6. Control de acceso
   → Loguear como PRODUCTOR
   → Navegar manualmente a /admin/biblioteca
   → Debe redirigir a /unauthorized
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Backend real para ramos | Ver [MAPS-012-tdd-biblioteca-digital-api.md](../tdd/MAPS-012-tdd-biblioteca-digital-api.md) y [MAPS-012-biblioteca-digital-api.md](./MAPS-012-biblioteca-digital-api.md) (`GET/PATCH/POST/DELETE /api/v1/library/ramos`). |
| Reordenamiento por drag-and-drop | El campo `orden` resuelve el ordenamiento manualmente desde el form. DnD queda fuera de scope. |
| URLs de Google Drive reales | El mock usa URLs placeholder `EXAMPLE`. Deben reemplazarse con los links reales en la carga inicial del admin. |
| Sub-recursos por ramo | Si el negocio define sub-carpetas o recursos individuales dentro de un ramo, requiere un modelo de datos extendido. |
| Descripción en ramos SECUNDARIO | Pendiente definición de negocio (¿solo nombre + link o también descripción?). |

---

*Documento generado en la feature MAPS-010 — Biblioteca Digital.*
