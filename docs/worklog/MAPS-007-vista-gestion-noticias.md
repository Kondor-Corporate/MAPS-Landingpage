# MAPS-007 — Vista de Gestión de Noticias (panel Admin)

Documentación de la feature **Vista de gestión de noticias** (`/admin/noticias`) dentro del proyecto MAPS Asesores. Complementa el [README técnico](../README.md), el [README raíz](../../README.md) y el [TDD aprobado](../tdd/MAPS-007-tdd-vista-gestion-noticias.md).

---

## Objetivo

Implementar la vista `/admin/noticias` con dos pestañas (Crear Nueva Noticia | Listado de Noticias), un formulario de creación/edición con metadata (título, categoría, audiencia, imagen de portada, cuerpo) y una tabla de "Noticias Recientes" con acciones inline (ver / editar / eliminar). Reemplaza el stub `Sección en construcción` que existía en `NewsManagementPage.tsx`.

La feature deja operativa toda la capa de UI: tabs, formulario con validación, uploader de imagen con preview, tabla con badges, paginación, modales de filtro / preview / confirmación de eliminación, y soporte para los dos roles habilitados (ADMIN y SUPERADMIN). Backend real queda fuera de scope (ver "Pendientes").

---

## Cambios implementados

### 1. Tipos y datos mock

**Archivos:**

- `frontend/src/modules/admin/types/news.ts`
- `frontend/src/modules/admin/data/newsMock.ts`

Se define el tipo `News` con `id`, `titulo`, `categoria` (enum cerrado), `audiencia` (`PRODUCTORES | PUBLICO`), `estado` (`BORRADOR | PUBLICADO`), `cuerpo` (texto plano), `imagenPortada` (`string | null` — dataURL), `fechaPublicacion` y `ultimaModificacion` (ISO). Se exportan `NewsInput` (sin `id` ni `ultimaModificacion`), `CATEGORIA_OPTIONS`, `AUDIENCIA_LABEL`, `ESTADO_LABEL`, `CATEGORIA_LABEL` para reuso desde formularios y badges.

`newsMock.ts` provee 7 noticias seed con thumbnails de `picsum.photos` (URL determinista por seed), mix de estados/audiencias/categorías y fechas relativas calculadas en runtime con un helper `isoDaysAgo`. Una noticia (`COMUNICADO` borrador) se deja con `imagenPortada: null` para validar el render del placeholder.

Se trabaja con mock porque el backend (`backend/src/controllers/`) no tiene controlador de noticias todavía. Cuando se implemente, se reemplaza el store por `axios` sin tocar la UI.

---

### 2. Store de noticias y hook de filtros

**Archivos:**

- `frontend/src/modules/admin/hooks/useNews.ts`
- `frontend/src/modules/admin/hooks/useNewsFilters.ts`

`useNews` es un store Zustand (mismo **patrón de store mock** histórico en admin que `useProducers` antes de MAPS-009; productores ya migró a API) con la lista en memoria y CRUD: `addNews`, `updateNews`, `setEstado`, `removeNews`. Cada operación actualiza `ultimaModificacion`. Generación de IDs con `Date.now().toString(36)` + random.

`useNewsFilters` expone `search`, `filters` (audiencia / estado / categoría / rango fechas), `setFilter`, `reset`, `apply(items)` (función pura) y `activeCount` (cantidad de filtros activos para el badge del botón Filtrar).

---

### 3. Refactor de paginación a `shared/components`

**Archivos:**

- `frontend/src/shared/components/TablePagination.tsx` (nuevo, copia de la paginación de productores)
- `frontend/src/modules/admin/components/ProducersPagination.tsx` (eliminado)
- `frontend/src/modules/admin/components/ProducersDashboard.tsx` (import actualizado)

Se renombró `ProducersPagination` → `TablePagination` y se movió a `shared/components/` para que tanto la tabla de productores como la de noticias lo reusen sin duplicar. Cambio puramente mecánico: el contenido del componente es el mismo (mismas props, misma lógica de elipsis, mismas opciones 8/16/32 por página). Se actualizó el único import existente en `ProducersDashboard`.

