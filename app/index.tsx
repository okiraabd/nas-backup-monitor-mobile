import { Redirect } from 'expo-router';

import { ErrorState, LoadingState, Screen } from '@/src/components/ui';
import { useAuthStore } from '@/src/store/auth-store';

export default function IndexRoute() {
  const user = useAuthStore((state) => state.user);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);
  const bootstrapError = useAuthStore((state) => state.bootstrapError);
  const retryBootstrap = useAuthStore((state) => state.retryBootstrap);

  if (!bootstrapped) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparing your session..." />
      </Screen>
    );
  }

  if (bootstrapError) {
    return (
      <Screen scroll={false}>
        <ErrorState message={bootstrapError} onRetry={retryBootstrap} />
      </Screen>
    );
  }

  return <Redirect href={user ? '/(tabs)' : '/login'} />;
}
