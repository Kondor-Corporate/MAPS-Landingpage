import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import type { ProducerCreateInput, ProducerUpdateInput, RedSocialInput } from '../validations/producer.schema.js';

export const producersService = {
  /**
   * Crea un nuevo productor
   */
  async createProducer(data: ProducerCreateInput, usuarioId: number) {
    // Verificar que el slug sea único
    const existingSlug = await prisma.productor.findUnique({
      where: { slug: data.slug },
    });

    if (existingSlug) {
      throw new AppError(400, 'El slug ya existe');
    }

    return await prisma.productor.create({
      data: {
        ...data,
        usuarioId,
      },
      include: {
        redesSociales: true,
      },
    });
  },

  /**
   * Obtiene todos los productores con paginación
   */
  async getProducers(skip: number = 0, take: number = 20, filters: Record<string, any> = {}) {
    const [productores, total] = await Promise.all([
      prisma.productor.findMany({
        skip,
        take,
        where: filters,
        orderBy: { nombre: 'asc' },
        include: {
          usuario: {
            select: { usuario: true, rol: true, activo: true },
          },
          redesSociales: {
            orderBy: { orden: 'asc' },
          },
        },
      }),
      prisma.productor.count({ where: filters }),
    ]);

    return {
      productores,
      total,
      pagina: Math.floor(skip / take) + 1,
      totalPaginas: Math.ceil(total / take),
    };
  },

  /**
   * Obtiene un productor por ID
   */
  async getProducerById(id: number) {
    return await prisma.productor.findUnique({
      where: { id },
      include: {
        usuario: {
          select: { usuario: true, rol: true },
        },
        redesSociales: {
          orderBy: { orden: 'asc' },
        },
      },
    });
  },

  /**
   * Obtiene un productor por slug
   */
  async getProducerBySlug(slug: string) {
    return await prisma.productor.findUnique({
      where: { slug },
      include: {
        usuario: {
          select: { usuario: true },
        },
        redesSociales: {
          orderBy: { orden: 'asc' },
        },
      },
    });
  },

  /**
   * Actualiza un productor
   */
  async updateProducer(id: number, data: ProducerUpdateInput) {
    const productor = await prisma.productor.findUnique({ where: { id } });
    if (!productor) {
      throw new AppError(404, 'Productor no encontrado');
    }

    // Si cambia el slug, verificar que sea único
    if (data.slug && data.slug !== productor.slug) {
      const existingSlug = await prisma.productor.findUnique({
        where: { slug: data.slug },
      });
      if (existingSlug) {
        throw new AppError(400, 'El slug ya existe');
      }
    }

    return await prisma.productor.update({
      where: { id },
      data,
      include: {
        redesSociales: true,
      },
    });
  },

  /**
   * Elimina un productor
   */
  async deleteProducer(id: number) {
    const productor = await prisma.productor.findUnique({ where: { id } });
    if (!productor) {
      throw new AppError(404, 'Productor no encontrado');
    }

    return await prisma.productor.delete({
      where: { id },
      select: { id: true },
    });
  },

  /**
   * Obtiene los productores activos (para el directorio público)
   */
  async getActiveProducers(skip: number = 0, take: number = 20) {
    const [productores, total] = await Promise.all([
      prisma.productor.findMany({
        skip,
        take,
        where: {
          usuario: {
            activo: true,
          },
        },
        orderBy: { nombre: 'asc' },
        include: {
          usuario: {
            select: { usuario: true },
          },
          redesSociales: {
            orderBy: { orden: 'asc' },
          },
        },
      }),
      prisma.productor.count({
        where: {
          usuario: {
            activo: true,
          },
        },
      }),
    ]);

    return {
      productores,
      total,
      pagina: Math.floor(skip / take) + 1,
      totalPaginas: Math.ceil(total / take),
    };
  },

  /**
   * Agrega una red social a un productor
   */
  async addRedSocial(productorId: number, data: RedSocialInput) {
    const productor = await prisma.productor.findUnique({ where: { id: productorId } });
    if (!productor) {
      throw new AppError(404, 'Productor no encontrado');
    }

    return await prisma.redSocial.create({
      data: {
        ...data,
        productorId,
      },
    });
  },

  /**
   * Actualiza una red social
   */
  async updateRedSocial(redSocialId: number, data: Partial<RedSocialInput>) {
    const redSocial = await prisma.redSocial.findUnique({ where: { id: redSocialId } });
    if (!redSocial) {
      throw new AppError(404, 'Red social no encontrada');
    }

    return await prisma.redSocial.update({
      where: { id: redSocialId },
      data,
    });
  },

  /**
   * Elimina una red social
   */
  async deleteRedSocial(redSocialId: number) {
    return await prisma.redSocial.delete({
      where: { id: redSocialId },
      select: { id: true },
    });
  },
};
