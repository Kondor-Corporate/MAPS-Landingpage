# MAPS-008 — Estabilización de UI y documentación

Documentación de la feature de **estabilización de UI y honestidad documental** posterior a MAPS-007, dentro del proyecto MAPS Asesores. Complementa el [TDD MAPS-008](../tdd/MAPS-008-tdd-ui-stabilization.md), el [README técnico de docs](./README.md) y el [README raíz](../README.md).

Esta entrega **no** agrega integraciones nuevas con backend de negocio; refina shell público/autenticado, capas `shared`, enlaces y documentación para reducir confusiones en demos y en code review.

---

## Objetivo

Dejar la web pública y las zonas autenticadas en un estado **previsible**: sin pantallas en blanco evitables en `/productor/:slug`, anclas de contacto coherentes, navegación móvil usable en intranet/admin, sin dependencias prohibidas `shared` → `intranet`/`admin`, sin enlaces externos falsos (`https://#`), y un README que **no sugiera** que admin productores/noticias ya están cableados al API cuando operan con **mocks**.

El trabajo se entregó en **varios commits** (perfil/anclas, móvil, capas/enlaces, documentación); este worklog consolida el **cierre documental** y el inventario de pendientes.

---

## Contexto

MAPS-007 había consolidado UI rica en admin (productores, noticias) con datos en cliente. MAPS-008 corta deuda de **producto medio listo**: rutas públicas rotas o confusas, sidebar invisible en viewport chico, violación de capas, placeholders peligrosos y documentación que mezclaba “demo lista” con “backend integrado”.

---

## Cambios realizados (resumen por bloque)

### Bloque A — Perfil público y anclas

- **`ProducerProfilePage`:** deja el stub `return null`; muestra **UI mínima** (identidad, contacto según mock, estados razonables) resolviendo datos por `slug` desde **mock local**.
- **Tipos y mock:** tipos de perfil público y dataset en `modules/public-web` (p. ej. `producerProfilesMock`, `getProducerProfileBySlug`).
- **Anclas:** id canónico **`contacto`**; enlaces públicos unificados hacia **`/#contacto`** (layout, CTA, etc.), eliminando la divergencia `contacto` / `contactanos`.

### Bloque B — Navegación móvil (zonas autenticadas)

- **`AppLayout`:** por debajo de `lg`, **barra superior** con botón menú, **overlay** y **drawer**; cierre por ruta, overlay, tecla Escape y bloqueo de scroll.
- **`AppSidebar`:** refactor a **`AppSidebarPanel`** reutilizable (mismo contenido que el `aside` desktop); desktop sin cambio visual relevante.
- **Ítems y roles:** misma fuente que `getSidebarItems`; paridad de permisos.

### Bloque C — Capas `shared` y placeholders

- **`RecentNewsCard`:** movido a **`shared/components`**; eliminado el import desde `modules/intranet`.
- **`RecentNewsGrid`:** consume solo `shared` (y stores/constants compartidos).
- **`dashboardLinks`:** `SELF_PORTAL_URL` y `BIBLIOTECA_DRIVE_URL` pasan a **`null`** en lugar de `https://#`.
- **`AccessCard`:** si no hay `href`, CTA **no enlazable** con copy **«Próximamente»** y `aria-disabled`.
- **Sidebar (`SidebarLink` + `sidebarItems`):** **Acceso SELF** con entrada **deshabilitada** cuando la URL es `null`; sin `<a href>` falso.

### Bloque D — Documentación (este cierre)

- **TDD MAPS-008:** estado, decisiones y fases alineados a lo implementado; pendientes explícitos (mapa lazy, E2E, URLs reales).
- **README raíz:** sección **«Estado real del sistema»** (integrado / UI+mock / pendiente).
- **`docs/README.md`:** puntero al README raíz para inventario actualizado (el detalle de Auth permanece en ese doc).

---

## Archivos principales tocados por el código (referencia)

| Área | Rutas típicas |
|------|----------------|
| Perfil público | `frontend/src/modules/public-web/pages/ProducerProfilePage.tsx`, `public-web/data/producerProfilesMock.ts`, `public-web/types/*`, componentes públicos con anclas |
| Móvil / shell | `frontend/src/shared/layouts/AppLayout.tsx`, `AppSidebar.tsx` |
| Capas / enlaces | `frontend/src/shared/components/RecentNewsCard.tsx`, `RecentNewsGrid.tsx`, `AccessCard.tsx`, `constants/dashboardLinks.ts`, `constants/sidebarItems.tsx` |

*(Lista orientativa; el historial de git es la fuente exhaustiva por PR/commit.)*

---

## Decisiones tomadas

| Tema | Decisión |
|------|-----------|
| Id contacto | **`contacto`** como id y destino `/#contacto` |
| Perfil `/productor/:slug` | **Mock local mínimo** hasta API pública |
| Móvil admin/intranet | **Drawer + overlay**, mismo panel que desktop |
| `shared` vs módulos | **`RecentNewsCard` en `shared`**; sin imports `shared` → `intranet`/`admin` para este caso |
| SELF / Drive | **`null` en constants** + UI **«Próximamente»** / deshabilitado |
| Mapa | **Sin lazy-load** en el cierre de estos bloques — **pendiente** documentado |
| README | Diferenciar claramente **integrado** vs **mock** vs **pendiente** |

