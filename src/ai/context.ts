import { occurrencesInRange } from '@/db/repositories/events';
import { recentHealthDays } from '@/db/repositories/health';
import { searchNotes, listNotes } from '@/db/repositories/notes';
import { upcomingBirthdays } from '@/db/repositories/birthdays';
import { avaliarSaude, correlacaoCargaRecuperacao, impactoDasReunioes } from '@/features/analysis';
import { addDays, formatarDataLonga, formatarHora, formatarDiaCompleto } from '@/lib/date';
import { companyLabel, parseJsonArray } from '@/lib/types';
import { newId } from '@/lib/id';

export type CategoriaContexto = 'agenda' | 'saude' | 'reunioes' | 'aniversarios' | 'analise';

export interface BlocoContexto {
  id: string;
  categoria: CategoriaContexto;
  titulo: string;
  conteudo: string;
  incluido: boolean;
  /** Quantos caracteres este bloco acrescenta ao envio. */
  tamanho: number;
}

const bloco = (
  categoria: CategoriaContexto,
  titulo: string,
  conteudo: string,
  incluido = true,
): BlocoContexto => ({
  id: newId(),
  categoria,
  titulo,
  conteudo: conteudo.trim(),
  incluido,
  tamanho: conteudo.trim().length,
});

async function blocoAgenda(): Promise<BlocoContexto | null> {
  const hoje = new Date();
  const ocorrencias = await occurrencesInRange(addDays(hoje, -2), addDays(hoje, 14));
  if (!ocorrencias.length) return null;

  const linhas = ocorrencias.map((oc) => {
    const hora = oc.event.all_day ? 'dia inteiro' : formatarHora(oc.start);
    const local = oc.event.location ? `, em ${oc.event.location}` : '';
    const empresa = oc.event.company ? ` [${companyLabel(oc.event.company)}]` : '';
    const desc = oc.event.description ? ` - ${oc.event.description}` : '';
    return `- ${formatarDataLonga(oc.start)}, ${hora}: ${oc.event.title}${empresa}${local}${desc}`;
  });

  return bloco(
    'agenda',
    `Agenda (${ocorrencias.length} compromissos)`,
    `AGENDA DE DOIS DIAS ATRAS ATE DUAS SEMANAS A FRENTE\n${linhas.join('\n')}`,
  );
}

async function blocoSaude(): Promise<BlocoContexto | null> {
  const dias = await recentHealthDays(21);
  if (!dias.length) return null;

  const linhas = dias.map((d) => {
    const partes: string[] = [];
    if (d.recovery !== null) partes.push(`recuperacao ${Math.round(d.recovery)}%`);
    if (d.sleep_hours !== null) partes.push(`sono ${d.sleep_hours.toFixed(1)}h`);
    if (d.hrv !== null) partes.push(`VFC ${Math.round(d.hrv)}ms`);
    if (d.rhr !== null) partes.push(`FC repouso ${Math.round(d.rhr)}bpm`);
    if (d.strain !== null) partes.push(`esforco ${d.strain.toFixed(1)}`);
    return `- ${d.date}: ${partes.join(', ') || 'sem dados'}`;
  });

  const alertas = avaliarSaude(dias);
  const textoAlertas = alertas.length
    ? `\n\nSINAIS DETECTADOS PELO APP\n${alertas.map((a) => `- [${a.severity}] ${a.title}: ${a.body}`).join('\n')}`
    : '';

  return bloco(
    'saude',
    `Saude (${dias.length} dias do Whoop)`,
    `INDICADORES DE SAUDE DOS ULTIMOS DIAS\n${linhas.join('\n')}${textoAlertas}`,
  );
}

async function blocoAnalise(): Promise<BlocoContexto | null> {
  const hoje = new Date();
  const [dias, ocorrencias] = await Promise.all([
    recentHealthDays(90),
    occurrencesInRange(addDays(hoje, -90), hoje),
  ]);
  if (dias.length < 5 || !ocorrencias.length) return null;

  const partes: string[] = [];
  const correlacao = correlacaoCargaRecuperacao(ocorrencias, dias);
  if (correlacao?.recuperacaoAposDiaLeve != null && correlacao.recuperacaoAposDiaPesado != null) {
    partes.push(
      `Apos dias com mais de ${correlacao.limiarHoras.toFixed(1)}h de reuniao, a recuperacao media no dia seguinte foi de ${Math.round(
        correlacao.recuperacaoAposDiaPesado,
      )}%. Apos dias mais leves, foi de ${Math.round(correlacao.recuperacaoAposDiaLeve)}%. Base de ${correlacao.diasAnalisados} dias.`,
    );
  }

  const impactos = impactoDasReunioes(ocorrencias, dias);
  if (impactos.length) {
    const topo = impactos.slice(0, 5).map((i) => {
      const delta = i.delta === null ? 'sem base' : `${i.delta > 0 ? '+' : ''}${i.delta.toFixed(1)} pontos`;
      return `- ${i.titulo}: recuperacao no dia seguinte ${delta} contra a media geral, em ${i.ocorrencias} ocorrencias`;
    });
    partes.push(`CUSTO FISIOLOGICO ESTIMADO POR REUNIAO RECORRENTE\n${topo.join('\n')}`);
  }

  if (!partes.length) return null;
  return bloco(
    'analise',
    'Cruzamento de agenda com saude',
    `ANALISE CRUZADA CALCULADA PELO APP (indicio estatistico, nao prova de causa)\n${partes.join('\n\n')}`,
  );
}

