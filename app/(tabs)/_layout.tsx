import { Redirect, Tabs } from 'expo-router';
import { ChartNoAxesCombined, FileText, History, LayoutDashboard, ServerCog, UserCircle } from 'lucide-react-native';

import { LoadingState, Screen } from '@/src/components/ui';
import { useAuthStore } from '@/src/store/auth-store';
import { colors } from '@/src/theme/colors';

export default function TabLayout() {
  const user = useAuthStore((state) => state.user);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);

  if (!bootstrapped) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Menyiapkan dashboard..." />
      </Screen>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="monitor"
        options={{
          title: 'Monitor',
          tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="collector"
        options={{
          href: null,
          title: 'Collector',
          tabBarIcon: ({ color, size }) => <ServerCog color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
