import { expandEvent } from '@/db/repositories/events';
import {
  avaliarSaude,
  cargaPorDia,
  correlacaoCargaRecuperacao,
  impactoDasReunioes,
} from '@/features/analysis';
import {
  addDays,
  diffInDays,
  fromISODate,
  monthMatrix,
  proximoAniversario,
  toISODate,
  combinarDataHora,
} from '@/lib/date';
import type { CalendarEvent, HealthDay } from '@/lib/types';

let falhas = 0;
function ok(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) console.log(`  PASSA  ${nome}`);
  else {
    falhas += 1;
    console.log(`  FALHA  ${nome} ${detalhe}`);
  }
}

function evento(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: 'Comite executivo',
    description: null,
    category: 'reuniao',
    company: null,
    location: null,
    starts_at: new Date(2026, 0, 5, 9, 0).toISOString(),
    ends_at: new Date(2026, 0, 5, 10, 30).toISOString(),
    all_day: 0,
    recurrence: 'unico',
    recurrence_until: null,
    reminders: '[]',
    stress_rating: null,
    created_at: '',
    updated_at: '',
    ...over,
  } as CalendarEvent;
}

console.log('\n== DATAS ==');
ok('toISODate nao escorrega de fuso', toISODate(new Date(2026, 0, 5)) === '2026-01-05');
ok('fromISODate volta ao mesmo dia', fromISODate('2026-03-31').getDate() === 31);
ok('diffInDays conta dias corridos', diffInDays(new Date(2026, 0, 1), new Date(2026, 0, 11)) === 10);
ok('grade do mes tem 6 semanas de 7 dias', monthMatrix(new Date(2026, 1, 1)).length === 6 && monthMatrix(new Date(2026, 1, 1))[0].length === 7);
ok('grade comeca num domingo', monthMatrix(new Date(2026, 1, 1))[0][0].getDay() === 0);
const anivPassado = proximoAniversario(1, 10, new Date(2026, 5, 1));
ok('aniversario ja passado vai para o ano seguinte', anivPassado.getFullYear() === 2027, `-> ${toISODate(anivPassado)}`);
const anivFuturo = proximoAniversario(12, 25, new Date(2026, 5, 1));
ok('aniversario futuro fica no mesmo ano', anivFuturo.getFullYear() === 2026);
const anivHoje = proximoAniversario(6, 1, new Date(2026, 5, 1));
ok('aniversario de hoje conta como hoje', toISODate(anivHoje) === '2026-06-01');
ok('combinarDataHora monta hora local', combinarDataHora('2026-01-05', '14:30').getHours() === 14);

console.log('\n== RECORRENCIA ==');
const unico = expandEvent(evento(), new Date(2026, 0, 1), new Date(2026, 0, 31));
ok('evento unico gera uma ocorrencia', unico.length === 1, `-> ${unico.length}`);
ok('evento unico fora da janela nao aparece', expandEvent(evento(), new Date(2026, 2, 1), new Date(2026, 2, 31)).length === 0);

const semanal = expandEvent(evento({ recurrence: 'semanal' }), new Date(2026, 0, 1), new Date(2026, 0, 31));
ok('semanal cobre janeiro inteiro', semanal.length === 4, `-> ${semanal.length}: ${semanal.map((o) => o.dateKey).join(',')}`);
ok('semanal mantem o dia da semana', new Set(semanal.map((o) => o.start.getDay())).size === 1);
ok('primeira ocorrencia nao e marcada como repeticao', semanal[0].isRepeat === false);
ok('segunda ocorrencia e marcada como repeticao', semanal[1].isRepeat === true);
ok('duracao e preservada nas repeticoes', semanal[2].end !== null && (semanal[2].end!.getTime() - semanal[2].start.getTime()) === 90 * 60000);

const quinzenal = expandEvent(evento({ recurrence: 'quinzenal' }), new Date(2026, 0, 1), new Date(2026, 1, 28));
ok('quinzenal salta 14 dias', diffInDays(quinzenal[0].start, quinzenal[1].start) === 14);

const limitado = expandEvent(
  evento({ recurrence: 'semanal', recurrence_until: '2026-01-19' }),
  new Date(2026, 0, 1),
  new Date(2026, 2, 31),
);
ok('recurrence_until corta a serie', limitado.length === 3, `-> ${limitado.map((o) => o.dateKey).join(',')}`);
ok('ultima ocorrencia respeita o limite', limitado[limitado.length - 1].dateKey <= '2026-01-19');

