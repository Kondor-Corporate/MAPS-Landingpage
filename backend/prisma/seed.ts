import 'dotenv/config';

import bcrypt from 'bcryptjs';

import { PrismaClient, type RamoTipo, type Rol } from '@prisma/client';



const prisma = new PrismaClient();



const PLACEHOLDER_DRIVE = 'https://drive.google.com/drive/folders/EXAMPLE';

const BIBLIOTECA_ID = 1;



const seedUsers: { usuario: string; password: string; rol: Rol }[] = [

  { usuario: 'admin', password: 'Admin1234!', rol: 'ADMIN' },

  { usuario: 'superadmin', password: 'Super1234!', rol: 'SUPERADMIN' },

  { usuario: 'user', password: 'User1234!', rol: 'PRODUCTOR' },

];



type SeedProductor = {

  usuario: string;

  password: string;

  slug: string;

  nombre: string;

  apellido: string;

  bio: string;

  ciudad: string;

  latitud: number;

  longitud: number;

  telefono: string;

  matricula: string;

  tituloProfesional: string;

  anosExperiencia: number;

  clientesActivos: number;

  especialidades: string[];

  verificado?: boolean;

};



const seedProductores: SeedProductor[] = [

  {

    usuario: 'user',

    password: 'User1234!',

    slug: 'carlos-rodriguez',

    nombre: 'Carlos',

    apellido: 'A. Rodríguez',

    bio: 'Productor de seguros con más de 15 años de experiencia asesorando familias y empresas en La Plata y alrededores. Especializado en soluciones integrales de protección patrimonial y riesgos empresariales.',

    ciudad: 'Calle 7 776, La Plata, Buenos Aires, Argentina',

    latitud: -34.9214,

    longitud: -57.9545,

    telefono: '+54 221 555 0101',

    matricula: '78429',

    tituloProfesional: 'Productor de Seguros',

    anosExperiencia: 15,

    clientesActivos: 500,

    especialidades: [

      'salud-integral',

      'automotores',

      'riesgos-art',

      'hogar-pyme',

      'vida-ahorro',

      'viajero',

      'mascotas',

      'ciber-risk',

    ],

    verificado: true,

  },

  {

    usuario: 'maria.gonzalez',

    password: process.env.DEFAULT_PRODUCER_PASSWORD ?? 'Dev_DefaultProducer_12chars',

    slug: 'maria-gonzalez',

    nombre: 'María',

    apellido: 'González',

    bio: 'Asesora en seguros de personas y salud integral. Atiende clientes en el centro y norte de La Plata.',

    ciudad: 'Calle 50 1234, La Plata, Buenos Aires, Argentina',

    latitud: -34.9098,

    longitud: -57.9549,

    telefono: '+54 221 555 0102',

    matricula: '78430',

    tituloProfesional: 'Productora de Seguros',

    anosExperiencia: 8,

    clientesActivos: 220,

    especialidades: ['salud-integral', 'vida-ahorro', 'mascotas'],

    verificado: true,

  },

  {

    usuario: 'juan.perez',

    password: process.env.DEFAULT_PRODUCER_PASSWORD ?? 'Dev_DefaultProducer_12chars',

    slug: 'juan-perez',

    nombre: 'Juan',

    apellido: 'Pérez',

    bio: 'Especialista en riesgos industriales y ART para PyMEs de La Plata.',

    ciudad: 'Diagonal 74 320, La Plata, Buenos Aires, Argentina',

    latitud: -34.918,

    longitud: -57.962,

    telefono: '+54 221 555 0103',

    matricula: '78431',

    tituloProfesional: 'Productor de Seguros',

    anosExperiencia: 12,

    clientesActivos: 180,

    especialidades: ['riesgos-art', 'hogar-pyme', 'ciber-risk'],

  },

  {

    usuario: 'lucia.fernandez',

    password: process.env.DEFAULT_PRODUCER_PASSWORD ?? 'Dev_DefaultProducer_12chars',

    slug: 'lucia-fernandez',

    nombre: 'Lucía',

    apellido: 'Fernández',

    bio: 'Productora con foco en hogar, automotores y coberturas para familias en La Plata.',

    ciudad: 'Calle 12 890, La Plata, Buenos Aires, Argentina',

    latitud: -34.928,

    longitud: -57.948,

    telefono: '+54 221 555 0104',

    matricula: '78432',

    tituloProfesional: 'Productora de Seguros',

    anosExperiencia: 6,

    clientesActivos: 95,

    especialidades: ['automotores', 'hogar-pyme', 'viajero'],

  },

  {

    usuario: 'martin.lopez',

    password: process.env.DEFAULT_PRODUCER_PASSWORD ?? 'Dev_DefaultProducer_12chars',

    slug: 'martin-lopez',

    nombre: 'Martín',

    apellido: 'López',

    bio: 'Asesor comercial en La Plata con experiencia en flotas, comercio y seguros integrales.',

    ciudad: 'Av. 72 1500, La Plata, Buenos Aires, Argentina',

    latitud: -34.905,

    longitud: -57.97,

    telefono: '+54 221 555 0105',

    matricula: '78433',

    tituloProfesional: 'Productor de Seguros',

    anosExperiencia: 10,

    clientesActivos: 140,

    especialidades: ['automotores', 'hogar-pyme', 'salud-integral'],

  },

];



