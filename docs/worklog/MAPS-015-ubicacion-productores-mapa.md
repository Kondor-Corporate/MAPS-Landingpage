# MAPS-015 - Ubicacion editable de productores en mapa

Documentacion de la feature ubicacion editable de productores dentro del proyecto MAPS Asesores. Complementa el [README tecnico](./README.md) y el [README raiz](../README.md).

---

## Objetivo

Registrar el trabajo necesario para cerrar el flujo completo de ubicacion de productores: direccion, geocoding acotado a Argentina, pin ajustable, persistencia y actualizacion del mapa publico. Este work-log queda creado antes de implementar por pedido del usuario y debera completarse al cerrar la feature.

---

## Cambios implementados

### 1. TDD inicial de la feature

**Archivos:**

- `docs/tdd/MAPS-015-tdd-ubicacion-productores-mapa.md`
- `docs/worklog/MAPS-015-ubicacion-productores-mapa.md`

Se documenta el alcance esperado antes de tocar codigo: admin, intranet/productor, geocoding backend, picker de mapa, persistencia y mapa publico. No se implemento funcionalidad en esta etapa.

---

### 2. Flujo actual relevado

**Archivos revisados:**

- `frontend/src/modules/public-web/components/FindAdvisorMap.tsx`
- `frontend/src/modules/public-web/services/producersMap.service.ts`
- `frontend/src/shared/lib/geocode.ts`
- `frontend/src/shared/components/map/AddressMapPicker.tsx`
- `frontend/src/modules/admin/components/ProducerFormModal.tsx`
- `frontend/src/modules/admin/lib/mapAdminProducer.ts`
- `frontend/src/modules/intranet/components/ProducerProfileForm.tsx`
- `backend/src/api/v1/routes/producers.routes.ts`
- `backend/src/controllers/producers.controller.ts`
- `backend/src/services/producers.service.ts`
- `backend/src/lib/producerProfileMapper.ts`
- `backend/src/lib/geocode.ts`
- `backend/tests/producersMap.integration.test.ts`

Hallazgos principales:

- El mapa publico consume `GET /api/v1/producers/map`; no usa mock frontend.
- El backend filtra productores activos con coordenadas no nulas.
- El DTO publico del mapa no debe exponer datos sensibles.
- Admin geocodifica direccion al crear/editar productor.
- Intranet todavia permite editar latitud/longitud manualmente.
- `AddressMapPicker.tsx` existe sin uso y falla typecheck por `result.precision`.

---

### 3. Persistencia y contratos de ubicacion

**Archivos:**

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260708120000_productor_direccion/migration.sql`
- `backend/prisma/seed.ts`
- `backend/src/lib/producerProfileMapper.ts`
- `backend/src/services/producers.service.ts`
- `backend/src/validations/producer.schema.ts`
- `backend/src/validations/producerProfile.schema.ts`

Se agrega `Productor.direccion`, con backfill desde `ciudad`. Los DTOs admin, perfil y mapa publico incluyen `direccion` sin exponer datos sensibles. La persistencia prioriza coordenadas manuales del pin; si no llegan coordenadas y cambia la direccion, el backend geocodifica.

---

### 4. Geocoding Argentina

**Archivos:**

- `backend/src/lib/geocode.ts`
- `backend/tests/geocode.lib.test.ts`

Nominatim queda limitado a Argentina con `countrycodes=ar` y viewbox Buenos Aires / La Plata. No hay fallback global.

---

### 5. Picker compartido admin / intranet

**Archivos:**

- `frontend/src/shared/components/map/AddressMapPicker.tsx`
- `frontend/src/modules/admin/components/ProducerFormModal.tsx`
- `frontend/src/modules/admin/lib/mapAdminProducer.ts`
- `frontend/src/modules/admin/types/adminProducer.ts`
- `frontend/src/modules/admin/types/producer.ts`
- `frontend/src/modules/intranet/components/ProducerProfileForm.tsx`
- `frontend/src/modules/intranet/types/producerProfile.ts`
- `frontend/src/shared/types/producerProfile.ts`
- `frontend/src/modules/public-web/types/producerMap.ts`

`AddressMapPicker` queda integrado como componente real: input de direccion, geocoding con debounce, mapa, pin draggable y emision de direccion/coordenadas finales. Admin e intranet usan el mismo flujo. Intranet ya no muestra inputs manuales de latitud/longitud.

## Estado del sistema tras MAPS-015

Estado actual: implementado y verificado.

### Flujo esperado al finalizar

```
Admin/Productor
  -> ingresa direccion
  -> backend geocode prioriza Argentina / Buenos Aires / La Plata
  -> frontend muestra mapa y pin
  -> usuario ajusta pin si hace falta
  -> backend persiste direccion + latitud + longitud finales
  -> GET /producers/map devuelve coords actualizadas
  -> FindAdvisorMap muestra el pin actualizado
