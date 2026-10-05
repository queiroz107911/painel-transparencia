# CLAUDE.md — painel-transparencia

> Objetivo: **finalizar o projeto** descrito aqui, do estado atual até o repositório publicado no GitHub.
> Este arquivo reflete o estado em 04/10/2026. Antes de agir, confirme o estado real com `git status`, `git branch`, `git log --oneline` e `ls`.

---

## 1. Onde o projeto está e para onde ele vai

**Pasta de trabalho (WSL, Ubuntu):**

```
/home/queiroz/painel-transparencia      (equivale a ~/painel-transparencia)
```

- Prompt do usuário: `queiroz@DESKTOP-7DTSCA4:~/painel-transparencia$`
- Subpastas: `/home/queiroz/painel-transparencia/api` e `/home/queiroz/painel-transparencia/web`.
- Abrir o Claude Code a partir dela: `cd ~/painel-transparencia && claude`.
- Para ver a pasta no Windows (Explorador de Arquivos): `\\wsl$\<nome-da-distro>\home\queiroz\painel-transparencia` (o nome da distro aparece em `wsl -l`, normalmente `Ubuntu`). Não mover o projeto para `/mnt/c/...` (acesso a arquivos muito mais lento).
- Os comandos `npm`, `tsx` e `vitest` do backend rodam **de dentro de `api/`**; os do frontend, de dentro de `web/`; `docker compose` e `git`, da raiz.

**Repositório remoto (destino final):**

```
https://github.com/queiroz107911/painel-transparencia.git
```

- Conta GitHub: `queiroz107911`. Nome exato do repositório: `painel-transparencia` (é o nome citado no currículo).
- Verificar: `git remote -v`. Se não houver `origin`, adicionar: `git remote add origin https://github.com/queiroz107911/painel-transparencia.git`.
- Se o repositório ainda não existir no GitHub, **parar e avisar o usuário** para criá-lo vazio (sem README, sem .gitignore, sem licença) em github.com, com a descrição curta: "Painel de transparência: ingestão de contratações do PNCP, SQL Server, API Fastify e painel Next.js". Não criar conta nem inserir credenciais.
- Primeiro push: `git push -u origin main`. Depois, cada branch de etapa: `git push -u origin <branch>`.
- Se o push pedir autenticação, **parar e pedir ao usuário** que autentique (por exemplo `gh auth login` ou credencial do Git). Nunca digitar senha ou token.
- Pull requests: se o `gh` (GitHub CLI) estiver instalado e autenticado, usar `gh pr create`; senão, dar ao usuário o link para abrir o PR.

**Contexto:** o repositório é de portfólio para a candidatura à vaga de Desenvolvedor Full Stack Júnior na Centrosoft (empresa que atende órgãos públicos). Autor: João Pedro Queiroz ("Queiroz"). Tudo o que o currículo promete (seção 3) precisa existir no código.

**Ambiente:** Windows + WSL2 (Ubuntu), Docker Desktop com integração WSL, Node v20.20.2, VS Code com extensão WSL.

---

## 2. O que é o projeto

Um painel que busca contratações públicas na API aberta do **PNCP** (Portal Nacional de Contratações Públicas), grava no **SQL Server** e mostra em tabelas filtráveis e gráficos simples.

```
API do PNCP --(job de ingestão: paginação + retry/backoff)--> stg_contratacao (staging)
   --(MERGE idempotente)--> orgao + contratacao --(API Fastify)--> painel Next.js (Server Components)
```

**Stack:** Node.js 20, TypeScript `strict`, Fastify (API), Next.js App Router (web), SQL Server 2022 em Docker, driver `mssql` com **SQL escrito à mão e consultas parametrizadas (sem ORM)**, Vitest, GitHub Actions, Docker Compose, `node-cron`.

**Estrutura alvo:**

