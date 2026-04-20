-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPERADMIN', 'ADMIN', 'PRODUCER');

-- CreateEnum
CREATE TYPE "Visibilidad" AS ENUM ('INTERNA', 'PUBLICA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "usuario" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'PRODUCER',
    "creadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Productor" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "bio" TEXT,
    "ciudad" TEXT,
    "dni" TEXT,
    "foto" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Productor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedSocial" (
    "id" SERIAL NOT NULL,
    "productorId" INTEGER NOT NULL,
    "plataforma" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedSocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Noticia" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "contenido" TEXT NOT NULL,
    "imagen_url" TEXT,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "publicada_en" TIMESTAMP(3),
    "visibilidad" "Visibilidad" NOT NULL DEFAULT 'PUBLICA',
    "autorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Noticia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Biblioteca" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Biblioteca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ramo" (
    "id" SERIAL NOT NULL,
    "bibliotecaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ramo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recurso" (
    "id" SERIAL NOT NULL,
    "ramoId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "subidoPorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recurso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Productor_usuarioId_key" ON "Productor"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Productor_slug_key" ON "Productor"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Productor_dni_key" ON "Productor"("dni");

-- CreateIndex
CREATE INDEX "RedSocial_productorId_idx" ON "RedSocial"("productorId");

-- CreateIndex
CREATE UNIQUE INDEX "Noticia_slug_key" ON "Noticia"("slug");

-- CreateIndex
CREATE INDEX "Noticia_autorId_idx" ON "Noticia"("autorId");

-- CreateIndex
CREATE INDEX "Noticia_publicada_visibilidad_idx" ON "Noticia"("publicada", "visibilidad");

-- CreateIndex
CREATE INDEX "Ramo_bibliotecaId_idx" ON "Ramo"("bibliotecaId");

-- CreateIndex
CREATE INDEX "Recurso_ramoId_idx" ON "Recurso"("ramoId");

-- CreateIndex
CREATE INDEX "Recurso_subidoPorId_idx" ON "Recurso"("subidoPorId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Productor" ADD CONSTRAINT "Productor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedSocial" ADD CONSTRAINT "RedSocial_productorId_fkey" FOREIGN KEY ("productorId") REFERENCES "Productor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Noticia" ADD CONSTRAINT "Noticia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ramo" ADD CONSTRAINT "Ramo_bibliotecaId_fkey" FOREIGN KEY ("bibliotecaId") REFERENCES "Biblioteca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurso" ADD CONSTRAINT "Recurso_ramoId_fkey" FOREIGN KEY ("ramoId") REFERENCES "Ramo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurso" ADD CONSTRAINT "Recurso_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
