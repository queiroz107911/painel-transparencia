import cron from 'node-cron';
import { executarIngestao } from './ingestao.js';
import { fecharPool } from './db.js';

const MODALIDADE_PREGAO = 6;
const JANELA_DIAS = 3;

function dataParaAAAAMMDD(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function rodarIngestao(): Promise<void> {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - JANELA_DIAS);

  const dataInicial = dataParaAAAAMMDD(inicio);
  const dataFinal = dataParaAAAAMMDD(hoje);

  console.log(`[agendador] Rodando ingestão: ${dataInicial} → ${dataFinal}`);
  await executarIngestao({ dataInicial, dataFinal, modalidade: MODALIDADE_PREGAO });
}

// Executa todo dia às 02:00
cron.schedule('0 2 * * *', () => {
  rodarIngestao().catch((err: unknown) => {
    console.error('[agendador] Falha na ingestão agendada:', err);
  });
});

console.log('Agendador iniciado — ingestão diária às 02:00');

process.on('SIGTERM', async () => {
  console.log('Encerrando agendador...');
  await fecharPool();
  process.exit(0);
});
