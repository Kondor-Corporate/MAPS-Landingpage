# MAPS-011 — TDD: Biblioteca Digital — Vista Productores + Gestión Admin

Documento de diseño técnico para la Biblioteca Digital dentro del proyecto MAPS Asesores.

**Estado:** Borrador
**Autor:** Lucas
**Revisores:** — 
**Creado:** 2026-05-19
**Última actualización:** 2026-05-19

---

## Resumen

Los productores necesitan un espacio centralizado para acceder a material comercial, folletos y recursos actualizados organizados por ramo de seguro. Cada ramo enlaza a una carpeta de Google Drive mantenida por los administradores. El diseño contempla dos superficies: una vista de solo lectura para productores (`/intranet/biblioteca`) y un panel de gestión CRUD para admins (`/admin/biblioteca`) que reemplaza al stub actual. El impacto principal es dar operatividad completa a la última sección vacía del portal de productores.

---

## Objetivo

- Implementar la vista de Biblioteca Digital para productores: hero azul, grilla de Ramos Principales con botón "Explorar contenido" (abre Google Drive en nueva pestaña), y sección de categorías adicionales como pills clicables.
- Implementar el panel de gestión para ADMIN/SUPERADMIN: tabla de ramos con alta, baja, modificación y actualización del link de Google Drive, sin necesidad de deploy.
- Que la URL de cada ramo sea editable por un admin en cualquier momento desde la interfaz.

---

## Contexto

### Situación actual

- `frontend/src/modules/intranet/pages/DigitalLibraryPage.tsx` es un stub que devuelve `"Sección en construcción."`.
- `frontend/src/modules/intranet/components/LibraryCard.tsx` → `return null`.
- `frontend/src/modules/intranet/components/LibraryCategoryGrid.tsx` → `return null`.
- La ruta `/intranet/biblioteca` ya está cableada con `RoleGuard(['PRODUCTOR'])` en `frontend/src/router/index.tsx`.
- La ruta `/admin/biblioteca` ya está cableada con `RoleGuard(['ADMIN','SUPERADMIN'])` y apunta al mismo `DigitalLibraryPage` — necesita su propio componente de gestión.
- El sidebar ya expone "Biblioteca Digital" para los roles PRODUCTOR, ADMIN y SUPERADMIN en `frontend/src/shared/constants/sidebarItems.tsx` (líneas 205, 214, 224).
- No existe backend para esta feature; queda 100 % mock client-side (mismo patrón que MAPS-007 noticias y MAPS-009 productores).

### Por qué ahora

MAPS-007, MAPS-008 y MAPS-009 cerraron Productores y Noticias. La Biblioteca Digital es la última sección marcada "En construcción" visible en el sidebar para los tres roles. Sin ella el panel no es presentable de punta a punta en demos.

---

## Alcance

- **Tipos** en `modules/admin/types/library.ts`: `Ramo`, `RamoTipo`, `RamoIcono`, `RamoInput`, constantes de labels.
- **Mock data** en `modules/admin/data/libraryMock.ts`: 8 ramos PRINCIPAL + 8 ramos SECUNDARIO con iconos, descripción y URLs de Google Drive de ejemplo.
- **Store Zustand** `useLibraryStore` con `addRamo`, `updateRamo`, `toggleActivo`, `removeRamo`.
- **Vista productores** (`modules/intranet/`): hero, grilla de Ramos Principales con botón "Explorar contenido", sección de categorías adicionales como pills — todo solo lectura.
- **Vista admin** (`modules/admin/`): página de gestión con tabla de ramos y modal de alta/edición/baja.
- **Router**: actualizar `/admin/biblioteca` para usar `LibraryManagementPage` en lugar del `DigitalLibraryPage` de intranet.

### Fuera de alcance

- Backend real / API REST (se implementará en un ticket posterior).
- Carga de archivos directamente en la app (el contenido vive en Google Drive).
- Permisos granulares por ramo (todos los productores ven todos los ramos activos).
- Búsqueda o filtros en la vista de productores.
- Vista de detalle interno por ramo (el botón abre Drive directamente).
- Drag-and-drop para reordenar ramos (el campo `orden` se gestiona manualmente desde el form).

---

## Diseño propuesto

### Resumen