---

## Cómo verificar manualmente

### Código / producto

1. **Público:** abrir `/productor/carlos-rivera` (u otro `slug` del mock) → debe verse contenido, no pantalla en blanco.
2. **Anclas:** desde la landing, enlaces “Contacto” / CTAs deben llevar al bloque con **`#contacto`**.
3. **Móvil autenticado:** DevTools &lt; `lg`, login admin → abrir/cerrar menú, navegar → drawer debe cerrarse en rutas internas.
4. **Dashboards:** tarjetas SELF / Biblioteca con URL `null` → **Próximamente**, sin navegación a `https://#`.
5. **Sidebar:** Acceso SELF deshabilitado si aplica; biblioteca sigue como ruta interna.
6. **Build:** `cd frontend && npm run build` → exit 0.

### Documentación

1. Leer [docs/tdd/MAPS-008-tdd-ui-stabilization.md](../tdd/MAPS-008-tdd-ui-stabilization.md): estado **Implementado**, decisiones y checkboxes de fases.
2. Leer este worklog y comparar con commits si hace falta auditar.
3. En [README raíz](../README.md), sección **«Estado real del sistema»**: comprobar que **no** afirma integración backend para CRUD productores/noticias.
4. Opcional: `docs/README.md` → enlace al ancla del README raíz.

---

## Cambios implementados (detalle por sección — estilo worklog)

### 1. Perfil público y tipos mock

**Archivos (principales):** `ProducerProfilePage.tsx`, `producerProfilesMock.ts`, tipos en `public-web`.

Sustituye el retorno nulo por una vista usable alimentada por lookup en memoria; prepara el reemplazo futuro por fetch sin cambiar el contrato de ruta.

### 2. Anclas de contacto

**Archivos:** `CtaSection.tsx`, `PublicLayout.tsx` y consumidores de `#contactanos` / `#contacto`.

Unifica el destino en el DOM y en los `href` hacia **`/#contacto`**, coherente con scroll y deep links.

### 3. AppLayout móvil y panel compartido

**Archivos:** `AppLayout.tsx`, `AppSidebar.tsx`.

Encapsula el cuerpo del sidebar en **`AppSidebarPanel`**; el drawer móvil reutiliza el mismo bloque (navegación, avatar, logout).

### 4. RecentNewsCard en shared y dashboardLinks

**Archivos:** `shared/components/RecentNewsCard.tsx`, `RecentNewsGrid.tsx`, eliminación del card duplicado en intranet; `dashboardLinks.ts`, `AccessCard.tsx`, `sidebarItems.tsx`, `SidebarLink` en `AppSidebar.tsx`.

Restaura la regla de capas y elimina UX engañosa de enlaces rotos.

### 5. README y TDD

**Archivos:** `README.md`, `docs/tdd/MAPS-008-tdd-ui-stabilization.md`, `docs/README.md`.

Alinean expectativas del equipo y stakeholders sobre qué está cableado al backend y qué es demo con mocks.

---

## Criterios de aceptación verificados (documentales y de producto)

| Criterio | Estado |
|----------|--------|
| TDD MAPS-008 refleja decisiones y fases cerradas | Actualizado |
| Worklog MAPS-008 creado con plantilla | Este archivo |
| README distingue integrado / mock / pendiente | Sección añadida |
| Sin afirmar integración backend donde hay mocks | Texto explícito |
| Referencia cruzada TDD ↔ worklog | Enlaces en ambos |

---

## Pendientes fuera de alcance (explícitos)

| Pendiente | Detalle |
|-----------|---------|
| Integración API productores | Sustituir stores/mock por endpoints reales |
| Integración API noticias | Idem |
| Perfil público desde backend | Fetch por `slug`, contrato API |
| Mapa desde backend | Fuentes de datos y tiles acordadas |
| Lazy-load MapLibre | Code-splitting / `Suspense` u issue con métrica (LCP, tamaño de chunk) |
| URLs reales SELF / Drive | Completar `dashboardLinks` y retirar estados «Próximamente» donde corresponda |
| Tests E2E | Infraestructura (p. ej. Playwright) |
| Unificación iconos | Decisión `lucide-react` vs `react-icons` (Fase 5 TDD) |

---

## Riesgos residuales

| Riesgo | Mitigación |
|--------|------------|
| Visitantes esperan datos reales en `/productor/:slug` | README + TDD indican **mock** hasta integración |
| Regresión futura `shared` → módulo | Code review; grep en CI sugerible |
| `docs/README.md` desactualizado en secciones antiguas | Puntero al README raíz para **estado del producto** |

---

## Relación con el TDD MAPS-008

Este worklog es el **registro operativo** del TDD homónimo: implementación por fases (perfil/anclas, shell móvil, capas/enlaces, documentación), decisiones cerradas (id `contacto`, drawer, `null` en links) y **lista viva** de pendientes **fuera** del ticket (API, mapa backend, E2E, URLs reales).

---

*Documento generado en la feature MAPS-008 — UI stabilization / cierre documental.*
