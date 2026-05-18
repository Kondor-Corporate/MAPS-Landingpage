import { prisma } from '../lib/prisma.js';
import type { ContactInput } from '../validations/contact.schema.js';

export const contactService = {
  /**
   * Crea un nuevo mensaje de contacto
   */
  async createMessage(data: ContactInput) {
    return await prisma.contacto.create({
      data,
      select: {
        id: true,
        nombre: true,
        email: true,
        asunto: true,
        creadoEn: true,
      },
    });
  },

  /**
   * Obtiene mensajes de contacto con filtros y paginación
   */
  async getMessages(
    skip: number = 0,
    take: number = 20,
    filters: Record<string, any> = {},
  ) {
    const [mensajes, total] = await Promise.all([
      prisma.contacto.findMany({
        skip,
        take,
        where: filters,
        orderBy: { creadoEn: 'desc' },
        select: {
          id: true,
          nombre: true,
          email: true,
          asunto: true,
          leido: true,
          respondido: true,
          creadoEn: true,
        },
      }),
      prisma.contacto.count({ where: filters }),
    ]);

    return {
      mensajes,
      total,
      pagina: Math.floor(skip / take) + 1,
      totalPaginas: Math.ceil(total / take),
    };
  },

  /**
   * Obtiene un mensaje por ID
   */
  async getMessageById(id: number) {
    return await prisma.contacto.findUnique({
      where: { id },
    });
  },

  /**
   * Marca un mensaje como leído
   */
  async markAsRead(id: number) {
    return await prisma.contacto.update({
      where: { id },
      data: { leido: true },
      select: { id: true },
    });
  },

  /**
   * Marca un mensaje como respondido
   */
  async markAsResponded(id: number) {
    return await prisma.contacto.update({
      where: { id },
      data: { respondido: true },
      select: { id: true },
    });
  },

  /**
   * Elimina un mensaje
   */
  async deleteMessage(id: number) {
    return await prisma.contacto.delete({
      where: { id },
      select: { id: true },
    });
  },
};
