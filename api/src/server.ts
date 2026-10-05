import { buildApp } from './app.js';
import { criarRepositorio } from './repositorio.js';
import { fecharPool } from './db.js';

const repo = criarRepositorio();
const app = buildApp({ repo });

const porta = Number(process.env['API_PORT'] ?? 3001);

try {
  await app.listen({ port: porta, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

process.on('SIGTERM', async () => {
  await app.close();
  await fecharPool();
  process.exit(0);
});
