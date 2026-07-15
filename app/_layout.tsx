import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/src/features/auth/AuthProvider';
import { QueryLifecycleProvider } from '@/src/features/query/QueryLifecycleProvider';
import { shouldRetryApiQuery } from '@/src/api/client';
import { colors } from '@/src/theme/colors';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: shouldRetryApiQuery,
            staleTime: 10_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <QueryLifecycleProvider>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.foreground,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="logs/[id]" options={{ title: 'Detail Log' }} />
          </Stack>
          <StatusBar style="light" backgroundColor={colors.background} />
        </AuthProvider>
      </QueryLifecycleProvider>
    </QueryClientProvider>
  );
}
