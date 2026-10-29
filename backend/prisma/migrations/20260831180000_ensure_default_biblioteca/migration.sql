-- Registro estructural de Biblioteca requerido por la aplicación (bibliotecaId = 1).
-- Staging ejecuta migrate deploy sin seed; sin esta fila, crear ramos viola Ramo_bibliotecaId_fkey (P2003).
-- Idempotente: si id=1 ya existe, no se modifica ni se sobreescribe contenido.

INSERT INTO "Biblioteca" ("id", "nombre", "descripcion", "createdAt", "updatedAt")
VALUES (
  1,
  'Biblioteca Digital MAPS',
  'Catálogo de ramos y material comercial',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- SERIAL no avanza la secuencia al insertar un id explícito.
-- setval(..., is_called=true): el próximo nextval será MAX(id)+1.
SELECT setval(
  pg_get_serial_sequence('"Biblioteca"', 'id'),
  COALESCE((SELECT MAX("id") FROM "Biblioteca"), 1)
);