```
/intranet/biblioteca  (PRODUCTOR — solo lectura)
  └── DigitalLibraryPage
        ├── LibraryHero                   ← banner azul degradado
        ├── LibraryRamosSection           ← "Ramos Principales" + grilla 4 col
        │     └── LibraryRamoCard × N     ← card: icono, título, desc, botón Drive
        └── LibrarySecondarySection       ← "Explorar más categorías" fondo azul + pills

/admin/biblioteca  (ADMIN | SUPERADMIN — gestión CRUD)
  └── LibraryManagementPage
        └── LibraryManagementDashboard
              ├── LibraryHeader
              ├── LibraryToolbar            ← search + botón "Nuevo Ramo"
              ├── LibraryRamoTable          ← tabla + badges + acciones inline
              ├── LibraryRamoFormModal      ← crear / editar (mismo modal)
              └── LibraryRamoDeleteModal    ← confirm eliminar
```

El store Zustand es la fuente de verdad compartida: la vista de intranet filtra `activo === true`; la vista admin consume todos los ramos.

### Componentes / archivos afectados

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| `library.ts` | `modules/admin/types/library.ts` | Nuevo — tipos y constantes |
| `libraryMock.ts` | `modules/admin/data/libraryMock.ts` | Nuevo — datos de ejemplo (16 ramos) |
| `useLibraryStore.ts` | `modules/admin/hooks/useLibraryStore.ts` | Nuevo — store Zustand |
| `DigitalLibraryPage.tsx` | `modules/intranet/pages/DigitalLibraryPage.tsx` | Modificado — implementar (era stub) |
| `LibraryHero.tsx` | `modules/intranet/components/LibraryHero.tsx` | Nuevo — banner azul con chip y título |
| `LibraryRamosSection.tsx` | `modules/intranet/components/LibraryRamosSection.tsx` | Nuevo — sección "Ramos Principales" |
| `LibraryRamoCard.tsx` | `modules/intranet/components/LibraryRamoCard.tsx` | Nuevo — card individual de ramo |
| `LibraryCard.tsx` | `modules/intranet/components/LibraryCard.tsx` | Modificado — era stub, reexporta `LibraryRamoCard` |
| `LibrarySecondarySection.tsx` | `modules/intranet/components/LibrarySecondarySection.tsx` | Nuevo — sección pills categorías adicionales |
| `LibraryCategoryGrid.tsx` | `modules/intranet/components/LibraryCategoryGrid.tsx` | Modificado — era stub, implementa grilla responsive |
| `LibraryManagementPage.tsx` | `modules/admin/pages/LibraryManagementPage.tsx` | Nuevo — entry point admin |
| `LibraryManagementDashboard.tsx` | `modules/admin/components/LibraryManagementDashboard.tsx` | Nuevo — orquestador admin |
| `LibraryHeader.tsx` | `modules/admin/components/LibraryHeader.tsx` | Nuevo — título y bajada admin |
| `LibraryToolbar.tsx` | `modules/admin/components/LibraryToolbar.tsx` | Nuevo — search + botón nuevo ramo |
| `LibraryRamoTable.tsx` | `modules/admin/components/LibraryRamoTable.tsx` | Nuevo — tabla de gestión |
| `LibraryRamoFormModal.tsx` | `modules/admin/components/LibraryRamoFormModal.tsx` | Nuevo — modal crear/editar |
| `LibraryRamoDeleteModal.tsx` | `modules/admin/components/LibraryRamoDeleteModal.tsx` | Nuevo — confirm eliminar |
| `LibraryRamoStatusBadge.tsx` | `modules/admin/components/LibraryRamoStatusBadge.tsx` | Nuevo — pill Activo/Inactivo |
| `LibraryRamoTipoBadge.tsx` | `modules/admin/components/LibraryRamoTipoBadge.tsx` | Nuevo — pill Principal/Secundario |
| `router/index.tsx` | `frontend/src/router/index.tsx` | Modificado — `/admin/biblioteca` → `LibraryManagementPage` |

### Modelo de datos

```typescript
// modules/admin/types/library.ts

export type RamoTipo = 'PRINCIPAL' | 'SECUNDARIO';

export type RamoIcono =
  | 'car'         // Automotores
  | 'heart'       // Salud
  | 'fire'        // Incendio
  | 'store'       // Integral Comercio
  | 'bike'        // Movilidad
  | 'shield'      // Cyber Risk
  | 'key'         // Caución Alquier
  | 'megaphone'   // Campañas
  | 'classic-car' // Autos Clásicos
  | 'person'      // Accidentes Personales
  | 'people'      // Vida Colectivo
  | 'scales'      // Responsabilidad Civil
  | 'truck'       // Transporte
  | 'umbrella'    // Seguros de Retiro / ART
  | 'boat';       // Embarcaciones

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

export type RamoInput = Omit<Ramo, 'id' | 'creadoEn' | 'modificadoEn'>;
```

