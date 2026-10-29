# MAPS-016 — Credenciales administradas por admin para productores

Documentación de la feature credenciales de productores dentro del proyecto MAPS Asesores. Complementa el [README técnico](./README.md) y el [README raíz](../README.md).

---

## Objetivo

Reemplazar la contraseña compartida (`env.DEFAULT_PRODUCER_PASSWORD`) que recibían todos los productores nuevos por credenciales individuales definidas por el administrador en el alta. El productor puede cambiar su propia contraseña desde su perfil privado, y el administrador puede restablecerla manualmente si el productor pierde el acceso. No se agrega recuperación pública/autónoma de contraseña.

Diseño completo, alternativas descartadas y decisiones en `docs/tdd/MAPS-016-tdd-credenciales-productores.md`.

---

## Cambios implementados

### 1. Alta de productor con contraseña individual

**Archivos:**

- `backend/src/lib/passwordPolicy.ts` (nuevo)
- `backend/src/validations/producer.schema.ts`
- `backend/src/services/producers.service.ts`
- `backend/src/controllers/producers.controller.ts`
- `backend/src/config/env.ts`
- `backend/.env.example`

`createProducerSchema` exige `password` en el body (validado con `passwordSchema`). `producersService.create()` deja de hashear la constante `env.DEFAULT_PRODUCER_PASSWORD` y hashea la contraseña recibida.

```ts
// antes (producers.service.ts)
const env = loadEnv();
const passwordHash = await bcrypt.hash(env.DEFAULT_PRODUCER_PASSWORD, 12);

// después
const passwordHash = await bcrypt.hash(input.password, 12);
```

`DEFAULT_PRODUCER_PASSWORD` pasa a `.optional()` en `env.ts` — queda acotada a `prisma/seed.ts` (que la lee directo de `process.env`, sin pasar por `loadEnv()`).

Regla de negocio: la política de fortaleza (mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número) se centraliza en `passwordPolicy.ts` (`passwordSchema`) y se reutiliza en los tres flujos (alta, self-service, reset admin).

---

### 2. Cambio de contraseña desde el perfil del productor (self-service)

**Archivos:**

- `backend/src/validations/producerProfile.schema.ts`
- `backend/src/services/producers.service.ts`
- `backend/src/controllers/producers.controller.ts`
- `backend/src/api/v1/routes/producers.routes.ts`

Nuevo endpoint `PATCH /api/v1/producers/me/password`, protegido con `productorOnly`. Requiere `currentPassword`, `newPassword`, `confirmPassword`. `producersService.changeMyPassword()` verifica `currentPassword` con `bcrypt.compare` (401 si no coincide) antes de hashear la nueva, y revoca todas las `SesionToken` del usuario en la misma transacción (mismo patrón que `setActivo(id, false)`), forzando que la contraseña anterior deje de habilitar sesiones ya emitidas.

---

### 3. Restablecimiento de contraseña por administrador

**Archivos:**

- `backend/src/validations/producer.schema.ts`
- `backend/src/services/producers.service.ts`
- `backend/src/controllers/producers.controller.ts`
- `backend/src/api/v1/routes/producers.routes.ts`

Nuevo endpoint `PATCH /api/v1/producers/:id/password`, protegido con `adminOnly`. Requiere `newPassword`, `confirmPassword`. No pide ni valida contraseña actual. `producersService.resetPassword()` busca el `Productor` por id (404 si no existe), hashea la nueva contraseña y revoca `SesionToken` del usuario asociado, igual que el punto 2.

Regla de negocio: es la única vía de recuperación cuando el productor pierde el acceso — no existe ni se agrega un flujo público de "olvidé mi contraseña".

---

### 4. Dashboard admin — tabla, alta y acción de reset

**Archivos:**

- `frontend/src/modules/admin/components/ProducerFormModal.tsx`
- `frontend/src/modules/admin/components/ProducerTable.tsx`
- `frontend/src/modules/admin/components/ProducerActionsMenu.tsx`
- `frontend/src/modules/admin/components/ProducerResetPasswordModal.tsx` (nuevo)
- `frontend/src/modules/admin/components/ProducersDashboard.tsx`
- `frontend/src/modules/admin/services/producers.service.ts`
- `frontend/src/modules/admin/hooks/useAdminProducers.ts`
- `frontend/src/modules/admin/hooks/useProducerFilters.ts`
- `frontend/src/modules/admin/types/adminProducer.ts`
- `frontend/src/modules/admin/types/producer.ts`
- `frontend/src/modules/admin/lib/mapAdminProducer.ts`
- `frontend/src/shared/utils/passwordPolicy.ts` (nuevo — política compartida entre los 3 formularios de frontend)

