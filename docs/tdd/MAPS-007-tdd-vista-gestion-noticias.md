# MAPS-007 — TDD: Vista de Gestión de Noticias (panel Admin)

Documento de diseño técnico para la vista `/admin/noticias` dentro del proyecto MAPS Asesores.

**Estado:** Implementado
**Autor:** @joaco
**Revisores:** —
**Creado:** 2026-05-06
**Última actualización:** 2026-05-06

---

## Resumen

Implementar la vista `/admin/noticias` con dos pestañas (Crear Nueva Noticia | Listado de Noticias), un formulario de creación/edición con metadata (título, categoría, audiencia, imagen de portada, cuerpo) y una tabla de noticias recientes con acciones inline (preview / editar / eliminar). Reemplaza el stub `Sección en construcción` actual de `NewsManagementPage.tsx`. Misma estrategia mock de MAPS-007 productores: Zustand en memoria, sin backend real.

---

## Objetivo

Dejar operativa toda la capa de UI de gestión de noticias para los roles ADMIN y SUPERADMIN con fidelidad al diseño de Figma (las dos vistas del board: nav abierto y nav cerrado). La feature debe permitir:

- Cambiar entre tab "Crear Nueva Noticia" y "Listado de Noticias" sin perder el estado del form.
- Crear una noticia como **Borrador** o **Publicada** desde el form, asignando audiencia (Productores | Público General) y categoría.
- Subir imagen de portada con preview (en memoria, vía `FileReader`).
- Listar las noticias recientes en tabla con thumbnail, fecha, badges de audiencia y estado, y acciones (ver / editar / eliminar).
- Filtrar el listado por audiencia, estado, categoría y rango de fechas.
- Editar y eliminar noticias desde la tabla.

Backend real queda fuera de scope (ver "Fuera de alcance").

---

## Contexto

### Situación actual

- `frontend/src/modules/admin/pages/NewsManagementPage.tsx` es un stub:

  ```tsx
  export function NewsManagementPage() {
    return (
      <div className="flex flex-col gap-2 px-8 py-6">
        <h1 className="text-3xl font-bold text-maps-heading">Noticias</h1>
        <p className="text-maps-body">Sección en construcción.</p>
      </div>
    );
  }
  ```

- `frontend/src/modules/admin/components/NewsForm.tsx` existe pero es `return null;`.
- La ruta `/admin/noticias` ya está cableada en `frontend/src/router/index.tsx:88` con `RoleGuard(['ADMIN','SUPERADMIN'])` y dentro de `AppLayout`.
- El sidebar ya tiene el item "Noticias" para ambos roles (verificado vía `getSidebarItems`).
- Existe un tipo `NewsItem` muy básico en `frontend/src/shared/types/news.ts` usado por la web pública (`mockNews`, `RecentNewsCard`, `RecentNewsGrid`). **No** se reusa para el admin: tiene un shape distinto (orientado a presentación pública) y mezclar las dos cosas genera fricción. El admin tendrá su propio tipo `News` más rico.
- El backend `backend/src/controllers/` no tiene controlador de noticias todavía. La sección queda 100% mock client-side.

### Por qué ahora

MAPS-007 dejó cerrada la sección Productores. La ruta `/admin/noticias` ya está visible en el sidebar pero al entrar muestra "Sección en construcción", lo que rompe la sensación de panel completo en demos. Esta feature cierra el segundo gran flujo del admin para que el panel sea presentable de punta a punta.

---

## Alcance

