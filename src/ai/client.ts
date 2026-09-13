import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '@/lib/secrets';

/** Modelo padrao do Watson. Trocavel nas configuracoes. */
export const DEFAULT_MODEL = 'claude-opus-5';

export const MODEL_OPTIONS = [
  {
    value: 'claude-opus-5',
    label: 'Claude Opus 5',
    hint: 'Equilibrio entre profundidade de analise e custo. Recomendado.',
  },
  {
    value: 'claude-fable-5-1',
    label: 'Claude Fable 5.1',
    hint: 'O mais capaz da linha. Melhor em raciocinio longo, porem mais caro.',
  },
  {
    value: 'claude-sonnet-5',
    label: 'Claude Sonnet 5',
    hint: 'Mais rapido e economico. Bom para consultas simples do dia a dia.',
  },
];

export class MissingApiKeyError extends Error {
  constructor() {
    super('Nenhuma chave da API configurada.');
    this.name = 'MissingApiKeyError';
  }
}

async function buildClient(): Promise<Anthropic> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new MissingApiKeyError();
  return new Anthropic({
    apiKey,
    // O app roda no aparelho do proprio dono da chave, sem servidor
    // intermediario. Essa e a decisao de arquitetura assumida no projeto.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });
}

function extrairTexto(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

export interface RespostaWatson {
  texto: string;
  recusado: boolean;
  modeloUsado: string;
}

/**
 * Uma pergunta ao Watson, com o contexto ja montado e aprovado pelo usuario.
 * Sem streaming: em um app movel, uma resposta inteira e mais confiavel do
 * que um fluxo que pode ser cortado ao trocar de tela.
 */
export async function perguntarAoWatson(params: {
  system: string;
  historico: { role: 'user' | 'assistant'; content: string }[];
  pergunta: string;
  contexto: string;
  modelo?: string;
  esforco?: 'low' | 'medium' | 'high';
}): Promise<RespostaWatson> {
  const client = await buildClient();
  const modelo = params.modelo || DEFAULT_MODEL;

  const conteudoUsuario = params.contexto
    ? `${params.contexto}\n\n---\n\nPergunta: ${params.pergunta}`
    : params.pergunta;

  const response = await client.beta.messages.create({
    model: modelo,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [
      {
        type: 'text',
        text: params.system,
        cache_control: { type: 'ephemeral' },
      },
    ],
    output_config: { effort: params.esforco ?? 'medium' },
    messages: [
      ...params.historico.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: conteudoUsuario },
    ],
  });

  if (response.stop_reason === 'refusal') {
    return {
      texto:
        'Nao consegui responder a essa pergunta. O pedido foi recusado pelos filtros de seguranca do modelo.',
      recusado: true,
      modeloUsado: response.model,
    };
  }

  return {
    texto: extrairTexto(response.content as Anthropic.ContentBlock[]),
    recusado: false,
    modeloUsado: response.model,
  };
}

export interface IndicadoresExtraidos {
  date?: string;
  recovery?: number;
  hrv?: number;
  rhr?: number;
  sleep_hours?: number;
  sleep_need_hours?: number;
  sleep_performance?: number;
  strain?: number;
  calories?: number;
  respiratory_rate?: number;
  spo2?: number;
  skin_temp?: number;
  atividades?: {
    name: string;
    strain?: number;
    duration_min?: number;
    avg_hr?: number;
    max_hr?: number;
    calories?: number;
  }[];
}

const FERRAMENTA_INDICADORES: Anthropic.Tool = {
  name: 'registrar_indicadores',
  description:
    'Registra os indicadores de saude encontrados no relatorio do Whoop. Omita qualquer campo ausente no texto.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Data do relatorio no formato AAAA-MM-DD' },
      recovery: { type: 'number', description: 'Recuperacao em porcentagem, 0 a 100' },
      hrv: { type: 'number', description: 'Variabilidade da frequencia cardiaca em ms' },
      rhr: { type: 'number', description: 'Frequencia cardiaca em repouso em bpm' },
      sleep_hours: { type: 'number', description: 'Horas dormidas, decimal' },
      sleep_need_hours: { type: 'number', description: 'Horas de sono necessarias, decimal' },
      sleep_performance: { type: 'number', description: 'Desempenho do sono em porcentagem' },
      strain: { type: 'number', description: 'Esforco do dia na escala Whoop, 0 a 21' },
      calories: { type: 'number', description: 'Calorias gastas no dia' },
      respiratory_rate: { type: 'number', description: 'Frequencia respiratoria por minuto' },
      spo2: { type: 'number', description: 'Saturacao de oxigenio em porcentagem' },
      skin_temp: { type: 'number', description: 'Temperatura da pele em graus Celsius' },
      atividades: {
        type: 'array',
        description: 'Treinos e atividades listados no relatorio',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            strain: { type: 'number' },
            duration_min: { type: 'number' },
            avg_hr: { type: 'number' },
            max_hr: { type: 'number' },
            calories: { type: 'number' },
          },
          required: ['name'],
          additionalProperties: false,
        },
      },
    },
    required: [],
    additionalProperties: false,
  },
};

