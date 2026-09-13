import { getDatabase } from '@/db';
import { createEvent, listAllEvents, occurrencesInRange, deleteEvent, updateEvent } from '@/db/repositories/events';
import { createNote, searchNotes, listNotes, countNotesByCompany, updateNote, deleteNote } from '@/db/repositories/notes';
import { createBirthday, upcomingBirthdays } from '@/db/repositories/birthdays';
import { upsertHealthDay, getHealthDay, listHealthDays, summarizeMetric } from '@/db/repositories/health';
import { createUser, verifyPassword, changePassword, getUser } from '@/db/repositories/user';
import { getSetting, setSetting, getBooleanSetting, setBooleanSetting } from '@/db/repositories/settings';
import { appendMessage, recentMessages, clearChat } from '@/db/repositories/chat';

let falhas = 0;
function ok(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) console.log(`  PASSA  ${nome}`);
  else { falhas += 1; console.log(`  FALHA  ${nome} ${detalhe}`); }
}

(async () => {
  console.log('\n== MIGRACOES ==');
  const db = await getDatabase();
  const tabelas = (await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name",
  )).map((t) => t.name);
  for (const esperada of ['app_user', 'events', 'birthdays', 'health_days', 'meeting_notes', 'chat_messages', 'settings', 'notes_search']) {
    ok(`tabela ${esperada} existe`, tabelas.includes(esperada), `-> ${tabelas.join(',')}`);
  }
  const migracoes = await db.getAllAsync<{ id: number }>('SELECT id FROM _migrations');
  ok('as duas migracoes ficaram registradas', migracoes.length === 2, `-> ${migracoes.length}`);
  await getDatabase();
  ok('abrir de novo nao reaplica migracao', (await db.getAllAsync('SELECT id FROM _migrations')).length === 2);

  console.log('\n== ACESSO ==');
  await createUser({ name: 'Diretor', email: 'd@grupo.com.br', password: 'segredo123' });
  ok('usuario e criado', (await getUser())?.name === 'Diretor');
  ok('senha correta e aceita', await verifyPassword('segredo123'));
  ok('senha errada e recusada', !(await verifyPassword('segredo124')));
  ok('senha nao fica em texto claro', !(await db.getFirstAsync<{ password_hash: string }>('SELECT password_hash FROM app_user'))!.password_hash.includes('segredo123'));
  ok('troca de senha exige a atual', !(await changePassword('errada', 'nova123456')));
  ok('troca de senha funciona', await changePassword('segredo123', 'nova123456'));
  ok('senha nova passa a valer', await verifyPassword('nova123456'));
  ok('senha antiga deixa de valer', !(await verifyPassword('segredo123')));

  console.log('\n== AGENDA ==');
  const idComite = await createEvent({
    title: 'Comite de diretoria', description: 'Pauta trimestral', category: 'reuniao',
    company: 'grupo', location: 'Sede', starts_at: new Date(2026, 8, 7, 9, 0).toISOString(),
    ends_at: new Date(2026, 8, 7, 11, 0).toISOString(), recurrence: 'semanal',
    recurrence_until: null, reminders: [60, 1440],
  });
  await createEvent({
    title: 'Consulta cardiologista', category: 'medico', starts_at: new Date(2026, 8, 9, 15, 0).toISOString(),
    recurrence: 'unico', reminders: [180],
  });
  ok('dois eventos gravados', (await listAllEvents()).length === 2);
  const setembro = await occurrencesInRange(new Date(2026, 8, 1), new Date(2026, 8, 30));
  ok('ocorrencias do mes sao expandidas', setembro.length === 5, `-> ${setembro.length}`);
  ok('ocorrencias saem ordenadas no tempo', setembro.every((o, i) => i === 0 || o.start >= setembro[i - 1].start));
  ok('lembretes sao persistidos como lista', JSON.parse((await listAllEvents()).find((e) => e.id === idComite)!.reminders).length === 2);

  await updateEvent(idComite, {
    title: 'Comite de diretoria', category: 'reuniao', starts_at: new Date(2026, 8, 7, 9, 0).toISOString(),
    recurrence: 'unico', reminders: [60],
  });
  ok('editar para evento unico reduz as ocorrencias', (await occurrencesInRange(new Date(2026, 8, 1), new Date(2026, 8, 30))).length === 2);
  await deleteEvent(idComite);
  ok('excluir remove o evento', (await listAllEvents()).length === 1);

  console.log('\n== ANIVERSARIOS ==');
  const hoje = new Date();
  await createBirthday({ person_name: 'Socio fundador', birth_month: hoje.getMonth() + 1, birth_day: hoje.getDate(), birth_year: 1970, reminders: [1440] });
  await createBirthday({ person_name: 'Cliente antigo', birth_month: 12, birth_day: 25, reminders: [] });
  const proximos = await upcomingBirthdays();
  ok('aniversario de hoje vem primeiro', proximos[0].daysUntil === 0, `-> ${proximos[0].daysUntil}`);
  ok('idade e calculada', proximos[0].turningAge === proximos[0].nextDate.getFullYear() - 1970);
  ok('sem ano a idade fica nula', proximos.find((p) => p.birthday.person_name === 'Cliente antigo')!.turningAge === null);

  console.log('\n== SAUDE ==');
  await upsertHealthDay({ date: '2026-09-10', recovery: 71, hrv: 52, sleep_hours: 7.2, strain: 12.4, source: 'whoop' });
  ok('dia gravado', (await getHealthDay('2026-09-10'))?.recovery === 71);
  await upsertHealthDay({ date: '2026-09-10', strain: 15.1 });
  const atualizado = await getHealthDay('2026-09-10');
  ok('upsert atualiza o campo novo', atualizado?.strain === 15.1);
  ok('upsert preserva os campos antigos', atualizado?.recovery === 71 && atualizado?.hrv === 52, `-> recovery ${atualizado?.recovery} hrv ${atualizado?.hrv}`);
  await upsertHealthDay({ date: '2026-09-11', recovery: 55 });
  await upsertHealthDay({ date: '2026-09-12', recovery: 80 });
  const periodo = await listHealthDays('2026-09-10', '2026-09-12');
  ok('intervalo devolve na ordem certa', periodo.map((d) => d.date).join(',') === '2026-09-10,2026-09-11,2026-09-12');
  const resumoRec = summarizeMetric('recovery', periodo);
  ok('media ignora campos vazios', Math.round(resumoRec.media!) === 69, `-> ${resumoRec.media}`);
  ok('minimo e maximo saem certos', resumoRec.minimo === 55 && resumoRec.maximo === 80);
  const resumoSono = summarizeMetric('sleep_hours', periodo);
  ok('metrica com um unico dado nao quebra', resumoSono.amostras === 1 && resumoSono.media === 7.2);

  console.log('\n== BASE CORPORATIVA ==');
  const idNota = await createNote({
    title: 'Licitacao de balizamento em Confins', company: 'industria',
    meeting_date: '2026-08-14', participants: ['Joao Silva', 'Maria Souza'],
    topics: ['licitacao', 'balizamento', 'prazo'],
    summary: 'Discutimos o edital de balizamento noturno e a capacidade da fabrica.',
    decisions: 'Aprovado participar do certame.', action_items: 'Maria envia a proposta ate 30/08.',
  });
  await createNote({
    title: 'Revisao do software de gestao', company: 'software', meeting_date: '2026-08-20',
    participants: ['Carlos Pereira'], topics: ['roadmap', 'integracao'],
    summary: 'Roadmap do modulo de faturamento e integracao com a torre.',
  });

  ok('busca encontra pelo resumo', (await searchNotes('balizamento noturno')).length === 1);
  ok('busca ignora acento', (await searchNotes('licitacao')).length === 1);
  ok('busca acha por participante', (await searchNotes('Maria Souza')).length === 1);
  ok('busca acha por decisao', (await searchNotes('certame')).length === 1);
  ok('busca acha por prefixo parcial', (await searchNotes('baliz')).length === 1);
  ok('termo inexistente nao inventa resultado', (await searchNotes('helicoptero submarino')).length === 0);
  ok('termo curto nao dispara busca', (await searchNotes('de')).length === 0);
  ok('aspas nao quebram a busca', (await searchNotes('"licitacao" AND OR *')).length >= 0);
  ok('busca ampla acha as duas notas', (await searchNotes('integracao balizamento')).length === 2);

  const contagem = await countNotesByCompany();
  ok('contagem por empresa', contagem.industria === 1 && contagem.software === 1);
  ok('filtro por empresa funciona', (await listNotes({ company: 'software' })).length === 1);

  await updateNote(idNota, {
    title: 'Licitacao de balizamento em Confins', company: 'industria', meeting_date: '2026-08-14',
    participants: ['Joao Silva'], topics: ['licitacao'],
    summary: 'Texto totalmente novo sobre helicoptero de inspecao.',
  });
  ok('indice acompanha a edicao', (await searchNotes('helicoptero')).length === 1);
  ok('palavra que saiu do resumo some do indice', (await searchNotes('noturno')).length === 0);
  ok('palavra que ficou no titulo continua achavel', (await searchNotes('balizamento')).length === 1);
  ok('participante removido some do indice', (await searchNotes('Souza')).length === 0);

  await deleteNote(idNota);
  ok('excluir limpa o indice', (await searchNotes('helicoptero')).length === 0);
  ok('a outra nota continua la', (await listNotes()).length === 1);

  console.log('\n== CONFIGURACOES E CONVERSA ==');
  await setSetting('modelo_ia', 'claude-opus-5');
  ok('configuracao e lida de volta', (await getSetting('modelo_ia')) === 'claude-opus-5');
  await setSetting('modelo_ia', 'claude-sonnet-5');
  ok('configuracao e sobrescrita', (await getSetting('modelo_ia')) === 'claude-sonnet-5');
  ok('chave ausente devolve nulo', (await getSetting('nao_existe')) === null);
  ok('booleano usa o padrao quando ausente', (await getBooleanSetting('novo', true)) === true);
  await setBooleanSetting('novo', false);
  ok('booleano falso e persistido', (await getBooleanSetting('novo', true)) === false);

  await appendMessage('user', 'Como foi minha semana?');
  await appendMessage('watson', 'Recuperacao media de 69 por cento.');
  const conversa = await recentMessages(10);
  ok('conversa volta em ordem cronologica', conversa[0].role === 'user' && conversa[1].role === 'watson');
  await clearChat();
  ok('limpar apaga a conversa', (await recentMessages(10)).length === 0);

  console.log(falhas === 0 ? '\nTODOS OS TESTES DE BANCO PASSARAM\n' : `\n${falhas} TESTE(S) DE BANCO FALHARAM\n`);
  process.exit(falhas === 0 ? 0 : 1);
})();
