import * as Crypto from 'expo-crypto';

/**
 * Derivacao de senha para o acesso local.
 *
 * Nao existe servidor: a senha nunca sai do aparelho e nao ha o que
 * interceptar na rede. A protecao real do arquivo e o sandbox do sistema
 * operacional somado ao Face ID. Ainda assim aplicamos sal aleatorio e
 * varias rodadas de SHA-256 para que o hash guardado nao seja reversivel
 * por tabela pronta caso o arquivo do banco vaze.
 */
const ROUNDS = 500;

export async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(24);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  let digest = `${salt}:${password}`;
  for (let i = 0; i < ROUNDS; i += 1) {
    digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, digest);
  }
  return digest;
}

/** Comparacao em tempo constante, para nao vazar tamanho do prefixo igual. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
