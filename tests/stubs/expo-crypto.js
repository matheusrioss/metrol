import { createHash, randomBytes, randomUUID as nodeUuid } from 'node:crypto';
export function randomUUID() { return nodeUuid(); }
export async function getRandomBytesAsync(n) { return new Uint8Array(randomBytes(n)); }
export async function digestStringAsync(_alg, s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}
export const CryptoDigestAlgorithm = { SHA256: 'SHA-256' };
