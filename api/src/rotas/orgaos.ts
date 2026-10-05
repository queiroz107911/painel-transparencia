import type { FastifyPluginAsync } from 'fastify';
import type { Repositorio } from '../repositorio.js';

type Opts = { repo: Repositorio };

const rotasOrgaos: FastifyPluginAsync<Opts> = async (app, opts) => {
  app.get('/', async () => {
    return opts.repo.listarOrgaos();
  });
};

export default rotasOrgaos;
