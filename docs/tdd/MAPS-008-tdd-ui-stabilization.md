# MAPS-008 — TDD: Estabilización de UI y documentación post-MAPS-007

Documento de diseño técnico para estabilizar la UI y alinear la documentación del proyecto MAPS Asesores **después del merge grande de MAPS-007**, antes de avanzar con integraciones reales (API, persistencia).

**Estado:** En revisión
**Autor:** @pendiente
**Revisores:** @pendiente
**Creado:** 2026-05-07
**Última actualización:** 2026-05-07

---

## Resumen

MAPS-007 consolidó paneles admin (productores, noticias) y piezas públicas con **mocks en cliente**. Esta feature cierra brechas de producto «medio listo»: perfil público `/productor/:slug`, anclas y navegación coherentes, límites de capa `shared` vs módulos, enlaces/placeholders rotos, README honesto respecto a mocks, y deuda de performance/documentación del mapa (MapLibre vía `react-map-gl` + `FindAdvisorMap`). Objetivo: **demo estable y arquitectura clara** sin implementar aún backend nuevo ni sustituir mocks por datos reales (salvo lo explícitamente acordado en alcance).

---

## Objetivo

- Dejar la **web pública y las zonas autenticadas** en un estado predecible (sin pantallas en blanco por `null`, sin anclas rotas, navegación móvil usable en intranet/admin donde aplique).
- Corregir **violaciones de dependencias** (p. ej. `shared` importando desde `intranet`).
- Alinear **documentación** ([README.md](../../README.md) y, si aplica, [docs/README.md](../README.md)) con la realidad: qué está **integrado** vs **mock**.
- Dejar **registrada** la estrategia de carga del mapa (lazy-load u otra) o marcarla explícitamente como pendiente con criterios de medición.
- **Opcional dentro de alcance:** unificar iconografía (p. ej. evaluar redundancia `react-icons` vs `lucide-react`) con decisión explícita para no duplicar bundles.

Criterios de éxito orientativos: checklist de rutas y vistas sin regresiones; 0 imports `shared` → `intranet`/`admin`; anclas unificadas; README sin afirmar integración backend donde solo hay mocks; sección «Performance / pendientes» para MapLibre.

---

## Contexto

### Situación actual

- La ruta **`/productor/:slug`** está cableada en [`frontend/src/router/index.tsx`](../../frontend/src/router/index.tsx) con [`ProducerProfilePage`](../../frontend/src/modules/public-web/pages/ProducerProfilePage.tsx); la página hoy es un stub que **retorna `null`** → pantalla en blanco para visitantes.
- **Anclas:** en [`CtaSection.tsx`](../../frontend/src/modules/public-web/components/CtaSection.tsx) el `<section>` tiene `id="contacto"` pero el CTA usa `href="#contactanos"` (id inexistente). En [`PublicLayout.tsx`](../../frontend/src/shared/layouts/PublicLayout.tsx) hay enlaces a `#contactanos`. Hay que unificar ids y `href`.
- **Intranet/admin:** [`AppSidebar`](../../frontend/src/shared/layouts/AppSidebar.tsx) usa `hidden … lg:flex` → por debajo de `lg` el sidebar **no se muestra** y no existe menú móvil alternativo en [`AppLayout`](../../frontend/src/shared/layouts/AppLayout.tsx) (`AppSidebar` + `main` solamente) → riesgo de navegación incompleta en viewport chico.
- **Capa shared:** [`RecentNewsGrid.tsx`](../../frontend/src/shared/components/RecentNewsGrid.tsx) importa `RecentNewsCard` desde [`@/modules/intranet/components/RecentNewsCard`](../../frontend/src/modules/intranet/components/RecentNewsCard.tsx) mientras el grid lo consumen dashboards de **intranet y admin** — violación de dependencia `shared` → módulo de aplicación.
- **Placeholders:** [`dashboardLinks.ts`](../../frontend/src/shared/constants/dashboardLinks.ts) define `SELF_PORTAL_URL` y `BIBLIOTECA_DRIVE_URL` como `'https://#'` (usado desde dashboards y sidebar vía [`sidebarItems.tsx`](../../frontend/src/shared/constants/sidebarItems.tsx)).
- **README:** puede leerse como que admin/productores/noticias ya están **integrados** cuando operan con **mocks** (stores Zustand / datos locales como documenta MAPS-007).
- **MapLibre:** [`HomePage.tsx`](../../frontend/src/modules/public-web/pages/HomePage.tsx) importa estáticamente [`FindAdvisorMap`](../../frontend/src/modules/public-web/components/FindAdvisorMap.tsx) (`react-map-gl/maplibre`); los estilos globales están en [`frontend/src/index.css`](../../frontend/src/index.css). El bundle inicial puede beneficiarse de **code-splitting** / lazy-load.
- **Iconos:** [`frontend/package.json`](../../frontend/package.json) incluye **`lucide-react`** y **`react-icons`** — conviene inventario y regla (un primario + migración gradual).

