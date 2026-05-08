# MAPS-008 — TDD: Estabilización de UI y documentación post-MAPS-007

Documento de diseño técnico para estabilizar la UI y alinear la documentación del proyecto MAPS Asesores **después del merge grande de MAPS-007**, antes de avanzar con integraciones reales (API, persistencia).

**Estado:** Implementado (bloques de código de estabilización UI + cierre documental)
**Autor:** Nicolas Perez
**Revisores:** @pendiente
**Creado:** 2026-05-07
**Última actualización:** 2026-05-08

**Worklog:** [MAPS-008-ui-stabilization.md](../worklog/MAPS-008-ui-stabilization.md)

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

### Contexto previo (baseline antes de MAPS-008)

Incluye los problemas que motivaron el TDD: pantalla en blanco en `/productor/:slug`, anclas inconsistentes (`#contacto` vs `#contactanos`), sidebar oculto en móvil sin alternativa, `shared` importando `RecentNewsCard` desde intranet, links `https://#`, y README poco explícito sobre mocks.

### Estado tras los bloques implementados

- **`/productor/:slug`:** [`ProducerProfilePage`](../../frontend/src/modules/public-web/pages/ProducerProfilePage.tsx) con **UI mínima** y datos desde **mock local** (`producerProfilesMock` / tipos en `public-web`) — sin fetch a backend aún.
- **Anclas contacto:** id canónico **`contacto`**; enlaces públicos alineados (p. ej. `/#contacto`) en CTAs y layout.
- **Navegación móvil autenticada:** [`AppLayout`](../../frontend/src/shared/layouts/AppLayout.tsx) con **drawer + overlay** bajo `lg`; [`AppSidebar`](../../frontend/src/shared/layouts/AppSidebar.tsx) expone **`AppSidebarPanel`** reutilizado en desktop y drawer; misma fuente de ítems que `getSidebarItems`.
- **Capa `shared`:** [`RecentNewsCard`](../../frontend/src/shared/components/RecentNewsCard.tsx) vive en **`shared`**; [`RecentNewsGrid`](../../frontend/src/shared/components/RecentNewsGrid.tsx) **no** importa desde `modules/intranet` ni `modules/admin`.
- **Enlaces externos pendientes:** [`dashboardLinks.ts`](../../frontend/src/shared/constants/dashboardLinks.ts) usa **`null`** para SELF / Biblioteca Drive donde no hay URL real; **AccessCard** y sidebar (**Acceso SELF**) muestran estado **deshabilitado / «Próximamente»** en lugar de `https://#`.
- **README / docs:** sección explícita **«Estado real del sistema»** en el [README raíz](../../README.md) distingue integrado vs UI+mock vs pendiente.
- **MapLibre:** sigue pendiente **lazy-load** o documento de performance con métrica (no cerrado en MAPS-008 salvo nota en worklog).
- **Iconos:** inventario `lucide-react` vs `react-icons` **pendiente** (Fase 5 opcional del plan).

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
| Grid noticias | [`frontend/src/shared/components/RecentNewsGrid.tsx`](../../frontend/src/shared/components/RecentNewsGrid.tsx), [`RecentNewsCard.tsx`](../../frontend/src/shared/components/RecentNewsCard.tsx) | Card en `shared`; grid sin dependencia a intranet/admin |
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

- **Documentación explícita:** el README indica qué está **integrado con backend** frente a **UI con mocks** (productores/noticias admin, noticias en landing/dashboard, mapa, SELF/Drive).
- **Ancla canónica de contacto:** **`contacto`** (atributo `id` del bloque y rutas tipo `/#contacto` en layout/CTAs). No se mantiene `contactanos` como id divergente.
- **Perfil público `/productor/:slug`:** por ahora se resuelve con **mock local mínimo** (lista de perfiles + lookup por `slug`); **sin** API de productor público hasta ticket de integración.
- **Navegación móvil (intranet/admin):** **drawer + overlay** bajo breakpoint `lg`, reutilizando `AppSidebarPanel` y `getSidebarItems` (roles sin cambios de modelo).
- **Capas:** `frontend/src/shared` **no** importa desde `modules/intranet` ni `modules/admin` (p. ej. `RecentNewsCard` en `shared`); excepciones futuras requieren nota en TDD + worklog.
- **Links falsos:** no se usan `https://#`; **`dashboardLinks`** exporta `null` donde no hay URL; **AccessCard** y **sidebar** (SELF) muestran **«Próximamente»** / fila deshabilitada.
- **Enlaces externos reales (SELF / Google Drive):** **fuera de alcance** de MAPS-008 hasta definición de URLs — permanecen como pendiente explícito.
- **MapLibre:** la preferencia por **lazy-load** sigue vigente; **no** se tomó como cierre obligatorio en los bloques ya mergeados — queda pendiente o con issue/métrica.
- **API de productores/noticias**, **mapa desde backend** y **tests E2E:** **fuera de alcance** de MAPS-008 (mantener visibles en worklog y README).

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

- [x] Listado de anclas, imports capa `shared`, links rotos, entrypoints MapLibre (inventario cubierto en implementación + worklog).
- [x] Estado consignado en [MAPS-008 worklog](../worklog/MAPS-008-ui-stabilization.md).

### Fase 2 — Perfil público y anclas

- [x] `/productor/:slug` con UI mínima viable + datos mock coherentes.
- [x] Unificar ids y enlaces hacia **`#contacto`** / **`/#contacto`** en público.

### Fase 3 — Shell autenticado y dependencias

- [x] Navegación móvil (drawer/overlay) para items de intranet/admin.
- [x] Eliminar `shared` → `intranet`/`admin` en `RecentNewsGrid` / `RecentNewsCard`; verificar `npm run build`.

### Fase 4 — Pulido producto y docs

- [x] Corregir `dashboardLinks` y consumidores (null + UI «Próximamente»).
- [x] README (y [docs/README.md](../README.md)) con sección **Estado real del sistema**.
- [ ] MapLibre: lazy-load **o** sección/issue «Performance» con siguiente paso enlazado — **pendiente**.

### Fase 5 — Iconos (opcional)

- [ ] Decisión y, si aplica, migración incremental o regla documentada — **pendiente**.

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
- [x] Id canónico del bloque contacto: **`contacto`** (decidido e implementado en MAPS-008).
- [ ] ¿Migración de `react-icons` en esta ventana o diferida (p. ej. MAPS-009+)? — _tech lead_

---

## Referencias

- **Tickets:** MAPS-008
- **TDD relacionado:** [MAPS-007-tdd-vista-gestion-noticias.md](./MAPS-007-tdd-vista-gestion-noticias.md)
- **Work-log:** [MAPS-008-ui-stabilization.md](../worklog/MAPS-008-ui-stabilization.md) (véase convenciones en [CONVENTIONS.md](../CONVENTIONS.md); un worklog por PR cuando aplique).
- **PRs relacionados:** (completar si se consolida en uno o varios PRs)

---

## Cierre de feature (checklist post-merge)

1. [x] [docs/worklog/MAPS-008-ui-stabilization.md](../worklog/MAPS-008-ui-stabilization.md) redactado (plantilla `_TEMPLATE-worklog.md`).
2. [x] Este TDD actualizado: estado, decisiones y fases; enlace al worklog.
3. [ ] Completar **PRs relacionados** arriba cuando se cierre la ventana de merge.
4. [ ] Lazy-load **MapLibre** o issue de performance (criterio del plan Fase 4).
5. Si hubo varios PRs, puede aplicarse **un worklog por PR** según [CONVENTIONS.md](../CONVENTIONS.md).
