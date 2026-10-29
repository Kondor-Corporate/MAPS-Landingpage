# MAPS-017 — QA integral, estabilización y demo readiness

Documento de diseño técnico para estabilizar el proyecto post MAPS-014/015/016, resolver documentación crítica, preparar demo y validar flujos principales sin abrir una feature grande.

**Estado:** Implementado — listo para PR  
**Autor:** (equipo)  
**Revisores:** —  
**Creado:** 2026-07-11  
**Última actualización:** 2026-07-15

---

## Objetivo

Estabilizar el proyecto post MAPS-014/015/016, resolver documentación crítica, preparar demo, validar flujos principales y corregir gaps visibles sin abrir una feature grande.

---

## Contexto

### Situación actual (post MAPS-014/015/016)

| Área | Estado |
|------|--------|
| Noticias | **Real** — API `/api/v1/news`, admin CRUD, Home pública, intranet y dashboards conectados (MAPS-014) |
| Mapa / productores | **Real** — geocoding server-side, `GET /producers/map`, dirección editable en admin (MAPS-015) |
| Credenciales / perfil / foto | **Real** — alta con password individual, cambio self-service, reset admin, foto de perfil (MAPS-016) |
| Biblioteca digital | **Real** para ramos |
| Landing pública | **Parcial** — noticias, mapa y TeamSection reales; CTA al mapa (`#mapa`); contacto sin backend |
| Portal SELF | **Pendiente** — `SELF_PORTAL_URL = null`, UI deshabilitada |
| Admins | **Stub** — ruta UI existe; API `/api/v1/admins` sin endpoints funcionales |
| Docker / onboarding | Funcional pero migrate/seed no automáticos; README tenía conflictos de merge |
| Tests frontend | Existen en repo; **no corren en CI** |
| Geocode | Proxy backend operativo; rate limit y casos borde por revisar |
| Biblioteca URLs | Posibles valores `EXAMPLE` en seed o datos demo |

### Bloqueadores de demo y QA detectados

1. README con marcadores de conflicto sin resolver.
2. Documentación viva desalineada (p. ej. noticias marcadas como mock en `public-web.md`, inventario con news API pendiente).
3. Landing con secciones mock visibles (`TeamSection`) y CTA sin acción.
4. Sidebar novedades / navegación intranet-admin por validar en demo.
5. Setup Docker sin pasos migrate/seed suficientemente visibles para nuevos devs.
6. Deuda geocode rate limit.
7. URLs biblioteca con placeholders.
8. Frontend tests ausentes en pipeline CI.

### Por qué ahora

Los merges MAPS-014, MAPS-015 y MAPS-016 dejaron un núcleo operativo real, pero la auditoría integral detectó fricción en onboarding, documentación y readiness de demo. Antes de nuevas features conviene cerrar baseline, QA manual y bloqueadores visibles.

---

## Alcance

- README y documentación crítica alineada con estado real.
- QA manual integral de flujos MAPS-014/015/016.
- Landing demo readiness (TeamSection, CTA/contacto, footer/links).
- Docker/dev: pasos migrate/seed documentados o script de onboarding.
- Sidebar novedades y navegación relacionada.
- Rate limit `/geocode` y casos borde críticos.
- URLs biblioteca o fallback demo para no mostrar `EXAMPLE`.
- Frontend test runner en CI (si se decide incluir en esta fase).
- E2E smoke mínimo (si se decide incluir en esta fase).
- Registro de bugs críticos y deudas diferidas.

### Fuera de alcance

- Storage unificado completo (S3 productivo end-to-end).
- Upload de imágenes de noticias.
- SEO `/noticias/:slug`.
- CRUD admins completo.
- Portal SELF real.
- Paginación server-side avanzada.
- Refactor masivo de frontend/backend.
- Rediseño completo de landing.

---

## Fases ejecutadas

| Fase | Nombre | Estado |
|------|--------|--------|
| A | Baseline, README y plan | Completada |
| B | Bloqueadores demo landing/navegación | Completada |
| C | Docker/dev setup y seed/migrate | Completada |
| D / D.1 / D.2 | QA manual integral + API base URL + bugs | Completada |
| E | CORS multi-origin, password 400, healthcheck frontend | Completada |
| F.0 | Diagnóstico fixes finales post-QA | Completada |
| F.1 | Fixes finales seguros + diagnóstico reload/mapa | Completada |
| F.2 | Host canónico local y refresh cookie | Completada |
| F.3 | Ajuste final cards novedades en dashboard | Completada |
| F | Testing frontend / E2E smoke | **Diferida** (fuera de alcance) |
| G | Docs/worklog cierre | Completada |

