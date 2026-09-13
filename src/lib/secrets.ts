import * as SecureStore from 'expo-secure-store';

const API_KEY = 'watson_anthropic_api_key';

/**
 * A chave da API vive no cofre do sistema operacional (Keychain no iOS,
 * Keystore no Android), nunca no banco e nunca em texto plano.
 */
export async function saveApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY, key.trim(), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(API_KEY);
  } catch {
    return null;
  }
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY);
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return !!key && key.length > 10;
}
