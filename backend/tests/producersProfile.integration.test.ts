import { describe, it, expect, beforeAll, vi } from 'vitest';

import request from 'supertest';

import { createApp } from '../src/app.js';

import { loadEnv } from '../src/config/env.js';
import { getStorageAdapter } from '../src/lib/storage/index.js';
import {
  JPEG_SIGNATURE_FIXTURE,
  PDF_SIGNATURE_FIXTURE,
  PNG_1x1,
  UPLOAD_GARBAGE,
  WEBP_SIGNATURE_FIXTURE,
} from './helpers/binaryFixtures.js';



const BASE = '/api/v1';

const AUTH = `${BASE}/auth`;

const PRODUCERS = `${BASE}/producers`;



async function loginProductor(agent: ReturnType<typeof request.agent>) {

  const res = await agent

    .post(`${AUTH}/login`)

    .send({ usuario: 'user', password: 'User1234!' })

    .expect(200);

  return res.body.data.accessToken as string;

}



async function loginAdmin(agent: ReturnType<typeof request.agent>) {

  const res = await agent

    .post(`${AUTH}/login`)

    .send({ usuario: 'admin', password: 'Admin1234!' })

    .expect(200);

  return res.body.data.accessToken as string;

}



describe('producers profile API (MAPS-013)', () => {

  const app = createApp();



  beforeAll(() => {

    loadEnv();

  });



  it('GET /producers/me — productor autenticado devuelve perfil', async () => {

    const agent = request.agent(app);

    const token = await loginProductor(agent);



    const res = await agent

      .get(`${PRODUCERS}/me`)

      .set('Authorization', `Bearer ${token}`)

      .expect(200);



    expect(res.body.data.profile).toMatchObject({

      slug: 'carlos-rodriguez',

      nombre: 'Carlos',

      verificado: true,

      matricula: '78429',

    });

    expect(res.body.data.profile.email).toBeTruthy();

    expect(Array.isArray(res.body.data.profile.especialidades)).toBe(true);

    expect(res.body.data.profile.especialidades.length).toBeGreaterThan(0);

    expect(Array.isArray(res.body.data.profile.certificaciones)).toBe(true);

    expect(res.body.data.profile.certificaciones.length).toBeGreaterThanOrEqual(2);

  });



  it('GET /producers/me — sin token → 401', async () => {

    await request(app).get(`${PRODUCERS}/me`).expect(401);

  });



  it('PATCH /producers/me — actualiza bio', async () => {

    const agent = request.agent(app);

    const token = await loginProductor(agent);

    const nuevaBio = 'Trayectoria actualizada en test MAPS-013.';



    await agent

      .patch(`${PRODUCERS}/me`)

      .set('Authorization', `Bearer ${token}`)

      .send({ bio: nuevaBio })

      .expect(200);



    const res = await agent

      .get(`${PRODUCERS}/me`)

      .set('Authorization', `Bearer ${token}`)

      .expect(200);



    expect(res.body.data.profile.bio).toBe(nuevaBio);



    await agent

      .patch(`${PRODUCERS}/me`)

      .set('Authorization', `Bearer ${token}`)

      .send({

        bio: 'Productor de seguros con más de 15 años de experiencia asesorando familias y empresas en Madrid y alrededores. Especializado en soluciones integrales de protección patrimonial y riesgos empresariales.',

      })

      .expect(200);

  });



  it('PATCH /producers/me — actualiza dirección y coordenadas manuales', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);
    const direccion = 'Diagonal 75 172, La Plata, Buenos Aires, Argentina';

    const res = await agent
      .patch(`${PRODUCERS}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        direccion,
        ciudad: direccion,
        latitud: -34.91234,
        longitud: -57.98765,
      })
      .expect(200);

    expect(res.body.data.profile).toMatchObject({
      direccion,
      ciudad: direccion,
      latitud: -34.91234,
      longitud: -57.98765,
    });

    await agent
      .patch(`${PRODUCERS}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        direccion: 'Calle 7 776, La Plata, Buenos Aires, Argentina',
        ciudad: 'Calle 7 776, La Plata, Buenos Aires, Argentina',
        latitud: -34.9214,
        longitud: -57.9545,
      })
      .expect(200);
  });

  it('PATCH /producers/me — solo latitud → 400 y no persiste coords parciales', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    const before = await agent
      .get(`${PRODUCERS}/me`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const prevLat = before.body.data.profile.latitud;
    const prevLng = before.body.data.profile.longitud;

    const res = await agent
      .patch(`${PRODUCERS}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ latitud: -34.9 })
      .expect(400);

    expect(res.body.message).toBe('Latitud y longitud deben enviarse juntas');

    const after = await agent
      .get(`${PRODUCERS}/me`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(after.body.data.profile.latitud).toBe(prevLat);
    expect(after.body.data.profile.longitud).toBe(prevLng);
  });

  it('PATCH /producers/me — campos admin-only rechazados', async () => {

    const agent = request.agent(app);

    const token = await loginProductor(agent);



    await agent

      .patch(`${PRODUCERS}/me`)

      .set('Authorization', `Bearer ${token}`)

      .send({ matricula: '99999' })

      .expect(422);

  });



  it('GET /producers/by-slug/:slug — público sin email', async () => {

    const res = await request(app)

      .get(`${PRODUCERS}/by-slug/carlos-rodriguez`)

      .expect(200);



    expect(res.body.data.profile).toMatchObject({

      slug: 'carlos-rodriguez',

      nombre: 'Carlos',

    });

    expect(res.body.data.profile).not.toHaveProperty('email');

    expect(res.body.data.profile).not.toHaveProperty('id');

    expect(Array.isArray(res.body.data.profile.certificaciones)).toBe(true);

  });



  it('GET /producers/by-slug/inexistente — 404', async () => {

    await request(app)

      .get(`${PRODUCERS}/by-slug/slug-que-no-existe-xyz`)

      .expect(404);

  });



  it('GET /producers/me — admin no autorizado → 403', async () => {

    const agent = request.agent(app);

    const token = await loginAdmin(agent);



    await agent

      .get(`${PRODUCERS}/me`)

      .set('Authorization', `Bearer ${token}`)

      .expect(403);

  });

});



describe('producers admin profile API (MAPS-013 Fase 2)', () => {

  const app = createApp();



  beforeAll(() => {

    loadEnv();

  });



  it('PATCH /producers/:id — admin setea matricula, verificado y stats', async () => {

    const agent = request.agent(app);

    const adminToken = await loginAdmin(agent);



    const list = await agent

      .get(`${PRODUCERS}`)

      .set('Authorization', `Bearer ${adminToken}`)

      .expect(200);



    const carlos = list.body.data.find(

      (p: { slug: string }) => p.slug === 'carlos-rodriguez',

    );

    expect(carlos).toBeTruthy();



    await agent

      .patch(`${PRODUCERS}/${carlos.id}`)

      .set('Authorization', `Bearer ${adminToken}`)

      .send({

        matricula: '78429',

        verificado: true,

        anosExperiencia: 16,

        clientesActivos: 510,

        tituloProfesional: 'Productor de Seguros Senior',

      })

      .expect(200);



    const productorAgent = request.agent(app);

    const productorToken = await loginProductor(productorAgent);

    const me = await productorAgent

      .get(`${PRODUCERS}/me`)

      .set('Authorization', `Bearer ${productorToken}`)

      .expect(200);



    expect(me.body.data.profile).toMatchObject({

      matricula: '78429',

      verificado: true,

      anosExperiencia: 16,

      clientesActivos: 510,

      tituloProfesional: 'Productor de Seguros Senior',

    });



    await agent

      .patch(`${PRODUCERS}/${carlos.id}`)

      .set('Authorization', `Bearer ${adminToken}`)

      .send({

        anosExperiencia: 15,

        clientesActivos: 500,

        tituloProfesional: 'Productor de Seguros',

      })

      .expect(200);

  });



  it('POST/DELETE certificaciones — productor sube y elimina PDF', async () => {

    const agent = request.agent(app);

    const token = await loginProductor(agent);



    const before = await agent

      .get(`${PRODUCERS}/me`)

      .set('Authorization', `Bearer ${token}`)

      .expect(200);

    const initialCount = before.body.data.profile.certificaciones.length;



    const upload = await agent

      .post(`${PRODUCERS}/me/certificaciones`)

      .set('Authorization', `Bearer ${token}`)

      .field('nombre', 'Certificado Test')

      .attach('file', PDF_SIGNATURE_FIXTURE, {

        filename: 'test-cert.pdf',

        contentType: 'application/pdf',

      })

      .expect(201);



    expect(upload.body.data.certificacion).toMatchObject({

      nombre: 'Certificado Test',

      mimeType: 'application/pdf',

    });

    expect(upload.body.data.certificacion.archivoUrl).toMatch(/\.pdf$/i);



    const afterUpload = await agent

      .get(`${PRODUCERS}/me`)

      .set('Authorization', `Bearer ${token}`)

      .expect(200);

    expect(afterUpload.body.data.profile.certificaciones.length).toBe(initialCount + 1);



    const certId = upload.body.data.certificacion.id as number;

    await agent

      .delete(`${PRODUCERS}/me/certificaciones/${certId}`)

      .set('Authorization', `Bearer ${token}`)

      .expect(200);



    const afterDelete = await agent

      .get(`${PRODUCERS}/me`)

      .set('Authorization', `Bearer ${token}`)

      .expect(200);

    expect(afterDelete.body.data.profile.certificaciones.length).toBe(initialCount);

  });

  it('POST certificaciones — rechaza una imagen con mensaje funcional', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    const res = await agent
      .post(`${PRODUCERS}/me/certificaciones`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-image'), {
        filename: 'certificacion.png',
        contentType: 'image/png',
      })
      .expect(400);

    expect(res.body.message).toBe('Solo se permiten archivos PDF');
  });

  it('POST certificaciones — informa el límite máximo de 10 MB', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    const res = await agent
      .post(`${PRODUCERS}/me/certificaciones`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.alloc(10 * 1024 * 1024 + 1), {
        filename: 'certificacion-grande.pdf',
        contentType: 'application/pdf',
      })
      .expect(413);

    expect(res.body.message).toBe('El archivo supera el tamaño máximo de 10 MB.');
  });

  it('POST certificaciones — basura declarada application/pdf → 400 D3A', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    const res = await agent
      .post(`${PRODUCERS}/me/certificaciones`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', UPLOAD_GARBAGE, {
        filename: 'certificacion.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);

    expect(res.body.message).toBe('El archivo no es un PDF válido');
  });

  it('POST certificaciones — PNG real declarado application/pdf → 400 D3A', async () => {
    const adapter = getStorageAdapter();
    const uploadSpy = vi.spyOn(adapter, 'uploadCertificacion');

    try {
      const agent = request.agent(app);
      const token = await loginProductor(agent);

      const res = await agent
        .post(`${PRODUCERS}/me/certificaciones`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', PNG_1x1, {
          filename: 'certificacion.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);

      expect(res.body.message).toBe('El archivo no es un PDF válido');
      expect(uploadSpy).not.toHaveBeenCalled();
    } finally {
      uploadSpy.mockRestore();
    }
  });

  it('POST /producers/:id/certificaciones — admin, basura declarada PDF → 400 D3A', async () => {
    const adapter = getStorageAdapter();
    const uploadSpy = vi.spyOn(adapter, 'uploadCertificacion');

    try {
      const agent = request.agent(app);
      const adminToken = await loginAdmin(agent);

      const list = await agent
        .get(`${PRODUCERS}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const carlos = list.body.data.find(
        (p: { slug: string }) => p.slug === 'carlos-rodriguez',
      );
      expect(carlos).toBeTruthy();

      const res = await agent
        .post(`${PRODUCERS}/${carlos.id}/certificaciones`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', UPLOAD_GARBAGE, {
          filename: 'admin-cert.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);

      expect(res.body.message).toBe('El archivo no es un PDF válido');
      expect(uploadSpy).not.toHaveBeenCalled();
    } finally {
      uploadSpy.mockRestore();
    }
  });

});

