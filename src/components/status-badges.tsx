import { View } from 'react-native';

import { AppText, Badge } from '@/src/components/ui';
import { backupStatusColor, freshnessColor, titleCaseStatus } from '@/src/lib/status';
import { colors } from '@/src/theme/colors';

export function BackupStatusBadge({ status, acknowledged }: { status?: string; acknowledged?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
      <Badge color={backupStatusColor(status)} subtle>
        {status || 'UNKNOWN'}
      </Badge>
      {acknowledged ? (
        <Badge color={colors.mutedForeground} subtle>
          Ack&apos;d
        </Badge>
      ) : null}
    </View>
  );
}

export function FreshnessBadge({ status }: { status?: string }) {
  return (
    <Badge color={freshnessColor(status)} subtle>
      {titleCaseStatus(status)}
    </Badge>
  );
}

export function FreshnessDot({ status }: { status?: string }) {
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: freshnessColor(status),
      }}
    />
  );
}

export function KeyValue({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={{ gap: 3, minWidth: 110, flex: 1 }}>
      <AppText variant="label">{label}</AppText>
      <AppText style={{ fontWeight: '700' }}>{value ?? '-'}</AppText>
    </View>
  );
}
