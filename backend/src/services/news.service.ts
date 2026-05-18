import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import type { NewsCreateInput, NewsUpdateInput } from '../validations/news.schema.js';

export const newsService = {
  /**
   * Crea una nueva noticia
   */
  async createNews(data: NewsCreateInput, autorId: number) {
    // Verificar que el slug sea único
    const existingSlug = await prisma.noticia.findUnique({
      where: { slug: data.slug },
    });

    if (existingSlug) {
      throw new AppError(400, 'El slug ya existe');
    }

    return await prisma.noticia.create({
      data: {
        ...data,
        autorId,
        publicadaEn: data.publicada ? new Date() : null,
      },
      select: {
        id: true,
        titulo: true,
        slug: true,
        descripcion: true,
        imagenUrl: true,
        publicada: true,
        visibilidad: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Obtiene todas las noticias con filtros y paginación
   */
  async getNews(
    skip: number = 0,
    take: number = 20,
    filters: Record<string, any> = {},
  ) {
    const [noticias, total] = await Promise.all([
      prisma.noticia.findMany({
        skip,
        take,
        where: filters,
        orderBy: { publicadaEn: 'desc' },
        select: {
          id: true,
          titulo: true,
          slug: true,
          descripcion: true,
          imagenUrl: true,
          publicada: true,
          visibilidad: true,
          autor: {
            select: { id: true, usuario: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.noticia.count({ where: filters }),
    ]);

    return {
      noticias,
      total,
      pagina: Math.floor(skip / take) + 1,
      totalPaginas: Math.ceil(total / take),
    };
  },

  /**
   * Obtiene una noticia por ID
   */
  async getNewsById(id: number) {
    return await prisma.noticia.findUnique({
      where: { id },
      include: {
        autor: {
          select: { id: true, usuario: true },
        },
      },
    });
  },

  /**
   * Obtiene una noticia por slug
   */
  async getNewsBySlug(slug: string) {
    return await prisma.noticia.findUnique({
      where: { slug },
      include: {
        autor: {
          select: { id: true, usuario: true },
        },
      },
    });
  },

  /**
   * Actualiza una noticia
   */
  async updateNews(id: number, data: NewsUpdateInput) {
    const noticia = await prisma.noticia.findUnique({ where: { id } });
    if (!noticia) {
      throw new AppError(404, 'Noticia no encontrada');
    }

    // Si cambia el slug, verificar que sea único
    if (data.slug && data.slug !== noticia.slug) {
      const existingSlug = await prisma.noticia.findUnique({
        where: { slug: data.slug },
      });
      if (existingSlug) {
        throw new AppError(400, 'El slug ya existe');
      }
    }

    return await prisma.noticia.update({
      where: { id },
      data: {
        ...data,
        publicadaEn: data.publicada && !noticia.publicada ? new Date() : undefined,
      },
      select: {
        id: true,
        titulo: true,
        slug: true,
        descripcion: true,
        imagenUrl: true,
        publicada: true,
        visibilidad: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Elimina una noticia
   */
  async deleteNews(id: number) {
    const noticia = await prisma.noticia.findUnique({ where: { id } });
    if (!noticia) {
      throw new AppError(404, 'Noticia no encontrada');
    }

    return await prisma.noticia.delete({
      where: { id },
      select: { id: true },
    });
  },

  /**
   * Publica una noticia
   */
  async publishNews(id: number) {
    return await prisma.noticia.update({
      where: { id },
      data: {
        publicada: true,
        publicadaEn: new Date(),
      },
      select: {
        id: true,
        publicada: true,
        publicadaEn: true,
      },
    });
  },

  /**
   * Despublica una noticia
   */
  async unpublishNews(id: number) {
    return await prisma.noticia.update({
      where: { id },
      data: {
        publicada: false,
      },
      select: {
        id: true,
        publicada: true,
      },
    });
  },
};
