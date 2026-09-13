import { getDatabase } from '../index';
import { newId } from '@/lib/id';
import { addDays, toISODate } from '@/lib/date';
import type { HealthActivity, HealthDay } from '@/lib/types';

export type HealthDayInput = Partial<Omit<HealthDay, 'created_at' | 'updated_at'>> & {
  date: string;
};

const NUMERIC_FIELDS = [
  'recovery',
  'hrv',
  'rhr',
  'sleep_hours',
  'sleep_need_hours',
  'sleep_performance',
  'strain',
  'calories',
  'respiratory_rate',
  'spo2',
  'skin_temp',
] as const;

export type HealthMetric = (typeof NUMERIC_FIELDS)[number];

/** Grava ou atualiza o dia, preservando valores ja existentes quando o novo vem vazio. */
export async function upsertHealthDay(input: HealthDayInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const existing = await getHealthDay(input.date);

  const merged: Record<string, unknown> = {};
  for (const field of NUMERIC_FIELDS) {
    const incoming = input[field];
    merged[field] =
      incoming === undefined || incoming === null || Number.isNaN(Number(incoming))
        ? (existing?.[field] ?? null)
        : Number(incoming);
  }

  await db.runAsync(
    `INSERT INTO health_days (date, recovery, hrv, rhr, sleep_hours, sleep_need_hours,
       sleep_performance, strain, calories, respiratory_rate, spo2, skin_temp,
       notes, source, raw_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       recovery = excluded.recovery, hrv = excluded.hrv, rhr = excluded.rhr,
       sleep_hours = excluded.sleep_hours, sleep_need_hours = excluded.sleep_need_hours,
       sleep_performance = excluded.sleep_performance, strain = excluded.strain,
       calories = excluded.calories, respiratory_rate = excluded.respiratory_rate,
       spo2 = excluded.spo2, skin_temp = excluded.skin_temp,
       notes = excluded.notes, source = excluded.source, raw_text = excluded.raw_text,
       updated_at = excluded.updated_at`,
    [
      input.date,
      merged.recovery as number | null,
      merged.hrv as number | null,
      merged.rhr as number | null,
      merged.sleep_hours as number | null,
      merged.sleep_need_hours as number | null,
      merged.sleep_performance as number | null,
      merged.strain as number | null,
      merged.calories as number | null,
      merged.respiratory_rate as number | null,
      merged.spo2 as number | null,
      merged.skin_temp as number | null,
      input.notes ?? existing?.notes ?? null,
      input.source ?? existing?.source ?? 'manual',
      input.raw_text ?? existing?.raw_text ?? null,
      existing?.created_at ?? now,
      now,
    ],
  );
}

export async function getHealthDay(date: string): Promise<HealthDay | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<HealthDay>('SELECT * FROM health_days WHERE date = ?', [date])) ?? null
  );
}

export async function deleteHealthDay(date: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM health_days WHERE date = ?', [date]);
  await db.runAsync('DELETE FROM health_activities WHERE date = ?', [date]);
}

export async function listHealthDays(fromISO: string, toISO: string): Promise<HealthDay[]> {
  const db = await getDatabase();
  return db.getAllAsync<HealthDay>(
    'SELECT * FROM health_days WHERE date BETWEEN ? AND ? ORDER BY date ASC',
    [fromISO, toISO],
  );
}

export async function recentHealthDays(days: number): Promise<HealthDay[]> {
  const to = new Date();
  const from = addDays(to, -(days - 1));
  return listHealthDays(toISODate(from), toISODate(to));
}

export async function latestHealthDay(): Promise<HealthDay | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<HealthDay>('SELECT * FROM health_days ORDER BY date DESC LIMIT 1')) ??
    null
  );
}

export async function addActivity(input: {
  date: string;
  name: string;
  strain?: number | null;
  duration_min?: number | null;
  avg_hr?: number | null;
  max_hr?: number | null;
  calories?: number | null;
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO health_activities (id, date, name, strain, duration_min, avg_hr, max_hr, calories, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId(),
      input.date,
      input.name.trim(),
      input.strain ?? null,
      input.duration_min ?? null,
      input.avg_hr ?? null,
      input.max_hr ?? null,
      input.calories ?? null,
      new Date().toISOString(),
    ],
  );
}

export async function listActivities(fromISO: string, toISO: string): Promise<HealthActivity[]> {
  const db = await getDatabase();
  return db.getAllAsync<HealthActivity>(
    'SELECT * FROM health_activities WHERE date BETWEEN ? AND ? ORDER BY date DESC',
    [fromISO, toISO],
  );
}

export async function deleteActivity(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM health_activities WHERE id = ?', [id]);
}

export interface MetricSummary {
  metric: HealthMetric;
  media: number | null;
  minimo: number | null;
  maximo: number | null;
  ultimo: number | null;
  amostras: number;
  /** Variacao percentual contra o periodo imediatamente anterior. */
  variacao: number | null;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

/** Consolida uma metrica no periodo e compara com o periodo anterior de mesmo tamanho. */
export function summarizeMetric(
  metric: HealthMetric,
  periodo: HealthDay[],
  anterior: HealthDay[] = [],
): MetricSummary {
  const values = periodo
    .map((d) => d[metric])
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  const previous = anterior
    .map((d) => d[metric])
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));

  const media = average(values);
  const mediaAnterior = average(previous);

  return {
    metric,
    media,
    minimo: values.length ? Math.min(...values) : null,
    maximo: values.length ? Math.max(...values) : null,
    ultimo: values.length ? values[values.length - 1] : null,
    amostras: values.length,
    variacao:
      media !== null && mediaAnterior !== null && mediaAnterior !== 0
        ? ((media - mediaAnterior) / mediaAnterior) * 100
        : null,
  };
}

export const METRIC_LABELS: Record<HealthMetric, { label: string; unit: string; short: string }> = {
  recovery: { label: 'Recuperacao', unit: '%', short: 'Recup.' },
  hrv: { label: 'Variabilidade cardiaca', unit: 'ms', short: 'VFC' },
  rhr: { label: 'Frequencia em repouso', unit: 'bpm', short: 'FC rep.' },
  sleep_hours: { label: 'Horas de sono', unit: 'h', short: 'Sono' },
  sleep_need_hours: { label: 'Sono necessario', unit: 'h', short: 'Necessidade' },
  sleep_performance: { label: 'Desempenho do sono', unit: '%', short: 'Desemp. sono' },
  strain: { label: 'Esforco diario', unit: '', short: 'Esforco' },
  calories: { label: 'Calorias', unit: 'kcal', short: 'Calorias' },
  respiratory_rate: { label: 'Frequencia respiratoria', unit: 'rpm', short: 'Respiracao' },
  spo2: { label: 'Oxigenacao', unit: '%', short: 'SpO2' },
  skin_temp: { label: 'Temperatura da pele', unit: 'C', short: 'Temp.' },
};

export const PRIMARY_METRICS: HealthMetric[] = [
  'recovery',
  'hrv',
  'rhr',
  'sleep_hours',
  'sleep_performance',
  'strain',
];
