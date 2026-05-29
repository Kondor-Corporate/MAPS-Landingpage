# Documentacion MAPS

Indice de documentacion tecnica del proyecto MAPS Asesores.

La documentacion se separa en:

- **Estado actual y onboarding:** README raiz y documentos de referencia vivos.
- **Modulos:** descripcion funcional/tecnica de cada area del sistema.
- **Historial:** TDDs y work-logs por feature.

---

## Para empezar

- [`../README.md`](../README.md): vision general del proyecto, stack, setup y comandos principales.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md): ramas, commits, PRs, verificaciones y definition of done.
- [`CONVENTIONS.md`](./CONVENTIONS.md): convenciones para TDDs, work-logs y organizacion documental.

---

## Referencia tecnica

- [`ARCHITECTURE.md`](./ARCHITECTURE.md): arquitectura viva frontend/backend/DB/Docker.
- [`TESTING.md`](./TESTING.md): estrategia de pruebas, comandos locales y CI.
- [`MIGRATIONS.md`](./MIGRATIONS.md): Prisma, migraciones, seed y reset de base local.
- [`CHANGELOG.md`](./CHANGELOG.md): cambios relevantes por version/entrega.
- [`inventario-proyecto.md`](./inventario-proyecto.md): snapshot orientativo de estructura y dependencias.

---

## Modulos

- [`modules/auth.md`](./modules/auth.md): autenticacion, sesion, routing y roles.
- [`modules/library.md`](./modules/library.md): Biblioteca Digital, ramos, API e integracion admin/productor.
- [`modules/producers.md`](./modules/producers.md): productores, perfiles, mapa publico y certificaciones.

Documentos de modulo pendientes de consolidar:

- Noticias.
- Administradores.
- Web publica y mapa.

---

## Historial de diseno

Los TDDs son propuestas prospectivas o documentos de diseno previos a implementar una feature:

- [`tdd/`](./tdd/)

Los work-logs son bitacoras retrospectivas de features ya implementadas:

- [`worklog/`](./worklog/)

Para saber cuando crear cada tipo de documento, ver [`CONVENTIONS.md`](./CONVENTIONS.md).

---

## Fuente de verdad

- Estado actual del proyecto: README raiz y documentos vivos dentro de `docs/modules/` y referencia tecnica.
- Decisiones prospectivas: `docs/tdd/`.
- Historial de implementacion: `docs/worklog/`.
- Snapshots o inventarios: documentos con fecha explicita, no deben reemplazar al README ni a la arquitectura viva.
