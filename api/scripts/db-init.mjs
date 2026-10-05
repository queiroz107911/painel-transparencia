// Aplica todos os arquivos sql/ no SQL Server via docker exec
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Lê o .env da raiz do projeto (api/../.env)
const envPath = resolve(__dirname, '../../.env');
const envContent = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const password = env['MSSQL_SA_PASSWORD'];
if (!password) throw new Error('MSSQL_SA_PASSWORD não definida no .env');

const sqlFiles = ['001_schema.sql'];

for (const arquivo of sqlFiles) {
  const sqlPath = resolve(__dirname, '../sql', arquivo);
  const sql = readFileSync(sqlPath, 'utf8');
  console.log(`Aplicando ${arquivo}...`);
  execSync(
    `docker exec -i painel-sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -C -b -S localhost -U sa -P "${password}"'`,
    { input: sql, stdio: ['pipe', 'inherit', 'inherit'] },
  );
  console.log(`${arquivo} aplicado com sucesso`);
}
