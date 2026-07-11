# Web publica

Documentacion viva de la web publica de MAPS Asesores.

Incluye:

- Landing institucional.
- Mapa de asesores/productores.
- Perfil publico de productor por slug.
- Preview/modal de noticias con datos reales desde API (MAPS-014).

---

## Estado actual

| Area | Estado |
|------|--------|
| Landing `/` | Implementada |
| Mapa publico | Implementado con MapLibre y API de productores |
| Perfil publico `/productor/:slug` | Implementado con API |
| Noticias en landing | Implementadas con API real |
| TeamSection | Mock / datos estaticos |
| CTA / contacto comercial | Pendiente o sin accion real |
| SEO/metadatos avanzados | Pendiente |

---

## Rutas frontend

| Ruta | Componente | Estado |
|------|------------|--------|
| `/` | `HomePage` | Implementada |
| `/productor/:slug` | `ProducerProfilePage` | Implementada |

Archivos principales:

- `frontend/src/modules/public-web/pages/HomePage.tsx`
- `frontend/src/modules/public-web/pages/ProducerProfilePage.tsx`
- `frontend/src/modules/public-web/components/HeroSection.tsx`
- `frontend/src/modules/public-web/components/WhyUsSection.tsx`
- `frontend/src/modules/public-web/components/FindAdvisorMap.tsx`
- `frontend/src/modules/public-web/components/NewsPreviewSection.tsx`
- `frontend/src/modules/public-web/components/TeamSection.tsx`
- `frontend/src/modules/public-web/components/CtaSection.tsx`
- `frontend/src/shared/layouts/PublicLayout.tsx`

---

## APIs consumidas

### Mapa publico

```text
GET /api/v1/producers/map
```

Devuelve productores activos con coordenadas y datos publicos minimos para marcadores.

Servicio frontend:

- `frontend/src/modules/public-web/services/producersMap.service.ts`

### Perfil publico

```text
GET /api/v1/producers/by-slug/:slug
```

Devuelve perfil publico del productor activo. No debe exponer datos sensibles ni campos administrativos internos.

Servicio frontend:

- `frontend/src/modules/public-web/services/producerProfile.service.ts`

---

## Mapa

Tecnologias:

- `maplibre-gl`.
- `react-map-gl`.

Archivos relacionados:

- `frontend/src/modules/public-web/components/FindAdvisorMap.tsx`
- `frontend/src/shared/components/map/SingleProducerMap.tsx`
- `frontend/src/shared/components/map/MapPinIcon.tsx`
- `frontend/src/shared/components/map/mapStyle.ts`
- `frontend/src/shared/lib/geocode.ts`
- `frontend/src/shared/lib/distance.ts`

Notas:

- El mapa depende de que productores activos tengan `latitud` y `longitud`.
- Las coordenadas se generan en backend al crear/actualizar productor con direccion.
- Lazy-load de MapLibre sigue siendo una mejora posible de performance.

---

## Noticias en web publica

Estado actual:

- Landing muestra previews y modal con datos reales desde `GET /api/v1/news/public`.
- El mock `mockNews.ts` fue retirado del flujo principal (MAPS-014).
- Detalle vía modal + `GET /news/public/:slug` (sin ruta SEO `/noticias/:slug`).

Archivos relacionados:

- `frontend/src/modules/public-web/components/NewsPreviewSection.tsx`
- `frontend/src/modules/public-web/components/NewsDetailModal.tsx`
- `frontend/src/shared/services/publicNews.service.ts`
- `frontend/src/shared/hooks/usePublicNews.ts`
- `frontend/src/shared/lib/mapPublicNews.ts`
- `frontend/src/shared/components/NewsImage.tsx`
- `frontend/src/shared/store/newsModalStore.ts`

Detalle completo del modulo: [`news.md`](./news.md).

---

## Verificacion manual

Landing:

1. Abrir `http://localhost:5173`.
2. Confirmar hero, secciones institucionales y CTA.
3. Confirmar que no hay errores de consola relevantes.

Mapa:

1. Confirmar que la API `/api/v1/producers/map` responde.
2. Confirmar que el mapa renderiza marcadores si hay productores activos con coordenadas.
3. Abrir un marcador o accion relacionada si aplica.

Perfil publico:

1. Abrir `/productor/:slug` con slug existente.
2. Confirmar datos publicos.
3. Probar slug inexistente o productor inactivo.

---

## Pendientes conocidos

- TeamSection con datos reales o CMS.
- CTA/contacto con accion real (formulario, mailto o integracion).
- SEO y metadatos por pagina/perfil.
- Lazy-load del bundle de MapLibre si impacta performance.
- Definir estrategia final de imagenes publicas.
- E2E para landing, mapa y perfil publico.
