# MAPS-018 — TDD: Vista "Nuestro Equipo" (integrantes de la organización)

Documento de diseño técnico para la sección "Nuestro Equipo" dentro del proyecto MAPS Asesores.

**Estado:** Implementado (con placeholders — falta contenido real)
**Autor:** @lucaslegor
**Revisores:** —
**Creado:** 2026-08-26
**Última actualización:** 2026-08-26

---

## Resumen

Hoy la Home muestra productores/asesores (`TeamSection.tsx`, sección "Conocé nuestra red de asesores"). No existe ningún lugar donde se presenten los integrantes internos de la organización (dirección, gerencia, referentes). Se agrega una nueva sección pública "Conocé nuestro equipo" con nombre y apellido, foto y una descripción corta del puesto, resuelta con **datos estáticos en el frontend** (un array de constantes + imágenes como assets), sin backend ni panel admin — y **reemplaza en la Home** a "Conocé nuestra red de asesores": `TeamSection.tsx` se elimina y `OurTeamSection.tsx` ocupa su lugar en el mismo punto de la página.

---

## Objetivo

Dar visibilidad pública a los principales integrantes de la organización (no productores/asesores) en la landing, con la menor complejidad posible dado que es contenido que cambia raramente y lo edita el equipo de desarrollo vía PR.

---

## Contexto

### Situación actual

- `frontend/src/modules/public-web/components/TeamSection.tsx` usaba `id="equipo"` pero en realidad mostraba **productores verificados** (toma datos de `useProducersMap` / `MapProducer`), bajo el título "Conocé nuestra red de asesores". No era la sección que se pide acá — era la red de asesores/productores, no el equipo interno de la organización.
- Decisión de producto: esta sección **reemplaza** a `TeamSection.tsx` en la Home (no coexisten). El hook `useProducersMap` no se toca porque también lo usa `FindAdvisorMap.tsx` — solo se elimina el componente `TeamSection.tsx`, que queda sin otros usos.
- No existía ningún modelo, endpoint ni componente para "integrantes de la organización" (staff, dirección, gerencia).
- El proyecto ya tiene un patrón de contenido 100% administrable (`Noticia`, `Biblioteca`) con CRUD completo backend + admin, pero también tiene secciones puramente institucionales sin backend, como `WhyUsSection.tsx`, que hoy renderiza contenido fijo en el propio componente.

### Por qué ahora

El pedido de negocio es concreto: exponer en la landing a los "principales integrantes de la organización" con nombre, foto y puesto, como parte del contenido institucional de la web (mismo espíritu que `WhyUsSection`, pero mostrando personas). Es un directorio corto (dirección/gerencia) que cambia con muy baja frecuencia — no amerita construir un CRUD completo con backend, storage y panel admin para esto.

---

## Alcance

- Archivo de datos estático con los 7 integrantes (nombre, apellido, puesto, foto).
- Imágenes de los integrantes como assets del frontend.
- Nuevo componente público `OurTeamSection.tsx` con carrusel horizontal de tarjetas (foto o iniciales, nombre completo, puesto).
- Eliminación de `TeamSection.tsx` y de su uso en `HomePage.tsx` — `OurTeamSection.tsx` ocupa su lugar.

### Fuera de alcance

- Backend: no hay modelo de datos, ni migración, ni endpoint, ni tabla nueva.
- Panel admin: no hay pantalla de gestión ni CRUD. Alta/baja/edición de integrantes se hace editando el archivo de datos y mergeando un PR.
- Perfil individual público por integrante (no hay `/equipo/:slug`, a diferencia de productores). Cada tarjeta es solo informativa, sin "Ver perfil".
- Cualquier otra vía de descubrir asesores (mapa, `/productor/:slug`) — sigue intacta vía `FindAdvisorMap.tsx`; solo se retira el preview de tarjetas de productores de la Home.
- Internacionalización / multi-idioma del puesto.

---

## Diseño propuesto

### Resumen

