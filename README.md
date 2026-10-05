# Painel de Transparência

Painel de contratações públicas: consome a API aberta do [PNCP](https://pncp.gov.br), grava no SQL Server e exibe em tabelas filtráveis com gráficos.

[![CI](https://github.com/queiroz107911/painel-transparencia/actions/workflows/ci.yml/badge.svg)](https://github.com/queiroz107911/painel-transparencia/actions/workflows/ci.yml)

## Fluxo de dados

```
API PNCP
  └─ job de ingestão (paginação + retry/backoff)
       └─ stg_contratacao (staging, truncado a cada execução)
            └─ MERGE idempotente
                 ├─ orgao
                 └─ contratacao
                      └─ API Fastify (endpoints REST)
                           └─ Painel Next.js (Server Components)
```

## Stack

| Camada       | Tecnologia                        |
|--------------|-----------------------------------|
| Banco        | SQL Server 2022 (Docker)          |
| Backend      | Node.js 20, TypeScript, Fastify   |
| Frontend     | Next.js (App Router)              |
| Testes       | Vitest (offline, sem banco)       |
| CI           | GitHub Actions                    |
| Containers   | Docker + Docker Compose           |

## Pré-requisitos

- Docker Desktop com suporte a Linux containers
- Node.js 20 (para desenvolvimento local)

## Como rodar

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` e preencha `MSSQL_SA_PASSWORD` com uma senha forte (mínimo 8 caracteres, maiúscula, minúscula, número e símbolo).

### 2. Subir os containers

```bash
docker compose up -d
```

Aguarde o `painel-sqlserver` ficar `healthy` (pode levar ~30 s na primeira vez):

```bash
docker compose ps
```

### 3. Criar o schema do banco (só na primeira vez)

```bash
docker exec -i painel-sqlserver bash -c \
  '/opt/mssql-tools18/bin/sqlcmd -C -b -S localhost -U sa -P "$MSSQL_SA_PASSWORD"' \
  < api/sql/001_schema.sql
```

### 4. Executar a ingestão

Dentro de `api/`, rode o job manualmente para popular o banco:

```bash
# Instalar dependências (primeira vez)
cd api && npm ci

# Ingerir um dia de dados (modalidade 6 = Pregão Eletrônico)
npm run ingest -- --de 2026-09-01 --ate 2026-09-01 --modalidade 6
```

### 5. Acessar o painel

- **Painel:** http://localhost:3000
- **API:** http://localhost:3001

## Desenvolvimento local (sem Docker)

```bash
# Terminal 1 — banco
docker compose up sqlserver -d

# Terminal 2 — API
cd api && npm ci && npm run dev

# Terminal 3 — frontend
cd web && npm ci && npm run dev
```

## Testes

```bash
cd api && npm test
```

Os testes passam sem internet e sem banco (fetch e repositório são mockados).

## Endpoints da API

| Método | Rota                     | Descrição                                  |
|--------|--------------------------|--------------------------------------------|
| GET    | `/saude`                 | Health check                               |
| GET    | `/contratacoes`          | Lista com filtros, paginação e total       |
| GET    | `/contratacoes/resumo`   | Valor e quantidade por órgão e modalidade  |
| GET    | `/orgaos`                | Lista de órgãos para o filtro              |

Parâmetros de `/contratacoes`: `orgao` (CNPJ), `modalidade`, `de`, `ate`, `pagina`, `tamanho` (máx. 100).

## Decisões de projeto

**Sem ORM — SQL à mão com parâmetros**
Consultas escritas diretamente com `mssql` e `request.input(...)`. Nunca concatenação de valores. Facilita auditoria e deixa explícito o que vai para o banco.

**Staging + MERGE idempotente**
Cada execução do job trunca `stg_contratacao`, recarrega os dados da API e usa `MERGE` para atualizar `orgao` e `contratacao`. Rodar duas vezes com a mesma janela de datas não gera duplicatas.

**Retry com backoff exponencial**
A API do PNCP limita requisições com agressividade (HTTP 429). O `fetchComRetry` espera 1 s, 2 s, 4 s… antes de tentar novamente. Erros 4xx não são repetidos.

**Filtros na URL (Server Components)**
A página de lista guarda os filtros nos `searchParams` da URL. Não há estado no navegador — o formulário usa `method="get"`. Qualquer URL pode ser copiada e compartilhada com os mesmos filtros ativos.

**Gráficos em SVG puro**
Sem biblioteca de gráfico. O resumo renderiza barras horizontais diretamente em SVG no servidor.

## Variáveis de ambiente

| Variável             | Descrição                         | Padrão    |
|----------------------|-----------------------------------|-----------|
| `MSSQL_SA_PASSWORD`  | Senha do usuário `sa` do SQL Server | —        |
| `DB_HOST`            | Host do banco                     | localhost |
| `DB_PORT`            | Porta do banco                    | 1433      |
| `DB_NAME`            | Nome do banco                     | painel    |
| `API_PORT`           | Porta da API Fastify               | 3001      |

> As variáveis do `.env` são de desenvolvimento. Nunca commite senhas reais.
