-- MAPS-013 Fase 3: tracking real de último login para el admin view del productor.
ALTER TABLE "Usuario" ADD COLUMN "last_login_at" TIMESTAMP(3);