Un array de constantes tipado (`ourTeam.ts`) vive en el frontend, junto con las fotos como assets estáticos. `OurTeamSection.tsx` importa ese array directamente y renderiza un **carrusel horizontal** de tarjetas (7 integrantes) — sin hook, sin servicio HTTP, sin loading/error de red (los datos están disponibles en build-time, igual que el contenido de `WhyUsSection.tsx`). Alta/baja/edición de un integrante es un cambio de archivo + PR.

Con 7 tarjetas, una grilla estática obligaría a un layout de 2-3 filas; se eligió carrusel para mantener una sola fila visualmente prolija y consistente en todos los tamaños de pantalla.

### Componentes / archivos afectados

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| Datos del equipo | `frontend/src/modules/public-web/data/ourTeam.ts` | Nuevo — array tipado `OurTeamMember[]` con los 7 integrantes (nombre, apellido, puesto, foto) |
| Tipo | `frontend/src/modules/public-web/types/ourTeam.ts` | Nuevo — `interface OurTeamMember` |
| Assets de fotos | `frontend/public/team/*` | Nuevo — fotos reales de los 7 integrantes, servidas como asset estático (`/team/<archivo>`) |
| Componente público | `frontend/src/modules/public-web/components/OurTeamSection.tsx` | Nuevo — sección "Conocé nuestro equipo", carrusel horizontal |
| `TeamSection.tsx` | `frontend/src/modules/public-web/components/TeamSection.tsx` | **Eliminado** — reemplazado por `OurTeamSection.tsx` |
| Home | `frontend/src/modules/public-web/pages/HomePage.tsx` | Modificado — se quita `<TeamSection />` y se agrega `<OurTeamSection />` en su lugar |

Nada de backend, admin, storage, sidebar ni dependencias nuevas se toca (el carrusel se resuelve sin librería externa, ver Decisiones tomadas). El hook `useProducersMap` se mantiene intacto porque lo sigue usando `FindAdvisorMap.tsx`.

### Modelo de datos

N/A — no hay base de datos. El "modelo" es el tipo de TypeScript:

```ts
export interface OurTeamMember {
  id: string;
  nombre: string;
  apellido: string;
  puesto: string;       // ej: "CEO & Fundador", "Gerente Comercial"
  foto?: string;         // import estático o ruta en /public; opcional → fallback a iniciales
}
```

### Contratos de API

N/A — no hay endpoint ni llamada de red para esta sección.

### UI / UX

No hay Figma provisto. Referencia final de tarjeta: foto en formato retrato (`aspect-ratio 3:4`) ocupando la parte superior de la tarjeta, y debajo — alineados a la izquierda, sobre fondo blanco — el nombre en negrita y el puesto en texto secundario (estilo tipo "James Benjamin / CEO @ Framify" que pasó el usuario como referencia). El layout general es un **carrusel**, no una grilla estática:

- Título: "Conocé nuestro equipo".
- Bajada: "Los responsables de que MAPS funcione todos los días".
- Carrusel horizontal con las 7 tarjetas:
  - Mobile: 1 tarjeta visible (con preview parcial de la siguiente), scroll-snap por tarjeta.
  - Tablet: 2 tarjetas visibles.
  - Desktop: 3-4 tarjetas visibles.
  - Navegación: botones prev/next (flechas), + swipe/drag táctil y con mouse. Scroll-snap nativo de CSS (`scroll-snap-type: x mandatory`) en lugar de reimplementar lógica de slide a mano.
  - Sin autoplay (contenido de personas, no de novedades rotativas — evita animación innecesaria y problemas de accesibilidad).
- Tarjeta: foto de retrato a todo el ancho (`aspect-[3/4]`, `object-cover`) o iniciales grandes centradas como fallback sobre fondo `maps-brand-soft`; debajo, en un bloque con padding y texto alineado a la izquierda, nombre y apellido en negrita y puesto en texto secundario.
- Accesibilidad: botones prev/next con `aria-label` ("Ver integrante anterior/siguiente"), contenedor con `role="region"` y `aria-label="Nuestro equipo"`, foco visible en cada control.
- Sin estados de loading/error (los datos son estáticos y siempre están disponibles). Si el array está vacío, no se renderiza la sección.

