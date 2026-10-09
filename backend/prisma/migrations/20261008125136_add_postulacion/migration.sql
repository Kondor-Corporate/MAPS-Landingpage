-- CreateEnum
CREATE TYPE "PostulacionSituacion" AS ENUM ('PRODUCTOR_NUEVO', 'TRABAJA_CON_OTRAS');

-- CreateTable
CREATE TABLE "postulacion" (
    "id" SERIAL NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "situacion" "PostulacionSituacion" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "postulacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "postulacion_created_at_idx" ON "postulacion"("created_at");
