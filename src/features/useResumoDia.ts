import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { occurrencesInRange, type EventOccurrence } from '@/db/repositories/events';
import { recentHealthDays, latestHealthDay } from '@/db/repositories/health';
import { upcomingBirthdays, type UpcomingBirthday } from '@/db/repositories/birthdays';
import { countNotes } from '@/db/repositories/notes';
import { avaliarSaude, correlacaoCargaRecuperacao, type HealthAlert } from '@/features/analysis';
import { addDays, toISODate } from '@/lib/date';
import type { HealthDay } from '@/lib/types';

export interface ResumoDia {
  carregando: boolean;
  hoje: EventOccurrence[];
  amanha: EventOccurrence[];
  aniversarios: UpcomingBirthday[];
  saudeHoje: HealthDay | null;
  saudeUltima: HealthDay | null;
  serie: HealthDay[];
  alertas: HealthAlert[];
  totalDossies: number;
  horasEmReuniaoHoje: number;
  cargaComparada: { leve: number | null; pesado: number | null; limiar: number } | null;
  recarregar: () => void;
}

/** Tudo que a tela inicial precisa saber sobre o dia, em uma consulta so. */
export function useResumoDia(): ResumoDia {
  const [estado, setEstado] = useState<Omit<ResumoDia, 'recarregar'>>({
    carregando: true,
    hoje: [],
    amanha: [],
    aniversarios: [],
    saudeHoje: null,
    saudeUltima: null,
    serie: [],
    alertas: [],
    totalDossies: 0,
    horasEmReuniaoHoje: 0,
    cargaComparada: null,
  });

  const carregar = useCallback(async () => {
    const agora = new Date();
    const [ocorrencias, aniversarios, serie, ultima, totalDossies, ocorrencias90] =
      await Promise.all([
        occurrencesInRange(agora, addDays(agora, 1)),
        upcomingBirthdays(6),
        recentHealthDays(21),
        latestHealthDay(),
        countNotes(),
        occurrencesInRange(addDays(agora, -90), agora),
      ]);

    const chaveHoje = toISODate(agora);
    const chaveAmanha = toISODate(addDays(agora, 1));

    const hoje = ocorrencias.filter((o) => o.dateKey === chaveHoje);
    const amanha = ocorrencias.filter((o) => o.dateKey === chaveAmanha);

    const horas = hoje
      .filter((o) => o.event.category === 'reuniao' || o.event.category === 'compromisso')
      .reduce((acc, o) => acc + (o.end ? (o.end.getTime() - o.start.getTime()) / 3600000 : 1), 0);

    const correlacao = correlacaoCargaRecuperacao(ocorrencias90, serie);

    setEstado({
      carregando: false,
      hoje,
      amanha,
      aniversarios,
      saudeHoje: serie.find((d) => d.date === chaveHoje) ?? null,
      saudeUltima: ultima,
      serie,
      alertas: avaliarSaude(serie),
      totalDossies,
      horasEmReuniaoHoje: horas,
      cargaComparada: correlacao
        ? {
            leve: correlacao.recuperacaoAposDiaLeve,
            pesado: correlacao.recuperacaoAposDiaPesado,
            limiar: correlacao.limiarHoras,
          }
        : null,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  return { ...estado, recarregar: () => void carregar() };
}

/** Faixa de leitura da recuperacao, na escala que o proprio Whoop usa. */
export function faixaRecuperacao(valor: number | null | undefined): {
  tom: 'critico' | 'atencao' | 'bom' | 'neutro';
  rotulo: string;
} {
  if (valor === null || valor === undefined) return { tom: 'neutro', rotulo: 'sem dado' };
  if (valor < 34) return { tom: 'critico', rotulo: 'baixa' };
  if (valor < 67) return { tom: 'atencao', rotulo: 'moderada' };
  return { tom: 'bom', rotulo: 'boa' };
}