### Cambios en código existente

- `HomePage.tsx`: se elimina `<TeamSection />` y se agrega `<OurTeamSection />` en el mismo lugar del árbol de secciones (después de `FindAdvisorMap`, antes de `CtaSection`).
- `TeamSection.tsx` se borra del repo (sin otros importadores).
- Ningún otro archivo existente se toca (no hay sidebar, rutas admin, ni storage adapter involucrados). `useProducersMap.ts` no se modifica ni se borra: sigue en uso por `FindAdvisorMap.tsx`.

---

## Decisiones tomadas

- Se resuelve con datos estáticos en el frontend (Alternativa A), no con un modelo de backend administrable — ver justificación en "Alternativas consideradas".
- No hay relación con `Usuario`/`Productor`: un integrante de equipo es contenido puramente institucional, no una cuenta del sistema.
- El orden de aparición es el orden del array en `ourTeam.ts` — no hace falta un campo `orden` explícito.
- La foto es opcional en el tipo (`foto?: string`), con fallback a iniciales igual que `TeamProducerAvatar` en `TeamSection.tsx` — reutilizamos `getInitials` de `shared/utils/initials` en lugar de duplicar lógica.
- `OurTeamSection` reemplaza a `TeamSection.tsx` en la Home (decisión de producto): se elimina el componente viejo y el nuevo hereda el `id="equipo"` (ya no hay colisión posible una vez borrado el original). El preview de la red de asesores/productores deja de estar en la Home; sigue disponible vía `FindAdvisorMap.tsx` (mapa) y `/productor/:slug`.
- El carrusel se implementa con CSS scroll-snap nativo + botones prev/next (sin librería como `embla-carousel` o `swiper`): el proyecto no tiene ninguna dependencia de carrusel hoy, y agregar una para 7 tarjetas estáticas es más costo (bundle, mantenimiento, API a aprender) que el que ahorra.
- Sin autoplay: es contenido institucional de personas, no novedades — autoplay agregaría complejidad de accesibilidad (pausa al hover/focus, anuncios a lectores de pantalla) sin beneficio real.
- Contenido estático confirmado como decisión final (no backend administrable) — si en el futuro el equipo cambia con frecuencia, reevaluar la Alternativa A descartada.

---

## Alternativas consideradas

### Alternativa A (descartada por ahora) — Modelo backend administrable con CRUD completo

- **Qué era:** Nuevo modelo Prisma `IntegranteEquipo` (nombre, apellido, puesto, foto, orden, activo) con CRUD completo en backend (rutas + Zod + RBAC, mismo patrón que `Noticia`/`news.routes.ts`), storage adapter para fotos, y una pantalla nueva de gestión en el panel admin.
- **Pros:** Alta/baja/edición sin deploy ni PR; consistente con el patrón ya usado para Noticias y Biblioteca; escalable si el equipo crece o cambia seguido.
- **Contras:** Requiere modelo, migración, validaciones, servicio, controlador, rutas, storage adapter nuevo, tipos/servicio/página de admin y un ítem de sidebar — mucho código nuevo para un directorio corto (dirección/gerencia) que cambia con muy poca frecuencia.
- **Por qué se descartó (por ahora):** El costo de construir y mantener un CRUD completo no se justifica para contenido que se edita pocas veces al año. Queda documentada como ruta de upgrade si el contexto cambia (ver Preguntas abiertas).

### Alternativa B — Reusar el modelo `Productor` con un flag `esStaff`

