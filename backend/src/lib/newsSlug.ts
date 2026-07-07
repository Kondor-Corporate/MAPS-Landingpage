/**
 * Utilidades de slug para Noticias.
 * Genera identificadores URL-safe desde el título y garantiza unicidad en base de datos.
 */
import { AppError } from './errors.js';
import { prisma } from './prisma.js';

/** Slug URL-safe desde título (minúsculas, sin acentos, guiones). */
export function slugifyTitulo(titulo: string): string {
  const raw = titulo
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw.length > 0 ? raw.slice(0, 80) : 'noticia';
}

/** Reserva slug único: `base`, luego `base-2`, `base-3`, … */
export async function ensureUniqueNewsSlug(base: string, excludeId?: number): Promise<string> {
  const isTaken = async (slug: string): Promise<boolean> => {
    const row = await prisma.noticia.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!row) return false;
    if (excludeId !== undefined && row.id === excludeId) return false;
    return true;
  };

  if (!(await isTaken(base))) return base;

  for (let n = 2; n <= 200; n += 1) {
    const candidate = `${base}-${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  throw new AppError(500, 'No se pudo generar un slug único');
}
