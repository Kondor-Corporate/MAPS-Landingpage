# MAPS-017 — QA integral, estabilización y demo readiness

Documento de diseño técnico para estabilizar el proyecto post MAPS-014/015/016, resolver documentación crítica, preparar demo y validar flujos principales sin abrir una feature grande.

**Estado:** Aprobado para implementación  
**Autor:** (equipo)  
**Revisores:** —  
**Creado:** 2026-07-11  
**Última actualización:** 2026-07-11

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
| Landing pública | **Parcial** — noticias y mapa reales; `TeamSection` mock; CTA/contacto sin acción |
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

## Fases propuestas

### Fase A — Baseline, README y plan (esta fase)

- [x] Verificar rama `feature/MAPS-017-qa-estabilizacion`.
- [x] Resolver conflictos de merge en `README.md`.
- [x] Crear TDD y worklog MAPS-017.
- [x] Auditar docs vivas mínimas; corregir desalineaciones críticas.
- [x] Ejecutar typecheck, lint y build (frontend + backend).
- [ ] Registrar baseline de comandos y hallazgos iniciales.

### Fase B — Bloqueadores demo landing/navegación

- [ ] `TeamSection`: reemplazar mock, ocultar sección o documentar explícitamente en demo.
- [ ] CTA/contacto: acción mínima (mailto, form stub con feedback, ancla válida) o ocultar en demo.
- [ ] Revisar footer/links públicos rotos.
- [ ] Validar sidebar novedades y rutas `/admin/novedades`, `/intranet/noticias`.
- [ ] Validar tarjetas SELF/Biblioteca en dashboards (SELF sigue deshabilitado).

### Fase C — Docker/dev setup y seed/migrate

- [ ] Documentar o automatizar flujo: `docker compose up` → `migrate deploy` → `seed`.
- [ ] Verificar variables críticas en compose vs `.env.example`.
- [ ] Troubleshooting común (puerto 5432, volumen `pgdata`, healthchecks).

### Fase D — QA manual integral MAPS-014/015/016

Checklist orientativo:

**Noticias (MAPS-014)**

- [ ] Admin: crear, editar, publicar, despublicar, eliminar noticia.
- [ ] Home: noticias públicas visibles; modal con detalle por slug.
- [ ] Intranet: novedades internas; sin mezcla con mock legacy.
- [ ] Dashboards admin/intranet: recientes desde API.

**Mapa / productores (MAPS-015)**

- [ ] Admin: crear/editar productor con dirección y mapa.
- [ ] Geocoding al guardar; coordenadas persistidas.
- [ ] Mapa público: marcadores de productores activos.
- [ ] Perfil público `/productor/:slug`.

**Credenciales / perfil (MAPS-016)**

- [ ] Alta productor con password individual.
- [ ] Login productor; cambio de password self-service.
- [ ] Reset password por admin.
- [ ] Foto de perfil (upload/visualización según implementación actual).

**Transversal**

- [ ] Login/logout admin y productor.
- [ ] Guards de rol y rutas protegidas.
- [ ] Biblioteca ramos (admin CRUD, productor lectura).

### Fase E — Rate limit geocode y casos borde críticos

- [ ] Revisar `express-rate-limit` en proxy geocode.
- [ ] Mensajes de error UX en mapa/admin ante fallo de geocode.
- [ ] Timeout y User-Agent Nominatim en entornos Docker y local.

### Fase F — Testing frontend / E2E smoke (opcional)

- [ ] Evaluar agregar `npm test` frontend a CI.
- [ ] Definir smoke E2E mínimo (login → dashboard) si hay capacidad.
- [ ] Documentar en `docs/TESTING.md`.

### Fase G — Docs/worklog cierre

- [ ] Actualizar `CHANGELOG.md` y módulos afectados.
- [ ] Cerrar worklog MAPS-017 con hallazgos, bugs y deudas.
- [ ] Marcar inventario snapshot o mover desactualizados a fase posterior.

---

## Criterios de aceptación

- [ ] `README.md` sin marcadores de conflicto y con estado real documentado.
- [ ] Variables críticas documentadas: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, `STORAGE_PROVIDER`, `API_PUBLIC_URL`, `NOMINATIM_USER_AGENT`, `VITE_API_BASE_URL`, `DEFAULT_PRODUCER_PASSWORD` (solo seed).
- [ ] Pasos Docker/dev claros: compose, migrate, seed, URLs.
- [ ] Landing sin mocks críticos visibles en demo, o mocks documentados explícitamente.
- [ ] QA manual ejecutado y documentado en worklog.
- [ ] Bugs críticos corregidos o registrados con severidad y owner.
- [ ] Deudas no resueltas listadas y separadas de MAPS-017.

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

1. **Landing** (`http://localhost:5173`)
   - Hero y secciones institucionales cargan sin errores de consola críticos.
   - Noticias públicas desde API (no mock).
   - Mapa con productores activos geolocalizados.
   - Avisar si `TeamSection` o CTA siguen mock/pendiente.

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