- **Tipos**: `News`, `NewsAudiencia`, `NewsEstado`, `NewsCategoria`, `NewsInput` en `modules/admin/types/news.ts`.
- **Mock data**: 6–8 noticias de ejemplo con thumbnails (gradient o dataURL placeholder), fechas relativas, mix de estados y audiencias.
- **Store Zustand**: `useNews` con `addNews`, `updateNews`, `removeNews`, `setEstado`.
- **Hook de filtros**: `useNewsFilters` siguiendo el patrón de `useProducerFilters` (search + filtros + `apply` puro + `activeCount`).
- **Componentes nuevos en `modules/admin/components/`**:
  - `NewsManagementDashboard.tsx` (orquestador principal, equivalente a `ProducersDashboard`).
  - `NewsHeader.tsx` (título "Gestión de Noticias" + bajada).
  - `NewsTabs.tsx` (tabs "Crear Nueva Noticia" | "Listado de Noticias" con underline activo).
  - `NewsForm.tsx` (rellenado, hoy es `return null`) — formulario completo con grid 2 columnas.
  - `NewsRichTextEditor.tsx` (toolbar visual decorativa B/I/U/link/image + `<textarea>` controlado).
  - `NewsImageUploader.tsx` (`<input type="file">` con preview vía `FileReader.readAsDataURL`).
  - `NewsAudienceCard.tsx` (card "Audiencia" con dos radios mutuamente excluyentes).
  - `NewsPublishActionsCard.tsx` (card "Acciones de Publicación" con CTAs + estado live).
  - `NewsAudienceBadge.tsx` (pill purple con label "Productores" o "Público").
  - `NewsStatusBadge.tsx` (pill emerald "Publicado" o amber "Borrador").
  - `RecentNewsTable.tsx` (tabla con thumb / título+categoría / fecha / audiencia / estado / acciones).
  - `NewsTableActions.tsx` (3 íconos: `Eye`, `Pencil`, `Trash2`).
  - `NewsFilterModal.tsx` (filtros audiencia / estado / categoría / rango fechas — reusa `Modal`).
  - `NewsViewModal.tsx` (preview de noticia: thumbnail grande + meta + cuerpo formateado).
  - `NewsDeleteConfirmModal.tsx` (confirmación de eliminación).
- **Página reescrita**: `NewsManagementPage.tsx` pasa de stub a wrapper de `<NewsManagementDashboard />`.
- **Reusos del repo**:
  - `Modal` de `shared/components/Modal.tsx` para los 3 modales nuevos.
  - `ProducersPagination` de admin: **se renombra a `TablePagination`** y se mueve a `shared/components/` para reusarlo desde tabla de productores y de noticias sin duplicar (refactor mínimo, los imports actuales se actualizan).
  - `relativeTimeFromNow` de `shared/utils/relativeTime.ts` para la columna Fecha.
  - `getInitials` / `Avatar` no aplican (las noticias tienen thumbnail, no avatar).

### Fuera de alcance

- **Backend real**: no existe `backend/src/controllers/news.controller.ts`. Cuando se cree, hay que reemplazar `useNews` (mock store) por axios + (React Query o `useEffect`). El contrato sugerido: `GET /news?audiencia=&estado=&search=`, `POST /news`, `PATCH /news/:id`, `DELETE /news/:id`. Se documentará en un TDD aparte.
- **Editor WYSIWYG real (TipTap / Quill / Lexical)**: el cuerpo se guarda como texto plano en un `<textarea>`. La toolbar es **decorativa** (botones `disabled` con `title="Próximamente"`). Esta decisión es deliberada — ver "Decisiones tomadas".
- **Persistencia de la imagen**: la imagen de portada se guarda como `dataURL` en el store en memoria. Se pierde al refrescar. Cuando entre el backend, se sube a S3/Cloudinary y se guarda solo la URL.
- **Persistencia general**: el store es 100% en memoria. Se pierde al refresh.
- **Tests**: el proyecto no tiene setup de testing. Pendiente para feature futura.
- **Toasts**: hoy las acciones se reflejan visualmente sin notificación (igual que MAPS-007 productores).
- **Programación de publicación** (publicar en fecha futura) y **historial de versiones**: no están en el Figma.
- **Multi-imagen / galería en el cuerpo**: solo imagen de portada.

---

## Diseño propuesto

### Resumen

