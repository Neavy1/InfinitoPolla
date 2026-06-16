import app from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';

async function main() {
  await prisma.$connect();
  app.listen(config.port, () => {
    console.log(`API Polla Infinito 2026 en http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error('Error al iniciar servidor:', err);
  process.exit(1);
});
