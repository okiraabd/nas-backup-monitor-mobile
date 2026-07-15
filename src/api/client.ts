import { AxiosError, create, isAxiosError } from 'axios';

import { getApiBaseUrl } from '@/src/lib/env';
import { getAccessToken } from './token';

export const api = create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg || fallback;
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
    if (!error.response) return 'Unable to connect to the server. Check your connection and API address.';
    if (error.response.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.response.status === 403) return 'You do not have permission to perform this action.';
    if (error.response.status === 404) return 'The requested data was not found.';
    if (error.response.status >= 500) return 'The server is currently unable to process the request.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getApiErrorStatus(error: unknown) {
  return isAxiosError(error) ? error.response?.status : undefined;
}

export function shouldRetryApiQuery(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;

  const status = getApiErrorStatus(error);
  if (status && status < 500 && status !== 408 && status !== 429) return false;
  return true;
}
