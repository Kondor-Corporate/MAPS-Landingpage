-- AlterTable: encuadre de portada (paneo + zoom) para reproducir el crop en preview y cards.
ALTER TABLE "Noticia" ADD COLUMN "portada_encuadre" JSONB;