```
painel-transparencia/
├── .env                  (NÃO vai pro Git)
├── .env.example          (vai pro Git, sem segredos)
├── .gitignore            (node_modules, .env, dist, .next)
├── docker-compose.yml
├── README.md
├── CLAUDE.md
├── .github/workflows/ci.yml        (a criar)
├── api/
│   ├── package.json  tsconfig.json  Dockerfile (a criar)
│   ├── sql/001_schema.sql
│   ├── src/
│   │   ├── retry.ts       (pronto)
│   │   ├── pncp.ts        (pronto)
│   │   ├── mapear.ts      (pronto)
│   │   ├── teste.ts       (TEMPORÁRIO: apagar)
│   │   ├── db.ts          (a criar: pool de conexão)
│   │   ├── ingestao.ts    (a criar: staging + MERGE)
│   │   ├── ingest.ts      (a criar: CLI do job)
│   │   ├── agendador.ts   (a criar: node-cron)
│   │   ├── app.ts         (a criar: buildApp())
│   │   ├── server.ts      (a criar: listen)
│   │   ├── repositorio.ts (a criar: SQL das consultas)
│   │   └── rotas/         (a criar)
│   └── test/fixtures/contratacoes.json   (pronto)
└── web/                   (a criar: Next.js)
```

---

## 3. Currículo x entrega (o repositório PRECISA entregar tudo isto)

- Job agendado que consome a API pública de contratações (PNCP), tratando **paginação, rate limit e retry com backoff**.
- Carga em tabelas de **staging** e consolidação no SQL Server com **MERGE idempotente**, evitando duplicidade a cada nova execução.
- Endpoints REST em Fastify com **filtros por órgão, modalidade e período, paginação e consultas SQL com joins e agregações**.
- Painel em Next.js com **Server Components, tabelas filtráveis e gráficos de valor contratado por órgão**.
- Testes com Vitest **mockando a API externa** e pipeline no **GitHub Actions** rodando testes e build a cada pull request.
- Stack inteira containerizada com **Docker e Docker Compose**.

Se algo não puder ser entregue (por exemplo o CI ou o gráfico), **avisar o usuário** para ajustar o bullet do currículo. O currículo não pode citar o que o repositório não tem.

---

## 4. Fatos confirmados sobre a API do PNCP (testados com chamadas reais)

- Base: `https://pncp.gov.br/api/consulta/v1`. Swagger: `https://pncp.gov.br/api/consulta/swagger-ui/index.html`.
- Endpoint: `GET /contratacoes/publicacao` com `dataInicial` e `dataFinal` (`AAAAMMDD`), `codigoModalidadeContratacao` (**obrigatório, um valor por consulta**), `pagina`, `tamanhoPagina`.
- Headers usados: `Accept: application/json` e `User-Agent: Mozilla/5.0`.
- **`tamanhoPagina=50` funciona** (testado). Com 10, a janela de 01 a 07/09/2026 da modalidade 6 tem 6361 registros em 637 páginas. Com 50, o dia 01/09/2026 (modalidade 6) tem 1537 registros em 31 páginas. 100 **não foi testado**.
- Janela máxima de 365 dias (senão HTTP 422). `tamanhoPagina` mínimo 10. A API limita requisições com agressividade (429).
- Modalidades: 6 = Pregão Eletrônico, 8 = Dispensa. Tabela completa na documentação oficial.

**Formato real da resposta:**

- Raiz: `data` (lista de contratações), `totalRegistros`, `totalPaginas`, `numeroPagina`, `paginasRestantes`, `empty`. **A lista se chama `data`, não `dados`.**

| Campo na API | Coluna | Tabela |
|---|---|---|
| `orgaoEntidade.cnpj` | `cnpj` / `orgao_cnpj` | `orgao` / `contratacao` |
| `orgaoEntidade.razaoSocial` | `razao_social` | `orgao` |
| `unidadeOrgao.ufSigla` | `uf` | `orgao` |
| `numeroControlePNCP` (ex.: `01612441000107-1-000131/2026`) | `numero_controle_pncp` (PK) | `contratacao` |
| `modalidadeId` | `modalidade_codigo` | `contratacao` |
| `modalidadeNome` | `modalidade_nome` | `contratacao` |
| `objetoCompra` | `objeto` | `contratacao` |
| `valorTotalEstimado` | `valor_total_estimado` | `contratacao` |
| `dataPublicacaoPncp` (ISO sem fuso, ex.: `2026-09-01T00:00:08`) | `data_publicacao` | `contratacao` |
| `situacaoCompraNome` | `situacao` | `contratacao` |

