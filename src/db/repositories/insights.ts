import { getDatabase } from '../index';
import { newId } from '@/lib/id';
import type { Insight } from '@/lib/types';

export async function saveInsight(input: Omit<Insight, 'id' | 'created_at' | 'dismissed'>) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO insights (id, kind, severity, title, body, related_date, dismissed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      newId(),
      input.kind,
      input.severity,
      input.title,
      input.body,
      input.related_date ?? null,
      new Date().toISOString(),
    ],
  );
}

export async function activeInsights(limit = 10): Promise<Insight[]> {
  const db = await getDatabase();
  return db.getAllAsync<Insight>(
    'SELECT * FROM insights WHERE dismissed = 0 ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
}

export async function dismissInsight(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE insights SET dismissed = 1 WHERE id = ?', [id]);
}
