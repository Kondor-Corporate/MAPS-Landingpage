# Convenciones de documentación — `docs/`

Esta carpeta contiene la documentación técnica del proyecto MAPS Asesores. Cada archivo describe una feature, una decisión de diseño, o el estado de un módulo del sistema.

---

## Fuentes de verdad

Para evitar que documentos historicos se interpreten como estado actual, usar esta jerarquia:

| Necesidad | Fuente principal |
|-----------|------------------|
| Onboarding y comandos principales | [`../README.md`](../README.md) |
| Indice de documentacion | [`README.md`](./README.md) |
| Estado actual de un modulo | `docs/modules/*.md` |
| Arquitectura viva | `docs/ARCHITECTURE.md` |
| Flujo de contribucion, ramas, commits y PRs | `docs/CONTRIBUTING.md` |
| Testing y comandos de verificacion | `docs/TESTING.md` |
| Migraciones Prisma y seed | `docs/MIGRATIONS.md` |
| Cambios relevantes por version/entrega | `docs/CHANGELOG.md` |
| Decision prospectiva de una feature | `docs/tdd/*.md` |
| Historial de implementacion de una feature | `docs/worklog/*.md` |
| Snapshot puntual de estructura/dependencias | documentos con fecha explicita, por ejemplo `inventario-proyecto.md` |

Reglas:

- Los TDDs y work-logs son historicos; no reemplazan al README, arquitectura viva ni documentos de modulo.
- Si una feature cambia el estado actual del sistema, actualizar el documento vivo correspondiente ademas del work-log.
- Si un documento snapshot queda viejo, marcar fecha, alcance y advertencia de vigencia.
- No duplicar contenido largo entre documentos: enlazar la fuente principal.

---

## Documentos de proceso relacionados

Estas convenciones cubren documentacion tecnica. Otros aspectos del trabajo del equipo se documentan en archivos dedicados:

- `CONTRIBUTING.md`: estrategia de ramas, commits, PRs, checklist y definition of done.
- `CHANGELOG.md`: resumen release-oriented de cambios relevantes.
- `TESTING.md`: niveles de prueba, comandos locales y CI.
- `MIGRATIONS.md`: flujo de migraciones y seed.
- `ARCHITECTURE.md`: organizacion viva del frontend, backend, base de datos y Docker.

Si un cambio afecta alguno de esos temas, actualizar el documento correspondiente en el mismo PR.

---

## Tipos de documento

### 1. Work-log — `MAPS-XXX-slug.md`

Bitácora **retrospectiva** de una feature ya implementada. Se escribe al cerrar el PR, mientras el contexto está fresco.

**Plantilla:** `_TEMPLATE-worklog.md`
**Ejemplos existentes:** `MAPS-004-auth-routing-polish.md`

#### Cuándo crear uno

- Al cerrar un PR no trivial (más de 1 archivo o cambios funcionales).
- Si una tarea grande se parte en varios PRs, **una entrada por PR** (no una por epic).

#### Cuándo NO crearlo

- Hotfixes triviales (typos, ajustes de estilo aislados).
- Bumps de dependencias sin impacto funcional.
- Cambios de configuración del entorno local.

---

### 2. Technical Design Document (TDD) — `MAPS-XXX-tdd-slug.md`

Propuesta **prospectiva** de cómo resolver algo, escrita **antes** de implementar. Se discute en PR, se aprueba, y recién ahí se codea.

**Plantilla:** `_TEMPLATE-tdd.md`
**Ejemplos existentes:** `MAPS-005-docker-db-foundation.md` (formato similar, con secciones de Alcance / Decisiones).

#### Cuándo crear uno

Si la tarea cumple **al menos una** de estas:

- Toca **2+ capas** del stack (ej: nueva tabla + endpoint + UI).
- Implica **elegir entre alternativas** no triviales (librería, patrón, esquema).
- **Cambia contratos** públicos (API, esquema de DB, formato de auth).
- **Migración / refactor** que afecta a varios módulos.
- Va a **involucrar a más de una persona** o requerir review temprano.
- Estimás **>1 semana** de implementación.

#### Cuándo NO crearlo

- Bug fixes localizados.
- Implementación directa de un Figma sin ambigüedad arquitectónica → con un work-log alcanza.
- Cambios de copy / styling.
- Tareas de configuración (CI, deps, lint).

---

## Naming

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Work-log | `MAPS-XXX-slug-corto.md` | `MAPS-009-seccion-productores-admin.md` |
| TDD | `MAPS-XXX-tdd-slug-corto.md` | `MAPS-012-tdd-integracion-backend-productores.md` |

- **Ticket:** el código de la rama (`feature/MAPS-007-…` → `MAPS-007`).
- **Slug:** 2–4 palabras en kebab-case que resuman el alcance.
- **Sin fecha en el nombre:** la fecha va en metadata interna del documento.

---

## Estados (solo para TDDs)

Los TDDs llevan un campo `Estado` en su metadata. Los work-logs no — un work-log solo existe si la feature ya se implementó.

| Estado | Significado |
|--------|-------------|
| **Borrador** | En escritura, no listo para review |
| **En revisión** | Listo para feedback del equipo |
| **Aprobado** | Consenso alcanzado, se puede empezar a implementar |
| **Implementado** | El código ya está en `main` (linkear PR y work-log) |
| **Reemplazado** | Quedó obsoleto. Linkear el TDD que lo sustituye |
| **Descartado** | Se decidió no avanzar. Dejar la razón en una nota |

> Mantener el archivo aunque el TDD quede descartado o reemplazado — es valor histórico.

---

## Flujo recomendado para una feature grande

```
1. Escribir TDD             → docs/MAPS-XXX-tdd-slug.md       (Estado: Borrador)
2. PR del TDD               → review en GitHub                  (Estado: En revisión)
3. Mergear TDD              →                                   (Estado: Aprobado)
4. Implementar (1+ PRs)     → cada PR cita el TDD
5. Cerrar última PR         → escribir work-log                 → docs/MAPS-XXX-slug.md
6. Actualizar TDD           → linkear PRs y work-log            (Estado: Implementado)
```

Para features chicas que no necesitan TDD: directo work-log al cerrar el PR.

---

## Cómo usar las plantillas

1. Copiar `_TEMPLATE-worklog.md` o `_TEMPLATE-tdd.md`.
2. Renombrar siguiendo el patrón de la tabla.
3. Completar todas las secciones (las que no apliquen, marcar `N/A` — no borrarlas para mantener consistencia visual entre documentos).
4. Pegar el contenido también como descripción del PR en GitHub (es el mismo formato).
5. Commitear el archivo en el mismo PR que documenta.
