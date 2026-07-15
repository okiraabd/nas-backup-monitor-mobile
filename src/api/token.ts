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
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAccessToken() {
  accessToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