`valorTotalHomologado` existe no JSON, mas **não é usado** (decisão: usar o estimado).

A fixture `api/test/fixtures/contratacoes.json` tem 10 itens reais (01–07/09/2026, modalidade 6, `tamanhoPagina=10`, página 1) e serve para os testes.

---

## 5. Banco de dados (SQL Server 2022 no Docker)

Fonte da verdade: `api/sql/001_schema.sql` (idempotente, com `IF ... IS NULL`, blocos separados por `GO`). Já executado com sucesso.

- Banco: `painel`. Usuário: `sa`. Senha: `MSSQL_SA_PASSWORD` do `.env` (forte: 8+ caracteres, maiúscula, minúscula, número e símbolo; senha fraca derruba o container).
- Container: `painel-sqlserver`, porta `1433`, volume nomeado `sqlserver_data`, `healthcheck` via `/opt/mssql-tools18/bin/sqlcmd`.
- `.env` (raiz): `MSSQL_SA_PASSWORD`, `DB_HOST=localhost`, `DB_PORT=1433`, `DB_NAME=painel`, `API_PORT=3001`.

| Tabela | Colunas | Observações |
|---|---|---|
| `stg_contratacao` | `numero_controle_pncp NVARCHAR(50)`, `orgao_cnpj VARCHAR(14)`, `orgao_razao_social NVARCHAR(300)`, `uf CHAR(2)`, `modalidade_codigo INT`, `modalidade_nome NVARCHAR(100)`, `objeto NVARCHAR(MAX)`, `valor_total_estimado DECIMAL(18,2)`, `data_publicacao DATETIME2`, `situacao NVARCHAR(100)` | Tudo NULL, sem PK. Espelho cru. **Esvaziada a cada execução do job.** |
| `orgao` | `cnpj VARCHAR(14) PK`, `razao_social NVARCHAR(300) NOT NULL`, `uf CHAR(2) NULL` | Um por CNPJ |
| `contratacao` | `numero_controle_pncp NVARCHAR(50) PK`, `orgao_cnpj VARCHAR(14) NOT NULL` FK para `orgao.cnpj` (`fk_contratacao_orgao`), `modalidade_codigo INT NOT NULL`, `modalidade_nome`, `objeto`, `valor_total_estimado`, `data_publicacao`, `situacao` | |

Índices: `ix_contratacao_data_publicacao`, `ix_contratacao_orgao_cnpj`, `ix_contratacao_modalidade_codigo`.

**Executar um `.sql` com `GO`** (o driver `mssql` não entende `GO`, só o `sqlcmd`):

```bash
docker exec -i painel-sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -C -b -S localhost -U sa -P "$MSSQL_SA_PASSWORD"' < api/sql/001_schema.sql
```

**Conexão do Node (`mssql`):** `user: 'sa'`, `password`, `server`, `port: Number(DB_PORT)`, `database: DB_NAME`, `options: { trustServerCertificate: true }` (certificado autoassinado do container; aceitável só em desenvolvimento).

---

## 6. ESTADO ATUAL: o que já está pronto

