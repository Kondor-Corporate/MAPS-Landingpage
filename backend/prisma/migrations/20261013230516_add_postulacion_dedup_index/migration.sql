-- CreateIndex
CREATE INDEX "postulacion_dni_matricula_created_at_idx" ON "postulacion"("dni", "matricula", "created_at");
