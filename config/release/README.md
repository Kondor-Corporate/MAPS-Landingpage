# Baseline de producción (R5)

El archivo **`production-baseline.json`** (gitignored) registra el commit y los digests `@sha256` desplegados antes de la primera promoción automática. No incluye secretos; solo referencias de imagen y `git_sha`.

## Captura (solo lectura en GCP)

1. Confirmar el commit desplegado en producción (tag, release notes o historial acordado).
2. Desde el repo, con credenciales de **lectura** en `maps-prod-landing-page`:

```bash
# Imágenes actuales de servicios
gcloud run services describe maps-prod-frontend --region=southamerica-east1 --project=maps-prod-landing-page --format='value(spec.template.spec.containers[0].image)'
gcloud run services describe maps-prod-backend --region=southamerica-east1 --project=maps-prod-landing-page --format='value(spec.template.spec.containers[0].image)'

# Imagen del job migrate (referencia jobs)
gcloud run jobs describe maps-prod-migrate --region=southamerica-east1 --project=maps-prod-landing-page --format='value(template.template.spec.containers[0].image)'
```

3. Comparar con Terraform **sin apply**:

```bash
cd infra/terraform/environments/production
terraform init -input=false
terraform plan -input=false -no-color
```

Las variables `frontend_image`, `backend_image` y `jobs_image` en el plan/state deben coincidir con los `@sha256` de Cloud Run. Si difieren, detener y reconciliar manualmente.

4. Opcional: `node scripts/release/capture-production-baseline.mjs --git-sha=<sha40> --frontend=... --backend=... --jobs=...`

5. Copiar `production-baseline.json.example` → `production-baseline.json` (local, gitignored) o publicar el JSON en la variable **`MAPS_PRODUCTION_BASELINE_JSON`**.

## Binding del plan (GCS)

Tras validar `plan.json`, subir junto al `.tfplan`:

```json
{
  "schema_version": 1,
  "verify_run_id": "<run id fase verify>",
  "git_sha": "<40 hex>",
  "release_build_run_id": "<id release-build>",
  "plan_mode": "full|jobs-only|services-only",
  "plan_sha256": "<64 hex del plan.tfplan>"
}
```

Ruta: `promotion/plans/<verify_run_id>/<plan_mode>.binding.json` (preferir `x-goog-if-generation-match:0`).

## Evidencia de migrate

Tras `jobs-only` + `maps-prod-migrate` exitoso, el workflow escribe `promotion/migrate-done/<verify_run_id>.json`. `services-only` exige ese objeto antes del apply.

## CI / verify en GitHub

Fase **verify** no incluye el archivo gitignored. Configurar **`MAPS_PRODUCTION_BASELINE_JSON`** (variable de repositorio) con el JSON completo. Sin baseline válido, el preflight falla y no hay comparación automática de migraciones Prisma ni promoción automática segura.
