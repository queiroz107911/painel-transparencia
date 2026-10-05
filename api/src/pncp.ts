import { fetchComRetry } from './retry.js';
import type { ItemApi } from './mapear.js';

const BASE = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const HEADERS = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' };
const TAMANHO_PAGINA = 50;
const PAUSA_ENTRE_PAGINAS_MS = 500;

export type Filtro = {
  dataInicial: string; // AAAAMMDD
  dataFinal: string;   // AAAAMMDD
  modalidade: number;
  maxPaginas?: number;
};

export async function buscarTodas(filtro: Filtro): Promise<ItemApi[]> {
  const itens: ItemApi[] = [];
  let pagina = 1;
  let totalPaginas = 1;

  while (pagina <= totalPaginas) {
    const url =
      `${BASE}?dataInicial=${filtro.dataInicial}&dataFinal=${filtro.dataFinal}` +
      `&codigoModalidadeContratacao=${filtro.modalidade}` +
      `&pagina=${pagina}&tamanhoPagina=${TAMANHO_PAGINA}`;

    const resposta = await fetchComRetry(url, { headers: HEADERS });
    const json = (await resposta.json()) as { data: ItemApi[]; totalPaginas: number };

    itens.push(...json.data);
    totalPaginas = json.totalPaginas;
    console.log(`Página ${pagina}/${totalPaginas} (${itens.length} itens até agora)`);

    if (filtro.maxPaginas && pagina >= filtro.maxPaginas) break;

    pagina++;

    if (pagina <= totalPaginas) {
      await new Promise((r) => setTimeout(r, PAUSA_ENTRE_PAGINAS_MS));
    }
  }

  return itens;
}
