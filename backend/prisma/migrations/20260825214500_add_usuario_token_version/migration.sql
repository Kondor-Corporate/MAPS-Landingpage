-- Revocación monotónica de access tokens por usuario.
ALTER TABLE "Usuario"
ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
