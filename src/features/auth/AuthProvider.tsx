import { PropsWithChildren, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';

import { authApi } from '@/src/api/auth';
import { setUnauthorizedHandler } from '@/src/api/client';
import { clearAccessToken, hydrateToken, setAccessToken } from '@/src/api/token';
import { isHumanRole } from '@/src/lib/status';
import { useAuthStore } from '@/src/store/auth-store';
import type { User } from '@/src/types/api';

export function AuthProvider({ children }: PropsWithChildren) {
  const setUser = useAuthStore((state) => state.setUser);
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped);

  const clearSession = useCallback(async (showMessage = false) => {
    await clearAccessToken();
    setUser(null);
    if (showMessage) {
      Alert.alert('Session expired', 'Please sign in again.');
    }
  }, [setUser]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const token = await hydrateToken();
        if (!token) return;
        const user = await authApi.me();
        if (!isHumanRole(user.role)) {
          await clearAccessToken();
          return;
        }
        if (mounted) setUser(user);
      } catch {
        await clearAccessToken();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setBootstrapped(true);
      }
    }

    setUnauthorizedHandler(() => {
      void clearSession(true);
    });
    void bootstrap();

    return () => {
      mounted = false;
      setUnauthorizedHandler(null);
    };
  }, [clearSession, setBootstrapped, setUser]);

  return children;
}

export async function persistLogin(token: string, user: User) {
  if (!isHumanRole(user.role)) {
    await clearAccessToken();
    throw new Error('This account is not allowed to use the mobile app.');
  }
  await setAccessToken(token);
  useAuthStore.getState().setUser(user);
}

export async function logout() {
  try {
    await authApi.logout();
  } catch {
    // Token may already be expired or revoked; local cleanup still wins.
  } finally {
    await clearAccessToken();
    useAuthStore.getState().setUser(null);
  }
}
