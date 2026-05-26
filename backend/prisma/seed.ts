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
