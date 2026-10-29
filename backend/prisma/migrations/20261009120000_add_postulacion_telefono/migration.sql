-- AlterTable
ALTER TABLE "postulacion" ADD COLUMN "telefono" TEXT NOT NULL DEFAULT '';

-- Quitamos el default: el teléfono es obligatorio desde la aplicación.
ALTER TABLE "postulacion" ALTER COLUMN "telefono" DROP DEFAULT;