### Por qué ahora

Sin esta pasada, el siguiente trabajo de **integración real** mezcla bugs de shell UI con bugs de API y dificulta demos y code review. MAPS-008 reduce ruido y delimita claramente «UI estable + docs honestas» vs «feature de backend».

---

## Alcance

- **Perfil público productor:** implementar o completar [`ProducerProfilePage`](../../frontend/src/modules/public-web/pages/ProducerProfilePage.tsx) para `/productor/:slug` (contenido mínimo viable: identidad, contacto o enlace coherente con diseño existente; estados loading/error cuando exista fetch; hasta entonces mock local o datos derivados del slug).
- **Anclas y CTAs:** auditoría en `public-web` y [`PublicLayout`](../../frontend/src/shared/layouts/PublicLayout.tsx); **un id canónico** para la sección de contacto y actualizar todos los `href`.
- **Navegación responsive intranet/admin:** patrón explícito para `< lg` (drawer, overlay o barra inferior) reutilizando componentes existentes si es posible, con la misma fuente de items que `getSidebarItems`.
- **Límites de capas:** mover `RecentNewsCard` (o primitivas compartidas) a `shared`, o mover `RecentNewsGrid` a un módulo que pueda importar intranet — **sin ciclos** y sin que `shared` dependa de `intranet`/`admin`.
- **Enlaces:** reemplazar `https://#` en [`dashboardLinks.ts`](../../frontend/src/shared/constants/dashboardLinks.ts) por URLs reales, `href` internas, o CTAs deshabilitados con copy claro según producto.
- **Documentación:** actualizar [README.md](../../README.md) (y [docs/README.md](../README.md) si aplica) con sección **Estado de integración** (mocks vs API).
- **MapLibre:** lazy-load de `FindAdvisorMap` (o de `HomePage` completa en el router) con `Suspense` y fallback liviano, **o** documento/issue de performance con métrica acordada.
- **Iconos:** inventario de uso y decisión (`react-icons` vs `lucide-react`).

### Fuera de alcance

- **Endpoints nuevos** y **persistencia** de noticias/productores (sustitución sistemática de mocks por backend) — salvo prerequisito técnico explícito y acotado en PR.
- **Rediseño Figma mayor** o nuevas pantallas de negocio.
- **Tests E2E** completos (puede quedar pendiente en worklog si no hay infraestructura).
- **Docker/backend** salvo cambios de documentación.

---

## Diseño propuesto

### Resumen

1. **Auditoría mecánica:** búsqueda de hashes `#contacto` / `#contactanos`, imports desde `shared` hacia módulos, `https://#`, uso de MapLibre y de paquetes de iconos.
2. **Perfil productor:** contrato de datos (mock o futuro API); evitar `return null` sin fallback accesible.
3. **Anclas:** tabla «origen enlace → id destino» y un único conjunto de ids en el DOM público.
4. **Shell móvil:** componente o extensión de layout que exponga los mismos items que [`getSidebarItems`](../../frontend/src/shared/constants/sidebarItems.tsx) por debajo de `lg`.
5. **Shared:** resolver la dependencia `RecentNewsGrid` → `intranet` (mover código o duplicar primitiva con justificación breve en worklog).
6. **README:** tabla «Módulo | UI | Backend | Notas».
7. **Mapa:** `React.lazy` / `import()` de `FindAdvisorMap` o de la ruta pública contenedora; fallback skeleton.

