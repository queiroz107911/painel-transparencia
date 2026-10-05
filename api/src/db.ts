import sql from 'mssql';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
loadEnv({ path: resolve(__dirname, '../../.env') });

function exigirEnv(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida`);
  return valor;
}

const dbConfig: sql.config = {
  user: 'sa',
  password: exigirEnv('MSSQL_SA_PASSWORD'),
  server: process.env['DB_HOST'] ?? 'localhost',
  port: Number(process.env['DB_PORT'] ?? 1433),
  database: process.env['DB_NAME'] ?? 'painel',
  options: { trustServerCertificate: true },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(dbConfig);
  }
  return pool;
}

export async function fecharPool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}
