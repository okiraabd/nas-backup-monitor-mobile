import { RefreshCw } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { AppText, Button } from '@/src/components/ui';
import { formatDateTimeWib } from '@/src/lib/datetime';
import { colors } from '@/src/theme/colors';

export function RefreshButton({
  refreshing,
  onPress,
  variant = 'outline',
}: {
  refreshing: boolean;
  onPress: () => void;
  variant?: 'primary' | 'outline';
}) {
  const foreground = variant === 'primary' ? colors.white : colors.foreground;

  return (
    <Button variant={variant} disabled={refreshing} onPress={onPress}>
      <RefreshCw color={foreground} size={16} />
      <AppText style={[styles.label, { color: foreground }]}>{refreshing ? 'Refreshing...' : 'Refresh'}</AppText>
    </Button>
  );
}

export function UpdatedAt({ timestamp }: { timestamp?: number }) {
  if (!timestamp) return null;
  return (
    <AppText variant="muted" style={styles.updatedAt}>
      Updated {formatDateTimeWib(new Date(timestamp).toISOString())}
    </AppText>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '800',
  },
  updatedAt: {
    textAlign: 'right',
  },
});
