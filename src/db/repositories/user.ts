import { getDatabase } from '../index';
import { generateSalt, hashPassword, safeEqual } from '@/lib/password';
import type { AppUser } from '@/lib/types';

export async function getUser(): Promise<AppUser | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<AppUser>(
      'SELECT id, name, email, biometric_ready, created_at, updated_at FROM app_user WHERE id = 1',
    )) ?? null
  );
}

export async function hasUser(): Promise<boolean> {
  return (await getUser()) !== null;
}

export async function createUser(input: {
  name: string;
  email?: string;
  password: string;
}): Promise<AppUser> {
  const db = await getDatabase();
  const salt = await generateSalt();
  const hash = await hashPassword(input.password, salt);
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO app_user (id, name, email, password_hash, password_salt, biometric_ready, created_at, updated_at)
     VALUES (1, ?, ?, ?, ?, 0, ?, ?)`,
    [input.name.trim(), input.email?.trim() || null, hash, salt, now, now],
  );

  const user = await getUser();
  if (!user) throw new Error('Nao foi possivel criar o usuario.');
  return user;
}

export async function verifyPassword(password: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ password_hash: string; password_salt: string }>(
    'SELECT password_hash, password_salt FROM app_user WHERE id = 1',
  );
  if (!row) return false;
  const hash = await hashPassword(password, row.password_salt);
  return safeEqual(hash, row.password_hash);
}

export async function changePassword(atual: string, nova: string): Promise<boolean> {
  if (!(await verifyPassword(atual))) return false;
  const db = await getDatabase();
  const salt = await generateSalt();
  const hash = await hashPassword(nova, salt);
  await db.runAsync(
    'UPDATE app_user SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = 1',
    [hash, salt, new Date().toISOString()],
  );
  return true;
}

export async function setBiometricReady(ready: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE app_user SET biometric_ready = ?, updated_at = ? WHERE id = 1', [
    ready ? 1 : 0,
    new Date().toISOString(),
  ]);
}

export async function updateProfile(name: string, email: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE app_user SET name = ?, email = ?, updated_at = ? WHERE id = 1', [
    name.trim(),
    email?.trim() || null,
    new Date().toISOString(),
  ]);
}
