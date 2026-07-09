# MAPS-015 - TDD: Ubicacion editable de productores en mapa

Documento de diseno tecnico para mejorar el flujo de ubicacion de productores dentro del proyecto MAPS Asesores.

**Estado:** Implementado
**Autor:** Lucas
**Revisores:** Pendiente
**Creado:** 2026-07-08
**Ultima actualizacion:** 2026-07-08

---

## Resumen

El mapa publico de productores ya consume datos reales desde `GET /api/v1/producers/map`, pero el flujo de carga y correccion de ubicacion todavia no esta unificado entre admin e intranet. El admin geocodifica a partir de direccion, mientras que el productor edita coordenadas manualmente. Este diseno propone acotar el geocoding a Argentina, priorizar Buenos Aires / La Plata, integrar un picker con pin draggable y persistir siempre la ubicacion final confirmada.

---

## Objetivo

Permitir que administradores y productores carguen o corrijan una direccion de forma asistida, vean el resultado en un mapa, ajusten el pin manualmente si hace falta y persistan direccion, latitud y longitud finales para que el mapa publico se actualice sin datos stale.

---

## Contexto

### Situacion actual

- El mapa publico principal esta en `frontend/src/modules/public-web/components/FindAdvisorMap.tsx`.
- Los productores del mapa se cargan desde `frontend/src/modules/public-web/services/producersMap.service.ts`.
- El endpoint publico es `GET /api/v1/producers/map`, montado en `backend/src/api/v1/routes/producers.routes.ts`.
- El backend devuelve productores activos con `latitud` y `longitud` no nulas desde `backend/src/services/producers.service.ts`.
- El DTO publico se arma en `backend/src/lib/producerProfileMapper.ts` y no debe exponer `email`, `id`, `dni` u otros datos sensibles.
- El geocoding browser pasa por `frontend/src/shared/lib/geocode.ts`, que llama al proxy backend `GET /api/v1/geocode`.
- El backend usa Nominatim server-side en `backend/src/lib/geocode.ts`.
- El admin carga una direccion en `frontend/src/modules/admin/components/ProducerFormModal.tsx`; el backend geocodifica al crear o actualizar productor.
- El productor edita `latitud` y `longitud` manualmente en `frontend/src/modules/intranet/components/ProducerProfileForm.tsx`.
- `frontend/src/shared/components/map/AddressMapPicker.tsx` quedo integrado como picker compartido. El problema original era que estaba sin uso y leia `result.precision`, aunque `geocodeQuery()` solo devuelve `{ latitude, longitude }`.

### Por que ahora

La ubicacion del productor impacta directamente el mapa publico y la busqueda por cercania. Si el geocoder resuelve una direccion local en otro pais o si el productor no puede corregir su ubicacion sin escribir coordenadas, el pin publico queda mal ubicado y el flujo no es confiable para usuarios finales.

---

## Alcance

- Acotar o sesgar geocoding a Argentina, priorizando Buenos Aires / La Plata cuando la busqueda sea ambigua.
- Definir un componente compartido de direccion + mapa + pin draggable para admin e intranet.
- Integrar el picker en alta/edicion admin de productores.
- Reemplazar en intranet la edicion manual de latitud/longitud por direccion + geocoding + pin ajustable.
- Persistir direccion textual en `direccion`, conservar `ciudad` por compatibilidad, y guardar latitud/longitud finales.
- Mantener `GET /api/v1/producers/map` como fuente real para el mapa publico.
- Corregir o retirar `AddressMapPicker.tsx` para no dejar typecheck roto ni archivos sin trackear innecesarios.
- Agregar tests backend y, si el patron del repo lo permite, tests frontend focalizados.

### Fuera de alcance

- Reemplazar Nominatim por otro proveedor de mapas/geocoding.
- Agregar autocomplete avanzado de direcciones.
- Crear una tabla historica de ubicaciones.
- Exponer coordenadas o datos privados adicionales en el DTO publico.
- Agregar mocks frontend de productores para produccion.
- Cambiar la estrategia general de autenticacion o permisos.

---

## Diseno propuesto