/** Le um relatorio colado do Whoop e devolve os indicadores estruturados. */
export async function extrairIndicadoresWhoop(
  textoRelatorio: string,
  systemPrompt: string,
  modelo?: string,
): Promise<IndicadoresExtraidos> {
  const client = await buildClient();

  const response = await client.messages.create({
    model: modelo || DEFAULT_MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    output_config: { effort: 'low' },
    tools: [FERRAMENTA_INDICADORES],
    tool_choice: { type: 'tool', name: 'registrar_indicadores' },
    messages: [
      {
        role: 'user',
        content: `Extraia os indicadores deste relatorio do Whoop:\n\n${textoRelatorio}`,
      },
    ],
  });

  const bloco = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  );
  if (!bloco) return {};
  return bloco.input as IndicadoresExtraidos;
}

export interface ResumoEstruturado {
  title: string;
  company: string;
  meeting_date?: string;
  participants: string[];
  topics: string[];
  summary: string;
  decisions?: string;
  action_items?: string;
}

const FERRAMENTA_RESUMO: Anthropic.Tool = {
  name: 'registrar_resumo',
  description:
    'Organiza um resumo de reuniao para a base de conhecimento corporativo, classificando a empresa do grupo envolvida.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Titulo curto e especifico da reuniao' },
      company: {
        type: 'string',
        enum: ['industria', 'engenharia', 'administracao', 'software', 'grupo', 'externo'],
        description:
          'industria = equipamentos de sinalizacao de pista; engenharia = engenharia aeroportuaria; administracao = administracao de aeroportos; software = tecnologia de gestao aeroportuaria; grupo = holding e assuntos transversais; externo = parceiros, clientes e fornecedores',
      },
      meeting_date: { type: 'string', description: 'Data da reuniao no formato AAAA-MM-DD' },
      participants: { type: 'array', items: { type: 'string' } },
      topics: {
        type: 'array',
        items: { type: 'string' },
        description: 'De tres a seis temas, em minusculas, uma ou duas palavras cada',
      },
      summary: { type: 'string', description: 'Resumo objetivo do que foi tratado' },
      decisions: { type: 'string', description: 'Decisoes tomadas, uma por linha' },
      action_items: {
        type: 'string',
        description: 'Acoes combinadas com responsavel e prazo, uma por linha',
      },
    },
    required: ['title', 'company', 'participants', 'topics', 'summary'],
    additionalProperties: false,
  },
};

/** Transforma um resumo bruto do Plaud em um registro classificado da base. */
export async function estruturarResumo(
  textoBruto: string,
  modelo?: string,
): Promise<ResumoEstruturado | null> {
  const client = await buildClient();

  const response = await client.messages.create({
    model: modelo || DEFAULT_MODEL,
    max_tokens: 8000,
    system:
      'Voce organiza resumos de reunioes de um grupo empresarial do setor aeroportuario para uma base de conhecimento pesquisavel. Trabalhe apenas com o que esta no texto. Nao invente participantes, decisoes, prazos nem numeros. Escreva sempre em portugues do Brasil.',
    output_config: { effort: 'medium' },
    tools: [FERRAMENTA_RESUMO],
    tool_choice: { type: 'tool', name: 'registrar_resumo' },
    messages: [{ role: 'user', content: `Organize este resumo de reuniao:\n\n${textoBruto}` }],
  });

  const bloco = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  );
  return bloco ? (bloco.input as ResumoEstruturado) : null;
}
