/**
 * Lógica de negocio y acceso Prisma para Noticias.
 * Centraliza filtros por audiencia, reglas de publicación, DTOs y operaciones CRUD.
 */
import {
  Prisma,
  type CategoriaNoticia,
  type Noticia,
  type NoticiaImagen,
  type Visibilidad,
} from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { ensureUniqueNewsSlug, slugifyTitulo } from '../lib/newsSlug.js';
import { prisma } from '../lib/prisma.js';
import { getStorageAdapter } from '../lib/storage/index.js';
import {
  cleanupBestEffort,
  compensateUploadFailure,
} from '../lib/storageConsistency.js';
import { assertAllowedUploadContent } from '../lib/uploadContentValidation.js';

/** Tope de imágenes de galería por noticia (portada aparte). */
export const MAX_GALERIA_IMAGENES = 10;

const galeriaOrderBy = [{ orden: 'asc' as const }, { id: 'asc' as const }];

export type NoticiaImagenDto = {
  id: number;
  url: string;
  orden: number;
};

export type NewsAdminDto = {
  id: number;
  titulo: string;
  slug: string;
  descripcion: string | null;
  contenido: string;
  categoria: CategoriaNoticia;
  imagenUrl: string | null;
  galeria: NoticiaImagenDto[];
  publicada: boolean;
  publicadaEn: Date | null;
  visibilidad: Visibilidad;
  autorId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewsPublicDto = {
  slug: string;
  titulo: string;
  descripcion: string | null;
  contenido: string;
  categoria: CategoriaNoticia;
  imagenUrl: string | null;
  galeria: string[];
  publicadaEn: Date | null;
};

export type ListNewsAdminQuery = {
  publicada?: boolean;
  visibilidad?: Visibilidad;
  categoria?: CategoriaNoticia;
  q?: string;
  page?: number;
  limit?: number;
};

export type ListNewsPagedQuery = {
  page?: number;
  limit?: number;
};

export type CreateNewsInput = {
  titulo: string;
  contenido: string;
  descripcion?: string | null;
  categoria: CategoriaNoticia;
  visibilidad: Visibilidad;
  publicada?: boolean;
};

export type UpdateNewsInput = Partial<CreateNewsInput>;

function toNoticiaImagenDto(row: NoticiaImagen): NoticiaImagenDto {
  return { id: row.id, url: row.url, orden: row.orden };
}

/** DTO admin: expone todos los campos, incluidos borradores y metadatos editoriales. */
function toNewsAdminDto(row: Noticia, imagenes: NoticiaImagen[] = []): NewsAdminDto {
  return {
    id: row.id,
    titulo: row.titulo,
    slug: row.slug,
    descripcion: row.descripcion,
    contenido: row.contenido,
    categoria: row.categoria,
    imagenUrl: row.imagenUrl,
    galeria: imagenes.map(toNoticiaImagenDto),
    publicada: row.publicada,
    publicadaEn: row.publicadaEn,
    visibilidad: row.visibilidad,
    autorId: row.autorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** DTO de lectura pública/intranet: sin id ni flags internos de publicación. */
function toNewsPublicDto(row: Noticia, imagenes: NoticiaImagen[] = []): NewsPublicDto {
  return {
    slug: row.slug,
    titulo: row.titulo,
    descripcion: row.descripcion,
    contenido: row.contenido,
    categoria: row.categoria,
    imagenUrl: row.imagenUrl,
    galeria: imagenes.map((img) => img.url),
    publicadaEn: row.publicadaEn,
  };
}

function buildAdminWhere(query: ListNewsAdminQuery): Prisma.NoticiaWhereInput {
  const where: Prisma.NoticiaWhereInput = {};

  if (query.publicada !== undefined) where.publicada = query.publicada;
  if (query.visibilidad !== undefined) where.visibilidad = query.visibilidad;
  if (query.categoria !== undefined) where.categoria = query.categoria;

  if (query.q) {
    const term = query.q.trim();
    if (term.length > 0) {
      where.OR = [
        { titulo: { contains: term, mode: 'insensitive' } },
        { contenido: { contains: term, mode: 'insensitive' } },
        { descripcion: { contains: term, mode: 'insensitive' } },
      ];
    }
  }

  return where;
}

function resolvePagination(query: ListNewsPagedQuery, defaultLimit: number) {
  const page = query.page ?? 1;
  const limit = query.limit ?? defaultLimit;
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/** Al publicar, conserva `publicadaEn` existente o la setea por primera vez. */
function applyPublishRules(
  current: Pick<Noticia, 'publicadaEn'>,
  nextPublicada: boolean,
): Date | null | undefined {
  if (nextPublicada) {
    return current.publicadaEn ?? new Date();
  }
  return undefined;
}

export const newsService = {
  async listAdminNews(query: ListNewsAdminQuery): Promise<NewsAdminDto[]> {
    const where = buildAdminWhere(query);
    const pagination =
      query.page !== undefined || query.limit !== undefined
        ? resolvePagination(query, query.limit ?? 100)
        : undefined;

    const rows = await prisma.noticia.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      ...(pagination ?? {}),
    });

    // Listados (cards) no incluyen galería: solo portada.
    return rows.map((row) => toNewsAdminDto(row));
  },

  async getAdminNewsById(id: number): Promise<NewsAdminDto | null> {
    const row = await prisma.noticia.findUnique({
      where: { id },
      include: { imagenes: { orderBy: galeriaOrderBy } },
    });
    if (!row) return null;
    const { imagenes, ...noticia } = row;
    return toNewsAdminDto(noticia, imagenes);
  },

  async createNews(input: CreateNewsInput, actorUserId: number): Promise<NewsAdminDto> {
    const slugBase = slugifyTitulo(input.titulo.trim());
    const slug = await ensureUniqueNewsSlug(slugBase);
    const publicada = input.publicada ?? false;
    const publicadaEn = publicada ? new Date() : null;

    const row = await prisma.noticia.create({
      data: {
        titulo: input.titulo.trim(),
        slug,
        descripcion: input.descripcion?.trim() || null,
        contenido: input.contenido.trim(),
        categoria: input.categoria,
        visibilidad: input.visibilidad,
        // La portada se sube por separado vía `setPortada`; una noticia nueva nace sin imagen.
        publicada,
        publicadaEn,
        autorId: actorUserId,
      },
    });

    return toNewsAdminDto(row);
  },

  async updateNews(id: number, input: UpdateNewsInput): Promise<NewsAdminDto> {
    const current = await prisma.noticia.findUnique({ where: { id } });
    if (!current) {
      throw new AppError(404, 'Noticia no encontrada');
    }

    const data: Prisma.NoticiaUpdateInput = {};

    if (input.titulo !== undefined) data.titulo = input.titulo.trim();
    if (input.contenido !== undefined) data.contenido = input.contenido.trim();
    if (input.descripcion !== undefined) {
      data.descripcion = input.descripcion?.trim() || null;
    }
    if (input.categoria !== undefined) data.categoria = input.categoria;
    if (input.visibilidad !== undefined) data.visibilidad = input.visibilidad;

    if (input.publicada !== undefined) {
      data.publicada = input.publicada;
      const nextPublicadaEn = applyPublishRules(current, input.publicada);
      if (nextPublicadaEn !== undefined) {
        data.publicadaEn = nextPublicadaEn;
      }
    }

    const row = await prisma.noticia.update({
      where: { id },
      data,
      include: { imagenes: { orderBy: galeriaOrderBy } },
    });

    const { imagenes, ...noticia } = row;
    return toNewsAdminDto(noticia, imagenes);
  },

  async deleteNews(id: number): Promise<void> {
    const current = await prisma.noticia.findUnique({
      where: { id },
      select: { id: true, imagenUrl: true, imagenes: { select: { url: true } } },
    });
    if (!current) {
      throw new AppError(404, 'Noticia no encontrada');
    }

    // El cascade borra las filas NoticiaImagen; los archivos del storage se limpian después del delete DB.
    const urls: string[] = current.imagenes.map((img) => img.url);
    if (current.imagenUrl) urls.push(current.imagenUrl);

    await prisma.noticia.delete({ where: { id } });

    const storage = getStorageAdapter();
    await Promise.all(
      urls.map((url) =>
        cleanupBestEffort({
          operation: 'cleanup_after_db_delete',
          category: 'noticias',
          resourceId: id,
          cleanup: () => storage.deleteImagenNoticia(url),
        }),
      ),
    );
  },

  async setPortada(id: number, file: Express.Multer.File): Promise<NewsAdminDto> {
    if (!file?.buffer) {
      throw new AppError(400, 'Imagen requerida');
    }
    const current = await prisma.noticia.findUnique({ where: { id } });
    if (!current) {
      throw new AppError(404, 'Noticia no encontrada');
    }

    const detectedMime = assertAllowedUploadContent(file.buffer, 'noticia');
    const previousImagenUrl = current.imagenUrl;

    const storage = getStorageAdapter();
    const uploaded = await storage.uploadImagenNoticia({
      buffer: file.buffer,
      mimeType: detectedMime,
      noticiaId: id,
    });

    let row;
    try {
      row = await prisma.noticia.update({
        where: { id },
        data: { imagenUrl: uploaded.url },
        include: { imagenes: { orderBy: galeriaOrderBy } },
      });
    } catch (error) {
      await compensateUploadFailure({
        category: 'noticias',
        resourceId: id,
        cleanup: () => storage.deleteImagenNoticia(uploaded.url),
      });
      throw error;
    }

    if (previousImagenUrl) {
      await cleanupBestEffort({
        operation: 'cleanup_after_db_replace',
        category: 'noticias',
        resourceId: id,
        cleanup: () => storage.deleteImagenNoticia(previousImagenUrl),
      });
    }

    const { imagenes, ...noticia } = row;
    return toNewsAdminDto(noticia, imagenes);
  },

  async removePortada(id: number): Promise<NewsAdminDto> {
    const current = await prisma.noticia.findUnique({ where: { id } });
    if (!current) {
      throw new AppError(404, 'Noticia no encontrada');
    }

    const previousImagenUrl = current.imagenUrl;

    const row = await prisma.noticia.update({
      where: { id },
      data: { imagenUrl: null },
      include: { imagenes: { orderBy: galeriaOrderBy } },
    });

    if (previousImagenUrl) {
      const storage = getStorageAdapter();
      await cleanupBestEffort({
        operation: 'cleanup_after_db_delete',
        category: 'noticias',
        resourceId: id,
        cleanup: () => storage.deleteImagenNoticia(previousImagenUrl),
      });
    }

    const { imagenes, ...noticia } = row;
    return toNewsAdminDto(noticia, imagenes);
  },

  async addImagenGaleria(
    id: number,
    file: Express.Multer.File,
  ): Promise<NoticiaImagenDto> {
    if (!file?.buffer) {
      throw new AppError(400, 'Imagen requerida');
    }
    const current = await prisma.noticia.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!current) {
      throw new AppError(404, 'Noticia no encontrada');
    }

    const count = await prisma.noticiaImagen.count({ where: { noticiaId: id } });
    if (count >= MAX_GALERIA_IMAGENES) {
      throw new AppError(
        400,
        `La galería admite un máximo de ${MAX_GALERIA_IMAGENES} imágenes`,
      );
    }

    const detectedMime = assertAllowedUploadContent(file.buffer, 'noticia');

    const storage = getStorageAdapter();
    const uploaded = await storage.uploadImagenNoticia({
      buffer: file.buffer,
      mimeType: detectedMime,
      noticiaId: id,
    });

    try {
      const img = await prisma.noticiaImagen.create({
        data: {
          noticiaId: id,
          url: uploaded.url,
          orden: count,
          mimeType: uploaded.mimeType,
          tamanoBytes: uploaded.tamanoBytes,
        },
      });

      return toNoticiaImagenDto(img);
    } catch (error) {
      await compensateUploadFailure({
        category: 'noticias',
        resourceId: id,
        cleanup: () => storage.deleteImagenNoticia(uploaded.url),
      });
      throw error;
    }
  },

  async removeImagenGaleria(id: number, imagenId: number): Promise<void> {
    const img = await prisma.noticiaImagen.findFirst({
      where: { id: imagenId, noticiaId: id },
    });
    if (!img) {
      throw new AppError(404, 'Imagen no encontrada');
    }

    const imageUrl = img.url;

    await prisma.noticiaImagen.delete({ where: { id: imagenId } });

    const storage = getStorageAdapter();
    await cleanupBestEffort({
      operation: 'cleanup_after_db_delete',
      category: 'noticias',
      resourceId: id,
      cleanup: () => storage.deleteImagenNoticia(imageUrl),
    });
  },

  async reorderImagenesGaleria(id: number, orden: number[]): Promise<NewsAdminDto> {
    const current = await prisma.noticiaImagen.findMany({
      where: { noticiaId: id },
      select: { id: true },
    });
    if (current.length === 0) {
      throw new AppError(404, 'Noticia sin imágenes de galería');
    }

    const currentIds = new Set(current.map((img) => img.id));
    const receivedIds = new Set(orden);
    const sameSet =
      currentIds.size === receivedIds.size &&
      [...currentIds].every((imgId) => receivedIds.has(imgId));
    if (!sameSet) {
      throw new AppError(400, 'El orden debe incluir exactamente las imágenes actuales de la galería');
    }

    await prisma.$transaction(
      orden.map((imagenId, index) =>
        prisma.noticiaImagen.update({ where: { id: imagenId }, data: { orden: index } }),
      ),
    );

    const row = await prisma.noticia.findUniqueOrThrow({
      where: { id },
      include: { imagenes: { orderBy: galeriaOrderBy } },
    });
    const { imagenes, ...noticia } = row;
    return toNewsAdminDto(noticia, imagenes);
  },

  async listPublicNews(query: ListNewsPagedQuery): Promise<NewsPublicDto[]> {
    const { skip, take } = resolvePagination(query, 6);

    const rows = await prisma.noticia.findMany({
      where: {
        publicada: true,
        visibilidad: 'PUBLICA',
      },
      orderBy: [{ publicadaEn: 'desc' }, { updatedAt: 'desc' }],
      skip,
      take,
    });

    // Listados (cards) no incluyen galería: solo portada.
    return rows.map((row) => toNewsPublicDto(row));
  },

  async getPublicNewsBySlug(slug: string): Promise<NewsPublicDto | null> {
    const row = await prisma.noticia.findFirst({
      where: {
        slug,
        publicada: true,
        visibilidad: 'PUBLICA',
      },
      include: { imagenes: { orderBy: galeriaOrderBy } },
    });

    if (!row) return null;
    const { imagenes, ...noticia } = row;
    return toNewsPublicDto(noticia, imagenes);
  },

  async listIntranetNews(query: ListNewsPagedQuery): Promise<NewsPublicDto[]> {
    const { skip, take } = resolvePagination(query, 6);

    // Audiencia interna: distinta del listado público aunque comparte el mismo DTO de lectura.
    const rows = await prisma.noticia.findMany({
      where: {
        publicada: true,
        visibilidad: 'INTERNA',
      },
      orderBy: [{ publicadaEn: 'desc' }, { updatedAt: 'desc' }],
      skip,
      take,
    });

    // Listados (cards) no incluyen galería: solo portada.
    return rows.map((row) => toNewsPublicDto(row));
  },
};
