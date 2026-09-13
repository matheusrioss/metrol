import { DatabaseSync } from 'node:sqlite';

/** Reimplementa a superficie do expo-sqlite sobre o SQLite do Node. */
class Adaptador {
  constructor() { this.db = new DatabaseSync(':memory:'); }
  async execAsync(sql) { this.db.exec(sql); }
  async runAsync(sql, params = []) {
    const r = this.db.prepare(sql).run(...params);
    return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
  }
  async getAllAsync(sql, params = []) { return this.db.prepare(sql).all(...params); }
  async getFirstAsync(sql, params = []) { return this.db.prepare(sql).get(...params) ?? null; }
  async withTransactionAsync(fn) {
    this.db.exec('BEGIN');
    try { await fn(); this.db.exec('COMMIT'); }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  async closeAsync() { this.db.close(); }
}

export async function openDatabaseAsync() { return new Adaptador(); }