Detalle por fase: [`docs/worklog/MAPS-017-qa-estabilizacion-demo.md`](../worklog/MAPS-017-qa-estabilizacion-demo.md).

---

## Criterios de aceptación

- [x] `README.md` sin marcadores de conflicto y con estado real documentado.
- [x] Variables críticas documentadas: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, `STORAGE_PROVIDER`, `API_PUBLIC_URL`, `NOMINATIM_USER_AGENT`, `VITE_API_BASE_URL`, `DEFAULT_PRODUCER_PASSWORD` (solo seed).
- [x] Pasos Docker/dev claros: compose, migrate, seed, URLs, `prisma generate`.
- [x] Landing sin mocks críticos visibles en demo (TeamSection real; CTA al mapa; contacto sin backend documentado).
- [x] QA manual ejecutado y documentado en worklog.
- [x] Bugs críticos corregidos o registrados con severidad.
- [x] Deudas no resueltas listadas y separadas de MAPS-017.

---

## Resultado final

MAPS-017 estabilizó el proyecto post MAPS-014/015/016 sin abrir features nuevas. El núcleo operativo (noticias, mapa, productores, credenciales, biblioteca) quedó validado para demo local. Se resolvieron bloqueadores de onboarding (README, Docker/migrate/seed, `prisma generate`), landing demo-ready (TeamSection, CTA, footer, sidebar novedades), bugs de QA (API base URL, CORS, password 400, healthcheck) y fixes UX finales (sidebar sticky, cards dashboard, filtros fechas, login copy, selects, TeamSection alineado). El reload de sesión quedó resuelto por configuración con host canónico `127.0.0.1`.

**Validación técnica de cierre (2026-07-15):** backend typecheck/lint/build/test OK (119 tests); frontend typecheck/lint/build OK; Docker `db`, `backend`, `frontend` healthy.

**QA final:** realizado por Nico; F.3 (cards dashboard) validado visualmente en `/admin/dashboard` e `/intranet/dashboard`.

---

## Decisiones clave

| Tema | Decisión |
|------|----------|
| URL canónica local | `http://127.0.0.1:5173` |
| API local | `http://127.0.0.1:3000/api/v1` |
| Cookies / refresh | **No mezclar** `localhost` y `127.0.0.1` para rutas protegidas con cookies HttpOnly (`SameSite=Lax`). CORS permite ambos orígenes, pero no los vuelve same-site. |
| Demo / QA | Usar exclusivamente `127.0.0.1` en desarrollo y demo local. |
| CORS | `FRONTEND_ORIGIN` admite lista separada por coma; auto-expansión localhost ↔ 127 en dev/test. |
| Migrate/seed | Manual documentado; scripts helper opcionales; no automatizar en entrypoint. |
| `prisma generate` | Paso explícito post-clone; sin `postinstall`. |
| PLACEHOLDER_DRIVE | Documentado como dato demo; UI productor filtra URLs `EXAMPLE`. |
| Cards dashboard | Variante `compact` en `RecentNewsCard` solo para dashboards; listados mantienen `default`. |
| Fase F (tests/E2E) | Diferida a ticket futuro; no bloquea cierre MAPS-017. |

---

## Fuera de alcance confirmado

Los siguientes temas **no** forman parte de MAPS-017 y quedan explícitamente diferidos:

- Portal SELF real.
- CRUD Administradores / SuperAdmin (API completa).
- Storage productivo unificado (S3 end-to-end).
- Drive real / reemplazo de `PLACEHOLDER_DRIVE` en seed.
- Rich text en noticias.
- E2E (Playwright u otro).
- Diseño / branding global.
- Legal / Términos / Privacidad.
- Upload de imágenes de noticias.
- SEO `/noticias/:slug`.
- Paginación server-side avanzada.
- Frontend tests en CI.
- Automatización migrate/seed en Docker entrypoint.
- Backend hot reload en Docker.

---

## Deudas post-MAPS-017

### Bugs / UX pendientes

