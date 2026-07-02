-- CreateEnum
CREATE TYPE "CategoriaNoticia" AS ENUM ('NOVEDAD', 'EVENTO', 'CIRCULAR', 'PRODUCTO', 'COMUNICADO');

-- AlterTable
ALTER TABLE "Noticia" ADD COLUMN "categoria" "CategoriaNoticia" NOT NULL DEFAULT 'NOVEDAD';
ALTER TABLE "Noticia" ALTER COLUMN "categoria" DROP DEFAULT;
