import Constants from 'expo-constants';
import { router } from 'expo-router';
import { LogOut, Shield, UserCircle } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';

import { getApiBaseUrl } from '@/src/lib/env';
import { formatLongDateTimeWib } from '@/src/lib/datetime';
import { logout } from '@/src/features/auth/AuthProvider';
import { AppText, Button, Card, Screen, SectionHeader } from '@/src/components/ui';
import { useAuthStore } from '@/src/store/auth-store';
import { colors, spacing } from '@/src/theme/colors';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <Screen contentStyle={styles.content}>
      <SectionHeader title="Profile" subtitle="Sesi dan informasi aplikasi." />

      <Card>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <UserCircle color={colors.primary} size={42} />
          </View>
          <View style={styles.flex}>
            <AppText variant="title">{user?.display_name ?? '-'}</AppText>
            <AppText variant="muted">@{user?.username ?? '-'}</AppText>
          </View>
        </View>
        <View style={styles.roleRow}>
          <Shield color={colors.primary} size={18} />
          <AppText style={styles.bold}>{user?.role ?? '-'}</AppText>
        </View>
        <AppText variant="muted">
          Last login: {user?.last_login_at ? formatLongDateTimeWib(user.last_login_at) : 'Tidak diketahui'}
        </AppText>
      </Card>

      <Card>
        <AppText variant="subtitle">App</AppText>
        <AppText variant="muted">Version: {Constants.expoConfig?.version ?? '1.0.0'}</AppText>
        <AppText variant="muted">API: {getApiBaseUrl()}</AppText>
      </Card>

      <Button
        variant="destructive"
        onPress={() =>
          Alert.alert('Logout?', 'Token sesi ini akan direvoke dari server.', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: handleLogout },
          ])
        }
      >
        <LogOut color={colors.white} size={18} />
        <AppText style={styles.logoutText}>Logout</AppText>
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 100,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontWeight: '800',
  },
  logoutText: {
    color: colors.white,
    fontWeight: '800',
  },
});