### Componentes / archivos afectados

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| Ruta perfil | [`frontend/src/router/index.tsx`](../../frontend/src/router/index.tsx) | Opcional: lazy del chunk público |
| Página perfil | [`frontend/src/modules/public-web/pages/ProducerProfilePage.tsx`](../../frontend/src/modules/public-web/pages/ProducerProfilePage.tsx) | Sustituir stub `return null` |
| Sección CTA / anclas | [`frontend/src/modules/public-web/components/CtaSection.tsx`](../../frontend/src/modules/public-web/components/CtaSection.tsx) | Alinear `id` y `href` |
| Layout público | [`frontend/src/shared/layouts/PublicLayout.tsx`](../../frontend/src/shared/layouts/PublicLayout.tsx) | Enlaces `#` al id canónico |
| Home + mapa | [`frontend/src/modules/public-web/pages/HomePage.tsx`](../../frontend/src/modules/public-web/pages/HomePage.tsx), [`FindAdvisorMap.tsx`](../../frontend/src/modules/public-web/components/FindAdvisorMap.tsx) | Lazy-load o nota de performance |
| Layout app | [`frontend/src/shared/layouts/AppLayout.tsx`](../../frontend/src/shared/layouts/AppLayout.tsx), [`AppSidebar.tsx`](../../frontend/src/shared/layouts/AppSidebar.tsx) | Navegación móvil |
| Grid noticias | [`frontend/src/shared/components/RecentNewsGrid.tsx`](../../frontend/src/shared/components/RecentNewsGrid.tsx), [`RecentNewsCard.tsx`](../../frontend/src/modules/intranet/components/RecentNewsCard.tsx) | Corregir dirección de dependencias |
| Links externos | [`frontend/src/shared/constants/dashboardLinks.ts`](../../frontend/src/shared/constants/dashboardLinks.ts) | Quitar `https://#` |
| Estilos map | [`frontend/src/index.css`](../../frontend/src/index.css) | Evaluar impacto si el chunk de MapLibre se mueve |
| Dependencias | [`frontend/package.json`](../../frontend/package.json) | Decisión iconos (opcional) |
| Docs | [`README.md`](../../README.md), [`docs/README.md`](../README.md) | Estado mocks vs API |

### Modelo de datos

N/A (sin cambios de schema en esta feature salvo decisión explícita posterior).

### Contratos de API

N/A. Si el perfil público anticipa un fetch, documentar el contrato **futuro** en «Preguntas abiertas» o en un TDD de backend separado.

### UI / UX

- Perfil productor: vista usable en mobile; no pantalla en blanco.
- Navegación: paridad funcional de items entre desktop y mobile en zonas autenticadas.
- Mapa: skeleton o placeholder liviano mientras carga el chunk pesado si hay lazy-load.

### Cambios en código existente

- Refactors acotados para **inversión de dependencias** y anclas; evitar reescrituras grandes no relacionadas.

---

## Decisiones tomadas

- **Documentación explícita:** el README debe indicar que admin productores/noticias son **UI + mocks** hasta el ticket de integración con API.
- **Ancla canónica:** un solo id para la sección de contacto en público (equipo alinea nombre: p. ej. `contacto` **o** `contactanos`, no ambos en distintos nodos/enlaces).
- **Capas:** `frontend/src/shared` no importa desde `modules/intranet` ni `modules/admin` (excepciones requieren nota en este TDD y en worklog).
- **MapLibre:** preferir **lazy-load** si el análisis de bundle lo justifica; si excede la ventana, **Implementación diferida** con umbral medible acordado en review.

---

## Alternativas consideradas

### Alternativa A — Solo README, sin tocar código

- **Qué era:** Documentar problemas sin fixes.
- **Pros:** Rápido.
- **Contras:** Demos siguen rotas; deuda en código.
- **Por qué se descartó:** No cumple objetivo de estabilización UX.

