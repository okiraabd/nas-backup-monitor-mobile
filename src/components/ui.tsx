import { PropsWithChildren, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/src/theme/colors';

export function Screen({
  children,
  scroll = true,
  contentStyle,
  keyboardShouldPersistTaps,
}: PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
}>) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.screenContent, contentStyle]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screenContent, styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  padded = true,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; padded?: boolean }>) {
  return <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>;
}

export function AppText({
  children,
  style,
  variant = 'body',
  numberOfLines,
}: PropsWithChildren<{ style?: StyleProp<TextStyle>; variant?: keyof typeof textVariants; numberOfLines?: number }>) {
  return (
    <Text style={[styles.text, textVariants[variant], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: PropsWithChildren<{
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive' | 'success';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  const isTextChild = typeof children === 'string' || typeof children === 'number';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        buttonVariants[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {isTextChild ? (
        <AppText style={[styles.buttonText, buttonTextVariants[variant]]}>{children}</AppText>
      ) : (
        <View style={styles.buttonContent}>{children}</View>
      )}
    </Pressable>
  );
}

export function IconButton({
  children,
  onPress,
  disabled,
  destructive,
}: PropsWithChildren<{ onPress?: () => void; disabled?: boolean; destructive?: boolean }>) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.iconButton,
        destructive && styles.iconButtonDestructive,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  onToggleSecureTextEntry,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  textContentType,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  onToggleSecureTextEntry?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'username' | 'current-password' | 'off';
  autoCorrect?: boolean;
  textContentType?: 'username' | 'password';
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.inputShell}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={secureTextEntry}
          textContentType={textContentType}
          multiline={multiline}
          keyboardType={keyboardType}
          style={[
            styles.input,
            onToggleSecureTextEntry && styles.inputWithAction,
            multiline && styles.textArea,
          ]}
        />
        {onToggleSecureTextEntry ? (
          <Pressable
            accessibilityLabel={secureTextEntry ? 'Tampilkan password' : 'Sembunyikan password'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onToggleSecureTextEntry}
            style={({ pressed }) => [styles.inputAction, pressed && styles.pressed]}
          >
            {secureTextEntry ? (
              <Eye color={colors.mutedForeground} size={20} />
            ) : (
              <EyeOff color={colors.mutedForeground} size={20} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Badge({
  children,
  color = colors.mutedForeground,
  subtle,
}: PropsWithChildren<{ color?: string; subtle?: boolean }>) {
  return (
    <View style={[styles.badge, { borderColor: `${color}55`, backgroundColor: subtle ? `${color}18` : 'transparent' }]}>
      <AppText style={{ color, fontSize: 11, fontWeight: '700' }}>{children}</AppText>
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? <AppText variant="muted">{subtitle}</AppText> : null}
      </View>
      {action}
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <Card style={styles.stateCard}>
      <AppText variant="subtitle">{title}</AppText>
      {message ? <AppText variant="muted" style={styles.centerText}>{message}</AppText> : null}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={styles.stateCard}>
      <AppText variant="subtitle" style={{ color: colors.destructiveBright }}>
        Gagal memuat
      </AppText>
      <AppText variant="muted" style={styles.centerText}>
        {message}
      </AppText>
      {onRetry ? (
        <Button variant="outline" onPress={onRetry}>
          Coba lagi
        </Button>
      ) : null}
    </Card>
  );
}

export function LoadingState({ label = 'Memuat...' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <AppText variant="muted">{label}</AppText>
    </View>
  );
}

export function ProgressBar({ value, color }: { value?: number | null; color?: string }) {
  const safe = Math.max(0, Math.min(100, value ?? 0));
  const fill = color ?? (safe >= 85 ? colors.destructiveBright : safe >= 70 ? colors.warn : colors.primary);
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${safe}%`, backgroundColor: fill }]} />
    </View>
  );
}

const textVariants = StyleSheet.create({
  body: {
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  muted: {
    color: colors.mutedForeground,
    fontSize: 13,
  },
  label: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metric: {
    fontSize: 26,
    fontWeight: '800',
  },
});

const buttonVariants = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  destructive: {
    backgroundColor: colors.destructiveBright,
    borderColor: colors.destructiveBright,
  },
  success: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
});

const buttonTextVariants = StyleSheet.create({
  primary: {
    color: colors.white,
  },
  outline: {
    color: colors.foreground,
  },
  ghost: {
    color: colors.foreground,
  },
  destructive: {
    color: colors.white,
  },
  success: {
    color: colors.white,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  cardPadded: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  text: {
    color: colors.foreground,
    letterSpacing: 0,
  },
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    fontWeight: '800',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  iconButtonDestructive: {
    borderColor: `${colors.destructiveBright}66`,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    color: colors.foreground,
    backgroundColor: colors.background,
  },
  inputShell: {
    position: 'relative',
  },
  inputWithAction: {
    paddingRight: 52,
  },
  inputAction: {
    position: 'absolute',
    right: 2,
    top: 1,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    minHeight: 110,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stateCard: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  loading: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.muted,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
});
