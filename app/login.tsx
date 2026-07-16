import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { authApi } from '@/src/api/auth';
import { getApiErrorMessage } from '@/src/api/client';
import { AppText, Button, Card, Field, Screen } from '@/src/components/ui';
import { persistLogin } from '@/src/features/auth/AuthProvider';
import { DASHBOARD_ACCESS_MESSAGE } from '@/src/lib/status';
import { useAuthStore } from '@/src/store/auth-store';
import { colors, spacing } from '@/src/theme/colors';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const loginNotice = useAuthStore((state) => state.loginNotice);
  const setLoginNotice = useAuthStore((state) => state.setLoginNotice);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  async function onSubmit(values: LoginValues) {
    try {
      setLoginError(null);
      setLoginNotice(null);
      const response = await authApi.login(values);
      await persistLogin(response.access_token, response.user);
      router.replace('/(tabs)');
    } catch (error) {
      const message =
        error instanceof Error && error.message === DASHBOARD_ACCESS_MESSAGE
          ? error.message
          : getApiErrorMessage(error, 'Invalid username or password, or the server is unavailable');
      setLoginError(message);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
      style={styles.keyboardAvoider}
    >
      <Screen contentStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <View style={styles.logo}>
            <Image
              accessibilityLabel="NAS Backup Monitor"
              contentFit="contain"
              source={require('../assets/images/splash-mark-v2.png')}
              style={styles.logoImage}
            />
          </View>
          <View style={styles.header}>
            <AppText variant="title" style={styles.center}>
              Backup Monitor
            </AppText>
            <AppText variant="muted" style={styles.center}>
              Sign in to monitor NAS backups and Ceph.
            </AppText>
          </View>

          {loginError || loginNotice ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.errorBannerText}>{loginError ?? loginNotice}</AppText>
            </View>
          ) : null}

          <Controller
            control={form.control}
            name="username"
            render={({ field, fieldState }) => (
              <View style={styles.fieldWrap}>
                <Field
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  label="Username"
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="admin"
                  textContentType="username"
                />
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
                  autoCapitalize="none"
                  autoComplete="current-password"
                  autoCorrect={false}
                  label="Password"
                  value={field.value}
                  onChangeText={field.onChange}
                  onToggleSecureTextEntry={() => setShowPassword((visible) => !visible)}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  textContentType="password"
                />
                {fieldState.error ? <AppText style={styles.error}>{fieldState.error.message}</AppText> : null}
              </View>
            )}
          />

          <Button disabled={form.formState.isSubmitting} onPress={form.handleSubmit(onSubmit)}>
            {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    gap: spacing.lg,
  },
  logo: {
    alignSelf: 'center',
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
  errorBanner: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.destructiveBright}66`,
    borderRadius: 6,
    backgroundColor: `${colors.destructiveBright}12`,
  },
  errorBannerText: {
    color: colors.destructiveBright,
    textAlign: 'center',
  },
});
