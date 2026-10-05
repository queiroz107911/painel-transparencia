import sql from 'mssql';
import type { Contratacao } from './mapear.js';
import type { Filtro } from './pncp.js';
import { buscarTodas } from './pncp.js';
import { mapearContratacao } from './mapear.js';
import { getPool } from './db.js';

// Máx 2100 parâmetros por query no SQL Server; 10 colunas por linha → 210 linhas
const BATCH_SIZE = 200;

async function inserirStaging(
  transaction: sql.Transaction,
  contratacoes: Contratacao[],
): Promise<void> {
  for (let i = 0; i < contratacoes.length; i += BATCH_SIZE) {
    const lote = contratacoes.slice(i, i + BATCH_SIZE);
    const req = new sql.Request(transaction);
    const placeholders: string[] = [];

    lote.forEach((c, idx) => {
      req.input(`ncp${idx}`, sql.NVarChar(50), c.numeroControlePncp);
      req.input(`cnpj${idx}`, sql.VarChar(14), c.orgaoCnpj);
      req.input(`razao${idx}`, sql.NVarChar(300), c.orgaoRazaoSocial);
      req.input(`uf${idx}`, sql.Char(2), c.uf);
      req.input(`modcod${idx}`, sql.Int, c.modalidadeCodigo);
      req.input(`modnome${idx}`, sql.NVarChar(100), c.modalidadeNome);
      req.input(`obj${idx}`, sql.NVarChar(sql.MAX), c.objeto);
      req.input(`val${idx}`, sql.Decimal(18, 2), c.valorTotalEstimado);
      req.input(`dt${idx}`, sql.DateTime2, c.dataPublicacao ? new Date(c.dataPublicacao) : null);
      req.input(`sit${idx}`, sql.NVarChar(100), c.situacao);
      placeholders.push(
        `(@ncp${idx},@cnpj${idx},@razao${idx},@uf${idx},@modcod${idx},@modnome${idx},@obj${idx},@val${idx},@dt${idx},@sit${idx})`,
      );
    });

    await req.query(`
      INSERT INTO dbo.stg_contratacao (
        numero_controle_pncp, orgao_cnpj, orgao_razao_social, uf,
        modalidade_codigo, modalidade_nome, objeto,
        valor_total_estimado, data_publicacao, situacao
      ) VALUES ${placeholders.join(',')}
    `);
  }
}

export async function gravarContratacoes(contratacoes: Contratacao[]): Promise<void> {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    await new sql.Request(transaction).query('TRUNCATE TABLE dbo.stg_contratacao');

    if (contratacoes.length > 0) {
      await inserirStaging(transaction, contratacoes);
    }

    // MERGE orgao — dedup por CNPJ com MAX para escolher um valor por grupo
    await new sql.Request(transaction).query(`
      WITH src AS (
        SELECT orgao_cnpj,
               MAX(orgao_razao_social) AS razao_social,
               MAX(uf)                 AS uf
        FROM   dbo.stg_contratacao
        WHERE  orgao_cnpj IS NOT NULL
        GROUP  BY orgao_cnpj
      )
      MERGE dbo.orgao AS dest
      USING src ON dest.cnpj = src.orgao_cnpj
      WHEN MATCHED THEN UPDATE SET
        razao_social = src.razao_social,
        uf           = src.uf
      WHEN NOT MATCHED BY TARGET THEN INSERT (cnpj, razao_social, uf)
        VALUES (src.orgao_cnpj, src.razao_social, src.uf);
    `);

    // MERGE contratacao — dedup por numero_controle_pncp
    await new sql.Request(transaction).query(`
      WITH src AS (
        SELECT *,
               ROW_NUMBER() OVER (
                 PARTITION BY numero_controle_pncp
                 ORDER BY     numero_controle_pncp
               ) AS rn
        FROM   dbo.stg_contratacao
        WHERE  numero_controle_pncp IS NOT NULL
      )
      MERGE dbo.contratacao AS dest
      USING (SELECT * FROM src WHERE rn = 1) AS s
        ON  dest.numero_controle_pncp = s.numero_controle_pncp
      WHEN MATCHED THEN UPDATE SET
        modalidade_codigo    = s.modalidade_codigo,
        modalidade_nome      = s.modalidade_nome,
        objeto               = s.objeto,
        valor_total_estimado = s.valor_total_estimado,
        data_publicacao      = s.data_publicacao,
        situacao             = s.situacao
      WHEN NOT MATCHED BY TARGET THEN INSERT (
        numero_controle_pncp, orgao_cnpj, modalidade_codigo, modalidade_nome,
        objeto, valor_total_estimado, data_publicacao, situacao
      ) VALUES (
        s.numero_controle_pncp, s.orgao_cnpj, s.modalidade_codigo, s.modalidade_nome,
        s.objeto, s.valor_total_estimado, s.data_publicacao, s.situacao
      );
    `);

    await transaction.commit();
    console.log(`Gravados ${contratacoes.length} registros com sucesso`);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function executarIngestao(filtro: Filtro): Promise<void> {
  const itens = await buscarTodas(filtro);
  const contratacoes = itens.map(mapearContratacao);
  await gravarContratacoes(contratacoes);
}
