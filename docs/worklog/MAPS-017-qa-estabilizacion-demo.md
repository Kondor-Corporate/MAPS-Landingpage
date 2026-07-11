# MAPS-017 — QA integral, estabilización y demo readiness

Documentación de la fase de estabilización y QA integral del proyecto MAPS Asesores post MAPS-014/015/016.

**Estado:** En progreso  
**Rama:** `feature/MAPS-017-qa-estabilizacion`  
**Fecha inicio:** 2026-07-11  
**TDD:** [`docs/tdd/MAPS-017-tdd-qa-estabilizacion-demo.md`](../tdd/MAPS-017-tdd-qa-estabilizacion-demo.md)

---

## Contexto

Tras el merge de:

- **MAPS-014** — Noticias API fullstack (admin, Home, intranet, dashboards).
- **MAPS-015** — Mapa de productores, dirección editable y geocoding server-side.
- **MAPS-016** — Credenciales individuales, perfil productor y foto.

La auditoría integral detectó que el núcleo operativo es real, pero persisten fricciones de onboarding, documentación desalineada y readiness de demo (landing parcial, Docker migrate/seed, tests frontend fuera de CI, deudas de geocode/storage/biblioteca).

MAPS-017 no agrega features de producto; estabiliza, documenta y valida.

---

## Fases previstas

| Fase | Nombre | Estado |
|------|--------|--------|
| A | Baseline, README y plan | Completada |
| B | Bloqueadores demo landing/navegación | Completada |
| C | Docker/dev setup y seed/migrate | Pendiente |
| D | QA manual integral MAPS-014/015/016 | Pendiente |
| E | Rate limit geocode y casos borde | Pendiente |
| F | Testing frontend / E2E smoke (opcional) | Pendiente |
| G | Docs/worklog cierre | Pendiente |

---

## Hallazgos iniciales (Fase A)

### Git / rama

- Rama actual: `feature/MAPS-017-qa-estabilizacion`.
- Working tree limpio al inicio de Fase A.
- HEAD alineado con `development` (`b487498` — MAPS-016 merge).

### README

- `README.md` contenía **tres bloques de conflicto de merge** (`<<<<<<<`, `=======`, `>>>>>>>`).
- Secciones duplicadas por el conflicto: estructura de carpetas, convenciones de equipo, variables de entorno.
- **Resuelto en Fase A:** consolidación sin marcadores; estado real post MAPS-014/015/016; variables críticas y pasos Docker documentados.

### Documentación viva — desalineaciones críticas corregidas

| Archivo | Problema | Acción Fase A |
|---------|----------|---------------|
| `docs/modules/public-web.md` | Decía noticias mock en encabezado y tabla | Corregido: noticias reales; TeamSection/CTA pendientes |
| `docs/inventario-proyecto.md` | `/api/v1/news` como API pendiente | Corregido a Implementado (MAPS-014) |

### Documentación — pendiente para fases posteriores

| Archivo | Observación |
|---------|-------------|
| `docs/inventario-proyecto.md` | Snapshot 2026-05-29; requiere actualización amplia o archivado |
| `docs/tdd/MAPS-011-*`, `MAPS-012-*` | Títulos/numeración histórica inconsistente |
| `docs/modules/library.md` | Revisar URLs `EXAMPLE` en seed/datos demo (Fase B/E) |
| Legacy `newsMock.ts` / `mockNews.ts` | Archivos huérfanos en repo; limpieza menor |

### Estado funcional resumido

| Módulo | Real / Parcial / Pendiente |
|--------|----------------------------|
| Noticias | Real |
| Mapa productores | Real |
| Perfil/credenciales/foto | Real |
| Biblioteca ramos | Real |
| Landing TeamSection | Real (API mapa) |
| CTA/contacto | CTA al mapa (#mapa) |
| SELF | Deshabilitado (`null`) |
| Admins API | Stub |
| Frontend tests en CI | No |
| E2E | Pendiente |

### Primer foco completado

- Resolución de conflictos en `README.md`.
- Creación de TDD y worklog MAPS-017.
- Corrección mínima en docs críticas (`public-web.md`, `inventario-proyecto.md`).

---

## Comandos baseline (Fase A)

### Frontend (`frontend/`)

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | OK |
| `npm run lint` | OK |
| `npm run build` | OK (warning chunk > 500 kB en maplibre) |

### Backend (`backend/`)

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | OK tras `npx prisma generate` (client desactualizado en checkout local) |
| `npm run lint` | OK |
| `npm run build` | OK tras `npx prisma generate` |

**Nota:** En un clone fresco, correr `npx prisma generate` (o `npm install` post-clone) antes de typecheck/build. El schema ya incluye `direccion` (MAPS-015); el fallo inicial fue client Prisma no regenerado, no código roto.

Tests **no** ejecutados en Fase A (según alcance).

---

## Fase B — Bloqueadores demo landing/navegación (2026-07-11)

### Decisiones

| Área | Decisión |
|------|----------|
| TeamSection | **Opción A** — consumir `GET /producers/map` vía `useProducersMap`; hasta 3 productores verificados (o activos); perfil real con `Link` a `/productor/:slug`; empty state honesto con CTA al mapa |
| CTA / contacto | **Opción C** — sin backend de contacto; CTA `#mapa` con copy “Ver mapa de asesores”; sección `id="contacto"` conservada para anclas existentes |
| Footer | Eliminar `#terminos` / `#privacidad`; columna Legal con texto “próximamente”; enlaces útiles a `/#nosotros` y `/#mapa` |
| Sidebar intranet | Agregar **Novedades** → `/intranet/noticias` en `producerItems` |
| Sidebar admin | Sin cambio — ya tiene **Noticias** (CRUD `/admin/noticias`); novedades internas accesibles desde dashboard (`NOVEDADES_ADMIN_PATH`) |
| Biblioteca EXAMPLE | Sin tocar seed; helper `isResolvableLibraryUrl` en frontend para no ofrecer links placeholder como clicables |

### Archivos modificados

- `frontend/src/modules/public-web/components/TeamSection.tsx`
- `frontend/src/modules/public-web/components/CtaSection.tsx`
- `frontend/src/shared/layouts/PublicLayout.tsx`
- `frontend/src/shared/constants/sidebarItems.tsx`
- `frontend/src/shared/utils/libraryLinks.ts` (nuevo)
- `frontend/src/modules/intranet/components/LibraryRamoCard.tsx`
- `frontend/src/modules/intranet/components/LibrarySecondarySection.tsx`

### Pendientes post Fase B

- Hero con avatares decorativos y stat “2,500 personas” (no pedido en Fase B; sigue siendo copy marketing no verificable).
- Seed `PLACEHOLDER_DRIVE` en `backend/prisma/seed.ts` — reemplazar por URLs reales en fase posterior o al configurar Drive productivo.
- Admin biblioteca sigue mostrando URLs truncadas con `EXAMPLE` en tabla (aceptable para operadores).

### Comandos Fase B (frontend)

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | OK |
| `npm run lint` | OK |
| `npm run build` | OK (warning chunk maplibre > 500 kB) |

Backend no tocado en Fase B.

---

## Próximos pasos (Fase C)

## Pendientes fuera de MAPS-017

| Pendiente | Detalle |
|-----------|---------|
| Storage S3 unificado | Producción; ticket aparte |
| Upload imágenes noticias | Feature aparte |
| SEO `/noticias/:slug` | Feature aparte |
| CRUD admins | MAPS futuro |
| Portal SELF real | Integración externa |
| Paginación server-side avanzada | Mejora aparte |

---

*Documento iniciado en MAPS-017 Fase A — 2026-07-11.*
