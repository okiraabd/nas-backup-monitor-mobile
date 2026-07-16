const DEFAULT_ANDROID_EMULATOR_API = 'http://10.0.2.2:8000/api';

export function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  return (envUrl || DEFAULT_ANDROID_EMULATOR_API).replace(/\/+$/, '');
}
