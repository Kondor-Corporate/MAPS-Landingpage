# D5A — Fundación de testing frontend

Fecha: 2026-09-12

## Problema inicial

El frontend conservaba 28 archivos de tests escritos para Vitest y React
Testing Library, pero no tenía runner, dependencias, scripts, typecheck de tests
ni gate de tests en CI. ESLint y TypeScript excluían `src/tests`.

## Stack elegido

- Vitest 4.1.4, alineado con backend.
- jsdom 29.1.1.
- React Testing Library 16.3.3 y DOM Testing Library 10.4.1.
- user-event 14.6.7 y jest-dom 6.9.1.
- MSW 2.15.0.

Las versiones son compatibles con React 18, Vite 8 y el Node 22 usado por el
proyecto y CI. El equipo local utilizado durante la activación tenía Node
20.19.4; jsdom 29 también lo soporta. No se incorporaron coverage, Browser Mode,
Playwright ni `axios-mock-adapter`.

## Decisiones

- Configuración Vitest separada de `vite.config.ts` para no cargar el plugin de
  metadata HTML de producción.
- Entorno jsdom, imports explícitos de Vitest y alias `@` a `src`.
- Typecheck de producción y tests separados mediante `tsconfig.test.json`.
- ESLint incluye desde D5A los tests.
- MSW reemplaza los dos únicos usos previstos de `axios-mock-adapter`.
- El lifecycle de MSW continúa local en los tests que lo usan; su
  centralización queda para D5B.
- MapLibre permanece detrás de su mock mínimo de boundary.
- No se agregaron skips, retries, coverage ni timeouts ampliados.

## Archivos y configuración

- `frontend/vitest.config.ts`: runner jsdom, React, setup, alias e inclusión.
- `frontend/tsconfig.test.json`: typecheck estricto de producción y tests.
- `frontend/package.json` y lockfile: dependencias y scripts de tests.
- `frontend/eslint.config.js`: tests incluidos en lint.
- `.github/workflows/ci.yml`: jobs backend/frontend paralelos.
- `docs/TESTING.md`: comandos y estrategia ejecutable actualizados.

## Tests recuperados y ajustes de activación

Se activaron 28 archivos y 166 casos. Los ajustes se limitaron al harness o a
expectativas desfasadas, salvo la corrección productiva mínima de coordenadas
documentada debajo:

- Interceptores de request migrados de `axios-mock-adapter` a MSW.
- Sleep real de LoginPage reemplazado por una promesa controlada.
- Fake timers de AddressMapPicker vuelven a timers reales.
- `scrollIntoView` se define solo en la suite que prueba scroll.
- Tests de password usan datos que llegan a la regla que pretenden afirmar.
- Upload inválido configura `user-event` para no filtrar por `accept`.
- Tests de confirmación se alinearon con los diálogos accesibles actuales.
- Mocks de locks admin aíslan un filtro ajeno al riesgo probado.
- Se removieron assertions frágiles sobre un wrapper interno del popup.

## Incompatibilidades y hallazgos

El primer `npm install` falló por un error interno de npm 10.8.2/Arborist al
resolver los peers opcionales de Vitest (`edgesOut`). Se reintentó con
`--legacy-peer-deps`; las dependencias directas requeridas fueron declaradas y
el lockfile quedó generado.

La activación detectó y confirmó una regresión productiva preexistente:
`normalizeCoordinates(null, longitud)` devolvía latitud `0` porque
`Number(null) === 0`. Con autorización explícita se agregó únicamente un guard
para rechazar `null` y `undefined` antes de la conversión numérica. Los valores
`0` y `"0"` siguen siendo válidos. El test existente actúa como regression test
y se agregó el caso simétrico con longitud `null`.

También se observó que `Button` incluye sus sizers invisibles en el nombre
accesible, produciendo nombres repetidos en confirmaciones. No se cambió
producción en D5A.

## Comandos y resultados

- `npm run typecheck`: verde.
- `npm run test:typecheck`: verde.
- `npm run lint`: verde, con una advertencia preexistente en `Modal.tsx`.
- `npm test`: 28 archivos y 166 tests verdes; 0 fallidos; 0 skipped.

## Deuda diferida

### D5B

Auth/routing P0, lifecycle global de MSW, reset consistente de stores y mejora
del nombre accesible de botones/diálogos.

### D5C

Mappers y dominios de productores, perfil, noticias, biblioteca y mapa; revisión
de tests de bajo valor y fixtures repetidas.

### D5D

Coverage V8 orientado a riesgo y Playwright para pocos flujos E2E de alto valor.

### Release hardening

Cualquier hallazgo productivo adicional debe resolverse en alcance explícito,
no mezclarse silenciosamente con la fundación del runner.
