-- El init usaba PRODUCER; 20260420192306_rol ya puede haber dejado PRODUCTOR.
-- Idempotente: solo renombra si PRODUCER sigue existiendo.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Rol' AND e.enumlabel = 'PRODUCER'
  ) THEN
    ALTER TYPE "Rol" RENAME VALUE 'PRODUCER' TO 'PRODUCTOR';
  END IF;
END $$;
