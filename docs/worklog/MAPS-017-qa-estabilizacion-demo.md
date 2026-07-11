# MAPS-017 — QA integral, estabilización y demo readiness

Documentación de la fase de estabilización y QA integral del proyecto MAPS Asesores post MAPS-014/015/016.

**Estado:** En progreso  
**Rama:** `feature/MAPS-017-qa-estabilizacion`  
**Fecha inicio:** 2026-07-11  
**TDD:** [`docs/tdd/MAPS-017-tdd-qa-estabilizacion-demo.md`](../tdd/MAPS-017-tdd-qa-estabilizacion-demo.md)

---

## Contexto

Tras el merge de:

- **MAPS-014** — Noticias API fullstack (admin, Home, intranet, dashboards).
- **MAPS-015** — Mapa de productores, dirección editable y geocoding server-side.
- **MAPS-016** — Credenciales individuales, perfil productor y foto.

La auditoría integral detectó que el núcleo operativo es real, pero persisten fricciones de onboarding, documentación desalineada y readiness de demo (landing parcial, Docker migrate/seed, tests frontend fuera de CI, deudas de geocode/storage/biblioteca).

MAPS-017 no agrega features de producto; estabiliza, documenta y valida.

---

## Fases previstas

| Fase | Nombre | Estado |
|------|--------|--------|
| A | Baseline, README y plan | Completada |
| B | Bloqueadores demo landing/navegación | Completada |
| C | Docker/dev setup y seed/migrate | Completada |
| D | QA manual integral MAPS-014/015/016 | Pendiente |
| E | Rate limit geocode y casos borde | Pendiente |
| F | Testing frontend / E2E smoke (opcional) | Pendiente |
| G | Docs/worklog cierre | Pendiente |

---

## Hallazgos iniciales (Fase A)

### Git / rama

- Rama actual: `feature/MAPS-017-qa-estabilizacion`.
- Working tree limpio al inicio de Fase A.
- HEAD alineado con `development` (`b487498` — MAPS-016 merge).

### README

- `README.md` contenía **tres bloques de conflicto de merge** (`<<<<<<<`, `=======`, `>>>>>>>`).
- Secciones duplicadas por el conflicto: estructura de carpetas, convenciones de equipo, variables de entorno.
- **Resuelto en Fase A:** consolidación sin marcadores; estado real post MAPS-014/015/016; variables críticas y pasos Docker documentados.

### Documentación viva — desalineaciones críticas corregidas

| Archivo | Problema | Acción Fase A |
|---------|----------|---------------|
| `docs/modules/public-web.md` | Decía noticias mock en encabezado y tabla | Corregido: noticias reales; TeamSection/CTA pendientes |
| `docs/inventario-proyecto.md` | `/api/v1/news` como API pendiente | Corregido a Implementado (MAPS-014) |

### Documentación — pendiente para fases posteriores

| Archivo | Observación |
|---------|-------------|
| `docs/inventario-proyecto.md` | Snapshot 2026-05-29; requiere actualización amplia o archivado |
| `docs/tdd/MAPS-011-*`, `MAPS-012-*` | Títulos/numeración histórica inconsistente |
| `docs/modules/library.md` | Revisar URLs `EXAMPLE` en seed/datos demo (Fase B/E) |
| Legacy `newsMock.ts` / `mockNews.ts` | Archivos huérfanos en repo; limpieza menor |

### Estado funcional resumido