- [x] Repositório local com Git, `.gitignore`, `.env`, `.env.example`, `README.md` mínimo, pastas `api/` e `web/`. Primeiro commit na `main` feito.
- [x] Fixture real do PNCP salva.
- [x] `docker-compose.yml` com o serviço `sqlserver` (sobe `healthy`).
- [x] `api/sql/001_schema.sql` executado: banco `painel` e 3 tabelas com PKs, FK e índices. Branch `feat/banco` criada para isso.
- [x] Projeto Node em `api/`: `type: module`, dependências `mssql` e `dotenv`; dev: `typescript`, `tsx`, `@types/node`, `vitest`; `tsconfig.json` gerado por `npx tsc --init`. Imports entre arquivos `.ts` usam extensão `.js` (`import ... from './retry.js'`).
- [x] `api/src/retry.ts`: `fetchComRetry(url, opcoes, maxTentativas = 5)`. Repete só em 429 e 5xx, backoff exponencial `1000 * 2 ** (tentativa - 1)` ms, erro claro na última tentativa, não repete 4xx.
- [x] `api/src/mapear.ts`: tipo `Contratacao` (camelCase, espelha o banco) e `mapearContratacao(item)`; `?.` e `?? null` nos opcionais; CNPJ, número de controle e modalidade são obrigatórios de propósito.
- [x] `api/src/pncp.ts`: `buscarTodas({ dataInicial, dataFinal, modalidade, maxPaginas? })` com `TAMANHO_PAGINA = 50`, pausa de 500 ms entre páginas, loop `while (pagina <= totalPaginas)`.
- [x] `api/src/teste.ts` validou buscador + tradutor contra a API real (3 páginas = 150 linhas).

**Verificar:** `retry.ts`, `pncp.ts` e `mapear.ts` provavelmente **ainda não foram commitados** (confirmar com `git status`; se faltar, commitar em commits pequenos). Confirmar também se `feat/banco` já foi mesclada na `main` e se há `origin` configurado (seção 1).

---

## 7. O QUE FALTA, em ordem (cada item = 1 branch + 1 PR)

Cada etapa só termina quando o critério "Pronto quando" for verificado por comando.

### 7.0 Publicar o que existe (branch `feat/banco` e `main`)

1. Commitar `retry.ts`, `pncp.ts`, `mapear.ts` (e `CLAUDE.md`), em commits pequenos (ex.: `feat: adiciona retry com backoff exponencial`).
2. Garantir `origin` (seção 1), `git push -u origin main` e `git push -u origin feat/banco`, abrir PR de `feat/banco` para `main` e mesclar.

### 7.1 Ingestão: gravar no banco (branch `feat/ingestao`)

1. **Limpeza:** apagar `src/teste.ts`; tipar `buscarTodas` com o tipo `ItemApi` (exportá-lo de `mapear.ts`) no lugar de `any[]`; evitar a pausa de 500 ms depois da última página; renomear `vale_tentar_de_novo` e `ultima_tentativa` para camelCase; opcionalmente adicionar timeout ao `fetch` (`AbortSignal.timeout`).
2. **`src/db.ts`:** carregar o `.env` **da raiz** (`../.env` relativo a `api/`; usar caminho resolvido a partir do arquivo, não do diretório atual), criar e exportar um pool do `mssql` reutilizável e uma função para fechá-lo.
3. **`npm run db:init`** no `package.json`: executa o comando `docker exec ... sqlcmd` da seção 5 para todos os `api/sql/*.sql` em ordem.
4. **`src/ingestao.ts`**, função que recebe `Contratacao[]` e, **dentro de uma transação**:
   1. `TRUNCATE TABLE dbo.stg_contratacao`.
   2. Inserir na staging. Preferir `request.bulk(table)` do `mssql`. Alternativa: `INSERT` parametrizado em lotes pequenos (o SQL Server aceita no máximo 2100 parâmetros por consulta).
   3. `MERGE` em `orgao` a partir dos órgãos da staging, **deduplicando por CNPJ** (o MERGE dá erro se duas linhas de origem casam com a mesma linha de destino).
   4. `MERGE` em `contratacao`: `WHEN MATCHED THEN UPDATE` e `WHEN NOT MATCHED BY TARGET THEN INSERT`, chave `numero_controle_pncp`, também **deduplicando a origem**. Terminar o comando com `;`.
   - `orgao` **deve ser mesclada antes** de `contratacao` (FK).
5. **`src/ingest.ts` (CLI):** `npm run ingest -- --de 2026-09-01 --ate 2026-09-07 --modalidade 6`. Argumentos via `node:util` `parseArgs`. Converter `AAAA-MM-DD` para `AAAAMMDD`. Validar: datas válidas, `--de <= --ate`, janela de no máximo 365 dias, modalidade numérica; erro claro e `process.exit(1)` se inválido. Fluxo: `buscarTodas` → `map(mapearContratacao)` → gravar → fechar o pool.
6. **`src/agendador.ts`:** `node-cron`, uma vez por dia, chamando **a mesma função** do comando manual com janela dos últimos 3 dias. Script `npm run agendador`. Conferir a sintaxe do cron na documentação do pacote.
7. Scripts no `package.json`: `db:init`, `ingest`, `agendador`, `dev`, `test`, `build`.

