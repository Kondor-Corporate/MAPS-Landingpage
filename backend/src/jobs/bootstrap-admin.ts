import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { bootstrapAdmin, parseBootstrapAdminConfig } from './bootstrapAdmin.js';

async function main() {
  const config = parseBootstrapAdminConfig(process.env);
  const result = await bootstrapAdmin(prisma, config);

  if (result.action === 'created') {
    console.log('Bootstrap: superadministrador creado.');
  } else if (result.action === 'updated') {
    console.log('Bootstrap: superadministrador actualizado explícitamente.');
  } else {
    console.log('Bootstrap: el administrador ya existía; no se modificó.');
  }
}

async function run() {
  try {
    await main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    const safeMessage =
      message.startsWith('Configuración de bootstrap inválida:') ||
      message.startsWith('El usuario ya existe')
        ? message
        : 'Revise la configuración y la conectividad del job.';
    console.error(`Bootstrap fallido: ${safeMessage}`);
    process.exitCode = 1;
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      console.error('Bootstrap fallido: no se pudo cerrar la conexión de forma limpia.');
      process.exitCode = 1;
    }
  }
}

void run();
