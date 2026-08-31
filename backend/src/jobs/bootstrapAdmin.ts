import { Rol, type PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { passwordSchema } from '../lib/passwordPolicy.js';

const bootstrapAdminSchema = z.object({
  BOOTSTRAP_ADMIN_EMAIL: z.string().trim().email(),
  BOOTSTRAP_ADMIN_PASSWORD: passwordSchema,
  BOOTSTRAP_ADMIN_FORCE: z.enum(['true', 'false']).optional().default('false'),
});

export type BootstrapAdminConfig = {
  email: string;
  password: string;
  force: boolean;
};

export type BootstrapAdminResult = {
  action: 'created' | 'unchanged' | 'updated';
};

export function parseBootstrapAdminConfig(raw: NodeJS.ProcessEnv): BootstrapAdminConfig {
  const parsed = bootstrapAdminSchema.safeParse(raw);
  if (!parsed.success) {
    const invalidFields = [
      ...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? 'unknown'))),
    ];
    throw new Error(`Configuración de bootstrap inválida: ${invalidFields.join(', ')}`);
  }

  return {
    email: parsed.data.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
    password: parsed.data.BOOTSTRAP_ADMIN_PASSWORD,
    force: parsed.data.BOOTSTRAP_ADMIN_FORCE === 'true',
  };
}

export async function bootstrapAdmin(
  prismaClient: PrismaClient,
  config: BootstrapAdminConfig,
): Promise<BootstrapAdminResult> {
  const existing = await prismaClient.usuario.findUnique({
    where: { usuario: config.email },
    select: { id: true, activo: true, rol: true },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(config.password, 12);
    await prismaClient.usuario.create({
      data: {
        usuario: config.email,
        passwordHash,
        rol: Rol.SUPERADMIN,
        activo: true,
      },
    });
    return { action: 'created' };
  }

  if (!config.force) {
    if (existing.activo && existing.rol === Rol.SUPERADMIN) {
      return { action: 'unchanged' };
    }
    throw new Error(
      'El usuario ya existe pero no es un administrador activo; use BOOTSTRAP_ADMIN_FORCE=true para corregirlo',
    );
  }

  const passwordHash = await bcrypt.hash(config.password, 12);
  await prismaClient.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        rol: Rol.SUPERADMIN,
        activo: true,
        tokenVersion: { increment: 1 },
      },
    });
    await tx.sesionToken.deleteMany({ where: { usuarioId: existing.id } });
  });

  return { action: 'updated' };
}