// Dia 31 num mes de 30: nao pode pular para o dia 1 do mes seguinte
const mensal31 = expandEvent(
  evento({ starts_at: new Date(2026, 0, 31, 9, 0).toISOString(), ends_at: null, recurrence: 'mensal' }),
  new Date(2026, 0, 1),
  new Date(2026, 5, 30),
);
const diasMensal = mensal31.map((o) => o.dateKey);
ok('mensal no dia 31 nao vaza para o mes seguinte', !diasMensal.includes('2026-03-01') && !diasMensal.includes('2026-05-01'), `-> ${diasMensal.join(',')}`);
ok('mensal em fevereiro cai no dia 28', diasMensal.includes('2026-02-28'), `-> ${diasMensal.join(',')}`);

const anual = expandEvent(
  evento({ recurrence: 'anual' }),
  new Date(2026, 0, 1),
  new Date(2029, 0, 31),
);
ok('anual gera uma por ano', anual.length === 4, `-> ${anual.length}`);

const meioDaJanela = expandEvent(evento({ recurrence: 'diario' }), new Date(2026, 0, 10), new Date(2026, 0, 14));
ok('janela no meio da serie devolve so o trecho pedido', meioDaJanela.length === 5, `-> ${meioDaJanela.length}`);
ok('todas as ocorrencias do trecho sao repeticoes', meioDaJanela.every((o) => o.isRepeat));

console.log('\n== SAUDE ==');
const dia = (date: string, over: Partial<HealthDay> = {}): HealthDay =>
  ({
    date,
    recovery: null, hrv: null, rhr: null, sleep_hours: null, sleep_need_hours: null,
    sleep_performance: null, strain: null, calories: null, respiratory_rate: null,
    spo2: null, skin_temp: null, notes: null, source: 'manual', raw_text: null,
    created_at: '', updated_at: '', ...over,
  }) as HealthDay;

ok('base vazia nao gera alerta', avaliarSaude([]).length === 0);

const critico = avaliarSaude([dia('2026-01-01', { recovery: 25 })]);
ok('recuperacao abaixo de 34 vira alerta critico', critico.some((a) => a.severity === 'critico'));

const tresBaixos = avaliarSaude([
  dia('2026-01-01', { recovery: 45 }),
  dia('2026-01-02', { recovery: 42 }),
  dia('2026-01-03', { recovery: 48 }),
]);
ok('tres dias abaixo de 50 viram alerta de tendencia', tresBaixos.some((a) => a.kind === 'recuperacao_persistente'));

const sono = avaliarSaude([
  dia('2026-01-01', { recovery: 70, sleep_hours: 5.2 }),
  dia('2026-01-02', { recovery: 70, sleep_hours: 5.5 }),
]);
ok('duas noites curtas viram alerta de sono', sono.some((a) => a.kind === 'debito_sono'));

const baseHrv = Array.from({ length: 14 }, (_, i) => dia(`2026-01-${String(i + 1).padStart(2, '0')}`, { recovery: 70, hrv: 60 }));
const comQueda = [...baseHrv, dia('2026-01-15', { recovery: 70, hrv: 40 }), dia('2026-01-16', { recovery: 70, hrv: 38 }), dia('2026-01-17', { recovery: 70, hrv: 41 })];
ok('queda sustentada de VFC e detectada', avaliarSaude(comQueda).some((a) => a.kind === 'vfc_em_queda'));

const semanaBoa = Array.from({ length: 7 }, (_, i) => dia(`2026-02-${String(i + 1).padStart(2, '0')}`, { recovery: 75, sleep_hours: 7.5 }));
const alertasBons = avaliarSaude(semanaBoa);
ok('semana saudavel gera sinal positivo', alertasBons.length === 1 && alertasBons[0].severity === 'bom', `-> ${JSON.stringify(alertasBons.map((a) => a.kind))}`);

console.log('\n== CRUZAMENTO AGENDA x SAUDE ==');
const reuniaoPesada = evento({ id: 'pesada', title: 'Comite semanal', recurrence: 'semanal', starts_at: new Date(2026, 0, 5, 9, 0).toISOString(), ends_at: new Date(2026, 0, 5, 13, 0).toISOString() });
const ocorrencias = expandEvent(reuniaoPesada, new Date(2026, 0, 1), new Date(2026, 1, 28));

