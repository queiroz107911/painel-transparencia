import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchComRetry } from '../src/retry.js';

function buildFetchMock(respostas: Array<{ status: number; body?: string }>) {
  let chamada = 0;
  return vi.fn((): Promise<Response> => {
    const r = respostas[chamada] ?? respostas.at(-1)!;
    chamada++;
    return Promise.resolve(new Response(r.body ?? '', { status: r.status }));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchComRetry', () => {
  it('retorna na primeira tentativa quando 200', async () => {
    const mockFetch = buildFetchMock([{ status: 200, body: 'ok' }]);
    vi.stubGlobal('fetch', mockFetch);

    const res = await fetchComRetry('http://teste', {}, 3, 0);

    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('tenta novamente em 429 e retorna quando 200', async () => {
    const mockFetch = buildFetchMock([
      { status: 429 },
      { status: 429 },
      { status: 200, body: 'ok' },
    ]);
    vi.stubGlobal('fetch', mockFetch);

    const res = await fetchComRetry('http://teste', {}, 5, 0);

    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('tenta novamente em 500 e retorna quando 200', async () => {
    const mockFetch = buildFetchMock([{ status: 500 }, { status: 200, body: 'ok' }]);
    vi.stubGlobal('fetch', mockFetch);

    const res = await fetchComRetry('http://teste', {}, 5, 0);

    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('lança erro depois de esgotar as tentativas em 429', async () => {
    vi.stubGlobal('fetch', buildFetchMock([{ status: 429 }]));

    await expect(fetchComRetry('http://teste', {}, 3, 0)).rejects.toThrow(
      'HTTP 429',
    );
  });

  it('não tenta novamente em 400 — lança na primeira chamada', async () => {
    const mockFetch = buildFetchMock([{ status: 400 }]);
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchComRetry('http://teste', {}, 5, 0)).rejects.toThrow(
      'HTTP 400',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('não tenta novamente em 404', async () => {
    const mockFetch = buildFetchMock([{ status: 404 }]);
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchComRetry('http://teste', {}, 5, 0)).rejects.toThrow(
      'HTTP 404',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('recupera após falhas e retorna resposta com texto correto', async () => {
    const mockFetch = buildFetchMock([
      { status: 503 },
      { status: 200, body: '{"ok":true}' },
    ]);
    vi.stubGlobal('fetch', mockFetch);

    const res = await fetchComRetry('http://teste', {}, 5, 0);
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
