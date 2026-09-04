import type { Rol, Usuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import { loadEnv } from '../config/env.js';
import type { JWTPayload } from '../types/jwt.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getEnv() {
  return loadEnv();
}

export type AuthUserPublic = Pick<Usuario, 'id' | 'usuario' | 'rol'> & {
  slug: string | null;
};

export const authService = {
  async login(usuario: string, password: string) {
    const env = getEnv();
    const user = await prisma.usuario.findUnique({
      where: { usuario },
      include: { productor: { select: { slug: true } } },
    });

    if (!user) {
      throw new AppError(401, 'Credenciales inválidas');
    }
    if (!user.activo) {
      throw new AppError(403, 'Cuenta desactivada');
    }
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new AppError(401, 'Credenciales inválidas');
    }

    await prisma.usuario.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessPayload: JWTPayload = {
      sub: String(user.id),
      role: user.rol,
      ver: user.tokenVersion,
    };
    const accessOpts: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };
    const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, accessOpts);

    const refreshPayload = {
      sub: String(user.id),
      role: user.rol as Rol,
      typ: 'refresh' as const,
      /** Evita colisión de JWT (mismo iat en el mismo segundo) y de `token_hash` en BD. */
      jti: randomUUID(),
    };
    const refreshOpts: SignOptions = {
      expiresIn: env.REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    };
    const refreshToken = jwt.sign(refreshPayload, env.REFRESH_SECRET, refreshOpts);

    const decoded = jwt.decode(refreshToken) as jwt.JwtPayload;
    const expiresAt =
      decoded.exp !== undefined
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.sesionToken.create({
      data: {
        usuarioId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        usuario: user.usuario,
        rol: user.rol,
        slug: user.productor?.slug ?? null,
      },
    };
  },

  async refresh(refreshToken: string) {
    const env = getEnv();
    let payload: jwt.JwtPayload & { sub?: string; role?: Rol; typ?: string };
    try {
      payload = jwt.verify(refreshToken, env.REFRESH_SECRET) as typeof payload;
    } catch {
      throw new AppError(401, 'Refresh token inválido o expirado');
    }

    if (payload.typ !== 'refresh' || !payload.sub || !payload.role) {
      throw new AppError(401, 'Refresh token inválido');
    }

    const tokenHash = hashToken(refreshToken);
    const session = await prisma.sesionToken.findUnique({
      where: { tokenHash },
      include: {
        usuario: {
          select: {
            id: true,
            usuario: true,
            rol: true,
            activo: true,
            tokenVersion: true,
            productor: { select: { slug: true } },
          },
        },
      },
    });

    if (!session) {
      throw new AppError(401, 'Sesión no encontrada o revocada');
    }

    if (session.expiresAt < new Date()) {
      await prisma.sesionToken.delete({ where: { id: session.id } }).catch(() => undefined);
      throw new AppError(401, 'Refresh token expirado');
    }

    if (session.usuarioId !== Number(payload.sub)) {
      throw new AppError(401, 'Refresh token inválido');
    }
    if (!session.usuario.activo) {
      await prisma.sesionToken.deleteMany({ where: { usuarioId: session.usuarioId } });
      throw new AppError(401, 'Cuenta desactivada');
    }

    const accessPayload: JWTPayload = {
      sub: payload.sub,
      role: session.usuario.rol,
      ver: session.usuario.tokenVersion,
    };
    const accessOpts: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };
    const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, accessOpts);

    return {
      accessToken,
      user: {
        id: session.usuario.id,
        usuario: session.usuario.usuario,
        rol: session.usuario.rol,
        slug: session.usuario.productor?.slug ?? null,
      },
    };
  },

  /**
   * Revoca a lo sumo la sesión cuyo hash coincide con este refresh.
   * Valida firma y `typ` con `ignoreExpiration: true` antes de tocar BD:
   * tokens arbitrarios no deben provocar `deleteMany`. Un refresh legítimo
   * expirado sigue pasando la validación y puede eliminar su hash persistido.
   * Cero coincidencias es éxito (`deleteMany`).
   */
  async logout(refreshToken: string) {
    const env = getEnv();
    let payload: jwt.JwtPayload & { typ?: string };
    try {
      payload = jwt.verify(refreshToken, env.REFRESH_SECRET, {
        ignoreExpiration: true,
      }) as typeof payload;
    } catch {
      return;
    }

    if (payload.typ !== 'refresh') {
      return;
    }

    const tokenHash = hashToken(refreshToken);
    await prisma.sesionToken.deleteMany({ where: { tokenHash } });
  },

  /** Cambio self-service: el usuario autenticado cambia su propia contraseña. */
  async changeMyPassword(
    usuarioId: number,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    const user = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    const currentOk = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!currentOk) {
      // 400 (no 401): el token sigue siendo válido; el interceptor axios no debe forzar logout.
      throw new AppError(400, 'Contraseña actual incorrecta');
    }

    if (input.newPassword === input.currentPassword) {
      throw new AppError(400, 'La nueva contraseña debe ser distinta de la actual');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: usuarioId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      }),
      prisma.sesionToken.deleteMany({ where: { usuarioId } }),
    ]);
  },
};