**Pronto quando:** rodar o ingest duas vezes seguidas com a mesma janela não duplica linhas. Provar com `SELECT COUNT(*)` antes e depois e com `SELECT numero_controle_pncp, COUNT(*) FROM dbo.contratacao GROUP BY numero_controle_pncp HAVING COUNT(*) > 1` sem resultado. Testar primeiro com janela de um dia e `maxPaginas` baixo.

### 7.2 API Fastify (branch `feat/api`)

Instalar `fastify`. Não usar CORS (o Next chama a API pelo servidor).

- **`src/app.ts` com `buildApp({ repo })`:** cria e devolve o app **sem `listen`**, recebendo o repositório por parâmetro (para trocar por um falso nos testes). `src/server.ts` só faz o `listen` na porta `API_PORT`.
- `GET /saude`.
- Erros sempre `{ "erro": "mensagem" }` (via `setErrorHandler`). Códigos: 200, 400 (entrada inválida), 404, 500.
- **`src/repositorio.ts`:** funções que só falam com o banco, SQL à mão, **sempre `request.input(...)`**, nunca concatenar valores.
- Endpoints (rotas em português e no plural):
  - `GET /contratacoes`: filtros opcionais `orgao` (CNPJ), `modalidade`, `de`, `ate`, mais `pagina` e `tamanho` (máximo 100). Validar a query string com o schema JSON do Fastify (400 se inválida). WHERE montado com condições fixas e valores por parâmetro. Paginação com `ORDER BY data_publicacao DESC, numero_controle_pncp OFFSET @offset ROWS FETCH NEXT @tamanho ROWS ONLY` (obrigatório ter `ORDER BY`). `JOIN orgao` para devolver razão social e UF. Resposta: `{ dados, total, pagina, tamanho }`, com `total` vindo de um `COUNT(*)` com os mesmos filtros.
  - `GET /contratacoes/resumo`: valor total e quantidade **por órgão** e **por modalidade**, com `GROUP BY` e `JOIN` com `orgao`, aceitando os filtros de período; limitar os órgãos retornados (`TOP`) para o gráfico.
  - `GET /orgaos`: lista de órgãos (para o filtro da tela).

**Pronto quando:** os filtros combinam entre si e a resposta traz o total. Verificar com `curl` na API rodando.

### 7.3 Frontend Next.js (branch `feat/web`)

Criar com `create-next-app` dentro de `web/` (App Router, TypeScript). **Conferir na documentação oficial da versão instalada** o comportamento de `searchParams` (em versões recentes é uma Promise e exige `await`) e de cache do `fetch`. Variável `API_URL` (local: `http://localhost:3001`; no Docker: `http://api:3001`).

- Página de lista com filtros (órgão, modalidade, período) guardados nos **`searchParams` da URL** (formulário `GET`, sem estado no navegador) e paginação por links com `?pagina=`.
- Página `/resumo` com **gráfico de barras de valor contratado por órgão**, em CSS/SVG simples, sem biblioteca de gráfico.
- Dados buscados em **Server Components**, com `fetch` no servidor, sem cache.
- Visual simples e limpo.

**Pronto quando:** mudar um filtro muda a URL e a tabela; `npm run build` passa em `web/`.

### 7.4 Testes com Vitest (branch `test/vitest`)

Tudo sem internet (`npm test` passa offline):

1. `mapearContratacao` com a fixture `contratacoes.json`.
2. `fetchComRetry` com `fetch` mockado (`vi.fn` / `vi.stubGlobal`): repete no 429, desiste depois do limite, **não** repete no 400. A espera é real (1s, 2s...), então usar `vi.useFakeTimers()` ou tornar a base da espera parametrizável.
3. `buscarTodas` (paginação) com `fetch` mockado devolvendo 2 ou 3 páginas: confere quantidade de itens e o `break` por `maxPaginas`.
4. Uma rota Fastify com `app.inject` e **repositório falso**.

