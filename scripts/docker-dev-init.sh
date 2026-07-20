#!/usr/bin/env bash
# MAPS Asesores — inicializa entorno Docker de desarrollo (migrate + seed).
# Uso: desde la raiz del repo: ./scripts/docker-dev-init.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Levantando servicios..."
docker compose up -d --build

echo "==> Esperando backend healthy..."
for i in $(seq 1 30); do
  if docker compose exec -T backend curl -sf http://localhost:3000/api/v1/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Aplicando migraciones..."
docker compose exec backend npx prisma migrate deploy

echo "==> Ejecutando seed..."
docker compose exec backend npm run db:seed

echo "==> Listo. Frontend: http://localhost:5173 | Health: http://localhost:3000/api/v1/health"
