# Documentacion MAPS

Indice de documentacion tecnica del proyecto MAPS Asesores.

La documentacion se separa en cuatro capas. No mezclarlas:

| Capa | Donde vive | Rol |
|------|------------|-----|
| **Viva** | README raiz, este indice, `ARCHITECTURE`, `TESTING`, `MIGRATIONS`, `CONTRIBUTING`, `CONVENTIONS`, `CHANGELOG`, `GCP_STAGING_RUNBOOK`, `modules/` | Estado y contratos actuales. Se actualiza con el codigo. |
| **TDD** | `docs/tdd/` | Diseno prospectivo de una feature. Historico una vez implementada. |
| **Worklog** | `docs/worklog/` | Bitacora retrospectiva de una feature cerrada. |
| **Snapshot** | p. ej. `inventario-proyecto.md` | Foto puntual. Conserva valor historico; no describe el presente. |

---

## Para empezar

- [`../README.md`](../README.md): vision general del proyecto, stack, setup y comandos principales.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md): ramas, commits, PRs, verificaciones y definition of done.
- [`CONVENTIONS.md`](./CONVENTIONS.md): convenciones para TDDs, work-logs y organizacion documental.

---

## Referencia tecnica (documentos vivos)

- [`ARCHITECTURE.md`](./ARCHITECTURE.md): arquitectura vigente frontend/backend/DB, local y staging GCP.
- [`TESTING.md`](./TESTING.md): estrategia de pruebas, comandos locales y CI.
- [`MIGRATIONS.md`](./MIGRATIONS.md): Prisma, migraciones, seed y reset de base local.
- [`CHANGELOG.md`](./CHANGELOG.md): cambios relevantes por entrega.
- [`GCP_STAGING_RUNBOOK.md`](./GCP_STAGING_RUNBOOK.md): contrato y operacion del staging GCP (entorno existente).
- [`inventario-proyecto.md`](./inventario-proyecto.md): **snapshot** de estructura (2026-05-29); no usar como estado actual.

---

## Modulos (documentos vivos)

- [`modules/auth.md`](./modules/auth.md): autenticacion, sesion, routing y roles.
- [`modules/library.md`](./modules/library.md): Biblioteca Digital, ramos, API e integracion admin/productor.
- [`modules/producers.md`](./modules/producers.md): productores, perfiles, mapa publico y certificaciones.
- [`modules/news.md`](./modules/news.md): noticias, API e integracion admin/publico/intranet.
- [`modules/admins.md`](./modules/admins.md): administradores (API y pantalla `/admin/admins`, D1B).
- [`modules/public-web.md`](./modules/public-web.md): landing, mapa publico y perfil publico.

El detalle de endpoints y contratos vive solo aqui. La Knowledge Base no duplica estos documentos.

---

## Historial de diseno

Los TDDs son propuestas prospectivas o documentos de diseno previos a implementar una feature:

- [`tdd/`](./tdd/)

Los work-logs son bitacoras retrospectivas de features ya implementadas:

- [`worklog/`](./worklog/)

Los paths reales son `docs/tdd/` y `docs/worklog/`. Documentos historicos conservan valor aunque su estado ya no sea vigente; no se reescriben para simular el presente.

Para saber cuando crear cada tipo de documento, ver [`CONVENTIONS.md`](./CONVENTIONS.md).

---

## Fuente de verdad

- Estado actual del proyecto: README raiz y documentos **vivos** de esta carpeta.
- Decisiones prospectivas: `docs/tdd/`.
- Historial de implementacion: `docs/worklog/`.
- Snapshots o inventarios: documentos con fecha explicita; no reemplazan al README ni a la arquitectura viva.
