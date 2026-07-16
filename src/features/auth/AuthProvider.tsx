import { PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { authApi } from '@/src/api/auth';
import { getApiErrorMessage, getApiErrorStatus, setUnauthorizedHandler } from '@/src/api/client';
import { clearAccessToken, hydrateToken, setAccessToken } from '@/src/api/token';
import { DASHBOARD_ACCESS_MESSAGE, isHumanRole } from '@/src/lib/status';
import { useAuthStore } from '@/src/store/auth-store';
import type { User } from '@/src/types/api';

export function AuthProvider({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped);
  const setBootstrapError = useAuthStore((state) => state.setBootstrapError);
  const setLoginNotice = useAuthStore((state) => state.setLoginNotice);
  const bootstrapAttempt = useAuthStore((state) => state.bootstrapAttempt);
  const sessionExpiryHandled = useRef(false);

  useEffect(() => {
    if (user) sessionExpiryHandled.current = false;
  }, [user]);

  const clearSession = useCallback(async (showMessage = false) => {
    let storageCleanupFailed = false;
    try {
      await clearAccessToken();
    } catch {
      storageCleanupFailed = true;
    }
    setUser(null);
    if (showMessage) {
      Alert.alert(
        'Session expired',
        storageCleanupFailed
          ? 'Please sign in again. The saved credential could not be removed from secure storage.'
          : 'Please sign in again.',
      );
    }
  }, [setUser]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        setBootstrapError(null);
        const token = await hydrateToken();
        if (!token) return;
        const user = await authApi.me();
        if (!isHumanRole(user.role)) {
          await clearSession(false);
          if (mounted) setLoginNotice(DASHBOARD_ACCESS_MESSAGE);
          return;
        }
        if (mounted) setUser(user);
      } catch (error) {
        const status = getApiErrorStatus(error);
        if (status === 401 || status === 403) {
          await clearSession(false);
        } else if (mounted) {
          setUser(null);
          setBootstrapError(getApiErrorMessage(error, 'Unable to restore your session.'));
        }
      } finally {
        if (mounted) setBootstrapped(true);
      }
    }

    setUnauthorizedHandler(() => {
      if (sessionExpiryHandled.current) return;
      sessionExpiryHandled.current = true;
      void clearSession(true);
    });
    void bootstrap();

    return () => {
      mounted = false;
      setUnauthorizedHandler(null);
    };
  }, [bootstrapAttempt, clearSession, setBootstrapError, setBootstrapped, setLoginNotice, setUser]);

  return children;
}

export async function persistLogin(token: string, user: User) {
  if (!isHumanRole(user.role)) {
    useAuthStore.getState().setLoginNotice(DASHBOARD_ACCESS_MESSAGE);
    try {
      await clearAccessToken();
    } catch {
      // Access remains denied even if secure storage cleanup fails.
    }
    throw new Error(DASHBOARD_ACCESS_MESSAGE);
  }
  await setAccessToken(token);
  useAuthStore.getState().setLoginNotice(null);
  useAuthStore.getState().setUser(user);
}

export async function logout() {
  try {
    await authApi.logout();
  } catch {
    // Token may already be expired or revoked; local cleanup still wins.
  } finally {
    try {
      await clearAccessToken();
    } finally {
      useAuthStore.getState().setUser(null);
    }
  }
}
