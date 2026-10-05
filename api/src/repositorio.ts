import sql from 'mssql';
import { getPool } from './db.js';

export type FiltrosContratacao = {
  orgao?: string;
  modalidade?: number;
  de?: string;
  ate?: string;
  pagina: number;
  tamanho: number;
};

export type FiltrosPeriodo = {
  de?: string;
  ate?: string;
};

export type ContratacaoComOrgao = {
  numeroControlePncp: string;
  modalidadeCodigo: number;
  modalidadeNome: string | null;
  objeto: string | null;
  valorTotalEstimado: number | null;
  dataPublicacao: Date | null;
  situacao: string | null;
  orgaoCnpj: string;
  orgaoRazaoSocial: string;
  orgaoUf: string | null;
};

export type ResumoOrgao = {
  cnpj: string;
  razaoSocial: string;
  uf: string | null;
  quantidade: number;
  valorTotal: number | null;
};

export type ResumoModalidade = {
  modalidadeCodigo: number;
  modalidadeNome: string | null;
  quantidade: number;
  valorTotal: number | null;
};

export type OrgaoRow = {
  cnpj: string;
  razaoSocial: string;
  uf: string | null;
};

export type Repositorio = {
  listarContratacoes(
    filtros: FiltrosContratacao,
  ): Promise<{ dados: ContratacaoComOrgao[]; total: number }>;
  resumirContratacoes(filtros: FiltrosPeriodo): Promise<{
    porOrgao: ResumoOrgao[];
    porModalidade: ResumoModalidade[];
  }>;
  listarOrgaos(): Promise<OrgaoRow[]>;
};

type Setter = (req: sql.Request) => void;

function construirWhere(
  filtros: FiltrosPeriodo & { orgao?: string; modalidade?: number },
): { where: string; setters: Setter[] } {
  const conds: string[] = [];
  const setters: Setter[] = [];

  if (filtros.orgao !== undefined) {
    const v = filtros.orgao;
    setters.push((req) => req.input('orgao', sql.VarChar(14), v));
    conds.push('c.orgao_cnpj = @orgao');
  }
  if (filtros.modalidade !== undefined) {
    const v = filtros.modalidade;
    setters.push((req) => req.input('modalidade', sql.Int, v));
    conds.push('c.modalidade_codigo = @modalidade');
  }
  if (filtros.de !== undefined) {
    const v = filtros.de;
    setters.push((req) => req.input('de', sql.Date, v));
    conds.push('CAST(c.data_publicacao AS DATE) >= @de');
  }
  if (filtros.ate !== undefined) {
    const v = filtros.ate;
    setters.push((req) => req.input('ate', sql.Date, v));
    conds.push('CAST(c.data_publicacao AS DATE) <= @ate');
  }

  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  return { where, setters };
}