**Pronto quando:** `npm test` passa sem internet e sem banco.

### 7.5 Docker completo e CI (branch `chore/docker-ci`)

- `api/Dockerfile` e `web/Dockerfile` simples (`node:20-alpine` ou similar).
- `docker-compose.yml` com `sqlserver`, `api` e `web`. A `api` usa `DB_HOST=sqlserver` (nome do serviço, não `localhost`) e `depends_on` com `condition: service_healthy`. O `web` usa `API_URL=http://api:3001`. Garantir que o schema seja aplicado no ambiente do compose (o `db:init` não roda sozinho): escolher entre documentar o comando no README ou um serviço de inicialização, e registrar a decisão no README.
- `.github/workflows/ci.yml`: em `pull_request`, instalar dependências (`npm ci`), rodar `npm test` e `npm run build` em `api/` e `web/`. Badge de CI no README.

**Pronto quando:** `docker compose up` sobe os três serviços e o painel abre; o badge de CI fica verde.

### 7.6 README (branch `docs/readme`)

Como rodar passo a passo (do clone até ver o painel), diagrama do fluxo (seção 2), decisões tomadas e por quê (sem ORM, staging + MERGE, SQL parametrizado, Server Components, filtros na URL), print do painel (pedir ao usuário, que precisa tirar do navegador), badge de CI, aviso de que as senhas do `.env` são de desenvolvimento.

---

## 8. Convenções de Git

- Uma branch por etapa: `feat/banco` (existe), `feat/ingestao`, `feat/api`, `feat/web`, `test/vitest`, `chore/docker-ci`, `docs/readme`. Ao fim de cada uma: `git push -u origin <branch>`, PR para a `main` e merge, para a próxima etapa partir da `main` atualizada.
- Commits pequenos, em português, com prefixo `feat:`, `fix:`, `test:`, `chore:`, `docs:` (ex.: `feat: adiciona MERGE idempotente de contratações`).
- **Nunca** commitar `.env`. Conferir com `git ls-files` que só o `.env.example` está versionado e que nenhum segredo está no histórico.

## 9. Restrições técnicas

- Fora do escopo (não fazer): ORM, migrations, microsserviços, filas (BullMQ/Redis), Kubernetes, deploy em nuvem, autenticação, refresh token, log de auditoria, mascaramento de CPF/CNPJ. O projeto `sigcon` é outro repositório e não entra aqui.
- Nunca concatenar valores em SQL: sempre parâmetros (`request.input(...)`).
- Não assumir nomes de campos da API nem comportamento de versões novas de Next.js ou Fastify: conferir na documentação oficial ou testar na hora.
- Não digitar senhas, tokens ou credenciais em nenhum lugar; pedir ao usuário quando for necessário autenticar.
- Não adicionar nada fora deste arquivo antes de fechar tudo o que está nele.

## 10. Checklist final antes de dar o projeto como concluído

- [ ] Todos os bullets da seção 3 existem no repositório.
- [ ] `npm test` passa offline em `api/`; `npm run build` passa em `api/` e `web/`.
- [ ] `docker compose up` sobe `sqlserver`, `api` e `web`.
- [ ] Ingestão duas vezes seguidas não duplica linhas.
- [ ] README completo; `.env.example` presente; nenhum segredo no histórico do Git.
- [ ] CI verde no GitHub.
- [ ] Tudo enviado para `https://github.com/queiroz107911/painel-transparencia.git`, com histórico de commits limpo e PRs das etapas.
- [ ] Descrição curta do repositório preenchida no GitHub.

## 11. Primeira ação ao abrir este arquivo

1. `cd ~/painel-transparencia` e rodar `git status`, `git branch`, `git remote -v` e `git log --oneline`.
2. `docker compose ps`: se `painel-sqlserver` não estiver `healthy`, rodar `docker compose up -d` e esperar.
3. Executar a seção 7.0 e seguir a ordem até o checklist da seção 10.