describe('POST /producers/me/foto (MAPS-016)', () => {
  const app = createApp();

  beforeAll(() => {
    loadEnv();
  });

  it('productor autenticado sube su foto de perfil', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    const res = await agent
      .post(`${PRODUCERS}/me/foto`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_1x1, { filename: 'avatar.png', contentType: 'image/png' })
      .expect(200);

    expect(res.body.data.profile.foto).toMatch(/\/uploads\/fotos\//);
    expect(res.body.data.profile.foto).toMatch(/\.png$/i);

    const me = await agent
      .get(`${PRODUCERS}/me`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body.data.profile.foto).toBe(res.body.data.profile.foto);
  });

  it('subir una segunda foto reemplaza la anterior', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    const first = await agent
      .post(`${PRODUCERS}/me/foto`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_1x1, { filename: 'avatar1.png', contentType: 'image/png' })
      .expect(200);

    const second = await agent
      .post(`${PRODUCERS}/me/foto`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_1x1, { filename: 'avatar2.png', contentType: 'image/png' })
      .expect(200);

    expect(second.body.data.profile.foto).not.toBe(first.body.data.profile.foto);
  });

  it('sin archivo → 400', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    await agent
      .post(`${PRODUCERS}/me/foto`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('mimetype no permitido (PDF) → 400', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    await agent
      .post(`${PRODUCERS}/me/foto`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'doc.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });

  it('archivo mayor a 5 MB → 413 con mensaje funcional', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    const res = await agent
      .post(`${PRODUCERS}/me/foto`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'avatar-grande.png',
        contentType: 'image/png',
      })
      .expect(413);

    expect(res.body.message).toBe('El archivo supera el tamaño máximo de 5 MB.');
  });

  it('admin no puede usar el endpoint self-service → 403', async () => {
    const agent = request.agent(app);
    const token = await loginAdmin(agent);

    await agent
      .post(`${PRODUCERS}/me/foto`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_1x1, { filename: 'avatar.png', contentType: 'image/png' })
      .expect(403);
  });

  it('sin token → 401', async () => {
    await request(app)
      .post(`${PRODUCERS}/me/foto`)
      .attach('file', PNG_1x1, { filename: 'avatar.png', contentType: 'image/png' })
      .expect(401);
  });

  it('D3A — fixture JPEG con firma válida → 200 y extensión .jpg', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    const res = await agent
      .post(`${PRODUCERS}/me/foto`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', JPEG_SIGNATURE_FIXTURE, {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    expect(res.body.data.profile.foto).toMatch(/\.jpg$/i);
  });

  it('D3A — fixture WebP con firma válida → 200 y extensión .webp', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    const res = await agent
      .post(`${PRODUCERS}/me/foto`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', WEBP_SIGNATURE_FIXTURE, {
        filename: 'avatar.webp',
        contentType: 'image/webp',
      })
      .expect(200);

    expect(res.body.data.profile.foto).toMatch(/\.webp$/i);
  });

  it('D3A — JPEG bytes declarados image/png → 200 y extensión .jpg', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    const res = await agent
      .post(`${PRODUCERS}/me/foto`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', JPEG_SIGNATURE_FIXTURE, {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(res.body.data.profile.foto).toMatch(/\.jpg$/i);
  });

  it('D3A — basura declarada image/png → 400', async () => {
    const agent = request.agent(app);
    const token = await loginProductor(agent);

    const res = await agent
      .post(`${PRODUCERS}/me/foto`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', UPLOAD_GARBAGE, {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(400);

    expect(res.body.message).toBe(
      'La foto debe ser un archivo JPG, PNG o WEBP válido',
    );
  });
});

describe('D3A — storage no invocado (productores)', () => {
  const app = createApp();

  beforeAll(() => {
    loadEnv();
  });

  it('certificación basura → uploadCertificacion no llamado', async () => {
    const adapter = getStorageAdapter();
    const uploadSpy = vi.spyOn(adapter, 'uploadCertificacion');

    try {
      const agent = request.agent(app);
      const token = await loginProductor(agent);

      await agent
        .post(`${PRODUCERS}/me/certificaciones`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', UPLOAD_GARBAGE, {
          filename: 'cert.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);

      expect(uploadSpy).not.toHaveBeenCalled();
    } finally {
      uploadSpy.mockRestore();
    }
  });

  it('foto basura → uploadFoto no llamado', async () => {
    const adapter = getStorageAdapter();
    const uploadSpy = vi.spyOn(adapter, 'uploadFoto');

    try {
      const agent = request.agent(app);
      const token = await loginProductor(agent);

      await agent
        .post(`${PRODUCERS}/me/foto`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', UPLOAD_GARBAGE, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(400);

      expect(uploadSpy).not.toHaveBeenCalled();
    } finally {
      uploadSpy.mockRestore();
    }
  });
});