type SeedRamo = {

  nombre: string;

  descripcion: string;

  icono: string;

  tipo: RamoTipo;

  orden: number;

};



const seedRamos: SeedRamo[] = [

  {

    nombre: 'Automotores',

    descripcion: 'Condiciones, folletos de flota y material de auxilio mecánico.',

    icono: 'car',

    tipo: 'PRINCIPAL',

    orden: 1,

  },

  {

    nombre: 'Salud',

    descripcion: 'Planes prestacionales, cartillas médicas y red de farmacias.',

    icono: 'heart',

    tipo: 'PRINCIPAL',

    orden: 2,

  },

  {

    nombre: 'Incendio',

    descripcion: 'Coberturas para edificios, consorcios y plantas industriales.',

    icono: 'fire',

    tipo: 'PRINCIPAL',

    orden: 3,

  },

  {

    nombre: 'Integral Comercio',

    descripcion: 'Protección PyME y soluciones multirriesgo para negocios.',

    icono: 'store',

    tipo: 'PRINCIPAL',

    orden: 4,

  },

  {

    nombre: 'Movilidad',

    descripcion: 'Ecomovilidad: Seguros para bicicletas y monopatines eléctricos.',

    icono: 'bike',

    tipo: 'PRINCIPAL',

    orden: 5,

  },

  {

    nombre: 'Cyber Risk',

    descripcion: 'Protección digital para empresas ante ataques y filtraciones de datos.',

    icono: 'shield',

    tipo: 'PRINCIPAL',

    orden: 6,

  },

  {

    nombre: 'Caución Alquiler',

    descripcion: 'Garantías ágiles para inquilinos y propietarios.',

    icono: 'key',

    tipo: 'PRINCIPAL',

    orden: 7,

  },

  {

    nombre: 'Campañas',

    descripcion: 'Promociones vigentes y material publicitario de temporada.',

    icono: 'megaphone',

    tipo: 'PRINCIPAL',

    orden: 8,

  },

  {

    nombre: 'Autos Clásicos',

    descripcion: 'Material comercial para vehículos de colección.',

    icono: 'classic-car',

    tipo: 'SECUNDARIO',

    orden: 1,

  },

  {

    nombre: 'ART',

    descripcion: 'Recursos de riesgos del trabajo y prevención.',

    icono: 'umbrella',

    tipo: 'SECUNDARIO',

    orden: 2,

  },

  {

    nombre: 'Accidentes Personales',

    descripcion: 'Folletos y condiciones de cobertura personal.',

    icono: 'person',

    tipo: 'SECUNDARIO',

    orden: 3,

  },

  {

    nombre: 'Vida Colectivo',

    descripcion: 'Planes grupales y material para empresas.',

    icono: 'people',

    tipo: 'SECUNDARIO',

    orden: 4,

  },

  {

    nombre: 'Responsabilidad Civil',

    descripcion: 'Coberturas de RC profesional y general.',

    icono: 'scales',

    tipo: 'SECUNDARIO',

    orden: 5,

  },

  {

    nombre: 'Transporte',

    descripcion: 'Mercaderías, flotas y logística.',

    icono: 'truck',

    tipo: 'SECUNDARIO',

    orden: 6,

  },

  {

    nombre: 'Seguros de Retiro',

    descripcion: 'Material de ahorro previsional y retiro.',

    icono: 'umbrella',

    tipo: 'SECUNDARIO',

    orden: 7,

  },

  {

    nombre: 'Embarcaciones',

    descripcion: 'Yates, lanchas y embarcaciones deportivas.',

    icono: 'boat',

    tipo: 'SECUNDARIO',

    orden: 8,

  },

];



