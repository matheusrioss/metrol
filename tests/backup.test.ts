import { empacotar, desempacotar, BackupInvalidoError, type Envelope } from '@/features/backup';

let falhas = 0;
function ok(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) console.log(`  PASSA  ${nome}`);
  else { falhas += 1; console.log(`  FALHA  ${nome} ${detalhe}`); }
}
async function rejeita(nome: string, fn: () => Promise<unknown>, trecho: string) {
  try {
    await fn();
    falhas += 1;
    console.log(`  FALHA  ${nome} (nao rejeitou)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ok(nome, e instanceof BackupInvalidoError && msg.includes(trecho), `-> ${msg}`);
  }
}

const base = {
  meeting_notes: [
    { id: 'n1', title: 'Contrato de sinalizacao de pista', summary: 'Negociacao com o aeroporto.', company: 'industria' },
  ],
  health_days: [{ date: '2026-09-10', recovery: 71, hrv: 52.5, sleep_hours: 7.25 }],
  app_user: [{ id: 1, name: 'Diretor', password_hash: 'abc' }],
  events: [],
};

(async () => {
  console.log('\n== BACKUP CIFRADO ==');

  const envelope = await empacotar(base, 'senha-do-cofre');
  ok('envelope carrega formato e versao', envelope.formato === 'watson-backup' && envelope.versao === 1);
  ok('o conteudo nao aparece em texto claro', !envelope.dados.includes('sinalizacao') && !envelope.dados.includes('Diretor'));
  ok('cada backup usa um sal novo', (await empacotar(base, 'senha-do-cofre')).salt !== envelope.salt);
  ok('mesmo conteudo gera cifra diferente', (await empacotar(base, 'senha-do-cofre')).dados !== envelope.dados);

  const voltou = await desempacotar(envelope, 'senha-do-cofre');
  ok('ida e volta preserva tudo', JSON.stringify(voltou) === JSON.stringify(base));
  ok('numero decimal sobrevive', (voltou.health_days[0] as Record<string, number>).hrv === 52.5);
  ok('tabela vazia sobrevive', Array.isArray(voltou.events) && voltou.events.length === 0);

  await rejeita('senha errada e recusada', () => desempacotar(envelope, 'senha-errada'), 'Senha incorreta');

  const adulterado: Envelope = { ...envelope, dados: `${envelope.dados.slice(0, -4)}AAAA` };
  await rejeita('arquivo adulterado e recusado', () => desempacotar(adulterado, 'senha-do-cofre'), 'corrompido');

  const outroFormato: Envelope = { ...envelope, formato: 'outra-coisa' };
  await rejeita('arquivo estranho e recusado', () => desempacotar(outroFormato, 'senha-do-cofre'), 'nao e um backup');

  const versaoFutura: Envelope = { ...envelope, versao: 99 };
  await rejeita('versao futura e recusada', () => desempacotar(versaoFutura, 'senha-do-cofre'), 'versao mais nova');

  const acentos = { notas: [{ texto: 'Reuniao com licitacao, manutencao e inspecao. Acentos: ção, ã, é, ü. Emoji: 🛬' }] };
  const comAcento = await desempacotar(await empacotar(acentos, 'x'), 'x');
  ok('acentos e emoji sobrevivem', JSON.stringify(comAcento) === JSON.stringify(acentos));

  const grande = { notas: Array.from({ length: 400 }, (_, i) => ({ id: i, texto: 'ata de reuniao '.repeat(60) })) };
  const voltouGrande = await desempacotar(await empacotar(grande, 'x'), 'x');
  ok('base grande sobrevive', JSON.stringify(voltouGrande) === JSON.stringify(grande));

  console.log(falhas === 0 ? '\nTODOS OS TESTES DE BACKUP PASSARAM\n' : `\n${falhas} TESTE(S) DE BACKUP FALHARAM\n`);
  process.exit(falhas === 0 ? 0 : 1);
})();
