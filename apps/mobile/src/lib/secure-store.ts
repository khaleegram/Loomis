import * as SecureStore from 'expo-secure-store';

const PREFIX = 'loomis.';

export async function secureGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(`${PREFIX}${key}`);
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(`${PREFIX}${key}`, value);
}

export async function secureDelete(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(`${PREFIX}${key}`);
}

export async function secureDeleteMany(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => secureDelete(key)));
}
