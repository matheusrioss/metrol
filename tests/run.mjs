/**
 * Executa a suite de testes do Watson.
 *
 * O app roda em React Native, entao os modulos nativos do Expo nao existem
 * no Node. Cada teste e empacotado pelo esbuild com os stubs de tests/stubs,
 * que reimplementam apenas a superficie usada. O banco e o SQLite do proprio
 * Node, de modo que migracoes, FTS5 e consultas sao exercitados de verdade.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const stubs = join(raiz, 'tests', 'stubs');
const saida = join(raiz, 'node_modules', '.cache', 'watson-tests');

const SUITES = [
  { nome: 'Logica de datas, recorrencia e analise', arquivo: 'logica.test.ts' },
  { nome: 'Backup cifrado', arquivo: 'backup.test.ts' },
  { nome: 'Banco de dados e busca', arquivo: 'banco.test.ts' },
];

const ALIASES = [
  `--alias:@=${join(raiz, 'src')}`,
  `--alias:expo-sqlite=${join(stubs, 'expo-sqlite.js')}`,
  `--alias:expo-crypto=${join(stubs, 'expo-crypto.js')}`,
  `--alias:expo-file-system=${join(stubs, 'expo-file-system.js')}`,
  `--alias:expo-sharing=${join(stubs, 'expo-sharing.js')}`,
  `--alias:expo-document-picker=${join(stubs, 'expo-document-picker.js')}`,
];

rmSync(saida, { recursive: true, force: true });
mkdirSync(saida, { recursive: true });

let comFalha = 0;

for (const suite of SUITES) {
  const entrada = join(raiz, 'tests', suite.arquivo);
  const destino = join(saida, suite.arquivo.replace('.ts', '.mjs'));

  console.log(`\n### ${suite.nome}`);

  try {
    execFileSync(
      'npx',
      ['esbuild', entrada, '--bundle', '--platform=node', '--format=esm', `--outfile=${destino}`, ...ALIASES, '--log-level=error'],
      { cwd: raiz, stdio: 'inherit' },
    );
  } catch {
    console.error('  Falha ao empacotar a suite.');
    comFalha += 1;
    continue;
  }

  try {
    execFileSync('node', ['--experimental-sqlite', '--no-warnings', destino], {
      cwd: raiz,
      stdio: 'inherit',
    });
  } catch {
    comFalha += 1;
  }
}

if (comFalha > 0) {
  console.error(`\n${comFalha} suite(s) com falha.\n`);
  process.exit(1);
}
console.log('\nTudo verde.\n');