- **Qué era:** Agregar un campo a `Productor` para marcar productores que además son "staff" y mostrarlos en la nueva sección.
- **Pros:** No requiere tabla nueva.
- **Contras:** `Productor` está atado 1:1 a `Usuario` (login, matrícula, DNI, geolocalización) — campos irrelevantes para alguien que solo debe aparecer como "integrante del equipo" (ej. un director que no vende pólizas). Mezclaría dos conceptos de negocio distintos.
- **Por qué se descartó:** Acoplaría el modelo de asesores con el de organización interna, y de todos modos seguiría requiriendo más trabajo que una solución estática para el volumen de contenido esperado.

---

## Plan de implementación

### Fase única — Sección estática en Home
- [x] Definir tipo `OurTeamMember` (`public-web/types/ourTeam.ts`)
- [x] Cargar array con los 7 integrantes reales + fotos (`public-web/data/ourTeam.ts`, `public/team/`)
- [x] `OurTeamSection.tsx`: carrusel con scroll-snap, botones prev/next accesibles, fallback a iniciales, oculto si el array está vacío
- [x] Eliminar `TeamSection.tsx` y su uso en `HomePage.tsx`; insertar `<OurTeamSection />` en su lugar
- [ ] Confirmar apellido de Ezequiel y puesto de Federico Espinosa
- [ ] Optimizar peso de las fotos
- [ ] Verificar manualmente en mobile/tablet/desktop (swipe táctil, botones, scroll con mouse/trackpad)

No hay fases backend/admin — todo el trabajo es frontend y cabe en un único PR.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| La Home deja de mostrar un preview directo de asesores reales (antes vía `TeamSection.tsx`) | Alta (por diseño) | Bajo-Medio | El descubrimiento de asesores reales se mantiene vía `FindAdvisorMap.tsx` (mapa) y `/productor/:slug`; decisión de producto explícita del usuario |
| Cambios de integrantes (altas/bajas/fotos) requieren un PR y deploy | Alta (por diseño) | Bajo | Aceptado como trade-off consciente dado el bajo volumen y frecuencia de cambio esperado; si esto se vuelve frecuente, migrar a la Alternativa A descartada |
| Fotos pesadas sin optimizar afectando performance de la Home | Media | Bajo | Optimizar/comprimir las imágenes antes de commitear (o usar `next/image`-style loading si aplica al bundler actual) |
| Carrusel hecho a mano (sin librería) con bugs de scroll-snap en algún navegador/dispositivo | Media | Medio | Probar manualmente en Chrome/Safari/Firefox y mobile antes de mergear; degradar con gracia a scroll horizontal simple si `scroll-snap` no es soportado |

---

## Plan de rollout

- [ ] Feature flag: no aplica
- [ ] Migraciones: ninguna (no hay backend)
- [ ] Variables de entorno nuevas: ninguna
- [ ] Comunicación a usuarios: no aplica (contenido institucional)
- [ ] Plan de rollback: restaurar `TeamSection.tsx` (disponible en el historial de git) y volver a insertarlo en `HomePage.tsx` en lugar de `<OurTeamSection />`

---

## Métricas de éxito

- La sección "Conocé nuestro equipo" se ve correctamente en la Home con los integrantes reales cargados.
- No hay regresión visual ni de performance en la Home tras agregar la sección.

---

## Preguntas abiertas

- [x] Nombre, apellido, puesto y foto de los 7 integrantes — cargado en `ourTeam.ts` con fotos reales en `frontend/public/team/`.
- [ ] Apellido de Ezequiel — _responde:_ @lucaslegor
- [ ] Puesto de Federico Espinosa — _responde:_ @lucaslegor
- [ ] Optimizar/comprimir las fotos (algunas pesan ~2MB) antes de mergear a producción — _responde:_ @lucaslegor

---

## Referencias

- **Figma:** N/A (referencia visual: captura compartida de "Conocé nuestra red de asesores")
- **Tickets:** MAPS-018
- **PRs relacionados:** —
- **Diagramas / pruebas de concepto:** —
- **Work-log de implementación:** `docs/worklog/MAPS-018-vista-nuestro-equipo.md`
