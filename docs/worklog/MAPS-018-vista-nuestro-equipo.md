# MAPS-018 — Vista "Nuestro Equipo" (integrantes de la organización)

Documentación de la feature "Nuestro Equipo" dentro del proyecto MAPS Asesores. Complementa el [README técnico](./README.md) y el [README raíz](../README.md).

**Estado:** Implementado con contenido real (7 integrantes con nombre, puesto y foto). Faltan dos datos puntuales (apellido de Ezequiel, puesto de Federico) y optimizar el peso de las fotos.
**TDD:** [`docs/tdd/MAPS-018-tdd-vista-nuestro-equipo.md`](../tdd/MAPS-018-tdd-vista-nuestro-equipo.md)

---

## Objetivo

Mostrar en la Home a los 7 principales integrantes de la organización (dirección, gerencia, referentes) con nombre y apellido, foto y una descripción corta del puesto — contenido institucional, distinto de la red de asesores/productores. Se resuelve como contenido estático en el frontend (sin backend ni panel admin), presentado en un carrusel horizontal, y **reemplaza en la Home** a la sección "Conocé nuestra red de asesores" (`TeamSection.tsx`), que se elimina.

Feature exclusivamente frontend: no agrega modelo de datos, endpoint ni pantalla de administración. El descubrimiento de asesores reales sigue disponible vía el mapa (`FindAdvisorMap.tsx`) y `/productor/:slug`.

---

## Cambios implementados

### 1. Datos y tipo del equipo

**Archivos:**

- `frontend/src/modules/public-web/types/ourTeam.ts`
- `frontend/src/modules/public-web/data/ourTeam.ts`
- `frontend/public/team/*` — 7 fotos reales (`maximiliano-perez.png`, `diana-niz.jpg`, `cesar-doporto.png`, `ezequiel.png`, `federico-espinosa.jpeg`, `martin-ingaramo.png`, `julio-perez.jpg`)

Tipo `OurTeamMember` (`id`, `nombre`, `apellido`, `puesto`, `foto?`) y array `ourTeam` con los **7 integrantes reales**:

| Integrante | Puesto |
|---|---|
| Maximiliano Perez | Líder Organización |
| Diana Niz | Gestión Siniestros |
| Cesar Doporto | Gestión Procesos |
| Ezequiel (apellido pendiente) | Gestión Comunicación |
| Federico Espinosa | Puesto pendiente |
| Martin Ingaramo | Asesor de Seguros |
| Julio Perez | Gestión Producción |

Las fotos originales llegaron sueltas en `frontend/public/temporal/` (nombres informales: "Maxi editada.png", "daiana.jpg", etc.); se copiaron a `frontend/public/team/` con nombres normalizados (`nombre-apellido.ext`) y se borró la carpeta `temporal/`. Se sirven como asset estático de Vite (ruta `/team/<archivo>`), sin import de módulo. El orden de aparición en el carrusel es el orden del array — no hay campo `orden` explícito.

---

### 2. Sección pública "Conocé nuestro equipo"

**Archivos:**

- `frontend/src/modules/public-web/components/OurTeamSection.tsx`
- `frontend/src/modules/public-web/components/TeamSection.tsx` — **eliminado**
- `frontend/src/modules/public-web/pages/HomePage.tsx` (se quita `<TeamSection />` y se agrega `<OurTeamSection />` en su lugar, entre `FindAdvisorMap` y `CtaSection`)
- `docs/modules/public-web.md` — actualizada referencia de `TeamSection` a `OurTeamSection`

Carrusel horizontal con CSS scroll-snap nativo (`snap-x snap-mandatory` + `overflow-x-auto`), sin librería externa. Botones prev/next (`lucide-react` `ChevronLeft`/`ChevronRight`, mismo ícono que ya se usa en `TablePagination.tsx`) que hacen `scrollBy` y se deshabilitan/ocultan en los extremos según la posición de scroll (`onScroll` + estado `canScrollPrev`/`canScrollNext`). Soporta swipe táctil y scroll de mouse/trackpad de forma nativa por ser scroll real del navegador. Sin autoplay. Título "Conocé nuestro equipo" y bajada "Los responsables de que MAPS funcione todos los días". Si `ourTeam` estuviera vacío, el componente retorna `null`.

Ancho de tarjeta responsive: `w-[80%]` en mobile (deja ver el borde de la siguiente), `sm:w-[45%]`, `md:w-[31%]`, `lg:w-[23%]` — se ven 1/2/3/4 tarjetas aprox. según breakpoint, como definido en el TDD.

**Diseño de tarjeta (ajustado a pedido del usuario, referencia tipo "James Benjamin / CEO @ Framify"):** ya no es un avatar circular centrado — la foto (o iniciales como fallback) ocupa todo el ancho de la tarjeta en formato retrato (`aspect-[3/4]`, `object-cover`), y debajo, en un bloque con padding y texto alineado a la izquierda, va el nombre completo en negrita y el puesto en texto secundario. `TeamMemberPhoto` (antes `TeamMemberAvatar`) ahora renderiza a `h-full w-full` dentro de ese contenedor rectangular en lugar de un círculo de 128px.

