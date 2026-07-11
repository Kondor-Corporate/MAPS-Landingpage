# MAPS Asesores — inicializa entorno Docker de desarrollo (migrate + seed).
# Uso: desde la raiz del repo: .\scripts\docker-dev-init.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> Levantando servicios..."
docker compose up -d --build

Write-Host "==> Esperando backend healthy..."
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        docker compose exec -T backend curl -sf http://localhost:3000/api/v1/health | Out-Null
        $healthy = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}
if (-not $healthy) {
    Write-Warning "Backend aun no responde health; continuando con migrate/seed..."
}

Write-Host "==> Aplicando migraciones..."
docker compose exec backend npx prisma migrate deploy

Write-Host "==> Ejecutando seed..."
docker compose exec backend npm run db:seed

Write-Host "==> Listo. Frontend: http://localhost:5173 | Health: http://localhost:3000/api/v1/health"
