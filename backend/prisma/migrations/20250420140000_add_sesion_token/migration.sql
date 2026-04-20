-- CreateTable
CREATE TABLE "sesion_token" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesion_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sesion_token_token_hash_key" ON "sesion_token"("token_hash");

-- CreateIndex
CREATE INDEX "sesion_token_usuario_id_idx" ON "sesion_token"("usuario_id");

-- AddForeignKey
ALTER TABLE "sesion_token" ADD CONSTRAINT "sesion_token_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
