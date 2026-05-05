import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { drizzle, type SqlJsDatabase as DrizzleDb } from 'drizzle-orm/sql-js';
import * as schema from '../drizzle/schema';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'stoll.db');

let sqlDb: SqlJsDatabase;
let drizzleDb: DrizzleDb<typeof schema>;

let initialized = false;

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  drizzleDb = drizzle(sqlDb, { schema });

  setInterval(() => {
    saveDatabase();
  }, 10000);

  initialized = true;
  console.log('📦 Banco SQLite (sql.js) iniciado');
}

function saveDatabase(): void {
  if (sqlDb) {
    const data = sqlDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

// Função segura para acessar o banco após inicialização
export function getDb(): DrizzleDb<typeof schema> {
  if (!initialized || !drizzleDb) {
    throw new Error('Banco de dados não inicializado. Execute initDatabase() primeiro.');
  }
  return drizzleDb;
}

export const db = new Proxy({} as Awaited<ReturnType<typeof getDb>>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});