### Resumen

El backend seguira siendo responsable de la persistencia y del proxy a Nominatim. `geocodeAddress()` debe incorporar parametros que prioricen Argentina y, cuando aplique, Buenos Aires / La Plata mediante `countrycodes`, `viewbox`, `bounded` o una estrategia equivalente soportada por Nominatim. El frontend usara un componente compartido para mostrar la direccion, geocodificarla, centrar el mapa y permitir arrastrar el pin. El formulario padre recibira coordenadas finales y las enviara al backend junto con la direccion textual.

### Componentes / archivos afectados

| Pieza | Ubicacion | Rol |
|-------|-----------|-----|
| Geocoding backend | `backend/src/lib/geocode.ts` | Modificado - sesgar busquedas a Argentina / Buenos Aires / La Plata |
| Endpoint geocode | `backend/src/controllers/geocode.controller.ts` | Revisar - mantener contrato publico y errores claros |
| Validacion geocode | `backend/src/validations/geocode.schema.ts` | Revisar - conservar limites de query |
| Servicio productores | `backend/src/services/producers.service.ts` | Modificado - aceptar coordenadas finales cuando vienen del pin |
| Validacion admin | `backend/src/validations/producer.schema.ts` | Modificado - validar direccion y coordenadas opcionales/finales |
| Validacion perfil productor | `backend/src/validations/producerProfile.schema.ts` | Modificado - permitir persistir ubicacion final desde intranet |
| Picker de mapa | `frontend/src/shared/components/map/AddressMapPicker.tsx` | Nuevo o modificado - direccion, geocoding, mapa, pin draggable |
| Cliente geocode | `frontend/src/shared/lib/geocode.ts` | Revisar - contrato TypeScript alineado al picker |
| Form admin | `frontend/src/modules/admin/components/ProducerFormModal.tsx` | Modificado - integrar picker y enviar coords finales |
| Mapper admin | `frontend/src/modules/admin/lib/mapAdminProducer.ts` | Modificado - incluir latitud/longitud finales en payload |
| Form intranet | `frontend/src/modules/intranet/components/ProducerProfileForm.tsx` | Modificado - reemplazar inputs manuales por picker |
| Mapa publico | `frontend/src/modules/public-web/components/FindAdvisorMap.tsx` | Verificar - debe reflejar coordenadas persistidas |
| Tests mapa productores | `backend/tests/producersMap.integration.test.ts` | Modificado - persistencia y DTO publico |
| Tests geocode | `backend/tests/geocode.integration.test.ts` | Modificado - sesgo Argentina y contrato estable |

### Modelo de datos

Se agrega el campo `direccion` a `Productor`.

Campos existentes a persistir en `Productor`:

```sql
ALTER TABLE "Productor" ADD COLUMN "direccion" TEXT;

UPDATE "Productor"
SET "direccion" = "ciudad"
WHERE "direccion" IS NULL
  AND "ciudad" IS NOT NULL
  AND btrim("ciudad") <> '';
```

`ciudad` se mantiene por compatibilidad y display existente. La direccion textual canonica para carga/edicion queda en `direccion`.

### Contratos de API

| Metodo | Ruta | Body / Query | Respuesta | Errores |
|--------|------|--------------|-----------|---------|
| `GET` | `/api/v1/geocode` | `q=<direccion>` | `200 { data: { latitud, longitud } \| null }` | `422` query invalida |
| `POST` | `/api/v1/producers` | productor + `direccion`/`ciudad` + opcional `latitud`, `longitud` | `201 AdminProducer` | `400` direccion no ubicable, `409`, `422` |
| `PATCH` | `/api/v1/producers/:id` | patch productor + opcional ubicacion final | `200 AdminProducer` | `400`, `404`, `409`, `422` |
| `PATCH` | `/api/v1/producers/me` | perfil + opcional ubicacion final | `200 { profile }` | `400`, `401`, `422` |
| `GET` | `/api/v1/producers/map` | N/A | `200 { producers: MapProducer[] }` | `500` |

