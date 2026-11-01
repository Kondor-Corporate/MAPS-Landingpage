# Environment `production` en GitHub (R6-C2)

Este documento describe la configuración **manual** del environment en el repositorio `Kondor-Corporate/MAPS-Landingpage`. Cursor y los workflows **no** pueden crear revisores obligatorios; solo referencian el environment.

## Crear o abrir el environment

1. GitHub → **Settings** → **Environments** → **New environment** → nombre exacto: `production`.
2. **Deployment branches**: restringir a **`main`** (o “Selected branches” → solo `main`). No autorizar `development` ni ramas de feature.
3. **Required reviewers**: agregar al menos una persona o team con permiso de aprobación. Sin esto, `environment: production` en un workflow **no** exige revisión humana.
4. **Wait timer** (opcional): 0 minutos salvo que el equipo quiera una pausa fija.
5. **Prevent self-review**: activar si quien dispara el workflow no debe aprobar solo.
6. **Deployment protection rules** → conservar historial de deployments habilitado (por defecto).

El revisor ve los inputs del workflow, no el contenido del plan. Antes de aprobar el job de apply
debe haber leído el `terraform show plan.tfplan` del paso de revisión y comprobar que el
`plan_sha256` del input es el del binding que subió el operador.

## Concurrencia

`release-promote.yml` define:

```yaml
concurrency:
  group: maps-prod-release
  cancel-in-progress: false
```

Eso evita dos applies concurrentes aunque dos workflows pasen la aprobación en paralelo.
GitHub conserva una sola ejecución pendiente por grupo: si se lanza una tercera mientras otra
corre y otra espera, la pendiente se cancela. Lanzar una operación a la vez.

## Qué job usa el environment

| Job | Environment | Por qué | Identidad GCP |
|-----|-------------|---------|---------------|
| `verify-promote` | ninguno | Solo lee GitHub (manifiesto, CI, ancestro en `development`). No toca GCP. | ninguna |
| `verify-rollback` | `production` | Lee el registro de despliegues en GCS; el provider OIDC exige el claim `environment=production`. | `maps-prod-deploy` |
| `apply-approved-plan` | `production` | `terraform apply` y `maps-prod-migrate`. | `maps-prod-deploy` |

`id-token: write` se concede solo a los dos jobs con environment (un test del repositorio lo exige).
`verify-promote` corre sin aprobación y por lo tanto **sin** acceso a las variables del environment: la
variable `MAPS_PRODUCTION_BASELINE_JSON` tiene que ser de **repositorio**.

## Variables

En el environment `production` (no en el repo público):

| Variable | Uso |
|----------|-----|
| `TF_STATE_BUCKET` | Nombre del bucket GCS del backend (no commitear). El workflow lo pasa como `-backend-config="bucket=…"`. |
| `GCP_DEPLOY_WORKLOAD_IDENTITY_PROVIDER` | Output Terraform `promote_workload_identity_provider`. Tiene que pertenecer al pool `maps-github-deploy` (el workflow lo comprueba). |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | Email `maps-prod-deploy@…`. |

En el repositorio (**Settings → Secrets and variables → Actions → Variables**):

| Variable | Uso |
|----------|-----|
| `MAPS_PRODUCTION_BASELINE_JSON` | JSON del baseline R5 (`git_sha` + digests), formato de `config/release/production-baseline.json.example`. Punto de comparación de migraciones. No es la fuente de verdad: antes de cualquier cambio el apply la contrasta con el registro de despliegues y con Cloud Run, y bloquea si está adelantada respecto del despliegue actual (corregirla y repetir verify). |

Nota para quien aprueba: el apply exige correr en el **mismo commit de `main`** que el verify. Si entra un merge a `main` entre ambos, el apply se rechaza y hay que repetir verify, plan y binding.

Los secretos de aplicación siguen en Secret Manager; no copiarlos al environment.

## Comprobación

Tras configurar revisores, disparar un workflow de prueba con un job vacío:

```yaml
jobs:
  probe:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo ok
```

Debe quedar **Waiting** hasta aprobar. Si corre sin espera, faltan required reviewers.
