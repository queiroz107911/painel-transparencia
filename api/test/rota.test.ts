import { describe, it, expect, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import type {
  Repositorio,
  ContratacaoComOrgao,
  OrgaoRow,
} from '../src/repositorio.js';

function fakeContratacao(): ContratacaoComOrgao {
  return {
    numeroControlePncp: 'TESTE-0001',
    modalidadeCodigo: 6,
    modalidadeNome: 'Pregão - Eletrônico',
    objeto: 'Aquisição de teste',
    valorTotalEstimado: 100000,
    dataPublicacao: new Date('2026-09-01'),
    situacao: 'Divulgada no PNCP',
    orgaoCnpj: '00000000000001',
    orgaoRazaoSocial: 'ORGAO TESTE',
    orgaoUf: 'DF',
  };
}

function fakeOrgao(): OrgaoRow {
  return { cnpj: '00000000000001', razaoSocial: 'ORGAO TESTE', uf: 'DF' };
}

function buildFakeRepo(overrides: Partial<Repositorio> = {}): Repositorio {
  return {
    listarContratacoes: vi.fn().mockResolvedValue({
      dados: [fakeContratacao()],
      total: 1,
    }),
    resumirContratacoes: vi.fn().mockResolvedValue({
      porOrgao: [],
      porModalidade: [],
    }),
    listarOrgaos: vi.fn().mockResolvedValue([fakeOrgao()]),
    ...overrides,
  };
}

describe('GET /saude', () => {
  it('retorna { status: ok }', async () => {
    const app = buildApp({ repo: buildFakeRepo() });
    const res = await app.inject({ method: 'GET', url: '/saude' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});

describe('GET /contratacoes', () => {
  it('retorna dados, total, pagina e tamanho', async () => {
    const app = buildApp({ repo: buildFakeRepo() });
    const res = await app.inject({ method: 'GET', url: '/contratacoes' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ dados: ContratacaoComOrgao[]; total: number; pagina: number; tamanho: number }>();
    expect(body.total).toBe(1);
    expect(body.dados).toHaveLength(1);
    expect(body.pagina).toBe(1);
    expect(body.tamanho).toBe(20);
  });

  it('rejeita tamanho > 100 com 400', async () => {
    const app = buildApp({ repo: buildFakeRepo() });
    const res = await app.inject({
      method: 'GET',
      url: '/contratacoes?tamanho=999',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<{ erro: string }>().erro).toBeTruthy();
  });

  it('repassa filtro orgao ao repositório', async () => {
    const listarMock = vi.fn().mockResolvedValue({ dados: [], total: 0 });
    const app = buildApp({
      repo: buildFakeRepo({ listarContratacoes: listarMock }),
    });

    await app.inject({
      method: 'GET',
      url: '/contratacoes?orgao=00000000000001',
    });

    expect(listarMock).toHaveBeenCalledWith(
      expect.objectContaining({ orgao: '00000000000001' }),
    );
  });

  it('repassa filtro modalidade ao repositório', async () => {
    const listarMock = vi.fn().mockResolvedValue({ dados: [], total: 0 });
    const app = buildApp({
      repo: buildFakeRepo({ listarContratacoes: listarMock }),
    });

    await app.inject({
      method: 'GET',
      url: '/contratacoes?modalidade=6',
    });

    expect(listarMock).toHaveBeenCalledWith(
      expect.objectContaining({ modalidade: 6 }),
    );
  });
});

describe('GET /contratacoes/resumo', () => {
  it('retorna porOrgao e porModalidade', async () => {
    const app = buildApp({ repo: buildFakeRepo() });
    const res = await app.inject({
      method: 'GET',
      url: '/contratacoes/resumo',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ porOrgao: unknown[]; porModalidade: unknown[] }>();
    expect(Array.isArray(body.porOrgao)).toBe(true);
    expect(Array.isArray(body.porModalidade)).toBe(true);
  });
});

describe('GET /orgaos', () => {
  it('retorna lista de órgãos', async () => {
    const app = buildApp({ repo: buildFakeRepo() });
    const res = await app.inject({ method: 'GET', url: '/orgaos' });

    expect(res.statusCode).toBe(200);
    expect(res.json<OrgaoRow[]>()).toHaveLength(1);
  });
});

describe('rota não encontrada', () => {
  it('retorna 404 com { erro: ... }', async () => {
    const app = buildApp({ repo: buildFakeRepo() });
    const res = await app.inject({ method: 'GET', url: '/nao-existe' });

    expect(res.statusCode).toBe(404);
    expect(res.json<{ erro: string }>().erro).toBeTruthy();
  });
});
