import * as Crypto from 'expo-crypto';

/** Identificador unico e opaco para as linhas do banco. */
export function newId(): string {
  return Crypto.randomUUID();
}
