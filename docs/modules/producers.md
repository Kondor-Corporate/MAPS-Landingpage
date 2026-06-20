# Productores

Documentacion viva del modulo Productores.

Este modulo cubre:

- Gestion administrativa de productores.
- Perfil propio del productor.
- Perfil publico por slug.
- Datos para mapa publico.
- Certificaciones.

Historial relacionado:

- Admin productores UI mock: `docs/worklog/MAPS-007-seccion-productores-admin.md`.
- API admin productores: `docs/worklog/MAPS-009-admin-api-productores.md`.
- Perfil productor y slug: `docs/worklog/MAPS-013-vista-perfil-productor.md`.

---

## Estado actual

| Area | Estado |
|------|--------|
| Admin CRUD productores | Implementado con API real |
| Activos/inactivos | Implementado |
| Geocodificacion de direccion | Implementada via Nominatim |
| Perfil propio productor | Implementado |
| Perfil publico por slug | Implementado |
| Mapa publico | Implementado |
| Certificaciones PDF | Implementado con storage local/S3-compatible |
| Paginacion/busqueda server-side | Pendiente |
| Primer login / invitacion | Pendiente |

---

## Modelo de datos

Modelos Prisma principales:

- `Usuario`
- `Productor`
- `RedSocial`
- `Certificacion`
- `SesionToken`

Relaciones:

- Un `Usuario` con rol `PRODUCTOR` tiene un `Productor`.
- `Productor` tiene redes sociales y certificaciones.
- La activacion/desactivacion del productor se modela con `Usuario.activo`.

Campos relevantes de `Productor`:

| Campo | Uso |
|-------|-----|
| `slug` | URL publica e intranet por perfil |
| `nombre`, `apellido` | Identidad visible |
| `ciudad` | Direccion/zona visible y fuente para geocoding |
| `latitud`, `longitud` | Mapa publico y zona de influencia |
| `matricula`, `verificado` | Datos profesionales |
| `bio`, `foto`, `whatsapp`, `idiomas` | Perfil |
| `anosExperiencia`, `clientesActivos` | Estadisticas |
| `especialidades` | Areas de especialidad |

---

## Backend

Rutas bajo:

```text
/api/v1/producers
```

### Publicas

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/producers/map` | Productores activos con coordenadas para mapa |
| `GET` | `/producers/by-slug/:slug` | Perfil publico de productor activo |

### Productor autenticado

Requiere rol `PRODUCTOR`.

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/producers/me` | Perfil propio |
| `PATCH` | `/producers/me` | Edita campos permitidos del perfil propio |
| `POST` | `/producers/me/certificaciones` | Sube certificacion PDF |
| `DELETE` | `/producers/me/certificaciones/:certId` | Elimina certificacion propia |

### Admin / SuperAdmin

Requiere rol `ADMIN` o `SUPERADMIN`.

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/producers` | Lista productores, con filtro opcional `activo` |
| `GET` | `/producers/:id` | Detalle admin |
| `POST` | `/producers` | Crea usuario productor + perfil |
| `PATCH` | `/producers/:id` | Actualiza datos admin/perfil |
| `PATCH` | `/producers/:id/activo` | Activa/desactiva productor |
| `POST` | `/producers/:id/certificaciones` | Sube certificacion como admin |
| `DELETE` | `/producers/:id/certificaciones/:certId` | Elimina certificacion como admin |

Archivos principales:

- `backend/src/api/v1/routes/producers.routes.ts`
- `backend/src/controllers/producers.controller.ts`
- `backend/src/services/producers.service.ts`
- `backend/src/validations/producer.schema.ts`
- `backend/src/validations/producerProfile.schema.ts`
- `backend/src/lib/producerProfileMapper.ts`
- `backend/src/lib/storage/`
- `backend/src/lib/geocode.ts`

---

## Frontend

### Admin productores

Rutas:

```text
/admin/productores
/admin/inactivos
```

Archivos principales:

- `frontend/src/modules/admin/pages/ProducersPage.tsx`
- `frontend/src/modules/admin/pages/InactiveProducersPage.tsx`
- `frontend/src/modules/admin/hooks/useAdminProducers.ts`
- `frontend/src/modules/admin/services/producers.service.ts`
- `frontend/src/modules/admin/components/ProducersDashboard.tsx`
- `frontend/src/modules/admin/components/ProducerFormModal.tsx`
- `frontend/src/modules/admin/components/ProducerTable.tsx`

### Perfil productor intranet

Rutas:

```text
/intranet/mi-perfil
/intranet/perfil/:slug
```

Archivos principales:

- `frontend/src/modules/intranet/pages/MyProfilePage.tsx`
- `frontend/src/modules/intranet/pages/ProducerProfileViewPage.tsx`
- `frontend/src/modules/intranet/hooks/useProducerProfile.ts`
- `frontend/src/modules/intranet/services/producerProfile.service.ts`
- `frontend/src/modules/intranet/components/ProducerProfileForm.tsx`
- `frontend/src/shared/components/profile/`

### Web publica

Rutas:

```text
/
/productor/:slug
```

Archivos principales:

- `frontend/src/modules/public-web/components/FindAdvisorMap.tsx`
- `frontend/src/modules/public-web/pages/ProducerProfilePage.tsx`
- `frontend/src/modules/public-web/services/producersMap.service.ts`
- `frontend/src/modules/public-web/services/producerProfile.service.ts`
- `frontend/src/shared/components/map/`

---

## Geocodificacion

Al crear o actualizar productores desde admin, la direccion/ciudad puede geocodificarse con Nominatim para persistir:

- `latitud`
- `longitud`

Variable relacionada:

```env
NOMINATIM_USER_AGENT=maps-landingpage-dev/1.0 (contact@kondor.local)
```

Riesgos:

- Nominatim puede fallar por direccion ambigua, rate limit o conectividad.
- La direccion debe ser suficientemente especifica.
- No hay cache externa documentada.

---

## Certificaciones y storage

Las certificaciones son PDFs asociados a productores.

Storage:

- `local`: disco en `backend/uploads/certificaciones`.
- `s3`: bucket S3-compatible.

Variables relacionadas:

```env
STORAGE_PROVIDER=local
API_PUBLIC_URL=http://localhost:3000
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_PUBLIC_BASE_URL=
```

En Docker desarrollo, `backend_uploads` persiste los archivos subidos.

---

## Verificacion manual

Admin:

1. Login como `admin`.
2. Abrir `/admin/productores`.
3. Crear productor con direccion valida.
4. Confirmar que aparece activo.
5. Editar datos.
6. Desactivar.
7. Abrir `/admin/inactivos` y reactivar.

Productor:

1. Login como `user`.
2. Abrir `/intranet/mi-perfil`.
3. Confirmar redireccion a `/intranet/perfil/:slug`.
4. Editar campos permitidos.
5. Subir/eliminar certificacion PDF.

Publico:

1. Abrir `/`.
2. Confirmar marcadores en mapa si hay productores activos con coordenadas.
3. Abrir `/productor/:slug`.

---

## Pendientes conocidos

- Paginacion y busqueda server-side para listados grandes.
- Flujo de invitacion o cambio obligatorio de password inicial.
- E2E admin/productor/publico.
- Mejor manejo operacional de geocoding.
- Upload de foto de perfil.
- Definir politica final para storage productivo.