const carga = cargaPorDia(ocorrencias);
ok('carga soma as horas do dia', carga.get('2026-01-05')?.horas === 4, `-> ${carga.get('2026-01-05')?.horas}`);
ok('carga conta as reunioes', carga.get('2026-01-05')?.reunioes === 1);

// Recuperacao ruim sempre no dia seguinte ao comite, boa nos demais dias
const serie: HealthDay[] = [];
for (let i = 0; i < 56; i += 1) {
  const d = addDays(new Date(2026, 0, 1), i);
  const chave = toISODate(d);
  const diaAnterior = toISODate(addDays(d, -1));
  const apoloComite = ocorrencias.some((o) => o.dateKey === diaAnterior);
  serie.push(dia(chave, { recovery: apoloComite ? 40 : 75, strain: apoloComite ? 8 : 10 }));
}

const impactos = impactoDasReunioes(ocorrencias, serie);
ok('o comite aparece na analise de impacto', impactos.length === 1, `-> ${impactos.length}`);
ok('impacto negativo e detectado', (impactos[0]?.delta ?? 0) < -10, `-> delta ${impactos[0]?.delta?.toFixed(1)}`);
ok('conta as ocorrencias corretamente', impactos[0]?.ocorrencias === ocorrencias.length, `-> ${impactos[0]?.ocorrencias} de ${ocorrencias.length}`);

const poucasAmostras = impactoDasReunioes(expandEvent(evento({ id: 'so-uma' }), new Date(2026, 0, 1), new Date(2026, 0, 31)), serie);
ok('uma ocorrencia unica nao vira estatistica', poucasAmostras.length === 0);

const leves = evento({ id: 'leve', title: 'Alinhamento rapido', recurrence: 'semanal', starts_at: new Date(2026, 0, 8, 9, 0).toISOString(), ends_at: new Date(2026, 0, 8, 9, 30).toISOString() });
const todas = [...ocorrencias, ...expandEvent(leves, new Date(2026, 0, 1), new Date(2026, 1, 28))];
const correlacao = correlacaoCargaRecuperacao(todas, serie);
ok('correlacao de carga e calculada', correlacao !== null);
if (correlacao) {
  ok('dias pesados mostram recuperacao pior', (correlacao.recuperacaoAposDiaPesado ?? 100) < (correlacao.recuperacaoAposDiaLeve ?? 0), `-> pesado ${correlacao.recuperacaoAposDiaPesado?.toFixed(1)} leve ${correlacao.recuperacaoAposDiaLeve?.toFixed(1)}`);
}
ok('sem dados suficientes a correlacao e nula', correlacaoCargaRecuperacao([], serie) === null);

console.log('\n== CASOS LIMITE DA CORRELACAO ==');
// Agenda em que todo dia tem exatamente a mesma carga: nao ha contraste.
const uniforme = evento({ id: 'uniforme', title: 'Diaria', recurrence: 'diario', starts_at: new Date(2026, 0, 1, 9, 0).toISOString(), ends_at: new Date(2026, 0, 1, 10, 0).toISOString() });
const ocUniforme = expandEvent(uniforme, new Date(2026, 0, 1), new Date(2026, 0, 31));
ok('carga uniforme nao inventa correlacao', correlacaoCargaRecuperacao(ocUniforme, serie) === null);

// Dias sem recuperacao registrada no dia seguinte sao descartados.
const semSaude = correlacaoCargaRecuperacao(todas, []);
ok('sem dados de saude a correlacao e nula', semSaude === null);

const correlacaoFinal = correlacaoCargaRecuperacao(todas, serie);
ok('limiar reportado e a menor carga do grupo pesado', (correlacaoFinal?.limiarHoras ?? 0) === 4, `-> ${correlacaoFinal?.limiarHoras}`);
ok('grupos tem pelo menos dois dias cada', (correlacaoFinal?.diasAnalisados ?? 0) >= 4, `-> ${correlacaoFinal?.diasAnalisados}`);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM\n' : `\n${falhas} TESTE(S) FALHARAM\n`);
process.exit(falhas === 0 ? 0 : 1);
