import Database from '@tauri-apps/plugin-sql';

const DB_URL = 'sqlite:gate_prep.db';

let dbPromise: Promise<Database> | null = null;

function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

export async function query<T = unknown>(sql: string, args: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, args);
}

export async function execute(sql: string, args: unknown[] = []) {
  const db = await getDb();
  return db.execute(sql, args);
}