---

### 4. Componentes pequeños (badges, header, tabs, acciones)

**Archivos nuevos:**

- `frontend/src/modules/admin/components/NewsAudienceBadge.tsx`
- `frontend/src/modules/admin/components/NewsStatusBadge.tsx`
- `frontend/src/modules/admin/components/NewsHeader.tsx`
- `frontend/src/modules/admin/components/NewsTabs.tsx`
- `frontend/src/modules/admin/components/NewsTableActions.tsx`

`NewsAudienceBadge` — pill `bg-violet-50 text-violet-700` con label "Productores" / "Público".

`NewsStatusBadge` — pill con punto de color (emerald para Publicado, amber para Borrador) — más visual que el badge plano del Figma.

`NewsHeader` — `<h1>` "Gestión de Noticias" + bajada institucional.

`NewsTabs` — segmented control con underline en el tab activo + íconos (`FilePlus2`, `ListChecks`). Roles ARIA `tab` y `aria-selected` para accesibilidad.

`NewsTableActions` — 3 íconos (`Eye`, `Pencil`, `Trash2`) en cada fila con `title` + `aria-label` específicos por noticia.

---

### 5. Form de creación/edición

**Archivos:**

- `frontend/src/modules/admin/components/NewsImageUploader.tsx` (nuevo)
- `frontend/src/modules/admin/components/NewsRichTextEditor.tsx` (nuevo)
- `frontend/src/modules/admin/components/NewsAudienceCard.tsx` (nuevo)
- `frontend/src/modules/admin/components/NewsPublishActionsCard.tsx` (nuevo)
- `frontend/src/modules/admin/components/NewsForm.tsx` (rellenado, antes era `return null`)

`NewsImageUploader` — `<input type="file">` oculto detrás de un botón estilizado. Al seleccionar:

1. Valida MIME (`image/*`).
2. Valida tamaño ≤ 2 MB (límite acordado).
3. Lee con `FileReader.readAsDataURL` y emite el dataURL al padre.

Si ya hay imagen, muestra preview con botón "X" para quitarla y "Reemplazar imagen". Errores de validación se renderizan inline en rojo.

`NewsRichTextEditor` — toolbar **decorativa** con 5 botones (Bold, Italic, ListOrdered, Link, Image), todos `disabled` con `title="Próximamente"` y opacidad reducida. Debajo, un `<textarea>` controlado de 8 filas. Decisión documentada en el TDD: no se monta WYSIWYG real porque el formato de persistencia (Markdown vs HTML vs JSON) conviene decidirlo con el backend.

`NewsAudienceCard` — card "Audiencia" con dos `<input type="radio">` mutuamente excluyentes (Productores / Público General). El radio activo resalta toda la option con `border-maps-brand bg-maps-brand-soft`.

`NewsPublishActionsCard` — card con CTAs:

- **"Publicar Ahora"** (sólido `bg-maps-brand`) o **"Actualizar y Publicar"** en modo edit.
- **"Guardar Borrador"** (outline) o **"Guardar cambios"** en edit.
- **"Cancelar edición"** (link sutil) solo en edit.
- Footer live: `Estado: <BORRADOR|PUBLICADO> · Último cambio: <relativeTimeFromNow>`.

`NewsForm` — orquestador del form. Recibe `state` (controlado por el padre), `onChange`, `onSubmit(input)` y `onCancelEdit?`. Layout `grid-cols-1 lg:grid-cols-[1fr_320px]` (la sidebar pasa abajo en mobile). Validación inline:

| Campo | Regla |
|-------|-------|
| `titulo` | trim ≥ 5 chars |
| `categoria` | requerida (no vacía) |
| `cuerpo` | trim ≥ 20 chars |

Los errores se muestran solo después del primer intento de submit (`showErrors` local). Cada `onChange` actualiza `ultimaModificacion: new Date().toISOString()` para que el footer del card de acciones refleje el "Último cambio" en vivo.

---

### 6. Tabla y modales

