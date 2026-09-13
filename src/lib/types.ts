/** Antecedencias de lembrete, em minutos antes do evento. */
export const REMINDER_OPTIONS = [
  { minutes: 10080, label: '1 semana antes' },
  { minutes: 4320, label: '3 dias antes' },
  { minutes: 2880, label: '2 dias antes' },
  { minutes: 1440, label: '1 dia antes' },
  { minutes: 180, label: '3 horas antes' },
  { minutes: 120, label: '2 horas antes' },
  { minutes: 60, label: '1 hora antes' },
  { minutes: 30, label: '30 minutos antes' },
  { minutes: 10, label: '10 minutos antes' },
  { minutes: 5, label: '5 minutos antes' },
  { minutes: 0, label: 'Na hora do evento' },
] as const;

export type Recurrence = 'unico' | 'diario' | 'semanal' | 'quinzenal' | 'mensal' | 'anual';

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'unico', label: 'Evento unico' },
  { value: 'diario', label: 'Todos os dias' },
  { value: 'semanal', label: 'Toda semana' },
  { value: 'quinzenal', label: 'A cada 15 dias' },
  { value: 'mensal', label: 'Todo mes' },
  { value: 'anual', label: 'Todo ano' },
];

export type EventCategory =
  | 'reuniao'
  | 'medico'
  | 'aniversario'
  | 'viagem'
  | 'pessoal'
  | 'compromisso';

export const CATEGORY_OPTIONS: { value: EventCategory; label: string; icon: string }[] = [
  { value: 'reuniao', label: 'Reuniao', icon: 'people-outline' },
  { value: 'medico', label: 'Medico', icon: 'medkit-outline' },
  { value: 'viagem', label: 'Viagem', icon: 'airplane-outline' },
  { value: 'compromisso', label: 'Compromisso', icon: 'briefcase-outline' },
  { value: 'pessoal', label: 'Pessoal', icon: 'heart-outline' },
  { value: 'aniversario', label: 'Aniversario', icon: 'gift-outline' },
];

/** As unidades do grupo empresarial, usadas para classificar o conhecimento. */
export type Company =
  | 'industria'
  | 'engenharia'
  | 'administracao'
  | 'software'
  | 'grupo'
  | 'externo';

export const COMPANY_OPTIONS: { value: Company; label: string; short: string }[] = [
  { value: 'industria', label: 'Industria de sinalizacao', short: 'Industria' },
  { value: 'engenharia', label: 'Engenharia aeroportuaria', short: 'Engenharia' },
  { value: 'administracao', label: 'Administracao de aeroportos', short: 'Administracao' },
  { value: 'software', label: 'Tecnologia e software', short: 'Software' },
  { value: 'grupo', label: 'Holding e grupo', short: 'Grupo' },
  { value: 'externo', label: 'Externo e parceiros', short: 'Externo' },
];

export function companyLabel(value: string): string {
  return COMPANY_OPTIONS.find((c) => c.value === value)?.short ?? 'Grupo';
}

export interface AppUser {
  id: number;
  name: string;
  email: string | null;
  biometric_ready: number;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  company: Company | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: number;
  recurrence: Recurrence;
  recurrence_until: string | null;
  reminders: string;
  stress_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface Birthday {
  id: string;
  person_name: string;
  birth_month: number;
  birth_day: number;
  birth_year: number | null;
  relationship: string | null;
  notes: string | null;
  reminders: string;
  created_at: string;
  updated_at: string;
}

export interface HealthDay {
  date: string;
  recovery: number | null;
  hrv: number | null;
  rhr: number | null;
  sleep_hours: number | null;
  sleep_need_hours: number | null;
  sleep_performance: number | null;
  strain: number | null;
  calories: number | null;
  respiratory_rate: number | null;
  spo2: number | null;
  skin_temp: number | null;
  notes: string | null;
  source: string;
  raw_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthActivity {
  id: string;
  date: string;
  name: string;
  strain: number | null;
  duration_min: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
  created_at: string;
}

export interface MeetingNote {
  id: string;
  title: string;
  company: Company;
  meeting_date: string;
  participants: string;
  topics: string;
  summary: string;
  decisions: string | null;
  action_items: string | null;
  raw_text: string | null;
  source: string;
  event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'watson';
  content: string;
  context_ref: string | null;
  created_at: string;
}

export interface Insight {
  id: string;
  kind: string;
  severity: 'critico' | 'atencao' | 'bom' | 'neutro';
  title: string;
  body: string;
  related_date: string | null;
  dismissed: number;
  created_at: string;
}

/** Converte com seguranca um campo TEXT que guarda JSON. */
export function parseJsonArray<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}