```
NewsManagementPage
└── NewsManagementDashboard          (orquestador, mantiene tab activo + estado modales)
    ├── NewsHeader                   (título + bajada)
    ├── NewsTabs                     (tabs Crear / Listado)
    ├── [tab=crear]
    │   └── NewsForm                 (grid 2 col — contenido | sidebar)
    │       ├── (col izq) Card "Contenido de la Noticia"
    │       │   ├── input título
    │       │   ├── select categoría + NewsImageUploader
    │       │   └── NewsRichTextEditor (toolbar mock + textarea)
    │       └── (col der) stack
    │           ├── NewsAudienceCard
    │           └── NewsPublishActionsCard
    ├── [tab=listado] (oculto el form, expande la tabla)
    └── Sección "Noticias Recientes" (siempre visible debajo)
        ├── header: título + botón Filtrar (con badge)
        ├── RecentNewsTable
        └── TablePagination
    ├── NewsFilterModal              (controlado por filterOpen)
    ├── NewsViewModal                (controlado por viewing)
    └── NewsDeleteConfirmModal       (controlado por deleting)
```

Notas de layout:

- El form usa `grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6`. La col derecha pasa abajo en mobile.
- La sección "Noticias Recientes" **siempre se renderiza**, en ambos tabs. Lo que cambia entre tabs es la visibilidad del form de arriba (consistente con lo que muestra el Figma).
- La paginación solo aparece si hay > pageSize noticias.

### Componentes / archivos afectados

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| Tipo `News` y derivados | `frontend/src/modules/admin/types/news.ts` | Nuevo — modelo central de noticia |
| Mock data | `frontend/src/modules/admin/data/newsMock.ts` | Nuevo — 6–8 noticias seed |
| Store de noticias | `frontend/src/modules/admin/hooks/useNews.ts` | Nuevo — Zustand CRUD |
| Hook de filtros | `frontend/src/modules/admin/hooks/useNewsFilters.ts` | Nuevo — search + filtros + apply puro |
| Orquestador | `frontend/src/modules/admin/components/NewsManagementDashboard.tsx` | Nuevo — equivalente a `ProducersDashboard` |
| Header | `frontend/src/modules/admin/components/NewsHeader.tsx` | Nuevo — título + bajada |
| Tabs | `frontend/src/modules/admin/components/NewsTabs.tsx` | Nuevo — segmented control con underline |
| Form (rellenar stub) | `frontend/src/modules/admin/components/NewsForm.tsx` | Modificado — pasa de `return null` al form completo |
| Editor mock | `frontend/src/modules/admin/components/NewsRichTextEditor.tsx` | Nuevo — toolbar decorativa + textarea |
| Uploader imagen | `frontend/src/modules/admin/components/NewsImageUploader.tsx` | Nuevo — file input con preview |
| Audience card | `frontend/src/modules/admin/components/NewsAudienceCard.tsx` | Nuevo — radios Productores / Público |
| Publish actions card | `frontend/src/modules/admin/components/NewsPublishActionsCard.tsx` | Nuevo — Publicar / Borrador + estado live |
| Audience badge | `frontend/src/modules/admin/components/NewsAudienceBadge.tsx` | Nuevo — pill purple |
| Status badge | `frontend/src/modules/admin/components/NewsStatusBadge.tsx` | Nuevo — pill verde / ámbar |
| Tabla | `frontend/src/modules/admin/components/RecentNewsTable.tsx` | Nuevo — desktop table + mobile cards |
| Acciones de fila | `frontend/src/modules/admin/components/NewsTableActions.tsx` | Nuevo — 3 íconos |
| Filter modal | `frontend/src/modules/admin/components/NewsFilterModal.tsx` | Nuevo — reusa `Modal` |
| View modal | `frontend/src/modules/admin/components/NewsViewModal.tsx` | Nuevo — preview |
| Delete confirm | `frontend/src/modules/admin/components/NewsDeleteConfirmModal.tsx` | Nuevo — confirma eliminación |
| Página | `frontend/src/modules/admin/pages/NewsManagementPage.tsx` | Modificado — stub → `<NewsManagementDashboard />` |
| Paginación compartida | `frontend/src/shared/components/TablePagination.tsx` | Nuevo (movido desde admin) — reuso entre productores y noticias |
| Imports productores | `ProducersDashboard.tsx`, `ProducersPagination.tsx` | Modificado — actualizar import de la paginación movida |

### Modelo de datos

**TypeScript only** — no hay schema DB ni migración (no hay backend).

