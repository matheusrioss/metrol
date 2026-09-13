import type { EventOccurrence } from '@/db/repositories/events';
import type { HealthDay } from '@/lib/types';
import type { SeverityTone } from '@/theme';
import { addDays, fromISODate, toISODate } from '@/lib/date';

export interface HealthAlert {
  kind: string;
  severity: SeverityTone;
  title: string;
  body: string;
}

const num = (v: number | null | undefined): v is number =>
  typeof v === 'number' && !Number.isNaN(v);

function media(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function serie(dias: HealthDay[], campo: keyof HealthDay): number[] {
  return dias.map((d) => d[campo]).filter((v): v is number => num(v as number));
}

/**
 * Regras de vigilancia sobre os indicadores do Whoop.
 *
 * Os limites seguem as faixas que o proprio Whoop usa: recuperacao abaixo de
 * 34% e zona vermelha, entre 34% e 66% e amarela. Sao sinais para conversar
 * com um medico, nunca um diagnostico.
 */
export function avaliarSaude(dias: HealthDay[]): HealthAlert[] {
  const alertas: HealthAlert[] = [];
  if (!dias.length) return alertas;

  const ordenados = [...dias].sort((a, b) => a.date.localeCompare(b.date));
  const ultimo = ordenados[ordenados.length - 1];
  const ultimos3 = ordenados.slice(-3);
  const ultimos7 = ordenados.slice(-7);
  const base14 = ordenados.slice(-14, -1);

  if (num(ultimo.recovery) && ultimo.recovery < 34) {
    alertas.push({
      kind: 'recuperacao_critica',
      severity: 'critico',
      title: `Recuperacao em ${Math.round(ultimo.recovery)}%`,
      body: 'Seu corpo esta na zona vermelha. Vale reduzir o esforco de hoje, adiar decisoes pesadas e priorizar sono.',
    });
  }

  const recup3 = serie(ultimos3, 'recovery');
  if (recup3.length >= 3 && recup3.every((v) => v < 50)) {
    alertas.push({
      kind: 'recuperacao_persistente',
      severity: 'atencao',
      title: 'Tres dias seguidos abaixo de 50% de recuperacao',
      body: 'Nao e um dia ruim isolado, e uma tendencia. Carga acumulada, sono curto ou estresse prolongado costumam explicar esse padrao.',
    });
  }

  const sono2 = serie(ordenados.slice(-2), 'sleep_hours');
  if (sono2.length >= 2 && sono2.every((v) => v < 6)) {
    alertas.push({
      kind: 'debito_sono',
      severity: 'atencao',
      title: 'Duas noites seguidas com menos de 6 horas',
      body: 'O debito de sono se acumula e derruba a recuperacao dos proximos dias. Proteja a agenda da noite.',
    });
  }

  const hrvAtual = media(serie(ultimos3, 'hrv'));
  const hrvBase = media(serie(base14, 'hrv'));
  if (hrvAtual !== null && hrvBase !== null && hrvBase > 0) {
    const queda = ((hrvAtual - hrvBase) / hrvBase) * 100;
    if (queda <= -15) {
      alertas.push({
        kind: 'vfc_em_queda',
        severity: 'atencao',
        title: `Variabilidade cardiaca ${Math.abs(Math.round(queda))}% abaixo do seu normal`,
        body: 'Queda sustentada da VFC costuma anteceder cansaco, infeccao ou excesso de estresse. Observe os proximos dias.',
      });
    }
  }

  const rhrAtual = media(serie(ultimos3, 'rhr'));
  const rhrBase = media(serie(base14, 'rhr'));
  if (rhrAtual !== null && rhrBase !== null && rhrBase > 0) {
    const alta = ((rhrAtual - rhrBase) / rhrBase) * 100;
    if (alta >= 8) {
      alertas.push({
        kind: 'fc_repouso_alta',
        severity: 'atencao',
        title: `Frequencia em repouso ${Math.round(alta)}% acima do habitual`,
        body: 'Elevacao da frequencia de repouso aparece antes de gripes, apos alcool e em noites mal dormidas.',
      });
    }
  }

  if (num(ultimo.strain) && num(ultimo.recovery) && ultimo.strain > 14 && ultimo.recovery < 45) {
    alertas.push({
      kind: 'esforco_sem_lastro',
      severity: 'atencao',
      title: 'Esforco alto com recuperacao baixa',
      body: `Voce registrou esforco ${ultimo.strain.toFixed(1)} com apenas ${Math.round(ultimo.recovery)}% de recuperacao. Repetir esse padrao leva a exaustao.`,
    });
  }

  const respAtual = media(serie(ultimos3, 'respiratory_rate'));
  const respBase = media(serie(base14, 'respiratory_rate'));
  if (respAtual !== null && respBase !== null && respAtual - respBase >= 1.5) {
    alertas.push({
      kind: 'respiracao_elevada',
      severity: 'atencao',
      title: 'Frequencia respiratoria acima da sua linha de base',
      body: 'O Whoop trata esse sinal como um dos primeiros indicios de doenca respiratoria. Vale ficar atento.',
    });
  }

  if (!alertas.length) {
    const recup7 = media(serie(ultimos7, 'recovery'));
    if (recup7 !== null && recup7 >= 66) {
      alertas.push({
        kind: 'tudo_bem',
        severity: 'bom',
        title: `Semana solida, ${Math.round(recup7)}% de recuperacao media`,
        body: 'Corpo respondendo bem a carga atual. E uma boa janela para as semanas mais exigentes de agenda.',
      });
    }
  }

  return alertas;
}

export interface CargaDiaria {
  data: string;
  reunioes: number;
  horas: number;
  titulos: string[];
}

/** Quantas reunioes e quantas horas de reuniao cada dia carrega. */
export function cargaPorDia(ocorrencias: EventOccurrence[]): Map<string, CargaDiaria> {
  const mapa = new Map<string, CargaDiaria>();
  for (const oc of ocorrencias) {
    if (oc.event.category !== 'reuniao' && oc.event.category !== 'compromisso') continue;
    const atual = mapa.get(oc.dateKey) ?? {
      data: oc.dateKey,
      reunioes: 0,
      horas: 0,
      titulos: [],
    };
    const duracao = oc.end ? (oc.end.getTime() - oc.start.getTime()) / 3600000 : 1;
    atual.reunioes += 1;
    atual.horas += duracao;
    atual.titulos.push(oc.event.title);
    mapa.set(oc.dateKey, atual);
  }
  return mapa;
}

export interface ImpactoReuniao {
  eventId: string;
  titulo: string;
  ocorrencias: number;
  recuperacaoSeguinte: number | null;
  esforcoNoDia: number | null;
  /** Diferenca, em pontos percentuais, contra a recuperacao media geral. */
  delta: number | null;
  avaliacaoManual: number | null;
}

/**
 * Cruza a agenda com o Whoop para estimar o custo fisiologico de cada reuniao
 * recorrente. A leitura e simples e honesta: comparamos a recuperacao do dia
 * seguinte a cada ocorrencia contra a recuperacao media do periodo inteiro.
 *
 * Nao e prova de causalidade. E um indicio que vale investigar quando se
 * repete em varias ocorrencias da mesma reuniao.
 */
export function impactoDasReunioes(
  ocorrencias: EventOccurrence[],
  dias: HealthDay[],
  minimoOcorrencias = 2,
): ImpactoReuniao[] {
  const porData = new Map<string, HealthDay>();
  for (const dia of dias) porData.set(dia.date, dia);

  const recuperacaoGeral = media(serie(dias, 'recovery'));
  if (recuperacaoGeral === null) return [];

  const agrupado = new Map<string, EventOccurrence[]>();
  for (const oc of ocorrencias) {
    if (oc.event.category !== 'reuniao' && oc.event.category !== 'compromisso') continue;
    const lista = agrupado.get(oc.event.id) ?? [];
    lista.push(oc);
    agrupado.set(oc.event.id, lista);
  }

  const resultado: ImpactoReuniao[] = [];

  for (const [eventId, lista] of agrupado) {
    const recuperacoes: number[] = [];
    const esforcos: number[] = [];

    for (const oc of lista) {
      const seguinte = porData.get(toISODate(addDays(fromISODate(oc.dateKey), 1)));
      if (seguinte && num(seguinte.recovery)) recuperacoes.push(seguinte.recovery);
      const noDia = porData.get(oc.dateKey);
      if (noDia && num(noDia.strain)) esforcos.push(noDia.strain);
    }

    if (recuperacoes.length < minimoOcorrencias) continue;

    const mediaRecup = media(recuperacoes);
    resultado.push({
      eventId,
      titulo: lista[0].event.title,
      ocorrencias: recuperacoes.length,
      recuperacaoSeguinte: mediaRecup,
      esforcoNoDia: media(esforcos),
      delta: mediaRecup === null ? null : mediaRecup - recuperacaoGeral,
      avaliacaoManual: lista[0].event.stress_rating,
    });
  }

  return resultado.sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));
}

