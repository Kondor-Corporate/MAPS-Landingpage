<!--
Plantilla para registrar una feature ya implementada (work-log).
Renombrar este archivo a: MAPS-XXX-slug-corto.md
Borrar este comentario antes de commitear.
Estilo basado en docs/MAPS-004-auth-routing-polish.md
-->

# MAPS-XXX — {{Título descriptivo de la feature}}

Documentación de la feature {{nombre breve}} dentro del proyecto MAPS Asesores. Complementa el [README técnico](./README.md) y el [README raíz](../README.md).

---

## Objetivo

{{2–4 líneas. Qué resuelve esta feature, en qué módulo del producto encaja, por qué se hizo ahora. No describir el cambio en sí — eso va en "Cambios implementados".}}

{{Si la feature es de estabilización / refactor / docs y NO agrega funcionalidad de negocio, dejarlo explícito acá.}}

---

## Cambios implementados

### 1. {{Título corto del cambio principal}}

**Archivo{{s}}:** `ruta/al/archivo.tsx`{{ — si son varios, listar:}}

- `ruta/al/archivo.tsx`
- `ruta/al/otro.ts`

{{Descripción del cambio: qué estaba mal o faltaba antes, qué hace ahora. Incluir snippet si ayuda a entender la intención (no pegar el diff completo).}}

```tsx
// antes
{{código previo}}

// después
{{código nuevo}}
```

{{Regla de negocio aplicada / consideración no obvia / decisión técnica que conviene fijar acá.}}

---

### 2. {{Título corto del segundo cambio}}

**Archivo{{s}}:** `ruta/...`

{{Descripción.}}

---

### 3. {{Título del tercero — sumar tantos como haga falta}}

…

---

## Estado del sistema tras MAPS-XXX

{{Descripción del estado final. Usar las subsecciones que apliquen al área tocada.}}

### {{Routing / Schema / API / UI / etc.}}

```
{{ASCII o tabla mostrando el estado final de las piezas relevantes}}
```

### {{Tabla resumen de algún aspecto clave}}

| Caso | Comportamiento |
|------|----------------|
| {{...}} | {{...}} |

---

## Criterios de aceptación verificados

| Criterio | Estado |
|----------|--------|
| {{Criterio 1 — descripción concreta y verificable}} | {{Cómo se verificó}} |
| {{Criterio 2}} | {{...}} |
| {{Criterio 3}} | {{...}} |

---

## Pruebas manuales recomendadas

```
1. {{Paso o flujo a probar}}
   → {{Comportamiento esperado}}
   → {{Validación adicional}}

2. {{Otro caso}}
   → …

3. {{Casos de error / edge cases}}
   → …
```

{{O versión backend con curl si aplica:}}

```bash
curl -s -X POST http://localhost:3000/api/v1/{{...}} \
  -H "Content-Type: application/json" \
  -d "{{...}}"
```

---

## Pendientes fuera de esta feature

| Pendiente | Detalle |
|-----------|---------|
| {{Cosa que conscientemente quedó fuera de scope}} | {{Por qué se difirió, dónde retomarlo, ticket si existe}} |
| {{Otro pendiente}} | {{...}} |

---

*Documento generado en la feature MAPS-XXX — {{nombre breve}}.*
