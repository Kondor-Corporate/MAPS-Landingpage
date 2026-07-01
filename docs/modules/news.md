# Noticias

Documentacion viva del modulo Noticias.

Historial relacionado:

- Gestion de noticias en admin: `docs/worklog/MAPS-007-vista-gestion-noticias.md`.

---

## Estado actual

| Area | Estado |
|------|--------|
| UI admin `/admin/noticias` | Implementada |
| Noticias en landing/dashboards | Implementadas con datos locales/mock |
| Store/hook frontend | Implementado con Zustand/mock |
| API backend `/api/v1/news` | Pendiente |
| Persistencia PostgreSQL | Modelo Prisma existe, API pendiente |
| Publicacion real | Pendiente |

---

## Modelo de datos

Prisma incluye el modelo `Noticia`.

Campos relevantes:

| Campo | Uso previsto |
|-------|--------------|
| `titulo` | Titulo visible |
| `slug` | URL/identificador publico |
| `descripcion` | Bajada/resumen |
| `contenido` | Cuerpo |
| `imagenUrl` | Imagen destacada |
| `publicada` | Estado de publicacion |
| `publicadaEn` | Fecha de publicacion |
| `visibilidad` | `PUBLICA` o `INTERNA` |
| `autorId` | Usuario autor |

Aunque el modelo existe, el backend no expone todavia endpoints funcionales para noticias.

---

## Backend

Ruta montada:

```text
/api/v1/news
```

Estado:

- `newsRouter` existe.
- No hay endpoints implementados.
- `news.controller.ts` y `news.service.ts` existen como base, pero no deben asumirse productivos sin revisar codigo actual.

Pendiente esperado:

- CRUD admin.
- Listado publico de noticias publicadas.
- Listado interno segun visibilidad.
- Validaciones Zod.
- RBAC admin/superadmin para mutaciones.
- Tests de integracion.

---

## Frontend

### Admin

Ruta:

```text
/admin/noticias
```

Archivos principales:

- `frontend/src/modules/admin/pages/NewsManagementPage.tsx`
- `frontend/src/modules/admin/components/NewsManagementDashboard.tsx`
- `frontend/src/modules/admin/hooks/useNews.ts`
- `frontend/src/modules/admin/data/newsMock.ts`
- `frontend/src/modules/admin/components/NewsForm.tsx`
- `frontend/src/modules/admin/components/NewsRichTextEditor.tsx`

Estado:

- La UI permite crear/editar/eliminar noticias en estado cliente.
- No persiste contra API.
- Los datos se pierden fuera del flujo mock/local.

### Web publica / dashboards

Archivos relacionados:

- `frontend/src/modules/public-web/components/NewsPreviewSection.tsx`
- `frontend/src/modules/public-web/components/NewsDetailModal.tsx`
- `frontend/src/shared/constants/mockNews.ts`
- `frontend/src/shared/store/newsModalStore.ts`

Estado:

- Usa contenido mock/local.
- No consume backend.

---

## Reglas a definir

Antes de implementar API real, definir:

- Diferencia entre noticia publica e interna.
- Estados editoriales necesarios: borrador, programada, publicada, archivada, etc.
- Slug automatico vs editable.
- Manejo de imagenes: URL externa, upload local, S3 u otro storage.
- Permisos de `ADMIN` vs `SUPERADMIN`.
- Si productores pueden ver noticias internas desde intranet.

---

## Verificacion actual

Admin UI:

1. Login como `ADMIN`.
2. Abrir `/admin/noticias`.
3. Crear/editar noticia.
4. Confirmar comportamiento visual.
5. Refrescar pagina sabiendo que no hay persistencia backend real.

---

## Pendientes conocidos

- API CRUD.
- Persistencia real.
- Integracion frontend con API.
- Tests backend.
- Tests frontend de flujos principales.
- E2E editorial.