Mock inicial en `libraryMock.ts`: 8 ramos PRINCIPAL (Automotores, Salud, Incendio, Integral Comercio, Movilidad, Cyber Risk, Caución Alquier, Campañas) y 8 ramos SECUNDARIO (Autos Clásicos, ART, Accidentes Personales, Vida Colectivo, Responsabilidad Civil, Transporte, Seguros de Retiro, Embarcaciones). Todos activos. `gdriveUrl` apunta a `"https://drive.google.com/drive/folders/EXAMPLE"` como placeholder.

### Contratos de API

> Backend fuera de alcance en MAPS-011. Contrato de referencia; implementación en [**MAPS-012**](./MAPS-012-tdd-biblioteca-digital-api.md) (usa `PATCH` en lugar de `PUT`, alineado a productores).

| Método | Ruta | Body / Query | Respuesta | Errores |
|--------|------|--------------|-----------|---------|
| `GET` | `/api/v1/library/ramos` | `?activo=true` | `200 Ramo[]` | — |
| `POST` | `/api/v1/library/ramos` | `RamoInput` | `201 Ramo` | `422 VALIDATION_ERROR` |
| `PUT` | `/api/v1/library/ramos/:id` | `Partial<RamoInput>` | `200 Ramo` | `404 NOT_FOUND` |
| `DELETE` | `/api/v1/library/ramos/:id` | — | `204` | `404 NOT_FOUND` |

### UI / UX

Referencia visual: mockup adjunto "Vista de Biblioteca Digital" (dos paneles: nav abierto y nav cerrado).

**Vista productores (`/intranet/biblioteca`)**

1. **`LibraryHero`** — banner con degradado azul de izquierda a derecha, chip "Recursos para Productores" en tono azul claro, título grande "Biblioteca Digital" en blanco, subtítulo descriptivo. Ocupa el ancho completo del área de contenido.

2. **`LibraryRamosSection`** — sección blanca, encabezado "Ramos Principales" (bold, texto oscuro) + link "Ver todo +" alineado a la derecha. Grilla de 4 columnas en desktop (2 en tablet, 1 en móvil). Muestra solo ramos `tipo === 'PRINCIPAL'` y `activo === true`, ordenados por `orden`.

3. **`LibraryRamoCard`** — card blanca con borde sutil, icono en recuadro azul claro, `nombre` en negrita, `descripcion` en gris, botón "Explorar contenido" que abre `gdriveUrl` en nueva pestaña (`target="_blank"`). Estado sin URL: botón deshabilitado con texto "Sin link disponible".

4. **`LibrarySecondarySection`** — fondo azul oscuro/degradado, encabezado "Explorar más categorías", fila de pills (chips con borde blanco) que al hacer clic abren el `gdriveUrl` del ramo SECUNDARIO en nueva pestaña. Muestra solo ramos `tipo === 'SECUNDARIO'` y `activo === true`.

**Vista admin (`/admin/biblioteca`)**

1. **`LibraryHeader`** — título "Gestión de Biblioteca Digital" + bajada descriptiva.

2. **`LibraryToolbar`** — input de búsqueda por nombre + botón "Nuevo Ramo" (abre `LibraryRamoFormModal` en modo crear).

3. **`LibraryRamoTable`** — columnas: Nombre | Tipo | Descripción | Link Drive (truncado con tooltip) | Estado | Acciones. Acciones inline: editar (lápiz) | toggle activo/inactivo (ojo) | eliminar (basura). Ordenado por `orden`.

4. **`LibraryRamoFormModal`** — campos: Nombre (texto, obligatorio), Descripción (textarea), Icono (select con preview), URL Google Drive (texto, obligatorio, formato `https://`), Tipo (radio Principal / Secundario), Orden (número entero positivo), Activo (toggle). El mismo modal se reutiliza para crear y editar.

5. **`LibraryRamoDeleteModal`** — confirm "¿Eliminar el ramo «X»? Esta acción no se puede deshacer." + botones Cancelar / Eliminar (rojo).

