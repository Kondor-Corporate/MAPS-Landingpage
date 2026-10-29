-- CreateEnum
CREATE TYPE "RamoTipo" AS ENUM ('PRINCIPAL', 'SECUNDARIO');

-- AlterTable
ALTER TABLE "Ramo" ADD COLUMN "icono" TEXT NOT NULL DEFAULT 'car';
ALTER TABLE "Ramo" ALTER COLUMN "icono" DROP DEFAULT;

ALTER TABLE "Ramo" ADD COLUMN "gdriveUrl" TEXT NOT NULL DEFAULT 'https://drive.google.com/drive/folders/EXAMPLE';
ALTER TABLE "Ramo" ALTER COLUMN "gdriveUrl" DROP DEFAULT;

ALTER TABLE "Ramo" ADD COLUMN "tipo" "RamoTipo" NOT NULL DEFAULT 'PRINCIPAL';
ALTER TABLE "Ramo" ALTER COLUMN "tipo" DROP DEFAULT;

ALTER TABLE "Ramo" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "Ramo_bibliotecaId_nombre_key" ON "Ramo"("bibliotecaId", "nombre");
