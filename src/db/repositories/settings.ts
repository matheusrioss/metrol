import { getDatabase } from '../index';

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, new Date().toISOString()],
  );
}

export async function getBooleanSetting(key: string, fallback = false): Promise<boolean> {
  const raw = await getSetting(key);
  if (raw === null) return fallback;
  return raw === '1' || raw === 'true';
}

export async function setBooleanSetting(key: string, value: boolean): Promise<void> {
  await setSetting(key, value ? '1' : '0');
}

export const SETTINGS_KEYS = {
  biometriaAtiva: 'biometria_ativa',
  revisarContexto: 'revisar_contexto_ia',
  modeloIA: 'modelo_ia',
  ultimoBackup: 'ultimo_backup',
  alertaRecuperacao: 'limite_alerta_recuperacao',
  alertaSono: 'limite_alerta_sono',
} as const;