**Archivos nuevos:**

- `frontend/src/modules/admin/components/RecentNewsTable.tsx`
- `frontend/src/modules/admin/components/NewsViewModal.tsx`
- `frontend/src/modules/admin/components/NewsDeleteConfirmModal.tsx`
- `frontend/src/modules/admin/components/NewsFilterModal.tsx`

`RecentNewsTable` — tabla desktop (`<table>`) con columnas NOTICIA / FECHA / AUDIENCIA / ESTADO / ACCIONES; degrada a cards apiladas en `<lg`. Empty state propio con icono `Inbox` cuando `news.length === 0`. Thumbnail real (img de dataURL o URL pública) con fallback a un placeholder gris (icono `ImageIcon`) si la noticia no tiene `imagenPortada`. Fecha formateada con `Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })`.

`NewsViewModal` — preview modal con thumbnail grande, badges, fecha completa y cuerpo formateado con `whitespace-pre-line`. Footer con CTA "Editar" que cierra el modal y abre el form en modo edit.

`NewsDeleteConfirmModal` — confirmación con icono de alerta, nombre de la noticia en bold y CTA destructivo rojo.

`NewsFilterModal` — modal con audiencia / estado / categoría / rango fechas (desde/hasta). Trabaja con un `draft` local que se inicializa con `initialFilters` cada vez que abre. Aplica todos los filtros de una pasada o limpia con "Limpiar filtros".

Todos reusan el `Modal` compartido (`frontend/src/shared/components/Modal.tsx`).

---

### 7. Orquestador y página

**Archivos:**

- `frontend/src/modules/admin/components/NewsManagementDashboard.tsx` (nuevo)
- `frontend/src/modules/admin/pages/NewsManagementPage.tsx` (reescrito)

`NewsManagementDashboard` — orquestador de toda la vista. Mantiene:

- Tab activo (`'crear' | 'listado'`).
- Estado del form (`NewsFormState`) **en el padre**, lo que permite que el form persista al cambiar de tab y volver.
- `editing: News | null` para distinguir crear vs editar.
- `viewing`, `deleting`, `filterOpen` para los 3 modales.
- Estado de paginación (`page`, `pageSize`).

Handlers clave:

```tsx
function handleEdit(n: News) {
  setEditing(n);
  setFormState(newsToFormState(n));
  setActiveTab('crear');         // saltar al tab del form
}

function handleSubmit(input: NewsInput) {
  if (editing) updateNews(editing.id, input);
  else { addNews(input); setPage(1); }
  setEditing(null);
  setFormState({ ...EMPTY_FORM, ultimaModificacion: new Date().toISOString() });
}
```

La sección "Noticias Recientes" se renderiza **siempre**, en ambos tabs (consistente con el Figma). La paginación solo aparece si `filtered.length > pageSize`.

`NewsManagementPage` se reduce a un wrapper de una línea:

```tsx
// antes
export function NewsManagementPage() {
  return (
    <div className="flex flex-col gap-2 px-8 py-6">
      <h1 className="text-3xl font-bold text-maps-heading">Noticias</h1>
      <p className="text-maps-body">Sección en construcción.</p>
    </div>
  );
}

// después
export function NewsManagementPage() {
  return <NewsManagementDashboard />;
}
```

---

## Estado del sistema tras MAPS-007 (vista gestión noticias)

### Rutas habilitadas

```
/admin/noticias  →  NewsManagementPage  →  NewsManagementDashboard
                   RoleGuard(['ADMIN', 'SUPERADMIN'])  ·  AppLayout
```

`router/index.tsx` no se modificó — la ruta y el guard ya estaban definidos desde MAPS-004; lo único que cambió es que ahora rinde la UI real en lugar del stub.

### Estado de los stubs anteriores

| Archivo | Antes | Después |
|---------|-------|---------|
| `NewsManagementPage.tsx` | `<h1>Noticias</h1> Sección en construcción` | `<NewsManagementDashboard />` |
| `NewsForm.tsx` | `return null` | Form completo con grid 2 cols + validación inline |

