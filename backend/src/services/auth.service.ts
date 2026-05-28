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
      decoded.exp !== undefined ? new Date(decoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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

    const accessPayload: JWTPayload = {
      sub: payload.sub,
      role: payload.role,
    };
    const accessOpts: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };
    const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, accessOpts);

    return { accessToken };
  },

  async logout(userSub: string, refreshToken: string) {
    const env = getEnv();
    let payload: jwt.JwtPayload & { sub?: string; typ?: string };
    try {
      payload = jwt.verify(refreshToken, env.REFRESH_SECRET) as typeof payload;
    } catch {
      throw new AppError(401, 'Refresh token inválido o expirado');
    }

    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new AppError(401, 'Refresh token inválido');
    }

    if (payload.sub !== userSub) {
      throw new AppError(403, 'El refresh token no corresponde a la sesión');
    }

    const tokenHash = hashToken(refreshToken);
    const session = await prisma.sesionToken.findUnique({
      where: { tokenHash },
    });

    if (!session || session.usuarioId !== Number(userSub)) {
      throw new AppError(401, 'Sesión no encontrada o ya revocada');
    }

    await prisma.sesionToken.delete({ where: { id: session.id } });
  },
};
