ALTER TABLE "Productor" ADD COLUMN "direccion" TEXT;

UPDATE "Productor"
SET "direccion" = "ciudad"
WHERE "direccion" IS NULL
  AND "ciudad" IS NOT NULL
  AND btrim("ciudad") <> '';