**Nota de diseño no obvia:** `TeamSection.tsx` no coexiste con esta sección — se eliminó del repo porque no tenía otros usos fuera de `HomePage.tsx` (el hook que consumía, `useProducersMap`, se mantiene porque también lo usa `FindAdvisorMap.tsx`). `OurTeamSection` hereda el `id="equipo"` que antes usaba `TeamSection.tsx`.

**Verificación realizada:** `tsc --noEmit` y `eslint` sin errores tras la eliminación de `TeamSection.tsx` y el cambio en `HomePage.tsx`; `npm run dev` levantado y sirviendo 200 en `http://localhost:5174/`. No se pudo tomar captura de pantalla en este entorno (sin `chromium-cli`/Playwright instalado) — falta una verificación visual manual en navegador antes de dar por cerrada la Fase única.

---

## Estado del sistema tras MAPS-018

La Home renderiza `OurTeamSection` entre `FindAdvisorMap` y `CtaSection` (donde antes estaba `TeamSection`), con las 7 tarjetas reales en carrusel. `TeamSection.tsx` fue eliminado del repo — la Home ya no tiene un preview de tarjetas de productores; ese descubrimiento queda a cargo del mapa y los perfiles públicos. Pendiente: completar apellido de Ezequiel y puesto de Federico, optimizar peso de fotos, y confirmar visualmente en navegador (ver "Pruebas manuales recomendadas").

### Comportamiento esperado de la tarjeta de integrante

| Caso | Comportamiento |
|------|----------------|
| Integrante con foto cargada | La foto ocupa la parte superior de la tarjeta en formato retrato (3:4) |
| Integrante sin foto | Fallback a iniciales grandes centradas sobre fondo `maps-brand-soft`, mismo bloque 3:4 |
| Array de integrantes vacío | La sección no se renderiza |
| Menos tarjetas que el ancho visible del carrusel | Botones prev/next se deshabilitan u ocultan según corresponda |

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| `OurTeamSection` renderiza los 7 integrantes reales con foto y puesto | Verificado por código + typecheck; falta confirmación visual en navegador |
| El carrusel funciona con botones, swipe táctil y scroll de mouse/trackpad en mobile/tablet/desktop | Pendiente de verificación manual en navegador |
| `TeamSection.tsx` (red de asesores) fue eliminado y ya no se renderiza en la Home | Verificado — archivo borrado, sin referencias rotas (typecheck limpio) |
| No se agregó ninguna dependencia nueva de carrusel al `package.json` | Verificado — `package.json` sin cambios |
| Contenido real de los 7 integrantes cargado en `ourTeam.ts` | Verificado, salvo 2 datos puntuales (apellido de Ezequiel, puesto de Federico) |

---

## Pruebas manuales recomendadas

```
1. Cargar la Home.
   → Se ven las 7 tarjetas en el carrusel (foto arriba, nombre y puesto abajo), en el orden definido en ourTeam.ts.

2. Navegar el carrusel con los botones prev/next.
   → Avanza/retrocede una tarjeta (o el bloque visible) por click, sin saltos raros.

3. Navegar el carrusel con swipe (mobile) y scroll horizontal (trackpad/mouse).
   → El scroll-snap deja cada tarjeta alineada, sin quedar "a mitad de tarjeta".

4. Probar con un integrante sin foto cargada.
   → Se ve el fallback de iniciales, mismo estilo que en la red de asesores.

5. Revisar accesibilidad básica: foco visible en los botones prev/next, aria-label presente.
   → Navegable por teclado (Tab + Enter en los botones).

6. Confirmar que la sección "Conocé nuestra red de asesores" ya no aparece en la Home.
   → En su lugar, en esa posición, se ve "Conocé nuestro equipo".
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Perfil individual público por integrante | Explícitamente fuera de alcance en el TDD MAPS-018; cada tarjeta es solo informativa |
| Backend administrable para este contenido | Descartado por ahora (Alternativa A del TDD); reconsiderar solo si el equipo empieza a cambiar con frecuencia |
| Apellido de Ezequiel y puesto de Federico Espinosa | Datos puntuales pendientes de confirmar en `frontend/src/modules/public-web/data/ourTeam.ts` |
| Optimización de peso de fotos | Algunas pesan ~2MB; comprimir antes de mergear a producción |
| Verificación visual en navegador (screenshot) | No se pudo hacer en este entorno de implementación (sin `chromium-cli`/Playwright); pendiente de una pasada manual |

---

*Documento generado en la feature MAPS-018 — vista "Nuestro Equipo". Estado inicial: borrador pendiente de implementación, actualizado tras cerrar el diseño en carrusel de contenido estático.*
