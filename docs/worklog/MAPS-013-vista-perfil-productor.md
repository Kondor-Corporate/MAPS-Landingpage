# MAPS-013 — Vista Mi Perfil — Intranet Productor + URL por slug

Documentación de la feature **Mi Perfil del productor** dentro del proyecto MAPS Asesores. Complementa el [TDD](../tdd/MAPS-013-tdd-vista-perfil-productor.md) y el [README raíz](../../README.md).

> **Estado del documento:** implementado (2026-05-26).  
> **Diseño previo:** [MAPS-013 TDD](../tdd/MAPS-013-tdd-vista-perfil-productor.md)

---

## Objetivo

Entregar la vista **Mi Perfil** para el rol **PRODUCTOR** en intranet, fiel al mock acordado (header con verificación y matrícula, trayectoria, especialidades, estadísticas, zona de influencia con mapa, certificaciones y acciones de contacto/edición). Los datos provienen de lo cargado por **ADMIN/SUPERADMIN** en el alta (MAPS-009) y de las ediciones posteriores del propio productor.

Cada productor accede mediante URL propia **`/intranet/perfil/:slug`** (p. ej. `/intranet/perfil/carlos-rodriguez`); `/intranet/mi-perfil` redirige al slug de la sesión activa.

---

## Cambios implementados

### 1. Migración Prisma — perfil extendido

**Archivos:**

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260526120000_producer_profile_extended/migration.sql`
- `backend/src/constants/producerSpecialties.ts`

**Descripción:** Ampliar `Productor` con campos de perfil. Especialidades en JSON (`Text`). **Fase 2:** tabla `Certificacion` para múltiples PDFs (reemplaza columnas planas Fase 1). Catálogo de 8 especialidades en código. `RedSocial` sin cambios.

---

### 2. API — lectura y edición del perfil propio

**Archivos:**

- `backend/src/api/v1/routes/producers.routes.ts`
- `backend/src/controllers/producers.controller.ts`
- `backend/src/services/producers.service.ts`
- `backend/src/validations/producerProfile.schema.ts` (nuevo)

**Descripción:** `GET/PATCH /producers/me`, `POST /producers/me/certificacion` (PDF → disco + URL en `Productor.certificacion`), `GET /producers/by-slug/:slug` (público, sin `email` ni `id`). Rutas literales antes de `/:id`. Mapper en `backend/src/lib/producerProfileMapper.ts`. Archivos estáticos en `/uploads/certificaciones`.

---

### 3. Seed — productor demo con perfil completo

**Archivo:** `backend/prisma/seed.ts`

**Descripción:** Tras crear usuario `user` (PRODUCTOR), upsert de `Productor` con slug `carlos-rodriguez`, datos alineados al mock (bio, Madrid, idiomas, stats, especialidades, redes, certificaciones placeholder).

---

### 4. Tipos y servicio HTTP frontend

**Archivos:**

- `frontend/src/modules/intranet/types/producerProfile.ts` (nuevo)
- `frontend/src/modules/intranet/services/producerProfile.service.ts` (nuevo)
- `frontend/src/modules/intranet/hooks/useProducerProfile.ts` (nuevo)

**Descripción:** DTO `ProducerProfile` espejo del API. Hook expone `profile`, `isLoading`, `error`, `refetch`, `updateProfile`. Usa `api` de `frontend/src/lib/axios.ts` con Bearer.

---

### 5. Vista de perfil — UI según mock

**Archivos:**

- `frontend/src/modules/intranet/pages/MyProfilePage.tsx` (redirect) o página dedicada
- `frontend/src/modules/intranet/pages/ProducerProfileViewPage.tsx` (nuevo, si se separa)
- `frontend/src/modules/intranet/components/profile/ProfileHeaderCard.tsx` (nuevo)
- `frontend/src/modules/intranet/components/profile/ProfileTrajectorySection.tsx` (nuevo)
- `frontend/src/modules/intranet/components/profile/ProfileSpecialtiesGrid.tsx` (nuevo)
- `frontend/src/modules/intranet/components/profile/ProfileStatsCards.tsx` (nuevo)
- `frontend/src/modules/intranet/components/profile/ProfileInfluenceMap.tsx` (nuevo)
- `frontend/src/modules/intranet/components/profile/ProfileCertificationsList.tsx` (nuevo)

**Descripción:** Layout two-column (≈70/30) en desktop dentro de `AppLayout`. Header full-width con foto circular, badge «PRODUCTOR VERIFICADO», título + matrícula, ciudad, idiomas, botones WhatsApp (verde), Email (azul), Editar Perfil (teal). Cards con `shadow-card`, iconografía Lucide/react-icons coherente con el resto del portal.

---

### 6. Formulario Editar Perfil

**Archivo:** `frontend/src/modules/intranet/components/ProducerProfileForm.tsx`

**Descripción:** Modal controlado desde header. Campos editables según TDD (bio, contacto, idiomas, especialidades checkbox/grid, redes, coordenadas opcionales). Submit → `PATCH /producers/me` → cierre modal + toast + `refetch`.

Modal funcional: `PATCH /producers/me` + `POST /producers/me/certificacion` (PDF único).

---

### 7. Routing con slug

**Archivos:**

- `frontend/src/router/index.tsx`
- `frontend/src/shared/constants/sidebarItems.tsx` (opcional)

**Descripción:**

```
/intranet/mi-perfil          → Navigate replace → /intranet/perfil/{slug}
/intranet/perfil/:slug       → ProducerProfileViewPage + guard slug === perfil.slug
```

Guard: comparar `:slug` con slug del perfil cargado vía `GET /me`; si no coincide → `/unauthorized`.

---

## Estado del sistema tras MAPS-013

### Routing intranet productor

```
/login                    → login
/intranet/dashboard       → dashboard (stub/contenido)
/intranet/biblioteca      → biblioteca (MAPS-012)
/intranet/mi-perfil       → redirect → /intranet/perfil/{slug}
/intranet/perfil/:slug    → vista Mi Perfil (MAPS-013)
/productor/:slug          → perfil público (mock/API futuro — fuera de cierre MAPS-013 salvo acuerdo)
```

### API productores (ampliación)

| Método | Ruta | Rol |
|--------|------|-----|
| `GET` | `/producers/me` | PRODUCTOR |
| `PATCH` | `/producers/me` | PRODUCTOR |
| `GET` | `/producers/by-slug/:slug` | Público |
| `GET/PATCH/POST …` | `/producers`, `/producers/:id` | ADMIN \| SUPERADMIN (MAPS-009 + campos extendidos) |

### Matriz de permisos de edición

| Campo | Admin | Productor |
|-------|-------|-----------|
| nombre, apellido, email, teléfono | Sí | Según decisión producto (TDD § preguntas) |
| verificado, matricula, stats | Sí | No |
| bio, ciudad, idiomas, foto, whatsapp | Sí | Sí |
| especialidades, redes, certificaciones (URL) | Sí | Sí |
| slug | Generado en alta | No |

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| Productor logueado en `/intranet/mi-perfil` termina en `/intranet/perfil/{su-slug}` | Verificado |
| La UI reproduce el mock (header, trayectoria, 8 especialidades, stats, mapa, certs, botones) | Verificado |
| Datos provienen de API/BD, no de mock estático intranet | Verificado |
| «Editar Perfil» persiste cambios y refresca la vista | Verificado |
| WhatsApp abre `wa.me` cuando hay número; Email abre `mailto` | Verificado |
| Certificaciones muestran nombre, tipo/tamaño y enlace de descarga | Verificado |
| Productor que navega a slug ajeno en intranet → `/unauthorized` | Verificado |
| `GET /producers/by-slug/:slug` responde sin auth para usuario activo | Verificado |
| Build frontend y tests backend relevantes pasan | Verificado (`npm run build`, `npm test`) |
| Perfil público `/productor/:slug` usa API real | Verificado |

---

## Pruebas manuales recomendadas

```
1. Seed + login productor
   → npm run db:seed en backend; login `user` / `User1234!`
   → Redirige a intranet; abrir Mi Perfil
   → URL final `/intranet/perfil/carlos-rodriguez` (o slug seed)