### Decisiones de UI vs. el Figma

| Diseño | Implementación | Razón |
|--------|----------------|-------|
| Toolbar del editor totalmente visible (sin indicación de estado) | Botones `disabled` con `title="Próximamente"` y opacidad reducida | Evita que el admin haga click esperando que algo pase; deja claro que es mock |
| Estado en el footer del card mostrado como texto plano | Estado con color (`text-emerald-700` para Publicado, `text-amber-700` para Borrador) | Acompaña al badge de la tabla; mayor escaneabilidad |
| Sin paginación visible | Paginación condicional cuando `filtered.length > pageSize` | El seed son 7 noticias; al crecer, paginar es necesario |
| Acciones en columna sin hover hint | Cada ícono con `title` y `aria-label` que incluye el título de la noticia | Accesibilidad |
| Sin estado vacío explícito en el Figma | Empty state con icono `Inbox` cuando los filtros no devuelven resultados | UX necesaria |
| Sidebar de creación siempre fija | En mobile (`<lg`) la sidebar (audiencia + acciones) pasa debajo del contenido | Fast-path responsive |

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| `npx tsc --noEmit` pasa limpio | Exit 0 |
| `npx vite build` compila sin errores nuevos | OK (solo el warning preexistente de `maplibre-gl > 500 KB`) |
| `/admin/noticias` rinde la vista real (no el stub) | `<NewsManagementDashboard />` |
| Tabs cambian entre Crear y Listado sin perder el form | Estado del form vive en el dashboard |
| Crear noticia como Publicada / Borrador con validación inline | `tryCommit` valida antes de llamar `onSubmit` |
| Subir imagen ≤ 2 MB con preview | `NewsImageUploader` con `FileReader` + validación |
| Imagen > 2 MB es rechazada con error inline | Mensaje "La imagen no puede superar los 2 MB" |
| Tabla muestra thumbnail / título+categoría / fecha / audiencia / estado / acciones | `RecentNewsTable` |
| Filtros (audiencia / estado / categoría / fechas) modifican la tabla y muestran badge | `NewsFilterModal` + `useNewsFilters.activeCount` |
| Ver noticia abre modal con preview formateado | `NewsViewModal` |
| Editar carga el form en el tab Crear con datos precargados | `handleEdit` + `newsToFormState` |
| Cancelar edición vuelve el form a vacío | `handleCancelEdit` |
| Eliminar pide confirmación y luego remueve la noticia | `NewsDeleteConfirmModal` + `removeNews` |
| Editar una noticia publicada NO la vuelve a borrador | `tryCommit` respeta el estado actual salvo cambio explícito |
| Refactor de paginación no rompe `/admin/productores` | `tsc` + `vite build` OK |

---

## Pruebas manuales recomendadas

