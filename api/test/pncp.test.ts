import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buscarTodas } from '../src/pncp.js';
import type { ItemApi } from '../src/mapear.js';

function buildPagedMock(totalPaginas: number, itensPorPagina: number) {
  let chamada = 0;
  return vi.fn((): Promise<Response> => {
    chamada++;
    const paginaAtual = chamada;
    const items: ItemApi[] = Array.from({ length: itensPorPagina }, (_, i) => ({
      numeroControlePNCP: `CTRL-${paginaAtual}-${i}`,
      orgaoEntidade: { cnpj: '00000000000001', razaoSocial: 'ORGAO TESTE' },
      modalidadeId: 6,
    }));
    const body = JSON.stringify({
      data: items,
      totalPaginas,
      numeroPagina: paginaAtual,
    });
    return Promise.resolve(
      new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('buscarTodas', () => {
  it('agrega itens de múltiplas páginas', async () => {
    vi.stubGlobal('fetch', buildPagedMock(3, 2));

    const promise = buscarTodas({
      dataInicial: '20260901',
      dataFinal: '20260901',
      modalidade: 6,
    });
    await vi.runAllTimersAsync();
    const itens = await promise;

    expect(itens).toHaveLength(6);
  });

  it('requisita cada página exatamente uma vez', async () => {
    const mockFetch = buildPagedMock(3, 1);
    vi.stubGlobal('fetch', mockFetch);

    const promise = buscarTodas({
      dataInicial: '20260901',
      dataFinal: '20260901',
      modalidade: 6,
    });
    await vi.runAllTimersAsync();
    await promise;

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('para em maxPaginas mesmo havendo mais páginas', async () => {
    const mockFetch = buildPagedMock(10, 3);
    vi.stubGlobal('fetch', mockFetch);

    const promise = buscarTodas({
      dataInicial: '20260901',
      dataFinal: '20260901',
      modalidade: 6,
      maxPaginas: 2,
    });
    await vi.runAllTimersAsync();
    const itens = await promise;

    expect(itens).toHaveLength(6);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retorna lista vazia quando totalPaginas=0 e data vazia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((): Promise<Response> =>
        Promise.resolve(
          new Response(
            JSON.stringify({ data: [], totalPaginas: 0, numeroPagina: 1 }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    );

    const promise = buscarTodas({
      dataInicial: '20260901',
      dataFinal: '20260901',
      modalidade: 6,
    });
    await vi.runAllTimersAsync();
    const itens = await promise;

    expect(itens).toHaveLength(0);
  });
});