2. Contenido del mock
   → Badge verificado visible si seed.verificado = true
   → Matrícula, ciudad, idiomas, bio, grilla especialidades, stats, mapa, lista PDFs

3. Editar Perfil
   → Cambiar bio y teléfono; guardar
   → Refresh F5: cambios persisten

4. Guard de slug
   → Manualmente ir a `/intranet/perfil/otro-slug-inexistente`
   → 404 o unauthorized según implementación

5. API pública
   curl -s http://localhost:3000/api/v1/producers/by-slug/carlos-rodriguez
   → 200 JSON sin email

6. Admin setea verificado
   → Login admin; PATCH productor verificado=true
   → Productor ve badge tras refetch
```

```bash
# Perfil propio (con token PRODUCTOR)
curl -s http://localhost:3000/api/v1/producers/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Actualización parcial
curl -s -X PATCH http://localhost:3000/api/v1/producers/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"Nueva trayectoria profesional."}'
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| Perfil público `/productor/:slug` rediseño UI | API integrada; rediseño visual en MAPS-014 |
| Mapa interactivo (pan/zoom) | Evaluar Leaflet/Mapbox cuando haya API key |
| `/admin/mi-perfil` para ADMIN/SUPERADMIN | Decisión producto: stub vs perfil admin separado |
| Upload foto de perfil | Reutilizar storage adapter en ticket futuro |
| Vercel Blob como tercer adapter | S3-compatible cubre R2/MinIO por ahora |
| Tests E2E Playwright flujo perfil | Valorar tras estabilizar UI |

---

## Fase 2 — Operación real (2026-05-26)

### Migración `Certificacion`

- Tabla hija `Certificacion` con migración de datos desde columnas `certificacion`/`certificacionNombre`.
- Seed demo con 2 certificaciones para `carlos-rodriguez`.

### Storage adapter

- `backend/src/lib/storage/` — `local` (dev) y `s3` (prod).
- Multer `memoryStorage`; env `STORAGE_PROVIDER`, `API_PUBLIC_URL`, `S3_*`.

### API admin extendida

- `PATCH /producers/:id` acepta matrícula, verificado, stats, título profesional y campos de perfil.
- `POST/DELETE /producers/:id/certificaciones` (admin).
- `POST/DELETE /producers/me/certificaciones` (productor; reemplaza ruta singular).

### UI admin

- `ProducerFormModal`: sección perfil profesional + gestión de certs en edición.
- `ProducerViewModal`: matrícula, verificado, stats, lista de certificaciones.

### UI perfil

- `ProfileCertificationsList` acepta array `certificaciones[]` con tamaño real.
- `ProducerProfileForm` / `ProducerCertificationsManager`: multi-cert upload/delete.

---

*Documento MAPS-013 — Vista Mi Perfil productor. Completar «Cambios implementados» y marcar criterios al cerrar la implementación.*
