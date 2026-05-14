# MAPS-009 — Admin API Productores (backend + integración frontend)

Documentación de la feature **API administrativa de productores y sustitución del mock en el panel admin** dentro del proyecto MAPS Asesores. Complementa el [README técnico](../README.md) y el [README raíz](../../README.md). Diseño previo: [`docs/tdd/MAPS-009-tdd-admin-api-productores.md`](../tdd/MAPS-009-tdd-admin-api-productores.md).

---

## Objetivo

Conectar `/admin/productores` y `/admin/inactivos` con persistencia real en PostgreSQL (Prisma), bajo autenticación JWT y roles **ADMIN** / **SUPERADMIN**, cerrando el contrato REST y retirando el flujo **Zustand + datos en memoria** de MAPS-007. No se amplió perfil público, mapa, intranet productor ni noticias.

---

## Contexto inicial

- **MAPS-007** entregó la UI admin de productores con mock local (`useProducers`, `producersMock`).
- El TDD MAPS-009 definió fases: cimientos de seguridad/validación, CRUD backend, integración frontend.
- El frontend **no** incorporó TanStack Query en esta entrega: datos vía `useState` / `useEffect` y `refetch` explícito.

---

## Fases realizadas

| Fase | Contenido |
|------|-----------|
| **Fase 0** | `authorize` (RBAC) y `validate` (Zod) operativos en rutas sensibles; esquemas `producer.schema.ts` alineados a IDs enteros y contratos estrictos. |
| **Fase 1** | CRUD backend: `producers.service.ts`, `producers.controller.ts`, `producers.routes.ts`; envelope `{ data, message, error }`; alta transaccional `Usuario` (PRODUCTOR) + `Productor`. |
| **Fase 2** | Frontend: `producers.service.ts` (Axios), `useAdminProducers`, `ProducersDashboard` y modales/formularios adaptados al DTO real; eliminación de `useProducers` y `producersMock`. |
| **Cierre (docs)** | Este work-log, actualización del TDD a **Implementado**, README y `docs/README` con estado real del sistema. |

---

## Cambios implementados (archivos principales)

### Backend

- `backend/src/api/v1/routes/producers.routes.ts` — rutas `GET /`, `GET /:id`, `POST /`, `PATCH /:id/activo`, `PATCH /:id` con `authenticate` + `authorize(ADMIN, SUPERADMIN)` + `validate`.
- `backend/src/controllers/producers.controller.ts` — handlers y DTO admin (`toAdminProducerDto`).
- `backend/src/services/producers.service.ts` — listado filtrado por `activo`, create/update/`setActivo`, revocación de `SesionToken` al desactivar.
- `backend/src/validations/producer.schema.ts` — create/update/query/param; sin WhatsApp en contrato documentado.
- `backend/src/middlewares/authorize.ts`, `backend/src/middlewares/validate.ts` — usados por productores y resto del enfoque del proyecto.

### Frontend (admin productores)

- `frontend/src/modules/admin/services/producers.service.ts` — llamadas HTTP.
- `frontend/src/modules/admin/hooks/useAdminProducers.ts` — `data`, `loading`, `error`, `refetch`, `create`, `update`, `activate`, `deactivate`.
- `frontend/src/modules/admin/types/adminProducer.ts` — DTO API; `producer.ts` — fila/formulario UI (`ProducerFormSubmit`, `producerNombreCompleto`).
- `frontend/src/modules/admin/lib/mapAdminProducer.ts`, `frontend/src/modules/admin/lib/apiError.ts`.
- `frontend/src/modules/admin/components/ProducersDashboard.tsx` y componentes de tabla/modales/filtros — cableados a la API.

### Eliminados

- `frontend/src/modules/admin/hooks/useProducers.ts`
- `frontend/src/modules/admin/data/producersMock.ts`

---

## Endpoints backend (`/api/v1/producers`)

Todos requieren `Authorization: Bearer <accessToken>` y rol **ADMIN** o **SUPERADMIN**.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/producers` | Lista; query opcional `activo=true` \| `false`. |
| `GET` | `/producers/:id` | Detalle admin. |
| `POST` | `/producers` | Alta: `nombre`, `apellido`, `email`, `telefono` opcional, `activo` opcional; password inicial vía env. |
| `PATCH` | `/producers/:id` | Update parcial de datos negocio + email cuenta. |
| `PATCH` | `/producers/:id/activo` | Body `{ activo: boolean }`; al pasar a `false` borra sesiones (`SesionToken`) del usuario. |

---

## Variables de entorno

- **`DEFAULT_PRODUCER_PASSWORD`** (backend): contraseña inicial hasheada en altas admin de productor. Documentada en `backend/.env.example` y README raíz. En producción: valor fuerte y rotación fuera del repo.

Otras ya existentes: `DATABASE_URL`, JWT/refresh, `FRONTEND_ORIGIN`, etc.

---

## Pruebas manuales recomendadas

```
1. Backend y frontend en dev con Docker DB; `backend/.env` y `frontend/.env` configurados (`VITE_API_BASE_URL`).
2. Login ADMIN o SUPERADMIN → /admin/productores
   → listado debe reflejar solo activos (?activo=true); spinner y mensaje de error + Reintentar si falla red.
3. Alta / edición / desactivar / reactivar → verificar BD y mensajes toast en UI.
4. Ver /admin/inactivos → sólo inactivos; reactivar y comprobar que desaparezca de esa lista.
5. Intentar llamar /api/v1/producers sin token o como PRODUCTOR → 401 / 403 según caso.
```

**Build:**

```bash
cd backend && npm run build   # tsc
cd frontend && npm run build  # vite build
```

---

## Riesgos residuales

- Paginación y búsqueda siguen mayormente **client-side** sobre la lista devuelta; con muchos registros hará falta paginación/búsqueda en servidor.
- “Última actividad” en UI se aproxima con timestamps de cuenta, no métrica de uso intranet.
- `DEFAULT_PRODUCER_PASSWORD` es operacional: sin flujo de “primer login obligatorio” en esta feature.

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Noticias admin | Sigue con mock / store local; sin API en este ticket. |
| Perfil público `/productor/:slug` | Datos locales/mock según módulo público; no contratado aquí. |
| Mapa / landing | Datos locales o stub; no alimentado por esta API. |
| Intranet productor | Sin cambios; edición de perfil por el propio productor es otra historia. |
| WhatsApp / sucursal / redes en admin | Fuera del contrato actual; requieren decisión de negocio y posible migración Prisma. |
| TanStack Query | Posible mejora futura para cache e invalidación estándar. |

---

## Relación con el TDD MAPS-009

Este work-log cierra la feature descrita en [`MAPS-009-tdd-admin-api-productores.md`](../tdd/MAPS-009-tdd-admin-api-productores.md). El TDD fue actualizado a estado **Implementado** con decisiones finales y preguntas aún abiertas explícitas.

La UI mock original quedó documentada históricamente en [`MAPS-007-seccion-productores-admin.md`](./MAPS-007-seccion-productores-admin.md) (con nota de supersesión por MAPS-009).

---

*Documento generado en el cierre de documentación MAPS-009 — Admin API Productores.*