```
1. Login como superadmin / Super1234! → /admin/dashboard
   → click "Noticias" en sidebar → se ve "Gestión de Noticias" + tabs + form vacío + tabla con 7 mock

2. Crear noticia
   → completar título "Test publicación inmediata", categoría Novedad, audiencia Productores
   → escribir 30+ chars en el cuerpo
   → click "Publicar Ahora"
   → la noticia aparece como primera fila de la tabla con badge Publicado verde

3. Validación
   → vaciar el form, click "Publicar Ahora"
   → se muestran 3 errores inline (título, categoría, cuerpo)
   → completar parcialmente y reintentar → solo quedan los errores que faltan

4. Imagen de portada (válida)
   → click "Subir Imagen" → seleccionar un PNG/JPG de < 2 MB
   → aparece preview en el form
   → publicar → la noticia muestra thumbnail real en la tabla

5. Imagen de portada (límite)
   → seleccionar una imagen > 2 MB
   → mensaje rojo "La imagen no puede superar los 2 MB"
   → form no acepta la imagen

6. Guardar borrador
   → completar form, click "Guardar Borrador"
   → la noticia aparece con badge Borrador ámbar
   → estado live durante el tipeo: "Estado: Borrador · Último cambio: hace unos segundos"

7. Cambiar tab no rompe el form
   → empezar a tipear título → cambiar a "Listado de Noticias" → volver a "Crear Nueva Noticia"
   → el título sigue ahí

8. Editar
   → click ícono lápiz en cualquier fila → tab cambia a Crear, form precargado
   → CTAs cambian a "Actualizar y Publicar" + "Guardar cambios" + "Cancelar edición"
   → modificar título → guardar → la fila refleja el cambio

9. Editar publicada NO la vuelve borrador
   → editar una con badge Publicado, tocar solo "Guardar cambios"
   → la noticia sigue Publicado (no se degrada)

10. Filtros
    → click "Filtrar" → audiencia=Productores, estado=Borrador → Aplicar
    → la tabla muestra solo borradores de productores
    → badge "1" o "2" en el botón Filtrar

11. Preview (ojo)
    → click ícono ojo → modal con thumbnail grande, badges, fecha completa, cuerpo
    → click "Editar" en el modal → cierra modal y abre form en edit

12. Eliminar
    → click ícono trash → modal de confirmación con título de la noticia
    → "Cancelar" → modal cierra, noticia sigue
    → "Eliminar" → noticia desaparece de la tabla

13. Roles
    → login como admin / Admin1234! → mismo comportamiento
    → login como productor → /admin/noticias debería redirigir a /unauthorized

14. Responsive
    → DevTools < lg → la sidebar del form pasa abajo
    → la tabla colapsa a cards apiladas

15. Paginación
    → crear 8+ noticias → aparece la paginación abajo de la tabla
    → cambiar Filas: 8 → 16 → más filas visibles, vuelve a página 1
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Backend real de noticias | No existe `backend/src/controllers/news.controller.ts`. Cuando se implemente, reemplazar `useNews` (mock store) por `axios` + (React Query o `useEffect`). Contrato sugerido: `GET /news?audiencia=&estado=&search=`, `POST /news`, `PATCH /news/:id`, `DELETE /news/:id`. Idealmente precedido por un TDD propio. |
| Editor WYSIWYG real | Hoy la toolbar (B/I/U/link/image) es decorativa (`disabled`). Cuando se decida formato (Markdown / HTML / JSON ProseMirror) junto con el backend, integrar TipTap u otro y conectar la toolbar real. Documentado como decisión deliberada en el TDD. |
| Persistencia de imagen | Hoy se guarda como `dataURL` en memoria (se pierde al refresh). Cuando entre el backend, mover a S3 / Cloudinary y guardar solo la URL en el store. |
| Persistencia general | Store 100% en memoria; al refrescar se pierden cambios. Resuelto por backend real. |
| Set canónico de categorías | Las 5 actuales (`NOVEDAD`, `EVENTO`, `CIRCULAR`, `PRODUCTO`, `COMUNICADO`) son una propuesta. Validar con stakeholder antes de fijarlas. |
| Tests | El proyecto no tiene setup de testing. Pendiente para feature futura (Vitest unit + Playwright E2E). |
| Toast / feedback post-acción | Crear, editar y eliminar reflejan el cambio en la tabla pero no notifican al usuario. Sumar sistema de toasts compartido. |
| Programación de publicación | Publicar en fecha futura no está soportado (no estaba en el Figma). |
| Historial de versiones | Editar pisa el cuerpo previo (no estaba en el Figma). |
| Multi-imagen / galería en el cuerpo | Solo imagen de portada. |
| Exportar listado (CSV / Excel) | Pedido típico de admin, no estaba en el Figma. |
| Búsqueda full-text del listado | Hoy `useNewsFilters` filtra por título / cuerpo client-side. Cuando crezca el dataset, mover al backend. |
| Skeleton de carga | Render sincrónico hoy; cuando entre el fetch async, agregar skeleton en `RecentNewsTable`. |

---

*Documento generado en la feature MAPS-007 — Vista de Gestión de Noticias. TDD asociado: [`docs/tdd/MAPS-007-tdd-vista-gestion-noticias.md`](../tdd/MAPS-007-tdd-vista-gestion-noticias.md).*
