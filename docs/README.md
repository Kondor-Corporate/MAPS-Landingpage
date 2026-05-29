# Documentacion MAPS

Indice de documentacion tecnica del proyecto MAPS Asesores.

La documentacion se separa en:

- **Estado actual y onboarding:** README raiz y documentos de referencia vivos.
- **Modulos:** descripcion funcional/tecnica de cada area del sistema.
- **Historial:** TDDs y work-logs por feature.

---

## Para empezar

- [`../README.md`](../README.md): vision general del proyecto, stack, setup y comandos principales.
- [`CONVENTIONS.md`](./CONVENTIONS.md): convenciones para TDDs, work-logs y organizacion documental.

---

## Modulos

- [`modules/auth.md`](./modules/auth.md): autenticacion, sesion, routing y roles.

Documentos de modulo pendientes de consolidar:

- Productores admin.
- Perfil productor.
- Biblioteca digital.
- Noticias.
- Administradores.
- Web publica y mapa.

---

## Referencia tecnica pendiente

Estos documentos se incorporaran como parte de la reorganizacion documental:

- `CONTRIBUTING.md`: ramas, commits, PRs, definition of done.
- `CHANGELOG.md`: cambios relevantes por version/entrega.
- `ARCHITECTURE.md`: arquitectura actual frontend/backend/DB/Docker.
- `TESTING.md`: estrategia de pruebas y comandos.
- `MIGRATIONS.md`: flujo Prisma, migraciones, seed y troubleshooting.

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
