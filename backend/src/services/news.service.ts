import { Prisma, type CategoriaNoticia, type Noticia, type Visibilidad } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { ensureUniqueNewsSlug, slugifyTitulo } from '../lib/newsSlug.js';
import { prisma } from '../lib/prisma.js';

export type NewsAdminDto = {
  id: number;
  titulo: string;
  slug: string;
  descripcion: string | null;
  contenido: string;
  categoria: CategoriaNoticia;
  imagenUrl: string | null;
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
  imagenUrl?: string | null;
  publicada?: boolean;
};

export type UpdateNewsInput = Partial<CreateNewsInput>;

function toNewsAdminDto(row: Noticia): NewsAdminDto {
  return {
    id: row.id,
    titulo: row.titulo,
    slug: row.slug,
    descripcion: row.descripcion,
    contenido: row.contenido,
    categoria: row.categoria,
    imagenUrl: row.imagenUrl,
    publicada: row.publicada,
    publicadaEn: row.publicadaEn,
    visibilidad: row.visibilidad,
    autorId: row.autorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toNewsPublicDto(row: Noticia): NewsPublicDto {
  return {
    slug: row.slug,
    titulo: row.titulo,
    descripcion: row.descripcion,
    contenido: row.contenido,
    categoria: row.categoria,
    imagenUrl: row.imagenUrl,
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

    return rows.map(toNewsAdminDto);
  },

  async getAdminNewsById(id: number): Promise<NewsAdminDto | null> {
    const row = await prisma.noticia.findUnique({ where: { id } });
    return row ? toNewsAdminDto(row) : null;
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
        imagenUrl: input.imagenUrl ?? null,
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
    if (input.imagenUrl !== undefined) data.imagenUrl = input.imagenUrl;

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
    });

    return toNewsAdminDto(row);
  },

  async deleteNews(id: number): Promise<void> {
    const current = await prisma.noticia.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!current) {
      throw new AppError(404, 'Noticia no encontrada');
    }

    await prisma.noticia.delete({ where: { id } });
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

    return rows.map(toNewsPublicDto);
  },

  async getPublicNewsBySlug(slug: string): Promise<NewsPublicDto | null> {
    const row = await prisma.noticia.findFirst({
      where: {
        slug,
        publicada: true,
        visibilidad: 'PUBLICA',
      },
    });

    return row ? toNewsPublicDto(row) : null;
  },

  async listIntranetNews(query: ListNewsPagedQuery): Promise<NewsPublicDto[]> {
    const { skip, take } = resolvePagination(query, 6);

    const rows = await prisma.noticia.findMany({
      where: {
        publicada: true,
        visibilidad: 'INTERNA',
      },
      orderBy: [{ publicadaEn: 'desc' }, { updatedAt: 'desc' }],
      skip,
      take,
    });

    return rows.map(toNewsPublicDto);
  },
};
