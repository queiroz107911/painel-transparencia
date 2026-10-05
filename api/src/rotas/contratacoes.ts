import type { FastifyPluginAsync } from 'fastify';
import type { Repositorio } from '../repositorio.js';

type Opts = { repo: Repositorio };

type QueryContratacoes = {
  orgao?: string;
  modalidade?: number;
  de?: string;
  ate?: string;
  pagina: number;
  tamanho: number;
};

type QueryResumo = {
  de?: string;
  ate?: string;
};

const rotasContratacoes: FastifyPluginAsync<Opts> = async (app, opts) => {
  app.get<{ Querystring: QueryContratacoes }>(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            orgao:      { type: 'string' },
            modalidade: { type: 'integer' },
            de:         { type: 'string' },
            ate:        { type: 'string' },
            pagina:     { type: 'integer', minimum: 1, default: 1 },
            tamanho:    { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req) => {
      const { orgao, modalidade, de, ate, pagina, tamanho } = req.query;
      const { dados, total } = await opts.repo.listarContratacoes({
        ...(orgao !== undefined && { orgao }),
        ...(modalidade !== undefined && { modalidade }),
        ...(de !== undefined && { de }),
        ...(ate !== undefined && { ate }),
        pagina,
        tamanho,
      });
      return { dados, total, pagina, tamanho };
    },
  );

  app.get<{ Querystring: QueryResumo }>(
    '/resumo',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            de:  { type: 'string' },
            ate: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req) => {
      const { de, ate } = req.query;
      return opts.repo.resumirContratacoes({
        ...(de !== undefined && { de }),
        ...(ate !== undefined && { ate }),
      });
    },
  );
};

export default rotasContratacoes;