export interface CorrelacaoCarga {
  diasAnalisados: number;
  recuperacaoAposDiaLeve: number | null;
  recuperacaoAposDiaPesado: number | null;
  limiarHoras: number;
}

/**
 * Compara a recuperacao do dia seguinte aos dias mais cheios de agenda contra
 * os dias mais leves.
 *
 * Dividimos por tercos em vez de cortar pela mediana: uma agenda real tem
 * muitos dias com exatamente a mesma carga, e um corte pela mediana joga
 * todos eles de um lado so, deixando o outro grupo vazio. Comparar o terco
 * mais pesado com o terco mais leve tambem contrasta melhor os extremos, que
 * e o que interessa aqui.
 */
export function correlacaoCargaRecuperacao(
  ocorrencias: EventOccurrence[],
  dias: HealthDay[],
): CorrelacaoCarga | null {
  const carga = cargaPorDia(ocorrencias);
  if (carga.size < 4) return null;

  const porData = new Map(dias.map((d) => [d.date, d]));

  // So entram dias cuja recuperacao do dia seguinte foi registrada.
  const comRecuperacao = [...carga.values()]
    .map((item) => {
      const seguinte = porData.get(toISODate(addDays(fromISODate(item.data), 1)));
      return seguinte && num(seguinte.recovery)
        ? { horas: item.horas, recuperacaoSeguinte: seguinte.recovery }
        : null;
    })
    .filter((v): v is { horas: number; recuperacaoSeguinte: number } => v !== null)
    .sort((a, b) => a.horas - b.horas);

  if (comRecuperacao.length < 4) return null;

  const tamanhoGrupo = Math.max(2, Math.floor(comRecuperacao.length / 3));
  const grupoLeve = comRecuperacao.slice(0, tamanhoGrupo);
  const grupoPesado = comRecuperacao.slice(-tamanhoGrupo);

  // Com cargas todas iguais nao ha contraste nenhum a relatar.
  if (grupoPesado[0].horas <= grupoLeve[grupoLeve.length - 1].horas) return null;

  return {
    diasAnalisados: grupoLeve.length + grupoPesado.length,
    recuperacaoAposDiaLeve: media(grupoLeve.map((d) => d.recuperacaoSeguinte)),
    recuperacaoAposDiaPesado: media(grupoPesado.map((d) => d.recuperacaoSeguinte)),
    limiarHoras: grupoPesado[0].horas,
  };
}