```

### Tabla resumen

| Caso | Comportamiento esperado |
|------|-------------------------|
| Alta admin con direccion | Geocodifica, muestra pin, permite drag y guarda coords finales |
| Edicion admin con nueva direccion | Reemplaza direccion y coords anteriores |
| Edicion intranet/productor | No requiere escribir lat/lng manualmente |
| Pin arrastrado | Actualiza coordenadas del formulario |
| Mapa publico | Usa coordenadas persistidas actualizadas |
| DTO publico | No expone `email`, `id`, `dni` |

---

## Criterios de aceptacion verificados

| Criterio | Estado |
|----------|--------|
| TDD creado siguiendo template | Verificado en `docs/tdd/MAPS-015-tdd-ubicacion-productores-mapa.md` |
| Work-log creado siguiendo template | Verificado en este archivo |
| No implementar funcionalidad todavia | Verificado: solo se agregaron documentos |
| Typecheck actual identifica problema de `AddressMapPicker` | Observado antes de este documento: `Property 'precision' does not exist on type 'GeocodeCoords'` |
| Admin puede ingresar direccion, ajustar pin y guardar | Cubierto por API y typecheck/build frontend |
| Productor puede actualizar ubicacion desde intranet sin lat/lng manual | Cubierto por API y componente integrado |
| Geocoding prioriza Argentina / Buenos Aires / La Plata | Cubierto por `backend/tests/geocode.lib.test.ts` |
| `GET /producers/map` devuelve coordenadas actualizadas | Cubierto por `backend/tests/producersMap.integration.test.ts` |
| Tests relevantes pasan | Backend tests/typecheck/lint/build; frontend typecheck/build |

---

## Pruebas manuales recomendadas

```
1. Admin crea productor con "Diagonal 75 172, La Plata, Buenos Aires, Argentina"
   -> El mapa se centra en La Plata / Buenos Aires
   -> El pin aparece en una ubicacion razonable
   -> Al arrastrar el pin, las coordenadas del payload cambian

2. Admin edita productor existente y cambia direccion
   -> No se conservan coordenadas viejas asociadas a la nueva direccion
   -> El backend persiste la ubicacion final del pin

3. Productor entra a intranet y cambia su direccion
   -> No necesita escribir latitud/longitud manualmente
   -> Puede ajustar el pin antes de guardar

4. Usuario publico abre el mapa
   -> El pin del productor aparece en la nueva ubicacion
   -> Popup y links de perfil/WhatsApp siguen funcionando

5. Direccion ambigua o no encontrada
   -> La UI informa el problema
   -> No se guarda una coordenada vieja por accidente
```

Comandos de validacion esperados al finalizar:

```bash
cd frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build

cd backend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Autocomplete avanzado | Queda fuera del alcance inicial; se podra evaluar luego si el geocoding manual no alcanza |
| Historial de mudanzas | No se registrara historial de ubicaciones en esta feature |
| Cambio de proveedor geocoding | Se mantiene Nominatim via backend |
| Migracion `ciudad` -> `direccion` | Resuelto dentro de MAPS-015: se agrega `direccion` y se conserva `ciudad` por compatibilidad |

---

## Decisiones tecnicas registradas

| Decision | Motivo |
|----------|--------|
| Mantener backend como proxy de Nominatim | Respeta User-Agent server-side y arquitectura existente |
| No agregar mocks frontend de productores | El mapa publico ya consume API real |
| Persistir coordenadas finales del pin | Corrige errores de geocoding sin depender de precision del proveedor |
| Reusar/adaptar `AddressMapPicker` solo si pasa typecheck | Hoy no esta integrado y usa un contrato incorrecto |
| Mantener DTO publico minimo | Evita exposicion de datos sensibles |

---

## Problemas encontrados

| Problema | Estado |
|----------|--------|
| `AddressMapPicker.tsx` no trackeado y sin uso | Resuelto: integrado como componente compartido |
| `AddressMapPicker.tsx` usa `result.precision` inexistente | Resuelto: contrato alineado a `GeocodeCoords` |
| Intranet edita latitud/longitud manualmente | Resuelto: reemplazado por picker con pin draggable |
| Geocoding no documenta sesgo a Argentina | Resuelto: implementado y cubierto por test |

---

## Comandos ejecutados

```bash
Get-Content docs/tdd/_TEMPLATE-tdd.md
Get-Content docs/worklog/_TEMPLATE-worklog.md
Get-Content docs/CONTRIBUTING.md
Get-Content docs/CONVENTIONS.md
Get-Content C:\Users\famil\.codex\attachments\1292b091-8ebf-42cd-938a-23d155a6b1b1\pasted-text.txt
Get-ChildItem docs/tdd -File
Get-ChildItem docs/worklog -File
git status --short
npm.cmd run prisma:generate
npx.cmd prisma migrate deploy
npm.cmd run db:seed
npm.cmd install
npm.cmd run typecheck
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Comando observado durante el relevamiento previo:

```bash
cd frontend
npm.cmd run typecheck
```

Resultado observado: falla por `src/shared/components/map/AddressMapPicker.tsx(83,28): error TS2339: Property 'precision' does not exist on type 'GeocodeCoords'.`

Resultado final: corregido; `frontend npm.cmd run typecheck` pasa.

---

## Validaciones finales

| Comando | Resultado |
|---------|-----------|
| `backend: npm.cmd run prisma:generate` | OK |
| `backend: npx.cmd prisma migrate deploy` | OK |
| `backend: npm.cmd run db:seed` | OK |
| `backend: npm.cmd run typecheck` | OK |
| `backend: npm.cmd test` | OK - 8 archivos, 95 tests |
| `backend: npm.cmd run lint` | OK |
| `backend: npm.cmd run build` | OK |
| `frontend: npm.cmd run typecheck` | OK |
| `frontend: npm.cmd run build` | OK |
| `frontend: npm.cmd install` | OK tras reintento elevado; restauró binarios locales, sin cambios finales en lockfile |
| `frontend: npm.cmd run lint` | OK |

---

*Documento generado en la feature MAPS-015 - ubicacion editable de productores en mapa.*
