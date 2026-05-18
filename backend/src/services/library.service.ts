import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import type { BibliotecaCreateInput, RamoCreateInput, RecursoCreateInput } from '../validations/library.schema.js';

export const libraryService = {
  // ============ BIBLIOTECAS ============

  async createBiblioteca(data: BibliotecaCreateInput) {
    return await prisma.biblioteca.create({
      data,
      include: { ramos: true },
    });
  },

  async getBibliotecas() {
    return await prisma.biblioteca.findMany({
      include: {
        ramos: {
          orderBy: { orden: 'asc' },
          include: {
            recursos: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  },

  async getBibliotecaById(id: number) {
    return await prisma.biblioteca.findUnique({
      where: { id },
      include: {
        ramos: {
          orderBy: { orden: 'asc' },
          include: {
            recursos: true,
          },
        },
      },
    });
  },

  async updateBiblioteca(id: number, data: Partial<BibliotecaCreateInput>) {
    const biblioteca = await prisma.biblioteca.findUnique({ where: { id } });
    if (!biblioteca) {
      throw new AppError(404, 'Biblioteca no encontrada');
    }

    return await prisma.biblioteca.update({
      where: { id },
      data,
      include: { ramos: true },
    });
  },

  async deleteBiblioteca(id: number) {
    const biblioteca = await prisma.biblioteca.findUnique({ where: { id } });
    if (!biblioteca) {
      throw new AppError(404, 'Biblioteca no encontrada');
    }

    return await prisma.biblioteca.delete({
      where: { id },
    });
  },

  // ============ RAMOS ============

  async createRamo(data: RamoCreateInput) {
    const biblioteca = await prisma.biblioteca.findUnique({
      where: { id: data.bibliotecaId },
    });
    if (!biblioteca) {
      throw new AppError(404, 'Biblioteca no encontrada');
    }

    return await prisma.ramo.create({
      data,
      include: {
        biblioteca: true,
        recursos: true,
      },
    });
  },

  async getRamoById(id: number) {
    return await prisma.ramo.findUnique({
      where: { id },
      include: {
        biblioteca: true,
        recursos: true,
      },
    });
  },

  async updateRamo(id: number, data: Partial<RamoCreateInput>) {
    const ramo = await prisma.ramo.findUnique({ where: { id } });
    if (!ramo) {
      throw new AppError(404, 'Ramo no encontrado');
    }

    return await prisma.ramo.update({
      where: { id },
      data,
      include: {
        recursos: true,
      },
    });
  },

  async deleteRamo(id: number) {
    const ramo = await prisma.ramo.findUnique({ where: { id } });
    if (!ramo) {
      throw new AppError(404, 'Ramo no encontrado');
    }

    return await prisma.ramo.delete({
      where: { id },
    });
  },

  // ============ RECURSOS ============

  async createRecurso(data: RecursoCreateInput, usuarioId: number) {
    const ramo = await prisma.ramo.findUnique({ where: { id: data.ramoId } });
    if (!ramo) {
      throw new AppError(404, 'Ramo no encontrado');
    }

    return await prisma.recurso.create({
      data: {
        ...data,
        subidoPorId: usuarioId,
      },
      include: {
        ramo: true,
        subidoPor: {
          select: { usuario: true },
        },
      },
    });
  },

  async getRecursoById(id: number) {
    return await prisma.recurso.findUnique({
      where: { id },
      include: {
        ramo: {
          include: { biblioteca: true },
        },
        subidoPor: {
          select: { usuario: true },
        },
      },
    });
  },

  async updateRecurso(id: number, data: { url?: string }) {
    const recurso = await prisma.recurso.findUnique({ where: { id } });
    if (!recurso) {
      throw new AppError(404, 'Recurso no encontrado');
    }

    return await prisma.recurso.update({
      where: { id },
      data,
      include: {
        ramo: true,
        subidoPor: {
          select: { usuario: true },
        },
      },
    });
  },

  async deleteRecurso(id: number) {
    const recurso = await prisma.recurso.findUnique({ where: { id } });
    if (!recurso) {
      throw new AppError(404, 'Recurso no encontrado');
    }

    return await prisma.recurso.delete({
      where: { id },
    });
  },
};