`ProducerFormModal` en modo `create` suma "Contraseña inicial" + "Confirmar contraseña" (nunca en modo `edit`). `ProducerTable` reemplaza la columna `DNI` por `Usuario` (email), en desktop y mobile. `ProducerActionsMenu` suma el ítem "Restablecer contraseña" (ícono `KeyRound`), que abre `ProducerResetPasswordModal` (pide solo nueva contraseña + confirmación, nunca la actual). `ProducersDashboard` orquesta el estado del nuevo modal siguiendo el mismo patrón que `DeactivateConfirmModal`.

```
// antes (ProducerTable.tsx)
const COLUMNS = ['Nombre', 'Estado', 'DNI', 'Últ. act. cuenta', 'Acciones'];

// después
const COLUMNS = ['Nombre', 'Usuario', 'Estado', 'Últ. act. cuenta', 'Acciones'];
```

DNI se mantiene visible en el detalle (`ProducerViewModal`, sin cambios) — sale de la grilla principal y del buscador (`useProducerFilters`), porque el alta actual ni siquiera lo recolecta.

---

### 5. Perfil privado del productor — cambio de contraseña

**Archivos:**

- `frontend/src/modules/intranet/components/ChangePasswordForm.tsx` (nuevo)
- `frontend/src/modules/intranet/services/producerProfile.service.ts`
- `frontend/src/modules/intranet/hooks/useProducerProfile.ts`
- `frontend/src/modules/intranet/pages/ProducerProfileViewPage.tsx`
- `frontend/src/modules/intranet/types/producerProfile.ts`

Nueva sección "Seguridad" en `/intranet/mi-perfil`, independiente del formulario de edición de perfil, con contraseña actual, nueva contraseña y confirmación. Reutiliza el mecanismo de toast ya presente en `ProducerProfileViewPage`. Limpia los tres campos tras éxito.

---

## Estado del sistema tras MAPS-016

### Endpoints `/api/v1/producers`

```
POST   /producers                → requiere password en el body (antes: password fija global)
PATCH  /producers/me/password    → nuevo, self-service, requiere currentPassword
PATCH  /producers/:id/password   → nuevo, admin, no requiere currentPassword
```

### Tabla admin

| Antes | Después |
|-------|---------|
| Nombre / Estado / DNI / Últ. act. cuenta / Acciones | Nombre / Usuario / Estado / Últ. act. cuenta / Acciones |

### Autorización

| Endpoint | Rol requerido |
|----------|----------------|
| `PATCH /producers/me/password` | `PRODUCTOR` (propio usuario) |
| `PATCH /producers/:id/password` | `ADMIN`, `SUPERADMIN` |

### Códigos de respuesta

| Caso | Código |
|------|--------|
| Password ausente/débil, confirmación no coincide (falla el schema Zod vía middleware `validate`) | `422` |
| `currentPassword` incorrecta (self-service) | `401` |
| Rol no autorizado (`authorize` middleware) | `403` |
| Productor inexistente (reset admin) | `404` |
| Email duplicado (alta) | `409` |

---

## Criterios de aceptación

