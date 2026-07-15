import Constants from 'expo-constants';

const DEFAULT_ANDROID_EMULATOR_API = 'http://10.0.2.2:8000/api';

export function getApiBaseUrl() {
  const extraUrl = Constants.expoConfig?.extra?.apiBaseUrl;
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const value = typeof envUrl === 'string' && envUrl.length > 0 ? envUrl : extraUrl;

  return (typeof value === 'string' && value.length > 0 ? value : DEFAULT_ANDROID_EMULATOR_API).replace(
    /\/+$/,
    '',
  );
}