Regla propuesta: si el frontend envia coordenadas confirmadas por el pin junto con la direccion, el backend debe persistir esas coordenadas finales. Si no envia coordenadas y cambia la direccion, el backend debe geocodificar.

### UI / UX

Estados requeridos del picker:

- `idle`: sin direccion suficiente.
- `loading`: geocoding en curso.
- `found`: ubicacion encontrada y pin visible.
- `not-found`: direccion no encontrada; permitir ajuste manual si hay centro default.
- `error`: error de red/servicio; no persistir coordenadas viejas asociadas a una direccion nueva.
- `manual`: pin movido manualmente; las coordenadas del formulario quedan marcadas como finales.

Vista inicial:

- Centrada en Argentina, preferentemente Buenos Aires / La Plata.
- El mapa debe evitar una experiencia global cuando se carga o busca una direccion local.

### Cambios en codigo existente

- `AddressMapPicker.tsx` no puede quedar con `result.precision` salvo que el contrato de `geocodeQuery()` se amplie formalmente y con tests.
- `ProducerProfileForm.tsx` debe dejar de pedir latitud/longitud manuales al productor.
- `ProducerFormModal.tsx` debe emitir `ciudad`, `latitud`, `longitud` finales.
- `producerFormToApiPayload()` debe enviar coordenadas cuando existan.
- `toMapProducerDto()` debe seguir ocultando datos sensibles.

---

## Decisiones tomadas

- Agregar `Productor.direccion` y conservar `ciudad` por compatibilidad.
- Mantener la fuente del mapa publico en `GET /api/v1/producers/map`; no introducir mocks frontend.
- Mantener Nominatim detras del backend, no llamarlo directamente desde el browser.
- Restringir geocoding a Argentina con `countrycodes=ar` y viewbox Buenos Aires / La Plata, sin fallback global.
- Reutilizar o adaptar `AddressMapPicker.tsx` solo si queda alineado al contrato real de `geocodeQuery()` y pasa typecheck.
- Persistir la ubicacion final del pin por encima de la primera sugerencia del geocoder.
- Permitir ubicacion manual si el geocoder no encuentra resultado y el usuario confirma coordenadas con el pin.
- Mantener la logica sensible de persistencia y validacion en backend.
- No exponer `email`, `id`, `dni` ni campos administrativos en el DTO publico del mapa.

---

## Alternativas consideradas

### Alternativa A - Solo mejorar geocoding backend

- **Que era:** agregar sesgo a Argentina y mantener formularios actuales.
- **Pros:** menor cambio frontend.
- **Contras:** intranet seguiria pidiendo coordenadas manuales; no permite corregir errores de geocoding por metros o altura.
- **Por que se descarto:** no cumple el objetivo funcional de pin ajustable para admin y productor.

### Alternativa B - Picker solo en admin

- **Que era:** agregar mapa draggable solo al alta/edicion admin.
- **Pros:** resuelve el flujo operativo principal.
- **Contras:** el productor seguiria sin una UX razonable para mudanzas o correcciones.
- **Por que se descarto:** el requerimiento pide unificar experiencia admin / intranet.

### Alternativa C - Geocoding directo desde frontend

- **Que era:** llamar Nominatim desde el browser con parametros de Argentina.
- **Pros:** implementacion rapida.
- **Contras:** rompe el criterio ya estabilizado de usar proxy backend con User-Agent correcto.
- **Por que se descarto:** viola la arquitectura existente y aumenta riesgo de bloqueo/uso incorrecto de Nominatim.

---

## Plan de implementacion

### Fase 1 - Tests y contrato backend
- [x] Agregar/ajustar tests de `GET /geocode` para verificar que la query se construye con sesgo a Argentina.
- [x] Agregar tests de `POST /producers` con direccion + coordenadas finales.
- [x] Agregar tests de `PATCH /producers/:id` reemplazando coordenadas anteriores.
- [x] Agregar tests de `PATCH /producers/me` para productor autenticado.
- [x] Verificar que `GET /producers/map` devuelve coordenadas actualizadas y no expone datos sensibles.

