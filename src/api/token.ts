import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'backup_monitor_access_token';
let accessToken: string | null = null;

export async function hydrateToken() {
  accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return accessToken;
}

export function getAccessToken() {
  return accessToken;
}

export async function setAccessToken(token: string) {
  accessToken = token;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    accessToken = null;
    throw error;
  }
}

export async function clearAccessToken() {
  accessToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