| Criterio | Estado |
|----------|--------|
| Admin crea productor con contraseña individual; login funciona con esa contraseña | Implementado — cubierto por test de integración |
| Alta rechaza contraseña débil o duplicado de email | Implementado — 422 (schema) / 409 (duplicado) |
| Ninguna respuesta de `/producers` expone `passwordHash` | Implementado — verificado en tests (`JSON.stringify(res.body)` sin `passwordHash`) |
| Productor cambia su contraseña autenticado, validando `currentPassword` | Implementado |
| Tras cambio/reset, la contraseña anterior deja de autenticar (sesión revocada) | Implementado — `SesionToken.deleteMany` en la misma transacción |
| Admin restablece contraseña sin conocer la actual; solo rol admin puede hacerlo | Implementado |
| No existe endpoint público de recuperación autónoma | Cumplido (no se agregó ninguno) |
| Tabla admin muestra columna Usuario/Email y ya no muestra DNI | Implementado |
| Buscador admin contempla nombre, apellido y email (sin DNI) | Implementado |
| `backend`: typecheck, lint, build en verde | Verificado (`npm run typecheck/lint/build`) |
| `backend`: `npm test` en verde | Verificado — 113/113 tests pasan (Postgres nativo en `localhost:5432`, sin Docker) |
| `backend`: `prisma migrate status` sin pendientes | Verificado — "Database schema is up to date!" (no hizo falta migración) |
| `backend`: sin `passwordHash` en respuestas ni `password` en logs | Verificado por grep (`controllers`, `producerProfileMapper.ts`, `console.*`) |
| `frontend`: typecheck, lint, build en verde | Verificado (`npm run typecheck/lint/build`) |
| `frontend`: tests de componentes | Escritos siguiendo el patrón de `LoginPage.test.tsx`, **no ejecutan** — el proyecto no tiene `vitest`/`jsdom`/`msw` instalados ni script `test` (ver `docs/TESTING.md`). Decisión explícita: no se wireó el runner en este alcance. |

---

## Pruebas manuales recomendadas

```bash
# Alta con password individual
curl -s -X POST http://localhost:3000/api/v1/producers \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","apellido":"Productor","email":"test.productor@example.com","password":"Temporal123","direccion":"Calle 7 776, La Plata, Buenos Aires, Argentina"}'

# Login con la password asignada por el admin
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"test.productor@example.com","password":"Temporal123"}'

# Cambio de contraseña self-service
curl -s -X PATCH http://localhost:3000/api/v1/producers/me/password \
  -H "Authorization: Bearer <productorToken>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"Temporal123","newPassword":"NuevaClave456","confirmPassword":"NuevaClave456"}'

# Reset administrativo
curl -s -X PATCH http://localhost:3000/api/v1/producers/<id>/password \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"Reset789xyz","confirmPassword":"Reset789xyz"}'
```

1. Crear productor desde `/admin/productores` con contraseña inicial propia.
   → Loguearse como ese productor con la contraseña definida por el admin.
   → Confirmar que el login funciona y que la contraseña no aparece en ninguna respuesta ni en logs.

2. Desde `/intranet/mi-perfil`, sección "Seguridad", cambiar la contraseña.
   → Confirmar éxito y limpieza de campos.
   → Cerrar sesión y volver a loguearse con la nueva contraseña; la anterior debe fallar.

3. Desde `/admin/productores`, usar "Restablecer contraseña" en el menú de acciones de un productor existente.
   → Confirmar que el modal no pide la contraseña actual.
   → Loguearse como ese productor con la contraseña restablecida; la anterior debe fallar.

4. Casos de error:
   → Alta con contraseña débil (`422`).
   → Alta con email duplicado (`409`).
   → Self-service con `currentPassword` incorrecta (`401`).
   → Self-service con `newPassword` ≠ `confirmPassword` (`422`).
   → Reset admin ejecutado por un usuario `PRODUCTOR` (`403`).

**Nota:** los flujos y códigos de error de estos pasos están cubiertos por los tests de integración automatizados (`backend/tests/producers.integration.test.ts`, 113/113 en verde). Lo que falta es la verificación manual en navegador (UI del admin y del perfil productor) — no se ejecutó en este entorno.

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Recuperación pública/autónoma de contraseña | Excluida a propósito por requerimiento funcional — la única vía de recuperación es el reset administrativo |
| Credenciales de `ADMIN`/`SUPERADMIN` | El módulo `admins.*` sigue siendo un stub vacío; fuera de alcance de MAPS-016 |
| Notificación por email al productor al resetear contraseña | No hay proveedor de email integrado en el repo |
| Historial/auditoría de cambios de contraseña | Solo queda registrado `Usuario.updatedAt`, sin log de quién/cuándo |
| Paginación/búsqueda server-side de productores | Pendiente ya conocido, no relacionado con esta feature |
| Wirear runner de tests en frontend (vitest/jsdom/msw) | Ver tabla de criterios de aceptación arriba — los `.test.tsx` de esta feature están escritos pero no ejecutan |
| Verificación manual en navegador (admin y perfil productor) | Ver "Pruebas manuales recomendadas" — no ejecutada en este entorno |

---

*Documento generado en la feature MAPS-016 — credenciales de productores.*