```ts
// frontend/src/modules/admin/types/news.ts

export type NewsAudiencia = 'PRODUCTORES' | 'PUBLICO';
export type NewsEstado    = 'BORRADOR' | 'PUBLICADO';
export type NewsCategoria = 'NOVEDAD' | 'EVENTO' | 'CIRCULAR' | 'PRODUCTO' | 'COMUNICADO';

export type News = {
  id: string;
  titulo: string;
  categoria: NewsCategoria;
  audiencia: NewsAudiencia;
  estado: NewsEstado;
  cuerpo: string;                 // texto plano por ahora
  imagenPortada: string | null;   // dataURL o null
  fechaPublicacion: string;       // ISO — si BORRADOR, es fecha de creación; si PUBLICADO, fecha de publicación
  ultimaModificacion: string;     // ISO — se actualiza en cada edit
};

export type NewsInput = Omit<News, 'id' | 'ultimaModificacion'>;
```

`CATEGORIA_OPTIONS` exportado del mock para reusar en el `<select>` y en el filtro:

```ts
export const CATEGORIA_OPTIONS: { value: NewsCategoria; label: string }[] = [
  { value: 'NOVEDAD', label: 'Novedad' },
  { value: 'EVENTO', label: 'Evento' },
  { value: 'CIRCULAR', label: 'Circular' },
  { value: 'PRODUCTO', label: 'Producto' },
  { value: 'COMUNICADO', label: 'Comunicado' },
];
```

### Contratos de API

`N/A` — esta feature es 100% client-side. El TDD del backend de noticias se redactará por separado cuando se priorice.

### UI / UX

**Figma:** referencia provista por el usuario en la conversación (vista con NAV abierto y NAV cerrado). No hay link público.

**Tokens y estilos:**

