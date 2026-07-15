import { Redirect } from 'expo-router';

import { LoadingState, Screen } from '@/src/components/ui';
import { useAuthStore } from '@/src/store/auth-store';

export default function IndexRoute() {
  const user = useAuthStore((state) => state.user);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);

  if (!bootstrapped) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparing your session..." />
      </Screen>
    );
  }

  return <Redirect href={user ? '/(tabs)' : '/login'} />;
}
