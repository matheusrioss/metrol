import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { listAllEvents, expandEvent } from '@/db/repositories/events';
import { listBirthdays } from '@/db/repositories/birthdays';
import { addDays, formatarHora, proximoAniversario } from '@/lib/date';
import { parseJsonArray, REMINDER_OPTIONS } from '@/lib/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function pedirPermissaoNotificacoes(): Promise<boolean> {
  try {
    const atual = await Notifications.getPermissionsAsync();
    if (atual.granted) return true;
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.granted;
  } catch {
    return false;
  }
}

async function agendar(titulo: string, corpo: string, quando: Date): Promise<boolean> {
  if (quando.getTime() <= Date.now() + 5000) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: corpo, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: quando,
      },
    });
    return true;
  } catch {
    return false;
  }
}

const rotuloAntecedencia = (minutos: number) =>
  REMINDER_OPTIONS.find((o) => o.minutes === minutos)?.label ?? `${minutos} minutos antes`;

export interface ResultadoAgendamento {
  agendados: number;
  permissao: boolean;
}

/**
 * Recalcula todos os lembretes do zero.
 *
 * Sem servidor, os avisos sao notificacoes locais agendadas pelo proprio
 * aparelho. Por isso limpamos e reagendamos a cada mudanca relevante: e a
 * unica forma de manter a fila fiel ao que esta no banco.
 */
export async function sincronizarLembretes(diasAFrente = 120): Promise<ResultadoAgendamento> {
  const permissao = await pedirPermissaoNotificacoes();
  if (!permissao) return { agendados: 0, permissao: false };

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    return { agendados: 0, permissao: false };
  }

  const agora = new Date();
  const limite = addDays(agora, diasAFrente);
  let agendados = 0;

  const eventos = await listAllEvents();
  for (const evento of eventos) {
    const antecedencias = parseJsonArray<number>(evento.reminders);
    if (!antecedencias.length) continue;

    for (const oc of expandEvent(evento, agora, limite)) {
      for (const minutos of antecedencias) {
        const quando = new Date(oc.start.getTime() - minutos * 60000);
        const horario = evento.all_day ? '' : ` as ${formatarHora(oc.start)}`;
        const corpo =
          minutos === 0
            ? `Comecando agora${horario ? `,${horario}` : ''}.`
            : `${rotuloAntecedencia(minutos)}${horario ? `, ${horario.trim()}` : ''}.`;
        if (await agendar(evento.title, corpo, quando)) agendados += 1;
      }
    }
  }

  const aniversarios = await listBirthdays();
  for (const aniv of aniversarios) {
    const antecedencias = parseJsonArray<number>(aniv.reminders);
    if (!antecedencias.length) continue;

    for (let ano = 0; ano < 2; ano += 1) {
      const base = addDays(agora, ano * 365);
      const data = proximoAniversario(aniv.birth_month, aniv.birth_day, base);
      data.setHours(9, 0, 0, 0);
      if (data > limite) continue;

      for (const minutos of antecedencias) {
        const quando = new Date(data.getTime() - minutos * 60000);
        const idade = aniv.birth_year ? ` Completa ${data.getFullYear() - aniv.birth_year} anos.` : '';
        const corpo =
          minutos === 0
            ? `Hoje e o aniversario.${idade}`
            : `${rotuloAntecedencia(minutos)}.${idade}`;
        if (await agendar(`Aniversario de ${aniv.person_name}`, corpo, quando)) agendados += 1;
      }
    }
  }

  return { agendados, permissao: true };
}

export async function contarLembretesAgendados(): Promise<number> {
  try {
    const lista = await Notifications.getAllScheduledNotificationsAsync();
    return lista.length;
  } catch {
    return 0;
  }
}

export const notificacoesLimitadas = Platform.OS === 'android';
