import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { Rol } from '@prisma/client';
import { z } from 'zod';
import { authorize } from '../src/middlewares/authorize.js';
import { validate } from '../src/middlewares/validate.js';
import { AppError } from '../src/lib/errors.js';
import {
  createProducerSchema,
  producerIdParamSchema,
} from '../src/validations/producer.schema.js';

function repeated<T>(count: number, value: T): T[] {
  return Array.from({ length: count }, () => value);
}

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
        password: 'Temporal123',
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
      password: 'Temporal123',
      ciudad: 'Calle 7 776, La Plata',
    });
  });

  it('array pequeño → pre-check y continúa en Zod', () => {
    const schema = z.object({
      orden: z.array(z.string().trim().min(1)),
    });
    const safeParse = vi.spyOn(schema, 'safeParse');
    const mw = validate({ body: schema });
    const input = { orden: ['  a ', 'b'] };
    const req = { body: input } as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(safeParse).toHaveBeenCalledTimes(1);
    expect(safeParse).toHaveBeenCalledWith(input);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.body).toEqual({ orden: ['a', 'b'] });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('array de exactamente 1000 elementos → no lo rechaza la barrera', () => {
    const schema = z.object({
      orden: z.array(z.string()),
    });
    const safeParse = vi.spyOn(schema, 'safeParse');
    const mw = validate({ body: schema });
    const orden = repeated(1000, 'a');
    const req = { body: { orden } } as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(safeParse).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.body).toEqual({ orden });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('array de 1001 elementos → 422 sin ejecutar safeParse', () => {
    const schema = z.object({
      orden: z.array(z.string()),
    });
    const safeParse = vi.spyOn(schema, 'safeParse');
    const mw = validate({ body: schema });
    const req = { body: { orden: repeated(1001, 'a') } } as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(safeParse).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      message: 'Datos de entrada inválidos',
      error: { formErrors: [], fieldErrors: {} },
    });
  });

  it('body que es un array de 1001 → 422 sin ejecutar safeParse', () => {
    const schema = z.array(z.string());
    const safeParse = vi.spyOn(schema, 'safeParse');
    const mw = validate({ body: schema });
    const req = { body: repeated(1001, 'x') } as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(safeParse).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      message: 'Datos de entrada inválidos',
      error: { formErrors: [], fieldErrors: {} },
    });
  });

  it('array anidado de 1001 → 422 sin ejecutar safeParse', () => {
    const schema = z.object({
      perfil: z.object({
        idiomas: z.array(z.string()),
      }),
    });
    const safeParse = vi.spyOn(schema, 'safeParse');
    const mw = validate({ body: schema });
    const req = {
      body: { perfil: { idiomas: repeated(1001, 'es') } },
    } as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(safeParse).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      message: 'Datos de entrada inválidos',
      error: { formErrors: [], fieldErrors: {} },
    });
  });

  it('array dentro de otro array de 1001 → 422 sin ejecutar safeParse', () => {
    const schema = z.object({
      grupos: z.array(z.array(z.string())),
    });
    const safeParse = vi.spyOn(schema, 'safeParse');
    const mw = validate({ body: schema });
    const req = { body: { grupos: [repeated(1001, 'x')] } } as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(safeParse).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('query con array pequeño → continúa en Zod', () => {
    const schema = z.object({
      ids: z.array(z.string()),
    });
    const safeParse = vi.spyOn(schema, 'safeParse');
    const mw = validate({ query: schema });
    const req = { query: { ids: ['1', '2'] } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(safeParse).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.query).toEqual({ ids: ['1', '2'] });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('query con array de 1001 → 422 sin ejecutar safeParse', () => {
    const schema = z.object({
      ids: z.array(z.string()),
    });
    const safeParse = vi.spyOn(schema, 'safeParse');
    const mw = validate({ query: schema });
    const req = { query: { ids: repeated(1001, '1') } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    mw(req, res, next);

    expect(safeParse).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      message: 'Datos de entrada inválidos',
      error: { formErrors: [], fieldErrors: {} },
    });
  });
});
