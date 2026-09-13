import { getDatabase } from '../index';
import { newId } from '@/lib/id';
import type { Company, MeetingNote } from '@/lib/types';

export interface MeetingNoteInput {
  title: string;
  company: Company;
  meeting_date: string;
  participants: string[];
  topics: string[];
  summary: string;
  decisions?: string | null;
  action_items?: string | null;
  raw_text?: string | null;
  source?: string;
  event_id?: string | null;
}

async function reindex(noteId: string) {
  const db = await getDatabase();
  const note = await db.getFirstAsync<MeetingNote>('SELECT * FROM meeting_notes WHERE id = ?', [
    noteId,
  ]);
  await db.runAsync('DELETE FROM notes_search WHERE note_id = ?', [noteId]);
  if (!note) return;
  await db.runAsync(
    `INSERT INTO notes_search (note_id, title, summary, decisions, action_items, participants, topics)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      note.id,
      note.title,
      note.summary,
      note.decisions ?? '',
      note.action_items ?? '',
      (JSON.parse(note.participants || '[]') as string[]).join(' '),
      (JSON.parse(note.topics || '[]') as string[]).join(' '),
    ],
  );
}

export async function createNote(input: MeetingNoteInput): Promise<string> {
  const db = await getDatabase();
  const id = newId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO meeting_notes (id, title, company, meeting_date, participants, topics, summary,
      decisions, action_items, raw_text, source, event_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title.trim(),
      input.company,
      input.meeting_date,
      JSON.stringify(input.participants ?? []),
      JSON.stringify(input.topics ?? []),
      input.summary.trim(),
      input.decisions?.trim() || null,
      input.action_items?.trim() || null,
      input.raw_text || null,
      input.source ?? 'plaud',
      input.event_id ?? null,
      now,
      now,
    ],
  );
  await reindex(id);
  return id;
}

export async function updateNote(id: string, input: MeetingNoteInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE meeting_notes SET title = ?, company = ?, meeting_date = ?, participants = ?,
      topics = ?, summary = ?, decisions = ?, action_items = ?, raw_text = ?, event_id = ?,
      updated_at = ? WHERE id = ?`,
    [
      input.title.trim(),
      input.company,
      input.meeting_date,
      JSON.stringify(input.participants ?? []),
      JSON.stringify(input.topics ?? []),
      input.summary.trim(),
      input.decisions?.trim() || null,
      input.action_items?.trim() || null,
      input.raw_text || null,
      input.event_id ?? null,
      new Date().toISOString(),
      id,
    ],
  );
  await reindex(id);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM meeting_notes WHERE id = ?', [id]);
  await db.runAsync('DELETE FROM notes_search WHERE note_id = ?', [id]);
}

export async function getNote(id: string): Promise<MeetingNote | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<MeetingNote>('SELECT * FROM meeting_notes WHERE id = ?', [id])) ?? null
  );
}

export async function listNotes(filter?: {
  company?: Company | 'todas';
  limit?: number;
}): Promise<MeetingNote[]> {
  const db = await getDatabase();
  const limit = filter?.limit ?? 200;
  if (filter?.company && filter.company !== 'todas') {
    return db.getAllAsync<MeetingNote>(
      'SELECT * FROM meeting_notes WHERE company = ? ORDER BY meeting_date DESC, created_at DESC LIMIT ?',
      [filter.company, limit],
    );
  }
  return db.getAllAsync<MeetingNote>(
    'SELECT * FROM meeting_notes ORDER BY meeting_date DESC, created_at DESC LIMIT ?',
    [limit],
  );
}

export async function countNotes(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM meeting_notes',
  );
  return row?.total ?? 0;
}

export async function countNotesByCompany(): Promise<Record<string, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ company: string; total: number }>(
    'SELECT company, COUNT(*) AS total FROM meeting_notes GROUP BY company',
  );
  return Object.fromEntries(rows.map((r) => [r.company, r.total]));
}

/** Converte texto livre em uma expressao segura para o FTS5. */
function toMatchQuery(input: string, operator: 'AND' | 'OR'): string | null {
  const tokens = input
    .toLowerCase()
    .replace(/["'()*:^-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
  if (!tokens.length) return null;
  return tokens.map((t) => `${t}*`).join(` ${operator} `);
}

export interface NoteSearchHit {
  note: MeetingNote;
  trecho: string;
}

/**
 * Busca textual na base corporativa. Tenta primeiro casar todos os termos;
 * se nada voltar, relaxa para qualquer um deles.
 */
export async function searchNotes(query: string, limit = 8): Promise<NoteSearchHit[]> {
  const db = await getDatabase();

  for (const operator of ['AND', 'OR'] as const) {
    const match = toMatchQuery(query, operator);
    if (!match) return [];
    try {
      const rows = await db.getAllAsync<{ note_id: string; trecho: string }>(
        `SELECT note_id, snippet(notes_search, 2, '', '', ' ... ', 28) AS trecho
         FROM notes_search WHERE notes_search MATCH ? ORDER BY rank LIMIT ?`,
        [match, limit],
      );
      if (!rows.length) continue;
      const hits: NoteSearchHit[] = [];
      for (const row of rows) {
        const note = await getNote(row.note_id);
        if (note) hits.push({ note, trecho: row.trecho });
      }
      if (hits.length) return hits;
    } catch {
      return [];
    }
  }
  return [];
}
