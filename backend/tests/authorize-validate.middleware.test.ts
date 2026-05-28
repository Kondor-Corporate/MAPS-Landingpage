import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { Rol } from '@prisma/client';
import { authorize } from '../src/middlewares/authorize.js';
import { validate } from '../src/middlewares/validate.js';
import { AppError } from '../src/lib/errors.js';
import {
  createProducerSchema,
  producerIdParamSchema,
} from '../src/validations/producer.schema.js';

function mockRes(): Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  res.status.mockReturnValue(res);
  return res;
}

describe('authorize', () => {
  it('sin req.user → next(AppError 401)', () => {
    const mw = authorize(Rol.ADMIN);
    const req = { user: undefined } as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ statusCode: 401, message: 'No autenticado' });
  });

  it('rol no permitido → next(AppError 403)', () => {
    const mw = authorize(Rol.ADMIN, Rol.SUPERADMIN);
    const req = { user: { sub: '1', role: Rol.PRODUCTOR } } as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ statusCode: 403, message: 'Acceso denegado' });
  });

  it('rol permitido → next() sin error', () => {
    const mw = authorize(Rol.ADMIN);
    const req = { user: { sub: '1', role: Rol.ADMIN } } as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });
});

describe('validate', () => {
  it('params inválidos → 422', () => {
    const mw = validate({ params: producerIdParamSchema });
    const req = { params: { id: 'abc' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Datos de entrada inválidos',
        error: expect.any(Object),
      }),
    );
  });

  it('body inválido → 422', () => {
    const mw = validate({ body: createProducerSchema });
    const req = { body: { nombre: '' } } as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Datos de entrada inválidos' }),
    );
  });

  it('body válido → next() y asigna body parseado', () => {
    const mw = validate({ body: createProducerSchema });
    const req = {
      body: {
        nombre: '  Ana ',
        apellido: ' Gómez ',
        email: ' ANA@EXAMPLE.COM ',
        ciudad: ' Calle 7 776, La Plata ',
      },
    } as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.body).toEqual({
      nombre: 'Ana',
      apellido: 'Gómez',
      email: 'ANA@EXAMPLE.COM',
      ciudad: 'Calle 7 776, La Plata',
    });
  });
});
