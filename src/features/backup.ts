import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import Hex from 'crypto-js/enc-hex';
import HmacSHA256 from 'crypto-js/hmac-sha256';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '@/db';
import { generateSalt, hashPassword } from '@/lib/password';
import { setSetting, SETTINGS_KEYS } from '@/db/repositories/settings';

const FORMATO = 'watson-backup';
const VERSAO = 1;

const TABELAS = [
  'app_user',
  'events',
  'birthdays',
  'health_days',
  'health_activities',
  'meeting_notes',
  'chat_messages',
  'insights',
  'settings',
] as const;

export interface Envelope {
  formato: string;
  versao: number;
  criado_em: string;
  salt: string;
  hmac: string;
  dados: string;
}

async function derivarChave(senha: string, salt: string): Promise<string> {
  return hashPassword(senha, salt);
}

/**
 * Cifra o conteudo do backup com uma chave derivada da senha do usuario.
 *
 * O HMAC guardado junto serve para duas coisas: detectar arquivo corrompido e
 * reconhecer senha errada antes de tentar decifrar, sem precisar adivinhar
 * pelo lixo que sairia da decifragem.
 */
export async function empacotar(
  dados: Record<string, unknown[]>,
  senha: string,
): Promise<Envelope> {
  const salt = await generateSalt();
  const chave = await derivarChave(senha, salt);
  const cifrado = AES.encrypt(JSON.stringify(dados), chave).toString();

  return {
    formato: FORMATO,
    versao: VERSAO,
    criado_em: new Date().toISOString(),
    salt,
    hmac: HmacSHA256(cifrado, chave).toString(Hex),
    dados: cifrado,
  };
}

export class BackupInvalidoError extends Error {}

/** Confere a integridade do envelope e devolve o conteudo original. */
export async function desempacotar(
  envelope: Envelope,
  senha: string,
): Promise<Record<string, Record<string, unknown>[]>> {
  if (envelope.formato !== FORMATO) {
    throw new BackupInvalidoError('Esse arquivo nao e um backup do Watson.');
  }
  if (envelope.versao > VERSAO) {
    throw new BackupInvalidoError('O backup veio de uma versao mais nova do aplicativo.');
  }

  const chave = await derivarChave(senha, envelope.salt);
  if (HmacSHA256(envelope.dados, chave).toString(Hex) !== envelope.hmac) {
    throw new BackupInvalidoError('Senha incorreta ou arquivo corrompido.');
  }

  try {
    const texto = AES.decrypt(envelope.dados, chave).toString(Utf8);
    const conteudo = JSON.parse(texto);
    if (!conteudo || typeof conteudo !== 'object') throw new Error('formato inesperado');
    return conteudo;
  } catch {
    throw new BackupInvalidoError('Senha incorreta ou arquivo corrompido.');
  }
}

async function coletarDados(): Promise<Record<string, unknown[]>> {
  const db = await getDatabase();
  const saida: Record<string, unknown[]> = {};
  for (const tabela of TABELAS) {
    saida[tabela] = await db.getAllAsync(`SELECT * FROM ${tabela}`);
  }
  return saida;
}

export interface ResultadoExportacao {
  caminho: string;
  nomeArquivo: string;
  registros: number;
  bytes: number;
}

/**
 * Gera um arquivo unico com toda a base, cifrado em AES com uma senha que so
 * o usuario conhece. Sem essa senha o arquivo e ilegivel, inclusive para
 * quem hospeda a nuvem onde ele for guardado.
 */
export async function exportarBackup(senha: string): Promise<ResultadoExportacao> {
  if (senha.length < 6) {
    throw new Error('Escolha uma senha de backup com pelo menos 6 caracteres.');
  }

  const dados = await coletarDados();
  const registros = Object.values(dados).reduce((acc, linhas) => acc + linhas.length, 0);

  const envelope = await empacotar(dados, senha);

  const carimbo = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const nomeArquivo = `watson-${carimbo}.json`;
  const conteudo = JSON.stringify(envelope);

  const pasta = new Directory(Paths.document, 'backups');
  if (!pasta.exists) pasta.create({ intermediates: true });

  const arquivo = new File(pasta, nomeArquivo);
  if (arquivo.exists) arquivo.delete();
  arquivo.create();
  arquivo.write(conteudo);

  await setSetting(SETTINGS_KEYS.ultimoBackup, new Date().toISOString());

  return { caminho: arquivo.uri, nomeArquivo, registros, bytes: conteudo.length };
}

/** Abre a folha de compartilhamento para o usuario escolher onde guardar. */
export async function compartilharBackup(caminho: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(caminho, {
    mimeType: 'application/json',
    dialogTitle: 'Guardar backup do Watson',
    UTI: 'public.json',
  });
  return true;
}

export interface ResultadoImportacao {
  registros: number;
  criadoEm: string;
}

/**
 * Restaura um backup por cima da base atual. Todas as tabelas sao
 * substituidas, de modo que o estado final e exatamente o do arquivo.
 */
export async function importarBackup(senha: string): Promise<ResultadoImportacao | null> {
  const escolha = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (escolha.canceled || !escolha.assets?.length) return null;

  const bruto = await new File(escolha.assets[0].uri).text();

  let envelope: Envelope;
  try {
    envelope = JSON.parse(bruto) as Envelope;
  } catch {
    throw new Error('Esse arquivo nao e um backup do Watson.');
  }

  const dados = await desempacotar(envelope, senha);

  const db = await getDatabase();
  let registros = 0;

  await db.withTransactionAsync(async () => {
    for (const tabela of TABELAS) {
      await db.runAsync(`DELETE FROM ${tabela}`);
      const linhas = dados[tabela] ?? [];
      for (const linha of linhas) {
        const colunas = Object.keys(linha);
        if (!colunas.length) continue;
        const marcadores = colunas.map(() => '?').join(', ');
        await db.runAsync(
          `INSERT OR REPLACE INTO ${tabela} (${colunas.join(', ')}) VALUES (${marcadores})`,
          colunas.map((c) => linha[c] as string | number | null),
        );
        registros += 1;
      }
    }

    await db.runAsync('DELETE FROM notes_search');
    const notas = await db.getAllAsync<{
      id: string;
      title: string;
      summary: string;
      decisions: string | null;
      action_items: string | null;
      participants: string;
      topics: string;
    }>('SELECT * FROM meeting_notes');
    for (const nota of notas) {
      await db.runAsync(
        `INSERT INTO notes_search (note_id, title, summary, decisions, action_items, participants, topics)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          nota.id,
          nota.title,
          nota.summary,
          nota.decisions ?? '',
          nota.action_items ?? '',
          (JSON.parse(nota.participants || '[]') as string[]).join(' '),
          (JSON.parse(nota.topics || '[]') as string[]).join(' '),
        ],
      );
    }
  });

  return { registros, criadoEm: envelope.criado_em };
}
