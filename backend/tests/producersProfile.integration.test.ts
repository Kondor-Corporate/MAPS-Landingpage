import { describe, it, expect, beforeAll } from 'vitest';

import request from 'supertest';

import { createApp } from '../src/app.js';

import { loadEnv } from '../src/config/env.js';



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



    const pdfBuffer = Buffer.from('%PDF-1.4 test certificacion MAPS-013');

    const upload = await agent

      .post(`${PRODUCERS}/me/certificaciones`)

      .set('Authorization', `Bearer ${token}`)

      .field('nombre', 'Certificado Test')

      .attach('file', pdfBuffer, {

        filename: 'test-cert.pdf',

        contentType: 'application/pdf',

      })

      .expect(201);



    expect(upload.body.data.certificacion).toMatchObject({

      nombre: 'Certificado Test',

    });



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

});