### Cambios en código existente

- `router/index.tsx`: agregar import de `LibraryManagementPage` y reemplazar la entrada `{ path: 'biblioteca', element: <DigitalLibraryPage /> }` dentro de `adminBranch` por `{ path: 'biblioteca', element: <LibraryManagementPage /> }`. La ruta de intranet no se modifica.
- `modules/intranet/components/LibraryCard.tsx` y `LibraryCategoryGrid.tsx`: reemplazar los stubs sin romper nada (actualmente devuelven `null`).

---

## Decisiones tomadas

- **Un store compartido para ambas vistas**: la vista de intranet filtra `activo === true`; la vista admin consume todos. Evita duplicar datos y facilita la futura integración con API.
- **Tipos `PRINCIPAL` / `SECUNDARIO`** en lugar de un orden puro: la distinción visual entre grilla de cards y pills justifica tiparlo explícitamente.
- **Conjunto fijo de iconos (`RamoIcono`)**: se define un enum de claves de icono renderizadas con SVGs inline, igual que el patrón de `sidebarItems.tsx`. Evita dependencia de librerías de iconos externas.
- **Ramo inactivo ≠ eliminado**: `toggleActivo` oculta el ramo de la vista de productores sin perder el registro ni su URL de Drive. Permite pausar temporalmente un ramo.
- **Sin filtros en la vista productores**: el volumen de ramos es bajo y la diferenciación PRINCIPAL/SECUNDARIO ya es el mecanismo de organización natural.
- **`LibraryManagementPage` separado del `DigitalLibraryPage`**: mantiene la separación de responsabilidades entre módulos intranet y admin, mismo patrón que `NewsManagementPage` vs el artículo público.

---

## Alternativas consideradas

### Alternativa A — Vista única con rol condicional

- **Qué era:** Un solo componente `DigitalLibraryPage` que detecta el rol del usuario y renderiza botones de gestión si es admin.
- **Pros:** Un solo archivo, menos routing.
- **Contras:** Mezcla responsabilidades de presentación y gestión; condicionales por rol dispersos en el JSX; difícil de testear; rompe el patrón establecido (noticias y productores tienen páginas separadas por módulo).
- **Por qué se descartó:** Inconsistente con la arquitectura del proyecto.

### Alternativa B — Links de Google Drive hardcodeados en frontend

- **Qué era:** Guardar los URLs de Google Drive como constantes en el código en lugar de en un store/base de datos.
- **Pros:** Implementación mínima, sin UI de gestión.
- **Contras:** Cada cambio de link requiere un deploy; el admin no puede actualizar sin acceso al repositorio; viola el requisito explícito de gestión dinámica.
- **Por qué se descartó:** No cumple el requisito de negocio.

### Alternativa C — Usar una librería de iconos externa (Lucide, Heroicons)

- **Qué era:** Importar iconos desde una librería npm para las cards de ramo.
- **Pros:** Más variedad de iconos sin codear SVGs manualmente.
- **Contras:** Agrega una dependencia que el resto del proyecto no usa; el bundle crece; los iconos del sidebar ya están inline.
- **Por qué se descartó:** Mantener coherencia con el patrón existente de SVGs inline en `sidebarItems.tsx`.

---

## Plan de implementación

### Fase 1 — Fundación de datos
- [ ] Crear `modules/admin/types/library.ts` con `Ramo`, `RamoTipo`, `RamoIcono`, `RamoInput` y constantes de labels.
- [ ] Crear `modules/admin/data/libraryMock.ts` con 16 ramos (8 PRINCIPAL + 8 SECUNDARIO), todos activos, URLs de Drive como placeholder.
- [ ] Crear `modules/admin/hooks/useLibraryStore.ts` con Zustand: estado `ramos[]`, acciones `addRamo`, `updateRamo`, `toggleActivo`, `removeRamo`.

### Fase 2 — Vista productores (intranet)
- [ ] Implementar `LibraryHero.tsx`.
- [ ] Implementar `LibraryRamoCard.tsx`.
- [ ] Implementar `LibraryCategoryGrid.tsx` (grilla 4 col responsive, reemplaza stub).
- [ ] Implementar `LibraryRamosSection.tsx` (header + `LibraryCategoryGrid`).
- [ ] Implementar `LibrarySecondarySection.tsx` con pills de ramos SECUNDARIO.
- [ ] Actualizar `LibraryCard.tsx` (stub → reexporta o wrappea `LibraryRamoCard`).
- [ ] Componer `DigitalLibraryPage.tsx` con las tres secciones.