export function criarRepositorio(): Repositorio {
  return {
    async listarContratacoes(filtros) {
      const pool = await getPool();
      const offset = (filtros.pagina - 1) * filtros.tamanho;
      const { where, setters } = construirWhere(filtros);

      const reqDados = pool.request();
      setters.forEach((s) => s(reqDados));
      reqDados.input('offset', sql.Int, offset);
      reqDados.input('tamanho', sql.Int, filtros.tamanho);

      type Row = {
        numero_controle_pncp: string;
        modalidade_codigo: number;
        modalidade_nome: string | null;
        objeto: string | null;
        valor_total_estimado: number | null;
        data_publicacao: Date | null;
        situacao: string | null;
        orgao_cnpj: string;
        orgao_razao_social: string;
        orgao_uf: string | null;
      };

      const { recordset } = await reqDados.query<Row>(`
        SELECT
          c.numero_controle_pncp,
          c.modalidade_codigo,
          c.modalidade_nome,
          c.objeto,
          c.valor_total_estimado,
          c.data_publicacao,
          c.situacao,
          o.cnpj      AS orgao_cnpj,
          o.razao_social AS orgao_razao_social,
          o.uf        AS orgao_uf
        FROM  dbo.contratacao c
        JOIN  dbo.orgao o ON o.cnpj = c.orgao_cnpj
        ${where}
        ORDER BY c.data_publicacao DESC, c.numero_controle_pncp
        OFFSET @offset ROWS FETCH NEXT @tamanho ROWS ONLY
      `);

      const reqTotal = pool.request();
      setters.forEach((s) => s(reqTotal));
      const { recordset: totRow } = await reqTotal.query<{ total: number }>(`
        SELECT COUNT(*) AS total
        FROM  dbo.contratacao c
        JOIN  dbo.orgao o ON o.cnpj = c.orgao_cnpj
        ${where}
      `);

      const dados: ContratacaoComOrgao[] = recordset.map((r) => ({
        numeroControlePncp: r.numero_controle_pncp,
        modalidadeCodigo: r.modalidade_codigo,
        modalidadeNome: r.modalidade_nome,
        objeto: r.objeto,
        valorTotalEstimado: r.valor_total_estimado,
        dataPublicacao: r.data_publicacao,
        situacao: r.situacao,
        orgaoCnpj: r.orgao_cnpj,
        orgaoRazaoSocial: r.orgao_razao_social,
        orgaoUf: r.orgao_uf,
      }));

      return { dados, total: totRow[0]?.total ?? 0 };
    },

    async resumirContratacoes(filtros) {
      const pool = await getPool();
      const { where, setters } = construirWhere(filtros);

      const reqOrgao = pool.request();
      setters.forEach((s) => s(reqOrgao));

      type RowOrgao = {
        cnpj: string;
        razao_social: string;
        uf: string | null;
        quantidade: number;
        valor_total: number | null;
      };
      const { recordset: orgaos } = await reqOrgao.query<RowOrgao>(`
        SELECT TOP 20
          o.cnpj,
          o.razao_social,
          o.uf,
          COUNT(*)               AS quantidade,
          SUM(c.valor_total_estimado) AS valor_total
        FROM  dbo.contratacao c
        JOIN  dbo.orgao o ON o.cnpj = c.orgao_cnpj
        ${where}
        GROUP BY o.cnpj, o.razao_social, o.uf
        ORDER BY valor_total DESC
      `);

      // Para modalidade não há JOIN com orgao — where só tem condições de data (c.)
      const reqMod = pool.request();
      setters.forEach((s) => s(reqMod));

      type RowMod = {
        modalidade_codigo: number;
        modalidade_nome: string | null;
        quantidade: number;
        valor_total: number | null;
      };
      const { recordset: modalidades } = await reqMod.query<RowMod>(`
        SELECT
          c.modalidade_codigo,
          c.modalidade_nome,
          COUNT(*)                    AS quantidade,
          SUM(c.valor_total_estimado) AS valor_total
        FROM  dbo.contratacao c
        ${where}
        GROUP BY c.modalidade_codigo, c.modalidade_nome
        ORDER BY valor_total DESC
      `);

      return {
        porOrgao: orgaos.map((r) => ({
          cnpj: r.cnpj,
          razaoSocial: r.razao_social,
          uf: r.uf,
          quantidade: r.quantidade,
          valorTotal: r.valor_total,
        })),
        porModalidade: modalidades.map((r) => ({
          modalidadeCodigo: r.modalidade_codigo,
          modalidadeNome: r.modalidade_nome,
          quantidade: r.quantidade,
          valorTotal: r.valor_total,
        })),
      };
    },

    async listarOrgaos() {
      const pool = await getPool();
      type Row = { cnpj: string; razao_social: string; uf: string | null };
      const { recordset } = await pool.request().query<Row>(`
        SELECT cnpj, razao_social, uf
        FROM   dbo.orgao
        ORDER BY razao_social
      `);
      return recordset.map((r) => ({
        cnpj: r.cnpj,
        razaoSocial: r.razao_social,
        uf: r.uf,
      }));
    },
  };
}
