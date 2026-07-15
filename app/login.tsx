import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Server } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { authApi } from '@/src/api/auth';
import { getApiErrorMessage } from '@/src/api/client';
import { AppText, Button, Card, Field, Screen } from '@/src/components/ui';
import { persistLogin } from '@/src/features/auth/AuthProvider';
import { colors, spacing } from '@/src/theme/colors';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  async function onSubmit(values: LoginValues) {
    try {
      const response = await authApi.login(values);
      await persistLogin(response.access_token, response.user);
      router.replace('/(tabs)');
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes('tidak diizinkan')
          ? error.message
          : getApiErrorMessage(error, 'Username/password salah atau server tidak terjangkau');
      Alert.alert('Login gagal', message);
    }
  }

  return (
    <Screen scroll={false} contentStyle={styles.container}>
      <Card style={styles.card}>
        <View style={styles.logo}>
          <Server color={colors.primary} size={34} />
        </View>
        <View style={styles.header}>
          <AppText variant="title" style={styles.center}>
            Backup Monitor
          </AppText>
          <AppText variant="muted" style={styles.center}>
            Masuk untuk memantau backup NAS dan Ceph.
          </AppText>
        </View>

        <Controller
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <View style={styles.fieldWrap}>
              <Field label="Username" value={field.value} onChangeText={field.onChange} placeholder="admin" />
              {fieldState.error ? <AppText style={styles.error}>{fieldState.error.message}</AppText> : null}
            </View>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <View style={styles.fieldWrap}>
              <Field
                label="Password"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="••••••••"
                secureTextEntry
              />
              {fieldState.error ? <AppText style={styles.error}>{fieldState.error.message}</AppText> : null}
            </View>
          )}
        />

        <Button disabled={form.formState.isSubmitting} onPress={form.handleSubmit(onSubmit)}>
          {form.formState.isSubmitting ? 'Masuk...' : 'Sign in'}
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    gap: spacing.lg,
  },
  logo: {
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
  fieldWrap: {
    gap: spacing.xs,
  },
  error: {
    color: colors.destructiveBright,
    fontSize: 12,
  },
});