async function blocoAniversarios(): Promise<BlocoContexto | null> {
  const proximos = (await upcomingBirthdays()).filter((b) => b.daysUntil <= 45);
  if (!proximos.length) return null;

  const linhas = proximos.map((p) => {
    const idade = p.turningAge ? `, completando ${p.turningAge} anos` : '';
    const rel = p.birthday.relationship ? ` (${p.birthday.relationship})` : '';
    return `- ${p.birthday.person_name}${rel}: ${formatarDataLonga(p.nextDate)}, em ${p.daysUntil} dias${idade}`;
  });

  return bloco(
    'aniversarios',
    `Aniversarios (${proximos.length} nos proximos 45 dias)`,
    `ANIVERSARIOS PROXIMOS\n${linhas.join('\n')}`,
  );
}

function renderNota(nota: Awaited<ReturnType<typeof listNotes>>[number]): string {
  const participantes = parseJsonArray(nota.participants).join(', ');
  const temas = parseJsonArray(nota.topics).join(', ');
  return [
    `### ${nota.title}`,
    `Empresa: ${companyLabel(nota.company)} | Data: ${nota.meeting_date}`,
    participantes ? `Participantes: ${participantes}` : '',
    temas ? `Temas: ${temas}` : '',
    `Resumo: ${nota.summary}`,
    nota.decisions ? `Decisoes: ${nota.decisions}` : '',
    nota.action_items ? `Acoes: ${nota.action_items}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function blocosReunioes(pergunta: string): Promise<BlocoContexto[]> {
  const hits = await searchNotes(pergunta, 6);
  if (hits.length) {
    return [
      bloco(
        'reunioes',
        `Reunioes relacionadas a pergunta (${hits.length})`,
        `REGISTROS DA BASE CORPORATIVA QUE CASAM COM A PERGUNTA\n\n${hits
          .map((h) => renderNota(h.note))
          .join('\n\n')}`,
      ),
    ];
  }

  const recentes = await listNotes({ limit: 4 });
  if (!recentes.length) return [];
  return [
    bloco(
      'reunioes',
      `Reunioes recentes (${recentes.length})`,
      `NENHUM REGISTRO CASOU DIRETAMENTE COM A PERGUNTA. SEGUEM OS MAIS RECENTES\n\n${recentes
        .map(renderNota)
        .join('\n\n')}`,
      false,
    ),
  ];
}

/**
 * Monta os blocos de contexto candidatos a acompanhar uma pergunta.
 * Nada e enviado ainda: o usuario revisa e decide bloco a bloco.
 */
export async function montarContexto(pergunta: string): Promise<BlocoContexto[]> {
  const [agenda, saude, analise, aniversarios, reunioes] = await Promise.all([
    blocoAgenda(),
    blocoSaude(),
    blocoAnalise(),
    blocoAniversarios(),
    blocosReunioes(pergunta),
  ]);

  return [agenda, saude, analise, aniversarios, ...reunioes].filter(
    (b): b is BlocoContexto => b !== null,
  );
}

/** Junta os blocos aprovados no texto que efetivamente sai do aparelho. */
export function renderizarContexto(blocos: BlocoContexto[]): string {
  const ativos = blocos.filter((b) => b.incluido);
  if (!ativos.length) return '';
  const hoje = new Date();
  return [
    `Hoje e ${formatarDiaCompleto(hoje)} de ${hoje.getFullYear()}.`,
    '',
    'CONTEXTO DA BASE LOCAL DO USUARIO',
    '',
    ...ativos.map((b) => b.conteudo),
  ].join('\n');
}

export function tamanhoContexto(blocos: BlocoContexto[]): number {
  return blocos.filter((b) => b.incluido).reduce((acc, b) => acc + b.tamanho, 0);
}
