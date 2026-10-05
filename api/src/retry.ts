export async function fetchComRetry(
  url: string,
  opcoes: RequestInit = {},
  maxTentativas = 5,
): Promise<Response> {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    const resposta = await fetch(url, opcoes);

    if (resposta.ok) return resposta;

    const valeTentarDeNovo = resposta.status === 429 || resposta.status >= 500;
    const ultimaTentativa = tentativa === maxTentativas;

    if (!valeTentarDeNovo || ultimaTentativa) {
      throw new Error(`Falha ao chamar a API (HTTP ${resposta.status}): ${url}`);
    }

    const esperaMs = 1000 * 2 ** (tentativa - 1); // 1s, 2s, 4s, 8s, 16s
    console.log(`HTTP ${resposta.status}. Tentativa ${tentativa} falhou, esperando ${esperaMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, esperaMs));
  }

  throw new Error('Não deveria chegar aqui');
}