- Mejoras visuales globales y contraste/marca.
- Confirmación de logout.
- Chips de filtros activos (productores).
- Vista biblioteca como productor para admin.
- Perfil admin/superadmin más completo.
- Volver a TeamSection/landing desde perfil público.
- Hero con avatares decorativos y stat “2,500 personas” (copy no verificable).
- Limpiar productores de prueba en DB de desarrollo antes de demo (`Nuevo Productor`, `Test Mapa`, etc.).

### Features futuras

- CRUD Administradores / SuperAdmin.
- Portal SELF real.
- Contacto / Sumate con backend real.
- Storage y uploads productivos.
- SEO noticias por slug.
- Legal / Términos / Privacidad.
- Upload de imágenes de noticias.

### Testing / infra

- Frontend tests en CI.
- E2E Playwright (smoke login → dashboard).
- Docker prod/staging (compose separado, nginx runner).
- Servicio one-shot migrate/seed (compose profile `setup`).
- Backend hot reload en Docker (target dev con `tsx watch`).
- Actualización o archivado de `docs/inventario-proyecto.md` (snapshot 2026-05-29).
- Limpieza legacy `newsMock.ts` / `mockNews.ts`.

---

## Roadmap post-MAPS-017 (recomendación de ramas)

| Prioridad | Tema sugerido | Rama sugerida |
|-----------|---------------|---------------|
| Alta | Limpieza datos demo + QA pre-demo | `chore/demo-data-cleanup` |
| Alta | Mejoras UX globales (contraste, logout, chips) | `feature/MAPS-018-ux-polish` |
| Media | CRUD admins | `feature/MAPS-019-admins-crud` |
| Media | Storage/uploads productivos | `feature/MAPS-020-storage` |
| Media | Frontend tests en CI + E2E smoke | `feature/MAPS-021-testing-ci-e2e` |
| Baja | SELF real | `feature/MAPS-022-self-portal` |
| Baja | Legal / contacto real | `feature/MAPS-023-legal-contacto` |
| Infra | Docker prod + one-shot migrate | `chore/docker-prod-setup` |

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Alcance demasiado amplio | Alta | Alto | Fases A–G estrictas; fuera de alcance explícito |
| Mezclar estabilización con nuevas features | Media | Alto | No abrir tickets de producto dentro de MAPS-017 |
| Resolver storage/SELF/admins dentro de MAPS-017 | Media | Alto | Listar como fuera de alcance; derivar a tickets propios |
| QA manual incompleto por tiempo | Media | Medio | Priorizar flujos demo; registrar gaps |
| Frontend tests en CI rompen pipeline | Baja | Medio | Fase F opcional; estabilizar tests antes de merge |

---

## Checklist de demo

Flujo sugerido para stakeholders (post estabilización):

1. **Landing** (`http://127.0.0.1:5173`)
   - Hero y secciones institucionales cargan sin errores de consola críticos.
   - Noticias públicas desde API (no mock).
   - Mapa con productores activos geolocalizados.
   - Avisar que contacto/Sumate no tiene backend real; CTA apunta al mapa.

2. **Perfil público**
   - Abrir `/productor/:slug` de productor seed activo.
   - Datos públicos coherentes; sin campos admin sensibles.

3. **Admin** (`admin` / `Admin1234!`)
   - Dashboard y listado de productores.
   - Crear/editar productor con dirección y mapa.
   - Gestión de noticias (CRUD + publicar).
   - Biblioteca ramos.
   - Reset password de productor.

4. **Productor** (`user` / `User1234!`)
   - Login intranet.
   - Dashboard con novedades internas.
   - Perfil propio y cambio de contraseña.
   - Biblioteca digital lectura.

5. **Explícitamente no demo-ready (documentar)**
   - Portal SELF.
   - CRUD admins.
   - Contacto/Sumate con acción real.
   - SEO noticias por URL dedicada.

---

## Referencias

- Worklog MAPS-014: `docs/worklog/MAPS-014-noticias-api-fullstack.md`
- Worklog MAPS-015: `docs/worklog/MAPS-015-ubicacion-productores-mapa.md`
- Worklog MAPS-016: `docs/worklog/MAPS-016-credenciales-productores.md`
- Worklog MAPS-017: `docs/worklog/MAPS-017-qa-estabilizacion-demo.md`
- Módulos vivos: `docs/modules/`