### Alternativa B — Integrar backend en la misma feature

- **Qué era:** Sustituir mocks mientras se arregla UI.
- **Pros:** Menos mocks.
- **Contras:** Mezcla riesgos; viola «antes de integraciones reales».
- **Por qué se descartó:** MAPS-008 es **corte de estabilidad** explícito.

---

## Plan de implementación

### Fase 1 — Inventario y criterios

- [ ] Listado de anclas, imports capa `shared`, links rotos, entrypoints MapLibre, usos `react-icons` vs `lucide-react` (p. ej. `npm run build` + analyzer si se acuerda).
- [ ] 1–2 párrafos de estado inicial para el worklog de cierre.

### Fase 2 — Perfil público y anclas

- [ ] `/productor/:slug` con UI mínima viable + datos mock coherentes.
- [ ] Unificar ids y enlaces `#...` en público.

### Fase 3 — Shell autenticado y dependencias

- [ ] Navegación móvil para items de intranet/admin.
- [ ] Eliminar `shared` → `intranet`/`admin`; verificar `npm run build` y rutas clave.

### Fase 4 — Pulido producto y docs

- [ ] Corregir `dashboardLinks` y consumidores.
- [ ] README (y docs si aplica) con tabla mocks vs integrado.
- [ ] MapLibre: lazy-load **o** sección «Performance» con siguiente paso enlazado.

### Fase 5 — Iconos (opcional)

- [ ] Decisión y, si aplica, migración incremental o regla documentada.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Refactor de imports introduce dependencias circulares | Media | Alto | Cambios pequeños; `npm run build` en cada PR |
| Lazy-load del mapa y CSS global (`maplibre-gl`) | Baja–Media | Medio | Validar que estilos sigan aplicando al chunk lazy |
| Cambiar id canónico de contacto rompe enlaces externos | Baja | Bajo | Nota en README o compatibilidad temporal dual |

---

## Plan de rollout

- [ ] Feature flag: no (merge normal).
- [ ] Migraciones: N/A
- [ ] Variables de entorno: N/A salvo doc
- [ ] Comunicación: opcional — «UI estable para demos»
- [ ] Rollback: revert del PR afectado

---

## Métricas de éxito

- 0 rutas públicas críticas con pantalla en blanco por `return null` no intencional en perfil productor.
- 0 imports desde `frontend/src/shared` hacia `modules/intranet` o `modules/admin` (verificación por búsqueda o checklist).
- README con mención explícita de **mocks** en admin para productores/noticias (y otros si aplica).
- Mapa: mejora documentada en tamaño de chunk / LCP si hay lazy-load; si no, issue enlazado con métrica objetivo.

---

## Preguntas abiertas

- [ ] Contenido mínimo obligatorio del perfil productor antes de existir API — _diseño/producto_
- [ ] Id canónico del bloque contacto: `contacto` o `contactanos` — _equipo_
- [ ] ¿Migración de `react-icons` en esta ventana o diferida (p. ej. MAPS-009+)? — _tech lead_

---

## Referencias

- **Tickets:** MAPS-008
- **TDD relacionado:** [MAPS-007-tdd-vista-gestion-noticias.md](./MAPS-007-tdd-vista-gestion-noticias.md)
- **Work-log (tras implementación):** `docs/worklog/MAPS-008-ui-stabilization.md` (crear al **cierre del PR** según [CONVENTIONS.md](../CONVENTIONS.md); no usar stub vacío).
- **PRs relacionados:** (completar al implementar)

---

## Cierre de feature (checklist post-merge)

Cuando la implementación esté en `main`:

1. Redactar [docs/worklog/MAPS-008-ui-stabilization.md](../worklog/MAPS-008-ui-stabilization.md) con la plantilla `_TEMPLATE-worklog.md`.
2. Actualizar este TDD: **Estado:** Implementado; enlazar PR(s) y el worklog.
3. Si hubo varios PRs, valorar **un worklog por PR** según criterio de [CONVENTIONS.md](../CONVENTIONS.md).