### Fase 2 - Backend
- [x] Ajustar `backend/src/lib/geocode.ts` para priorizar Argentina / Buenos Aires / La Plata.
- [x] Ajustar validaciones para aceptar coordenadas finales cuando correspondan.
- [x] Ajustar create/update admin para persistir coordenadas manuales confirmadas.
- [x] Ajustar updateMe para persistir direccion y coordenadas finales desde intranet.

### Fase 3 - Picker compartido frontend
- [x] Decidir si se adapta `AddressMapPicker.tsx` o se reemplaza por un componente equivalente.
- [x] Eliminar el uso invalido de `result.precision` o ampliar contrato con tests.
- [x] Implementar estados de geocoding y pin draggable.
- [x] Emitir `direccion`, `ciudad`, `latitud`, `longitud` finales al formulario padre.

### Fase 4 - Integracion admin e intranet
- [x] Integrar picker en `ProducerFormModal.tsx`.
- [x] Ajustar `producerFormToApiPayload()` para enviar coordenadas finales.
- [x] Integrar picker en `ProducerProfileForm.tsx`.
- [x] Retirar inputs manuales de latitud/longitud de la UX del productor.

### Fase 5 - Verificacion end-to-end
- [x] Crear/editar productor desde admin y confirmar pin publico actualizado mediante tests API.
- [x] Editar ubicacion desde intranet y confirmar persistencia mediante tests API.
- [x] Correr typecheck, build, tests backend y lint backend; lint frontend queda bloqueado por binario local faltante.
- [x] Actualizar work-log final con archivos tocados, comandos y validaciones.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Nominatim devuelve resultados ambiguos aun con sesgo | Media | Alto | Permitir pin draggable y persistir ubicacion final confirmada |
| Se guardan coordenadas viejas luego de cambiar direccion | Media | Alto | Limpiar coords al cambiar direccion y exigir confirmacion/geocode antes de guardar |
| El DTO publico expone datos sensibles por accidente | Baja | Alto | Tests sobre `/producers/map` verificando ausencia de `email`, `id`, `dni` |
| Typecheck sigue roto por `AddressMapPicker.tsx` | Alta | Medio | Alinear contrato de `geocodeQuery()` o retirar/reemplazar el archivo |
| Intranet envia numeros invalidos o NaN | Media | Medio | Validacion frontend y Zod backend para coordenadas |
| Diferencia entre direccion textual y ubicacion manual | Media | Medio | Mostrar estado `manual` y persistir ambos datos de forma explicita |

---

## Plan de rollout

- [ ] Feature flag: no previsto.
- [ ] Migraciones: no previstas salvo decision posterior sobre renombrar campos.
- [ ] Variables de entorno nuevas: no previstas.
- [ ] Comunicacion a usuarios: informar a admin/productores que pueden ajustar el pin antes de guardar.
- [ ] Rollback: revertir integracion frontend manteniendo endpoints actuales; backend debe preservar compatibilidad con direccion-only.

---

## Metricas de exito

- Typecheck frontend pasa sin error de `result.precision`.
- Admin puede crear/editar ubicacion con direccion + pin draggable.
- Productor puede actualizar ubicacion desde intranet sin escribir latitud/longitud manualmente.
- `GET /api/v1/producers/map` refleja coordenadas actualizadas despues de guardar.
- Tests backend de geocoding/persistencia/mapa publico pasan.
- DTO publico de mapa sigue sin exponer datos sensibles.

---

## Preguntas abiertas

- [x] Se agrega `direccion`; `ciudad` queda por compatibilidad/display.
- [x] Se usa `countrycodes=ar` y viewbox Buenos Aires / La Plata, sin fallback global.
- [x] El productor puede guardar ubicacion manual si confirma coordenadas con el pin.
- [x] La UI muestra estado textual del pin; las coordenadas viajan en el formulario pero no se exponen como inputs manuales.

---

## Referencias

- **Figma:** N/A
- **Tickets:** MAPS-015
- **PRs relacionados:** N/A
- **Diagramas / pruebas de concepto:** N/A
- **Work-log de implementacion:** `docs/worklog/MAPS-015-ubicacion-productores-mapa.md`
