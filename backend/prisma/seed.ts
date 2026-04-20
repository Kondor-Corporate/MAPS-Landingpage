import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type Rol } from '@prisma/client';

const prisma = new PrismaClient();

const seedUsers: { usuario: string; password: string; rol: Rol }[] = [
  { usuario: 'admin', password: 'Admin1234!', rol: 'ADMIN' },
  { usuario: 'superadmin', password: 'Super1234!', rol: 'SUPERADMIN' },
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
