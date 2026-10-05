export type Contratacao = {
  numeroControlePncp: string;
  orgaoCnpj: string;
  orgaoRazaoSocial: string;
  uf: string | null;
  modalidadeCodigo: number;
  modalidadeNome: string | null;
  objeto: string | null;
  valorTotalEstimado: number | null;
  dataPublicacao: string | null;
  situacao: string | null;
};

export type ItemApi = {
  numeroControlePNCP: string;
  orgaoEntidade: { cnpj: string; razaoSocial: string };
  unidadeOrgao?: { ufSigla?: string };
  modalidadeId: number;
  modalidadeNome?: string;
  objetoCompra?: string;
  valorTotalEstimado?: number;
  dataPublicacaoPncp?: string;
  situacaoCompraNome?: string;
};

export function mapearContratacao(item: ItemApi): Contratacao {
  return {
    numeroControlePncp: item.numeroControlePNCP,
    orgaoCnpj: item.orgaoEntidade.cnpj,
    orgaoRazaoSocial: item.orgaoEntidade.razaoSocial,
    uf: item.unidadeOrgao?.ufSigla ?? null,
    modalidadeCodigo: item.modalidadeId,
    modalidadeNome: item.modalidadeNome ?? null,
    objeto: item.objetoCompra ?? null,
    valorTotalEstimado: item.valorTotalEstimado ?? null,
    dataPublicacao: item.dataPublicacaoPncp ?? null,
    situacao: item.situacaoCompraNome ?? null,
  };
}
