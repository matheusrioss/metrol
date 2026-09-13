/**
 * Utilitarios de data em portugues do Brasil, sem dependencias externas.
 * Todas as funcoes trabalham no fuso horario do proprio aparelho.
 */

export const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
export const DIAS_SEMANA = [
  'domingo',
  'segunda-feira',
  'terca-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sabado',
];
export const MESES = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
export const MESES_CURTO = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Converte uma data para a chave YYYY-MM-DD usada no banco. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Le uma chave YYYY-MM-DD como data local (sem escorregar de fuso). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function hojeISO(): string {
  return toISODate(new Date());
}

export function addDays(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function addMonths(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + amount);
  return copy;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

export function diffInDays(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / 86400000);
}

/** Matriz de 6 semanas x 7 dias cobrindo o mes, para a grade do calendario. */
export function monthMatrix(reference: Date): Date[][] {
  const first = startOfMonth(reference);
  const cursor = addDays(first, -first.getDay());
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d += 1) {
      week.push(addDays(cursor, w * 7 + d));
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatarHora(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatarDataCurta(date: Date): string {
  return `${pad(date.getDate())} ${MESES_CURTO[date.getMonth()]}`;
}

export function formatarDataLonga(date: Date): string {
  return `${date.getDate()} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`;
}

export function formatarDiaCompleto(date: Date): string {
  const dia = DIAS_SEMANA[date.getDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${date.getDate()} de ${MESES[date.getMonth()]}`;
}

export function formatarMesAno(date: Date): string {
  const mes = MESES[date.getMonth()];
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${date.getFullYear()}`;
}

/** "hoje", "amanha", "em 3 dias", "ha 2 dias". */
export function descreverDistancia(alvo: Date, base = new Date()): string {
  const dias = diffInDays(base, alvo);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanha';
  if (dias === -1) return 'ontem';
  if (dias > 1 && dias < 30) return `em ${dias} dias`;
  if (dias < -1 && dias > -30) return `ha ${Math.abs(dias)} dias`;
  if (dias >= 30) return `em ${Math.round(dias / 30)} meses`;
  return `ha ${Math.round(Math.abs(dias) / 30)} meses`;
}

/** Combina uma data (YYYY-MM-DD) com uma hora (HH:MM) em um Date local. */
export function combinarDataHora(isoDate: string, hora: string): Date {
  const base = fromISODate(isoDate);
  const [h, m] = hora.split(':').map(Number);
  base.setHours(h || 0, m || 0, 0, 0);
  return base;
}

/** Proxima ocorrencia de um aniversario a partir de hoje. */
export function proximoAniversario(mes: number, dia: number, base = new Date()): Date {
  const ano = base.getFullYear();
  let alvo = new Date(ano, mes - 1, dia);
  if (diffInDays(base, alvo) < 0) {
    alvo = new Date(ano + 1, mes - 1, dia);
  }
  return alvo;
}
