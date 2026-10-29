-- CreateTable
CREATE TABLE "Certificacion" (
    "id" SERIAL NOT NULL,
    "productor_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivo_url" TEXT NOT NULL,
    "tamano_bytes" INTEGER,
    "mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificacion_pkey" PRIMARY KEY ("id")
);

-- Migrate legacy single-cert columns into Certificacion rows
INSERT INTO "Certificacion" ("productor_id", "nombre", "archivo_url", "mime_type", "orden", "updated_at")
SELECT
    "id",
    COALESCE("certificacion_nombre", 'Certificación'),
    "certificacion",
    'application/pdf',
    0,
    CURRENT_TIMESTAMP
FROM "Productor"
WHERE "certificacion" IS NOT NULL AND TRIM("certificacion") <> '';

-- Drop legacy columns
ALTER TABLE "Productor" DROP COLUMN IF EXISTS "certificacion";
ALTER TABLE "Productor" DROP COLUMN IF EXISTS "certificacion_nombre";

-- CreateIndex
CREATE INDEX "Certificacion_productor_id_idx" ON "Certificacion"("productor_id");

-- AddForeignKey
ALTER TABLE "Certificacion" ADD CONSTRAINT "Certificacion_productor_id_fkey" FOREIGN KEY ("productor_id") REFERENCES "Productor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