- Colores existentes en `tailwind.config.ts`:
  - `maps-brand` (#00a4c0) — CTA "Publicar Ahora", tab activo, audiencia seleccionada.
  - `maps-brand-soft` — fondo sutil del tab activo, pill audiencia.
  - `maps-heading`, `maps-body`, `maps-muted`, `maps-border`, `maps-surface`.
- Colores nuevos para badges (sin agregar a tailwind config — usar utilidades estándar de Tailwind):
  - Audiencia "Productores": `bg-violet-50 text-violet-700`.
  - Audiencia "Público": `bg-violet-50 text-violet-700` (mismo, según Figma — el chip cambia solo el label).
  - Estado "Publicado": `bg-emerald-50 text-emerald-700`.
  - Estado "Borrador": `bg-amber-50 text-amber-700`.

**Estados de UI:**

- **Loading**: N/A (data sincrónica).
- **Empty**: si `noticias.length === 0` después de aplicar filtros, la tabla muestra el mismo empty state que `ProducerTable` (icono `Inbox` + "Sin resultados").
- **Error**: N/A en mock.
- **Validación del form** (inline, igual que `ProducerFormModal`):
  - `titulo`: requerido, mín 5 chars.
  - `categoria`: requerida.
  - `cuerpo`: requerido, mín 20 chars.
  - `audiencia`: siempre default `PRODUCTORES`.
  - `imagenPortada`: opcional.
- **Estado live "Borrador, Último cambio: Hoy 10:45"**: se renderiza basado en `Date.now()` capturado al montar y actualizado en cada `onChange` del form. Se formatea con `relativeTimeFromNow`.

**Flujos:**

1. Usuario llega a `/admin/noticias` → tab "Crear Nueva Noticia" activo por default → ve form vacío + tabla "Noticias Recientes" abajo con el seed mock.
2. Completa el form → el chip de la card derecha actualiza "Borrador, Último cambio: ahora" en cada keystroke.
3. Click "Publicar Ahora" → valida → si OK, `addNews({ ...form, estado: 'PUBLICADO' })` → reset del form → la noticia aparece como primera fila de la tabla.
4. Click "Guardar Borrador" → ídem pero `estado: 'BORRADOR'`.
5. Tab "Listado de Noticias" → form se oculta, tabla queda en pantalla completa con paginación.
6. Click ojo en una fila → `NewsViewModal` con preview.
7. Click pencil → cambia tab a "Crear Nueva Noticia" + carga form en modo edit con esa noticia → CTAs cambian a "Actualizar" / "Cancelar edición".
8. Click trash → `NewsDeleteConfirmModal` → confirmar → `removeNews(id)`.
9. Click "Filtrar" → modal con audiencia / estado / categoría / rango fechas → aplicar.

### Cambios en código existente

- `frontend/src/modules/admin/pages/NewsManagementPage.tsx` — reemplazo total del stub.
- `frontend/src/modules/admin/components/NewsForm.tsx` — el archivo existe vacío; se rellena (no se borra para no romper si alguien lo importa, aunque hoy nadie lo hace).
- `frontend/src/modules/admin/components/ProducersPagination.tsx` — **se elimina** y se reemplaza por import del nuevo `shared/components/TablePagination.tsx`.
- `frontend/src/modules/admin/components/ProducersDashboard.tsx` — actualizar el import de paginación.
- `frontend/src/router/index.tsx` — **sin cambios** (la ruta ya existe).
- `frontend/src/shared/layouts/AppSidebar.tsx` — **sin cambios** (el item ya existe).

---

## Decisiones tomadas

- **Editor WYSIWYG: NO**. Toolbar decorativa + `<textarea>` controlado. Razón: coherencia con el patrón mock del repo (todo lo demás es mock hasta que entre el backend); el formato de persistencia (Markdown vs HTML vs JSON) conviene decidirlo *junto* con el backend para evitar retrabajo. Los botones de la toolbar van `disabled` con `title="Próximamente"` para que sea evidente que no son funcionales.
- **Tipo `News` propio del admin**, separado de `NewsItem` de `shared/types/news.ts`. Razón: `NewsItem` está orientado a la presentación pública (tiene `imageGradient`, `href` para navegar) y mezclarlos genera fricción. Cuando se unifique vía backend, ambos se derivarán del mismo DTO server-side.
- **Imagen de portada como dataURL en memoria** (vía `FileReader.readAsDataURL`). Razón: sin backend no hay dónde subirla; el dataURL permite preview real en la tabla y en el modal de view.
- **Mock + Zustand en memoria**, mismo enfoque que MAPS-007 productores. Razón: paridad con el otro módulo del admin; cuando se integre backend se reemplaza el store sin tocar la UI.
- **Tabs vs vistas separadas (rutas distintas)**: se eligen tabs internos al `NewsManagementPage` (no rutas `/admin/noticias/crear` y `/admin/noticias/listado`). Razón: el Figma claramente muestra tabs y mantiene la sección "Noticias Recientes" visible en ambos; separar en rutas perdería ese contexto compartido.
- **Sección "Noticias Recientes" siempre visible** (en ambos tabs). Razón: el Figma lo muestra así; además da contexto al admin mientras crea (puede ver qué publicó recientemente).
- **Editar carga el form en el tab "Crear"** y cambia los CTAs a "Actualizar" / "Cancelar edición" en lugar de abrir un modal. Razón: el form es grande, un modal sería incómodo; el tab "Crear" ya es el lugar natural para editar contenido.
- **Refactor de `ProducersPagination` a `shared/components/TablePagination`**: se hace dentro de esta feature porque es la primera vez que se necesita reusar y vale la pena pagar la deuda ahora. Riesgo bajo (solo cambia imports).
- **IDs generados con `Date.now()` + random** (mismo patrón que `useProducers`). Razón: paridad. Cuando entre backend, los genera server-side.
- **Filtros client-side** sobre el array completo. Razón: igual que productores, hasta que la cantidad lo justifique.
- **Categorías iniciales fijas**: `NOVEDAD`, `EVENTO`, `CIRCULAR`, `PRODUCTO`, `COMUNICADO`. Razón: el Figma solo muestra "Novedad" y "Evento", pero un set cerrado más amplio anticipa los casos típicos de comunicación interna. La definición canónica queda como pendiente para validar con stakeholder.
- **Límite de imagen de portada: 2 MB**. Razón: balance entre calidad razonable de preview y peso del dataURL en memoria; un límite más alto degrada el render de la tabla porque cada thumbnail vive como base64 en el store.
- **Editar una noticia publicada NO la vuelve a borrador**. Mantiene el estado actual salvo que el admin lo cambie explícitamente. Razón: edits típicos son correcciones menores que no justifican despublicar.

---

## Alternativas consideradas

### Alternativa A — TipTap (WYSIWYG real)

- **Qué era:** integrar `@tiptap/react` + `@tiptap/starter-kit` + extensiones link/image. Toolbar conectada con `editor.chain().focus().toggleBold().run()`.
- **Pros:** botones funcionales; formato persiste; experiencia de demo más realista.
- **Contras:** ~200KB extra al bundle; ~2–3 hs de trabajo extra (toolbar + estilos + serialización); hay que decidir formato (HTML / JSON ProseMirror) sin saber qué espera el backend → posible retrabajo igual; estilos por defecto chocan con la config de Tailwind del repo.
- **Por qué se descartó:** el backend no existe, así que la decisión de formato se está tomando a ciegas. La inversión no se amortiza hasta que haya backend.

### Alternativa B — Rutas separadas (`/admin/noticias/crear` y `/admin/noticias/listado`)

- **Qué era:** dos páginas independientes en el router en lugar de tabs.
- **Pros:** URLs deep-linkables; cada vista más simple aisladamente.
- **Contras:** rompe el diseño del Figma (que muestra tabs y la sección "Noticias Recientes" compartida); más boilerplate (2 páginas + 2 rutas + 2 entries en el router).
- **Por qué se descartó:** el Figma es la fuente de verdad y muestra tabs.

### Alternativa C — Editar en modal (como productores)

- **Qué era:** click en "Editar" abre un `NewsFormModal` con el form completo dentro.
- **Pros:** consistente con el patrón de productores; no requiere lógica de "modo edit" en el dashboard.
- **Contras:** el form de noticias es grande (incluye textarea + uploader + 2 cards laterales); meterlo en modal genera scroll incómodo; el tab "Crear" ya es el lugar natural.
- **Por qué se descartó:** la diferencia de tamaño respecto al form de productores justifica la divergencia.

### Alternativa D — Reusar `NewsItem` de `shared/types/news.ts`

- **Qué era:** evitar crear un tipo nuevo, extender el existente.
- **Pros:** menos archivos.
- **Contras:** `NewsItem` tiene `imageGradient`, `href` y `category: string` (libre); el admin necesita un enum cerrado de categoría, una imagen real, un id, un estado, etc. Mezclar deja un tipo gigante con campos opcionales.
- **Por qué se descartó:** la separación es más limpia. Cuando entre el backend, ambos derivan del DTO server-side.

---

## Plan de implementación

Una sola fase, mergeable como un solo PR (es un módulo nuevo aislado y un refactor menor de paginación).

### Fase 1 — Tipos, mock, store, hooks (fundación)

- [ ] `types/news.ts` con `News`, `NewsAudiencia`, `NewsEstado`, `NewsCategoria`, `NewsInput`, `CATEGORIA_OPTIONS`.
- [ ] `data/newsMock.ts` con 6–8 noticias seed (mix de estados, audiencias, categorías; fechas calculadas con helper).
- [ ] `hooks/useNews.ts` (Zustand CRUD).
- [ ] `hooks/useNewsFilters.ts` (search + filtros + apply puro + activeCount).

### Fase 2 — Refactor de paginación (deuda menor)

- [ ] Mover `ProducersPagination.tsx` → `shared/components/TablePagination.tsx`.
- [ ] Actualizar import en `ProducersDashboard.tsx`.
- [ ] `npx tsc --noEmit` para confirmar que no rompió nada.

### Fase 3 — Componentes pequeños

- [ ] `NewsAudienceBadge.tsx`, `NewsStatusBadge.tsx`.
- [ ] `NewsHeader.tsx`, `NewsTabs.tsx`.
- [ ] `NewsTableActions.tsx`.

### Fase 4 — Form de creación/edición

- [ ] `NewsImageUploader.tsx` (FileReader + preview).
- [ ] `NewsRichTextEditor.tsx` (toolbar mock con `disabled` + textarea).
- [ ] `NewsAudienceCard.tsx`, `NewsPublishActionsCard.tsx`.
- [ ] `NewsForm.tsx` rellenado (rellena el stub, grid 2 columnas).

### Fase 5 — Tabla y modales

- [ ] `RecentNewsTable.tsx` (desktop + cards mobile + empty state).
- [ ] `NewsViewModal.tsx`, `NewsDeleteConfirmModal.tsx`, `NewsFilterModal.tsx`.

### Fase 6 — Orquestador y wiring

- [ ] `NewsManagementDashboard.tsx` (tabs + estado modales + handlers).
- [ ] Reescribir `NewsManagementPage.tsx` como wrapper.

### Fase 7 — Verificación

- [ ] `npx tsc --noEmit` exit 0.
- [ ] `npm run dev` sin warnings.
- [ ] Pruebas manuales (ver "Pruebas manuales recomendadas" en el work-log post-implementación).

### Fase 8 — Worklog

- [ ] Generar `docs/worklog/MAPS-007-vista-gestion-noticias.md` siguiendo `_TEMPLATE-worklog.md`.
- [ ] Marcar este TDD como **Implementado**.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Refactor de `ProducersPagination` rompe la sección Productores | Baja | Medio | Hacer el refactor en commit aparte y validar `/admin/productores` antes de seguir |
| dataURL de imagen pesa mucho y degrada el render de la tabla | Baja | Bajo | Limitar tamaño en el uploader (mín validación: < 2MB); cuando entre backend pasa a URL real |
| Toolbar decorativa confunde al usuario que prueba ("¿por qué no funciona?") | Media | Bajo | `disabled` real + `title="Próximamente"` + opacidad reducida |
| Cambiar de tab pierde el form a medio completar | Media | Medio | El estado del form vive en el dashboard (no en el componente del tab), persiste entre tabs |
| Inconsistencia entre badge "Productores" del admin y el chip de la web pública | Baja | Bajo | Documentar en el worklog; cuando se unifique vía backend, se centraliza el badge |
| El cambio del tipo `News` colisiona con `NewsItem` existente | Muy baja | Bajo | Tipo en namespace distinto (`modules/admin/types/news.ts`), no se importa donde está `shared/types/news.ts` |

---

## Plan de rollout

- [ ] Feature flag: **no**. La ruta ya existe y hoy muestra un stub; reemplazar el stub por la UI real es una mejora incremental sin riesgo de regresión funcional.
- [ ] Migraciones: **N/A** (sin backend).
- [ ] Variables de entorno nuevas: **ninguna**.
- [ ] Comunicación a usuarios: **N/A** (proyecto en desarrollo, no hay usuarios prod).
- [ ] Plan de rollback: revertir el commit. La feature es aditiva (excepto el refactor menor de paginación, que se puede revertir junto).

---

## Métricas de éxito

- `npx tsc --noEmit` pasa con exit 0.
- `npm run dev` levanta sin warnings de Vite.
- Las 10 pruebas manuales del worklog pasan en una corrida.
- El usuario que loguea como ADMIN o SUPERADMIN puede crear, editar, eliminar y filtrar noticias en una sesión sin recargar.
- La sección Productores sigue funcionando idénticamente después del refactor de paginación.

---

## Preguntas abiertas

_Todas resueltas en la sección "Decisiones tomadas". Categorías canónicas pendientes de validación con stakeholder — quedan documentadas como pendiente en el worklog._

- [x] ¿Categorías canónicas? → Se usan las 5 propuestas; pendiente validar con stakeholder.
- [x] ¿Límite de imagen? → 2 MB.
- [x] ¿Editar noticia publicada vuelve a borrador? → No, mantiene estado.

---

## Referencias

- **Figma:** referencia provista por el usuario (vista NAV abierto + NAV cerrado).
- **Tickets:** MAPS-007.
- **Worklog hermano:** [`docs/worklog/MAPS-007-seccion-productores-admin.md`](../worklog/MAPS-007-seccion-productores-admin.md) — patrón de referencia para tipos, store, hooks, modales y pagination.
- **Worklog de implementación:** `docs/worklog/MAPS-007-vista-gestion-noticias.md` (a crear cuando termine la implementación).