### Fase 3 — Vista gestión admin
- [ ] Implementar `LibraryRamoStatusBadge.tsx` y `LibraryRamoTipoBadge.tsx`.
- [ ] Implementar `LibraryHeader.tsx`.
- [ ] Implementar `LibraryToolbar.tsx` (search + botón nuevo ramo).
- [ ] Implementar `LibraryRamoTable.tsx` con acciones inline.
- [ ] Implementar `LibraryRamoFormModal.tsx` (crear + editar, mismo modal).
- [ ] Implementar `LibraryRamoDeleteModal.tsx`.
- [ ] Componer `LibraryManagementDashboard.tsx`.
- [ ] Crear `LibraryManagementPage.tsx` como entry point.

### Fase 4 — Router y cierre
- [ ] Actualizar `router/index.tsx`: `/admin/biblioteca` → `LibraryManagementPage`.
- [ ] Verificar smoke visual ambas rutas (intranet y admin) con los tres roles.
- [ ] Confirmar que PRODUCTOR no puede acceder a `/admin/biblioteca` (redirige a `/unauthorized`).

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| URL de Google Drive expira o cambia | Alta | Medio | Admin puede editarla en cualquier momento desde la tabla sin deploy |
| Conjunto de iconos insuficiente para nuevos ramos | Media | Baja | Agregar nuevas claves a `RamoIcono` es un cambio mínimo sin migración |
| Stubs `LibraryCard` / `LibraryCategoryGrid` reusados en otro lugar | Baja | Medio | Verificar con `rg "LibraryCard\|LibraryCategoryGrid"` antes de modificar |
| Número de ramos crece y la grilla se desordena visualmente | Baja | Baja | El campo `orden: number` permite reordenar desde el form admin |

---

## Plan de rollout

- [ ] Feature flag: no aplica — la ruta ya existe, solo cambia de stub a implementada.
- [ ] Migraciones: ninguna (100 % client-side en esta iteración).
- [ ] Variables de entorno nuevas: ninguna.
- [ ] Comunicación a usuarios: informar a productores cuando la sección esté activa.
- [ ] Plan de rollback: revertir el commit del router para restaurar el stub.

---

## Métricas de éxito

- La vista de productores renderiza sin errores de consola en Chrome/Firefox.
- El botón "Explorar contenido" abre la URL de Google Drive en pestaña nueva.
- Un admin puede crear un ramo, editarlo y eliminarlo dentro de la misma sesión sin recargar la página.
- La vista admin (`/admin/biblioteca`) no es accesible para el rol PRODUCTOR (redirige a `/unauthorized`).
- Los ramos marcados como inactivos no aparecen en la vista de productores.

---

## Preguntas abiertas

- [ ] ¿Cuántos ramos reales hay al momento del lanzamiento? — _responde:_ @negocio
- [ ] ¿Los ramos SECUNDARIO también tienen descripción o solo nombre + link? — _responde:_ @negocio / @diseño
- [ ] ¿El campo `orden` se gestiona manualmente con un número entero o con drag-and-drop? — _responde:_ @famil (drag-and-drop fuera de scope por ahora)
- [ ] ¿El link de Google Drive es por ramo (una carpeta por ramo) o puede haber sub-recursos dentro de cada ramo? — _responde:_ @negocio

---

## Referencias

- **Figma / Mockup:** imagen "Vista de Biblioteca Digital" adjunta (dos paneles: nav abierto y cerrado)
- **Tickets relacionados:** MAPS-007 (noticias), MAPS-009 (admin productores), **MAPS-012** (API biblioteca)
- **TDD backend:** [`MAPS-012-tdd-biblioteca-digital-api.md`](./MAPS-012-tdd-biblioteca-digital-api.md)
- **Patrón de referencia para el store:** `modules/admin/hooks/useNews.ts` (MAPS-007)
- **Router base:** `frontend/src/router/index.tsx`
- **Sidebar items:** `frontend/src/shared/constants/sidebarItems.tsx`
- **Work-log de implementación UI:** [`docs/worklog/MAPS-011-biblioteca-digital.md`](../worklog/MAPS-011-biblioteca-digital.md)