async function main() {

  for (const u of seedUsers) {

    const passwordHash = await bcrypt.hash(u.password, 12);

    await prisma.usuario.upsert({

      where: { usuario: u.usuario },

      create: {

        usuario: u.usuario,

        passwordHash,

        rol: u.rol,

        activo: true,

      },

      update: {

        passwordHash,

        rol: u.rol,

        activo: true,

      },

    });

    console.log(`Usuario listo: ${u.usuario} (${u.rol})`);

  }

  for (const p of seedProductores) {
    const passwordHash = await bcrypt.hash(p.password, 12);
    const usuario = await prisma.usuario.upsert({
      where: { usuario: p.usuario },
      create: {
        usuario: p.usuario,
        passwordHash,
        rol: 'PRODUCTOR',
        activo: true,
      },
      update: {
        passwordHash,
        rol: 'PRODUCTOR',
        activo: true,
      },
    });

    const especialidadesJson = JSON.stringify(p.especialidades);

    const productor = await prisma.productor.upsert({
      where: { slug: p.slug },
      create: {
        usuarioId: usuario.id,
        slug: p.slug,
        nombre: p.nombre,
        apellido: p.apellido,
        bio: p.bio,
        ciudad: p.ciudad,
        telefono: p.telefono,
        whatsapp: null,
        foto: null,
        latitud: p.latitud,
        longitud: p.longitud,
        matricula: p.matricula,
        verificado: p.verificado ?? false,
        tituloProfesional: p.tituloProfesional,
        idiomas: ['Español'],
        anosExperiencia: p.anosExperiencia,
        clientesActivos: p.clientesActivos,
        especialidades: especialidadesJson,
      },
      update: {
        usuarioId: usuario.id,
        nombre: p.nombre,
        apellido: p.apellido,
        bio: p.bio,
        ciudad: p.ciudad,
        telefono: p.telefono,
        latitud: p.latitud,
        longitud: p.longitud,
        matricula: p.matricula,
        verificado: p.verificado ?? false,
        tituloProfesional: p.tituloProfesional,
        anosExperiencia: p.anosExperiencia,
        clientesActivos: p.clientesActivos,
        especialidades: especialidadesJson,
      },
    });

    if (p.slug === 'carlos-rodriguez') {
      await prisma.certificacion.deleteMany({ where: { productorId: productor.id } });
      await prisma.certificacion.createMany({
        data: [
          {
            productorId: productor.id,
            nombre: 'Cédula Profesional',
            archivoUrl:
              'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            mimeType: 'application/pdf',
            orden: 0,
          },
          {
            productorId: productor.id,
            nombre: 'Certificado ART',
            archivoUrl:
              'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            mimeType: 'application/pdf',
            orden: 1,
          },
        ],
      });

      await prisma.redSocial.deleteMany({ where: { productorId: productor.id } });
      await prisma.redSocial.createMany({
        data: [
          {
            productorId: productor.id,
            plataforma: 'linkedin',
            url: 'https://www.linkedin.com/in/carlos-rodriguez',
            orden: 0,
          },
          {
            productorId: productor.id,
            plataforma: 'instagram',
            url: 'https://www.instagram.com/carlosrodriguez',
            orden: 1,
          },
        ],
      });
    }

    console.log(`Productor listo: ${p.slug} (${p.usuario})`);
  }

  await prisma.biblioteca.upsert({

    where: { id: BIBLIOTECA_ID },

    create: {

      id: BIBLIOTECA_ID,

      nombre: 'Biblioteca Digital MAPS',

      descripcion: 'Catálogo de ramos y material comercial',

    },

    update: {

      nombre: 'Biblioteca Digital MAPS',

      descripcion: 'Catálogo de ramos y material comercial',

    },

  });

  console.log(`Biblioteca listo: id=${BIBLIOTECA_ID}`);



  for (const r of seedRamos) {

    await prisma.ramo.upsert({

      where: {

        bibliotecaId_nombre: {

          bibliotecaId: BIBLIOTECA_ID,

          nombre: r.nombre,

        },

      },

      create: {

        bibliotecaId: BIBLIOTECA_ID,

        nombre: r.nombre,

        descripcion: r.descripcion,

        icono: r.icono,

        gdriveUrl: PLACEHOLDER_DRIVE,

        tipo: r.tipo,

        orden: r.orden,

        activo: true,

      },

      update: {

        descripcion: r.descripcion,

        icono: r.icono,

        gdriveUrl: PLACEHOLDER_DRIVE,

        tipo: r.tipo,

        orden: r.orden,

        activo: true,

      },

    });

  }

  console.log(`Ramos listos: ${seedRamos.length}`);

}



main()

  .catch((e) => {

    console.error(e);

    process.exit(1);

  })

  .finally(async () => {

    await prisma.$disconnect();

  });

