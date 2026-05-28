-- El init usaba PRODUCER; el schema Prisma usa PRODUCTOR. Alineamos PostgreSQL.
ALTER TYPE "Rol" RENAME VALUE 'PRODUCER' TO 'PRODUCTOR';
