-- CreateTable
CREATE TABLE "NoticiaImagen" (
    "id" SERIAL NOT NULL,
    "noticia_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "mime_type" TEXT NOT NULL,
    "tamano_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticiaImagen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoticiaImagen_noticia_id_idx" ON "NoticiaImagen"("noticia_id");

-- AddForeignKey
ALTER TABLE "NoticiaImagen" ADD CONSTRAINT "NoticiaImagen_noticia_id_fkey" FOREIGN KEY ("noticia_id") REFERENCES "Noticia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
