import { parseArgs } from 'node:util';
import { executarIngestao } from './ingestao.js';
import { fecharPool } from './db.js';

const { values } = parseArgs({
  options: {
    de: { type: 'string' },
    ate: { type: 'string' },
    modalidade: { type: 'string' },
  },
});

function validarData(valor: string | undefined, nome: string): Date {
  if (!valor) {
    console.error(`Erro: --${nome} é obrigatório (formato AAAA-MM-DD)`);
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    console.error(`Erro: --${nome} deve estar no formato AAAA-MM-DD`);
    process.exit(1);
  }
  const d = new Date(`${valor}T00:00:00`);
  if (isNaN(d.getTime())) {
    console.error(`Erro: --${nome} é uma data inválida`);
    process.exit(1);
  }
  return d;
}

const dataDe = validarData(values.de, 'de');
const dataAte = validarData(values.ate, 'ate');

if (dataDe > dataAte) {
  console.error('Erro: --de não pode ser posterior a --ate');
  process.exit(1);
}

const diffDias = (dataAte.getTime() - dataDe.getTime()) / (1000 * 60 * 60 * 24);
if (diffDias > 365) {
  console.error('Erro: a janela máxima é de 365 dias');
  process.exit(1);
}

const modalidadeStr = values.modalidade;
if (!modalidadeStr || !/^\d+$/.test(modalidadeStr)) {
  console.error('Erro: --modalidade deve ser um número inteiro');
  process.exit(1);
}

const modalidade = Number(modalidadeStr);
const paraAAAAAMMDD = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

console.log(`Ingestão: de=${values.de} ate=${values.ate} modalidade=${modalidade}`);

executarIngestao({
  dataInicial: paraAAAAAMMDD(dataDe),
  dataFinal: paraAAAAAMMDD(dataAte),
  modalidade,
})
  .catch((err: unknown) => {
    console.error('Falha na ingestão:', err);
    process.exit(1);
  })
  .finally(() => fecharPool());
