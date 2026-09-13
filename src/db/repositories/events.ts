import { getDatabase } from '../index';
import { newId } from '@/lib/id';
import { addDays, fromISODate, startOfDay, toISODate } from '@/lib/date';
import type { CalendarEvent, EventCategory, Recurrence } from '@/lib/types';

export interface EventInput {
  title: string;
  description?: string | null;
  category: EventCategory;
  company?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at?: string | null;
  all_day?: boolean;
  recurrence: Recurrence;
  recurrence_until?: string | null;
  reminders: number[];
  stress_rating?: number | null;
}

/** Uma aparicao concreta de um evento em uma data especifica. */
export interface EventOccurrence {
  event: CalendarEvent;
  start: Date;
  end: Date | null;
  dateKey: string;
  isRepeat: boolean;
}

export async function listAllEvents(): Promise<CalendarEvent[]> {
  const db = await getDatabase();
  return db.getAllAsync<CalendarEvent>('SELECT * FROM events ORDER BY starts_at ASC');
}

export async function getEvent(id: string): Promise<CalendarEvent | null> {
  const db = await getDatabase();
  return (await db.getFirstAsync<CalendarEvent>('SELECT * FROM events WHERE id = ?', [id])) ?? null;
}

export async function createEvent(input: EventInput): Promise<string> {
  const db = await getDatabase();
  const id = newId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO events (id, title, description, category, company, location, starts_at, ends_at,
      all_day, recurrence, recurrence_until, reminders, stress_rating, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title.trim(),
      input.description?.trim() || null,
      input.category,
      input.company || null,
      input.location?.trim() || null,
      input.starts_at,
      input.ends_at || null,
      input.all_day ? 1 : 0,
      input.recurrence,
      input.recurrence_until || null,
      JSON.stringify(input.reminders ?? []),
      input.stress_rating ?? null,
      now,
      now,
    ],
  );
  return id;
}

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE events SET title = ?, description = ?, category = ?, company = ?, location = ?,
      starts_at = ?, ends_at = ?, all_day = ?, recurrence = ?, recurrence_until = ?,
      reminders = ?, stress_rating = ?, updated_at = ? WHERE id = ?`,
    [
      input.title.trim(),
      input.description?.trim() || null,
      input.category,
      input.company || null,
      input.location?.trim() || null,
      input.starts_at,
      input.ends_at || null,
      input.all_day ? 1 : 0,
      input.recurrence,
      input.recurrence_until || null,
      JSON.stringify(input.reminders ?? []),
      input.stress_rating ?? null,
      new Date().toISOString(),
      id,
    ],
  );
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
}

export async function setStressRating(id: string, rating: number | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE events SET stress_rating = ?, updated_at = ? WHERE id = ?', [
    rating,
    new Date().toISOString(),
    id,
  ]);
}

function addMonthsKeepingDay(base: Date, months: number): Date {
  const target = new Date(base);
  const day = base.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

/**
 * Expande um evento nas ocorrencias que caem dentro do intervalo pedido.
 * Eventos sem recorrencia devolvem no maximo uma ocorrencia.
 */
export function expandEvent(event: CalendarEvent, from: Date, to: Date): EventOccurrence[] {
  const first = new Date(event.starts_at);
  if (Number.isNaN(first.getTime())) return [];

  const durationMs = event.ends_at
    ? Math.max(0, new Date(event.ends_at).getTime() - first.getTime())
    : 0;
  const limit = event.recurrence_until ? fromISODate(event.recurrence_until) : null;
  const rangeStart = startOfDay(from);
  const rangeEnd = new Date(to);
  rangeEnd.setHours(23, 59, 59, 999);

  const build = (start: Date, isRepeat: boolean): EventOccurrence => ({
    event,
    start,
    end: event.ends_at ? new Date(start.getTime() + durationMs) : null,
    dateKey: toISODate(start),
    isRepeat,
  });

  if (event.recurrence === 'unico') {
    return first >= rangeStart && first <= rangeEnd ? [build(first, false)] : [];
  }

  const out: EventOccurrence[] = [];
  const maxIterations = 800;
  let cursor = new Date(first);
  let index = 0;

  while (index < maxIterations) {
    if (cursor > rangeEnd) break;
    if (limit && startOfDay(cursor) > startOfDay(limit)) break;
    if (cursor >= rangeStart) out.push(build(new Date(cursor), index > 0));

    index += 1;
    switch (event.recurrence) {
      case 'diario':
        cursor = addDays(first, index);
        break;
      case 'semanal':
        cursor = addDays(first, index * 7);
        break;
      case 'quinzenal':
        cursor = addDays(first, index * 14);
        break;
      case 'mensal':
        cursor = addMonthsKeepingDay(first, index);
        break;
      case 'anual':
        cursor = addMonthsKeepingDay(first, index * 12);
        break;
      default:
        index = maxIterations;
    }
  }

  return out;
}

/** Todas as ocorrencias de todos os eventos dentro de um intervalo, ordenadas. */
export async function occurrencesInRange(from: Date, to: Date): Promise<EventOccurrence[]> {
  const events = await listAllEvents();
  const out: EventOccurrence[] = [];
  for (const event of events) {
    out.push(...expandEvent(event, from, to));
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export async function occurrencesOnDay(date: Date): Promise<EventOccurrence[]> {
  return occurrencesInRange(date, date);
}

/** Agrupa ocorrencias por chave YYYY-MM-DD, para pintar a grade do mes. */
export function groupByDate(occurrences: EventOccurrence[]): Map<string, EventOccurrence[]> {
  const map = new Map<string, EventOccurrence[]>();
  for (const item of occurrences) {
    const list = map.get(item.dateKey);
    if (list) list.push(item);
    else map.set(item.dateKey, [item]);
  }
  return map;
}
