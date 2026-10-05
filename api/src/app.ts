import Fastify, { type FastifyError } from 'fastify';
import type { Repositorio } from './repositorio.js';
import rotasContratacoes from './rotas/contratacoes.js';
import rotasOrgaos from './rotas/orgaos.js';

export function buildApp(opts: { repo: Repositorio }) {
  const app = Fastify({ logger: true });

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({ erro: error.message });
    }
    request.log.error(error);
    const status = error.statusCode ?? 500;
    return reply.status(status).send({ erro: 'Erro interno do servidor' });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({ erro: 'Rota não encontrada' });
  });

  app.get('/saude', async () => ({ status: 'ok' }));

  void app.register(rotasContratacoes, { prefix: '/contratacoes', repo: opts.repo });
  void app.register(rotasOrgaos, { prefix: '/orgaos', repo: opts.repo });

  return app;
}
