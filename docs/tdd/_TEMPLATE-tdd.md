<!--
Plantilla para Technical Design Document (propuesta ANTES de implementar).
Renombrar este archivo a: MAPS-XXX-tdd-slug-corto.md
Borrar este comentario antes de commitear.
Estilo basado en docs/MAPS-005-docker-db-foundation.md ampliado con secciones de TDD.
-->

# MAPS-XXX — TDD: {{Título descriptivo del diseño}}

Documento de diseño técnico para {{nombre breve de la feature}} dentro del proyecto MAPS Asesores.

**Estado:** Borrador / En revisión / Aprobado / Implementado / Reemplazado / Descartado
**Autor:** @usuario
**Revisores:** @user1, @user2
**Creado:** YYYY-MM-DD
**Última actualización:** YYYY-MM-DD

---

## Resumen

{{3–5 líneas. Si alguien solo lee esta sección: qué problema resolvemos, cómo lo vamos a resolver, cuál es el impacto principal.}}

---

## Objetivo

{{Qué queremos lograr con este diseño. Concreto y medible si es posible.}}

---

## Contexto

### Situación actual

{{Cómo funciona hoy lo que vamos a cambiar — o por qué no existe lo que vamos a crear. Linkear código relevante con paths absolutos al estilo `frontend/src/...`.}}

### Por qué ahora

{{Qué dispara la urgencia. Sin esta sección, todo TDD parece postergable.}}

---

## Alcance

{{Qué se va a construir / modificar.}}

- {{Pieza 1}}
- {{Pieza 2}}
- {{Pieza 3}}

### Fuera de alcance

{{Qué explícitamente NO se resuelve en este diseño. Esta sección bloquea scope creep en el review.}}

- {{Cosa que alguien podría asumir incluida pero no lo está}}
- {{Otra}}

---

## Diseño propuesto

### Resumen

{{Vista de pájaro de la solución en 5–10 líneas. Diagrama si ayuda (ASCII / mermaid / link a Excalidraw).}}

### Componentes / archivos afectados

{{Listar nuevos archivos y modificados, con su rol. Mismo nivel de detalle que las "Cambios implementados" del work-log.}}

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| {{Componente / hook / servicio}} | `ruta/al/archivo.ts` | {{Nuevo / Modificado}} — {{qué hace}} |

### Modelo de datos

{{Tablas/campos nuevos o modificados. Migraciones necesarias. Si no aplica, marcar `N/A`.}}

```sql
-- ejemplo
ALTER TABLE producers ADD COLUMN sucursal_id INT REFERENCES sucursales(id);
```

### Contratos de API

{{Endpoints nuevos/modificados. Request/response shape. Códigos de error. Si no aplica, `N/A`.}}

| Método | Ruta | Body / Query | Respuesta | Errores |
|--------|------|--------------|-----------|---------|
| `POST` | `/api/v1/...` | `{ ... }` | `201 { ... }` | `409 DNI_DUPLICADO` |

### UI / UX

{{Si toca interfaz: link a Figma, descripción de flujos, estados (loading / empty / error). Si no aplica, `N/A`.}}

### Cambios en código existente

{{Qué archivos / funciones se tocan, qué se rompe, qué se mantiene retrocompatible.}}

---

## Decisiones tomadas

{{Decisiones técnicas que conviene fijar antes de codear. Una por bullet, breve y accionable.}}

- {{Ej: usar Zustand en lugar de Context API porque ya está en el stack}}
- {{Ej: el ID del productor sigue siendo serial (no UUID) para no romper migraciones existentes}}
- {{Ej: validación de DNI con regex `^\d{7,9}$` — formato AR, sin checksum}}

---

## Alternativas consideradas

{{Para cada alternativa: qué era, por qué se descartó. Esta sección protege la decisión cuando alguien proponga lo descartado meses después.}}

### Alternativa A — {{Nombre corto}}

- **Qué era:** …
- **Pros:** …
- **Contras:** …
- **Por qué se descartó:** …

### Alternativa B — {{Nombre corto}}

- **Qué era:** …
- **Pros:** …
- **Contras:** …
- **Por qué se descartó:** …

---

## Plan de implementación

{{Fases incrementales. Cada fase debería ser mergeable sola sin dejar el sistema roto.}}

### Fase 1 — {{Nombre}}
- [ ] {{Tarea concreta}}
- [ ] {{Tarea concreta}}

### Fase 2 — {{Nombre}}
- [ ] …

### Fase 3 — {{Nombre}}
- [ ] …

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| {{Ej: cambio de schema rompe queries existentes}} | Media | Alto | Migración en 2 pasos: agregar columna, backfill, switch, drop |

---

## Plan de rollout

{{Cómo lo prendemos en prod sin romper a los usuarios.}}

- [ ] Feature flag (sí / no — cuál)
- [ ] Migraciones (orden, reversibles)
- [ ] Cambios de configuración / variables de entorno nuevas
- [ ] Comunicación a usuarios (si aplica)
- [ ] Plan de rollback

---

## Métricas de éxito

{{Cómo vamos a saber que el diseño cumplió. Idealmente medibles.}}

- {{Ej: tiempo de carga del listado < 500ms p95}}
- {{Ej: 0 errores 5xx en el endpoint en la primera semana}}

---

## Preguntas abiertas

{{Lo que todavía no se sabe y necesita resolverse antes (o durante) la implementación. Marcar quién las puede responder.}}

- [ ] {{Pregunta 1}} — _responde:_ @usuario
- [ ] {{Pregunta 2}} — _responde:_ @usuario

---

## Referencias

- **Figma:** {{link al nodo}}
- **Tickets:** MAPS-XXX
- **PRs relacionados:** #N, #M
- **Diagramas / pruebas de concepto:** {{link}}
- **Work-log de implementación:** `docs/MAPS-XXX-slug.md` (cuando exista)
