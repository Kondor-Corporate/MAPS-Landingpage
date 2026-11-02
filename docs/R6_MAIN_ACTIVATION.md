# Llevar la automatización de release a `main` (R6)

`release-promote.yml` solo puede ejecutarse desde `main`: el provider OIDC de deploy exige
`workflow_ref = …/release-promote.yml@refs/heads/main` y `ref = refs/heads/main`, y
`workflow_dispatch` solo existe en la rama predeterminada. Hoy `main` no tiene el workflow,
ni `scripts/release/`, ni `config/release/`, ni el módulo `deploy-identity`.

Este procedimiento copia **solo esas rutas** desde `development`. No fusiona historiales: `main`
y `development` tienen historias distintas (merge-base `e07b58c`) y un `git merge` arrastraría
cientos de commits que no son parte de R6.

No se ejecuta durante el trabajo de R6: se hace después de que el PR único de
`feat/r6-release-finalization` esté mergeado en `development`.

## Qué viaja y qué no

La lista vive en [`config/release/main-activation-paths.json`](../config/release/main-activation-paths.json)
y la verifica `scripts/release/check-main-activation.mjs` (también corre en CI):

| Ruta | Por qué |
|------|---------|
| `.github/workflows/release-promote.yml` | El workflow de promoción y rollback. |
| `.github/workflows/release-build.yml` | `main` tiene la versión anterior; la verificación de autenticidad espera la actual. |
| `.github/workflows/ci.yml` | Corre los tests y validaciones de release; sin él `main` no los ejecuta. |
| `scripts/release/` | Todo lo que invoca el workflow. Se ejecuta desde `main`, no desde el SHA de la app. |
| `config/release/` | Ejemplos de baseline, política de retención y esta lista. |
| `infra/terraform/` | Módulo `deploy-identity`, política de retención, `.terraform-version`. El apply usa el Terraform de `main`. |
| `.gitignore` | Evita versionar `production-baseline.json`, planes y snapshots del registro. |
| `frontend/Dockerfile` | Compatibilidad del build sin BuildKit exigida por CI y Cloud Build. |
| `docs/GCP_PRODUCTION_RUNBOOK.md`, `docs/R6_*.md` | Procedimiento operativo junto al código que describe. |

Se incluye `frontend/Dockerfile` para conservar la compatibilidad con el builder clásico
sin BuildKit. El resto de `frontend/` y `docs/` sigue la sincronización normal.

Dependencias que ya están en `main`: `backend/prisma/migrations` (el preflight compara
migraciones con `git diff`; con `fetch-depth: 0` el checkout trae también `development`).

## Procedimiento

Lo hace una persona con permisos; ningún paso lo automatiza.

```bash
git fetch origin

# 1. Rama nueva desde main (no desde development).
git switch -c chore/r6-activate-main origin/main

# 2. Copiar contenido de development, solo las rutas del manifiesto. Sin merge, sin historia.
git checkout origin/development -- \
  .github/workflows/ci.yml .github/workflows/release-build.yml .github/workflows/release-promote.yml \
  .gitignore config/release \
  docs/GCP_PRODUCTION_RUNBOOK.md docs/R6_GITHUB_PRODUCTION_ENVIRONMENT.md \
  docs/R6_MAIN_ACTIVATION.md docs/R6_RELEASE_OPERATIONS_PLAN.md \
  frontend/Dockerfile infra/terraform scripts/release

# 3. Comprobar. Falla si falta una ruta, si un workflow cita un archivo sin cubrir, o si
#    main tiene archivos bajo esas rutas que development no tiene (no se borrarían solos).
node scripts/release/check-main-activation.mjs --against=origin/main

# 4. Revisar exactamente lo que cambia, y que no haya nada fuera de las rutas.
git status --short
git diff --cached --stat origin/main

# 5. Tests y validaciones locales (los mismos que corre CI).
node --test scripts/release/*.test.mjs
terraform fmt -check -recursive infra/terraform
```

Después: commit, push y PR hacia `main` los hace quien opera (no este procedimiento).

Al mergear, el `push` a `main` dispara `ci.yml`. Esa corrida valida que la copia es coherente.

### Comprobación posterior (solo lectura)

Con `main` actualizado:

```bash
git diff origin/main origin/development --stat -- \
  .github scripts/release config/release infra/terraform .gitignore
```

Debe estar vacío. Lo que siga difiriendo entre ramas fuera de esas rutas es la sincronización
normal y no afecta a R6.

## Lo que activar `main` NO hace

Copiar los archivos no habilita ni ejecuta nada en GCP:

- El workflow de promoción queda disponible, pero su fase **apply** queda bloqueada hasta
  completar el checklist de GCP de
  [`R6_RELEASE_OPERATIONS_PLAN.md`](./R6_RELEASE_OPERATIONS_PLAN.md) (`deploy_identity`
  aplicado, environment `production` con revisores, variables, baseline R5, permisos del deploy SA).
- `release-build.yml` pasa a poder dispararse desde la UI de `main` con la versión actual.
- El módulo `deploy-identity` en `main` crea 13 recursos en el **próximo** `terraform apply`
  dirigido; no los crea el merge. Ese apply es manual y está descrito en el runbook.
- `ci.yml` en `main` empieza a exigir los tests de `scripts/release/` y `terraform validate`.

## Si algo no cuadra

- `check-main-activation` reporta «main tiene X que HEAD no tiene»: X existía solo en `main`.
  Decidir a mano si debe quedar; el checkout por rutas no borra archivos.
- El diff trae archivos fuera de las rutas: no continuar; revisar con `git status` y `git restore --staged`.
- Cualquier duda sobre la rama de origen: el contenido siempre sale de `origin/development`
  después del merge del PR de R6, nunca de la rama de trabajo.
