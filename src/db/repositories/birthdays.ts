import { getDatabase } from '../index';
import { newId } from '@/lib/id';
import { diffInDays, proximoAniversario } from '@/lib/date';
import type { Birthday } from '@/lib/types';

export interface BirthdayInput {
  person_name: string;
  birth_month: number;
  birth_day: number;
  birth_year?: number | null;
  relationship?: string | null;
  notes?: string | null;
  reminders: number[];
}

export interface UpcomingBirthday {
  birthday: Birthday;
  nextDate: Date;
  daysUntil: number;
  turningAge: number | null;
}

export async function listBirthdays(): Promise<Birthday[]> {
  const db = await getDatabase();
  return db.getAllAsync<Birthday>(
    'SELECT * FROM birthdays ORDER BY birth_month ASC, birth_day ASC',
  );
}

export async function createBirthday(input: BirthdayInput): Promise<string> {
  const db = await getDatabase();
  const id = newId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO birthdays (id, person_name, birth_month, birth_day, birth_year, relationship, notes, reminders, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.person_name.trim(),
      input.birth_month,
      input.birth_day,
      input.birth_year ?? null,
      input.relationship?.trim() || null,
      input.notes?.trim() || null,
      JSON.stringify(input.reminders ?? []),
      now,
      now,
    ],
  );
  return id;
}

export async function updateBirthday(id: string, input: BirthdayInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE birthdays SET person_name = ?, birth_month = ?, birth_day = ?, birth_year = ?,
      relationship = ?, notes = ?, reminders = ?, updated_at = ? WHERE id = ?`,
    [
      input.person_name.trim(),
      input.birth_month,
      input.birth_day,
      input.birth_year ?? null,
      input.relationship?.trim() || null,
      input.notes?.trim() || null,
      JSON.stringify(input.reminders ?? []),
      new Date().toISOString(),
      id,
    ],
  );
}

export async function deleteBirthday(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM birthdays WHERE id = ?', [id]);
}

/** Aniversarios ordenados pelos que chegam primeiro a partir de hoje. */
export async function upcomingBirthdays(limit?: number): Promise<UpcomingBirthday[]> {
  const all = await listBirthdays();
  const hoje = new Date();
  const mapped = all.map((birthday) => {
    const nextDate = proximoAniversario(birthday.birth_month, birthday.birth_day, hoje);
    return {
      birthday,
      nextDate,
      daysUntil: diffInDays(hoje, nextDate),
      turningAge: birthday.birth_year ? nextDate.getFullYear() - birthday.birth_year : null,
    };
  });
  mapped.sort((a, b) => a.daysUntil - b.daysUntil);
  return typeof limit === 'number' ? mapped.slice(0, limit) : mapped;
}
