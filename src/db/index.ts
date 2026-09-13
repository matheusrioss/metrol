import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, MIGRATIONS } from './schema';

let instance: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ id: number }>('SELECT id FROM _migrations');
  const done = new Set(applied.map((row) => row.id));

  for (const migration of MIGRATIONS) {
    if (done.has(migration.id)) continue;
    await db.execAsync(migration.sql);
    await db.runAsync('INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)', [
      migration.id,
      migration.name,
      new Date().toISOString(),
    ]);
  }
}

/** Abre (uma unica vez) o banco local e garante que as migracoes rodaram. */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (instance) return Promise.resolve(instance);
  if (opening) return opening;

  opening = (async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await migrate(db);
    instance = db;
    return db;
  })();

  return opening;
}

/** Fecha o banco. Usado apenas ao restaurar um backup por cima do arquivo. */
export async function closeDatabase() {
  if (instance) {
    await instance.closeAsync();
    instance = null;
    opening = null;
  }
}

export { DATABASE_NAME };