| Módulo | Real / Parcial / Pendiente |
|--------|----------------------------|
| Noticias | Real |
| Mapa productores | Real |
| Perfil/credenciales/foto | Real |
| Biblioteca ramos | Real |
| Landing TeamSection | Real (API mapa) |
| CTA/contacto | CTA al mapa (#mapa) |
| SELF | Deshabilitado (`null`) |
| Admins API | Stub |
| Frontend tests en CI | No |
| E2E | Pendiente |

### Primer foco completado

- Resolución de conflictos en `README.md`.
- Creación de TDD y worklog MAPS-017.
- Corrección mínima en docs críticas (`public-web.md`, `inventario-proyecto.md`).

---

## Comandos baseline (Fase A)

### Frontend (`frontend/`)

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | OK |
| `npm run lint` | OK |
| `npm run build` | OK (warning chunk > 500 kB en maplibre) |

### Backend (`backend/`)

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | OK tras `npx prisma generate` (client desactualizado en checkout local) |
| `npm run lint` | OK |
| `npm run build` | OK tras `npx prisma generate` |

**Nota:** En un clone fresco, correr `npx prisma generate` (o `npm install` post-clone) antes de typecheck/build. El schema ya incluye `direccion` (MAPS-015); el fallo inicial fue client Prisma no regenerado, no código roto.

Tests **no** ejecutados en Fase A (según alcance).

---

## Fase B — Bloqueadores demo landing/navegación (2026-07-11)

### Decisiones

| Área | Decisión |
|------|----------|
| TeamSection | **Opción A** — consumir `GET /producers/map` vía `useProducersMap`; hasta 3 productores verificados (o activos); perfil real con `Link` a `/productor/:slug`; empty state honesto con CTA al mapa |
| CTA / contacto | **Opción C** — sin backend de contacto; CTA `#mapa` con copy “Ver mapa de asesores”; sección `id="contacto"` conservada para anclas existentes |
| Footer | Eliminar `#terminos` / `#privacidad`; columna Legal con texto “próximamente”; enlaces útiles a `/#nosotros` y `/#mapa` |
| Sidebar intranet | Agregar **Novedades** → `/intranet/noticias` en `producerItems` |
| Sidebar admin | Sin cambio — ya tiene **Noticias** (CRUD `/admin/noticias`); novedades internas accesibles desde dashboard (`NOVEDADES_ADMIN_PATH`) |
| Biblioteca EXAMPLE | Sin tocar seed; helper `isResolvableLibraryUrl` en frontend para no ofrecer links placeholder como clicables |

### Archivos modificados

- `frontend/src/modules/public-web/components/TeamSection.tsx`
- `frontend/src/modules/public-web/components/CtaSection.tsx`
- `frontend/src/shared/layouts/PublicLayout.tsx`
- `frontend/src/shared/constants/sidebarItems.tsx`
- `frontend/src/shared/utils/libraryLinks.ts` (nuevo)
- `frontend/src/modules/intranet/components/LibraryRamoCard.tsx`
- `frontend/src/modules/intranet/components/LibrarySecondarySection.tsx`

### Pendientes post Fase B

- Hero con avatares decorativos y stat “2,500 personas” (no pedido en Fase B; sigue siendo copy marketing no verificable).
- Seed `PLACEHOLDER_DRIVE` en `backend/prisma/seed.ts` — reemplazar por URLs reales en fase posterior o al configurar Drive productivo.
- Admin biblioteca sigue mostrando URLs truncadas con `EXAMPLE` en tabla (aceptable para operadores).

### Comandos Fase B (frontend)

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | OK |
| `npm run lint` | OK |
| `npm run build` | OK (warning chunk maplibre > 500 kB) |

Backend no tocado en Fase B.

---

## Fase C — Docker/dev setup, Prisma generate y onboarding (2026-07-11)

### Objetivo

Reducir friccion post-clone y post-`docker compose up`: documentar `prisma generate`, flujo migrate/seed, variables de entorno, verificacion manual y auditoria Docker sin rediseñar infraestructura.

### Decisiones

| Tema | Decision |
|------|----------|
| `prisma generate` post-clone | **Documentar** paso explicito en README y `docs/MIGRATIONS.md`; usar script existente `npm run prisma:generate`. **No** agregar `postinstall` (CI/Docker ya son explicitos; riesgo en builds parciales). |
| Migrate/seed automatico en entrypoint | **No automatizar.** Mantener comandos manuales documentados; riesgo de mutaciones implicitas en cada restart. Deuda futura: servicio one-shot o compose profile `setup`. |
| Scripts helper | Agregar `scripts/docker-dev-init.sh` y `scripts/docker-dev-init.ps1` (compose up + migrate deploy + seed). Opcionales; README los referencia. |
| PLACEHOLDER_DRIVE | **No tocar seed.** Documentar en README, worklog y `docs/modules/library.md` como dato demo; UI productor ya filtra URLs `EXAMPLE`. |
| Cambios Docker/compose | **Ninguno.** Auditoria solo documental salvo scripts de onboarding. |

### Archivos modificados

- `README.md` — onboarding post-clone, flujo Docker/local ampliado, verificacion rapida, env vars completas, nota PLACEHOLDER_DRIVE
- `docs/MIGRATIONS.md` — seccion Prisma Client (`prisma generate`)
- `docs/TESTING.md` — checklist verificacion manual post-setup
- `docs/modules/library.md` — PLACEHOLDER_DRIVE en pendientes
- `scripts/docker-dev-init.sh` (nuevo)
- `scripts/docker-dev-init.ps1` (nuevo)
- `docs/worklog/MAPS-017-qa-estabilizacion-demo.md` (este documento)

### Scripts auditados (sin cambios en package.json)

**Backend (`backend/package.json`):**

| Script | Proposito |
|--------|-----------|
| `dev` | `tsx watch src/server.ts` |
| `build` | `tsc` |
| `start` | `node dist/server.js` |
| `typecheck` | `tsc --noEmit` |
| `lint` / `lint:fix` | ESLint |
| `format` / `format:check` | Prettier |
| `prisma:generate` | `prisma generate` |
| `prisma:migrate` / `db:migrate` | `prisma migrate dev` |
| `db:seed` | `prisma db seed` |
| `prisma:studio` | Prisma Studio |
| `test` / `test:watch` | Vitest |

**Frontend (`frontend/package.json`):**

| Script | Proposito |
|--------|-----------|
| `dev` | Vite dev server |
| `build` | `vite build` |
| `preview` | `vite preview` |
| `typecheck` | `tsc --noEmit` |
| `lint` / `lint:fix` | ESLint |
| `format` / `format:check` | Prettier |

No se agregaron scripts npm nuevos; solo scripts shell/PowerShell en `scripts/`.

### Comandos validados (Fase C)

**Backend** (tras `npm run prisma:generate`):

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | OK |
| `npm run lint` | OK |
| `npm run build` | OK |

**Frontend:**

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | OK |
| `npm run lint` | OK |
| `npm run build` | OK (warning chunk maplibre > 500 kB) |

Tests completos no ejecutados (alcance Fase C).

### Auditoria Docker tecnica

| Aspecto | Estado actual | Riesgo | ¿Corregir ahora? | Recomendacion |
|---------|---------------|--------|------------------|---------------|
| Build backend — Prisma generate | Stage `build` ejecuta `npx prisma generate`; runner copia `node_modules/.prisma` | Bajo | No | OK para runtime; rebuild tras cambios de schema |
| Build backend — schema/migrations | `COPY prisma ./prisma` en build y runner | Bajo | No | Correcto |
| Build frontend | Multi-stage: `dev` (Vite), `build`, `runner` (nginx:8080) | Bajo | No | Compose usa target `dev` |
| Compose — red/servicios | `frontend` → `backend` → `db` en `maps-net`; nombres de servicio correctos | Bajo | No | OK |
| DATABASE_URL en Docker | Default `postgresql://...@db:5432/...` (host `db`, no localhost) | Bajo | No | OK |
| Healthchecks | `db`: pg_isready; `backend`: curl `/api/v1/health`; `frontend`: fetch :5173 | Medio | No | Utiles para `depends_on`; no garantizan DB migrada |
| Volumen uploads | `backend_uploads:/app/uploads` persiste certificaciones/fotos | Bajo | No | OK; se pierde con `down -v` |
| DB vacia tras compose up | **Si** — migrate/seed no automaticos | **Alto** onboarding | No (documentado) | Ejecutar migrate + seed; script helper disponible |
| Hot reload backend | No — imagen compilada, CMD `node dist/server.js` | Medio dev UX | No | Deuda: target dev con `tsx watch` o volumen codigo |
| Hot reload frontend | Si — volumen `./frontend:/app` + Vite | Bajo | No | OK |
| Colision puertos | Defaults 5173, 3000, 5432 configurables via env | Medio | No | Documentar cambio a 5433 si hay Postgres local |
| Dev vs prod | Un solo compose dev; Dockerfile frontend tiene stage prod no usado | Bajo | No | Deuda: compose prod separado |

### Imagen chica / one-shot / multi-stage — analisis

**Conveniente a futuro (deuda infra):**

- Backend runner con `npm ci --omit=dev` en imagen productiva (hoy incluye devDeps en runner).
- Multi-stage backend mas estricto: solo `dist`, `.prisma` y deps de produccion.
- Servicio compose one-shot `migrate` (profile `setup`) que ejecute `migrate deploy` + seed y termine.
- Target Docker `dev` para backend con hot reload.
- Compose prod con frontend `runner` (nginx) y variables/TLS propias.
- CI que construya y cachee imagenes Docker.

**No conviene tocar ahora:**

- Automatizar migrate en CMD/entrypoint del backend (efectos colaterales en restart, entornos mixtos).
- `postinstall` global con `prisma generate` (CI/Docker ya controlados; clones parciales).
- Rediseño completo de Dockerfiles o split compose dev/prod (fuera de alcance MAPS-017).
- Optimizacion agresiva de tamano de imagen sin bug bloqueante demostrado.

**Motivo:** Fase C busca onboarding claro con diff minimo; la infra actual funciona si se documentan migrate/seed y `prisma generate`.

### Flujo Docker documentado (resumen)

```bash
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
# opcional: ./scripts/docker-dev-init.ps1
```

### Flujo local sin Docker (resumen)

```bash
cp backend/.env.example backend/.env && cp frontend/.env.example frontend/.env
docker compose up -d db
cd backend && npm install && npm run prisma:generate
cd ../frontend && npm install
cd ../backend && npx prisma migrate deploy && npm run db:seed
npm run dev  # backend :3000
cd ../frontend && npm run dev  # :5173
```

### PLACEHOLDER_DRIVE

Constante en `backend/prisma/seed.ts` apunta a `https://drive.google.com/drive/folders/EXAMPLE`. Es contenido demo pendiente. La intranet productor usa `isResolvableLibraryUrl` para no mostrar esos enlaces como clicables. Para demo con documentos reales: editar URLs en admin biblioteca o actualizar seed cuando existan carpetas Drive definitivas.

---

## Próximos pasos (Fase D)

## Pendientes fuera de MAPS-017

| Pendiente | Detalle |
|-----------|---------|
| Storage S3 unificado | Producción; ticket aparte |
| Upload imágenes noticias | Feature aparte |
| SEO `/noticias/:slug` | Feature aparte |
| CRUD admins | MAPS futuro |
| Portal SELF real | Integración externa |
| Paginación server-side avanzada | Mejora aparte |

---

*Documento iniciado en MAPS-017 Fase A — 2026-07-11.*
