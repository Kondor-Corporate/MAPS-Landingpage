-- MAPS-013: perfil extendido en Productor (sin tablas hijas)
ALTER TABLE "Productor" ADD COLUMN "matricula" TEXT;
ALTER TABLE "Productor" ADD COLUMN "verificado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Productor" ADD COLUMN "idiomas" JSONB;
ALTER TABLE "Productor" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "Productor" ADD COLUMN "anos_experiencia" INTEGER;
ALTER TABLE "Productor" ADD COLUMN "clientes_activos" INTEGER;
ALTER TABLE "Productor" ADD COLUMN "titulo_profesional" TEXT;
ALTER TABLE "Productor" ADD COLUMN "especialidades" TEXT;
ALTER TABLE "Productor" ADD COLUMN "certificacion" TEXT;
ALTER TABLE "Productor" ADD COLUMN "certificacion_nombre" TEXT;

CREATE UNIQUE INDEX "Productor_matricula_key" ON "Productor"("matricula");
