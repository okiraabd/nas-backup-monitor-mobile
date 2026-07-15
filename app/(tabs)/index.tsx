import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertCircle, Database, HardDrive, RefreshCw, Server } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { logsApi } from '@/src/api/logs';
import { monitorApi } from '@/src/api/monitor';
import { ActivityBarChart } from '@/src/components/charts';
import { BackupStatusBadge, FreshnessBadge, FreshnessDot } from '@/src/components/status-badges';
import { AppText, Button, Card, EmptyState, ErrorState, LoadingState, ProgressBar, Screen, SectionHeader } from '@/src/components/ui';
import { formatRelative } from '@/src/lib/datetime';
import { getApiErrorMessage } from '@/src/api/client';
import { queryKeys } from '@/src/lib/query-keys';
import { colors, spacing } from '@/src/theme/colors';

const REFRESH_INTERVAL = 30_000;

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({
    queryKey: queryKeys.summary,
    queryFn: monitorApi.summary,
    refetchInterval: REFRESH_INTERVAL,
  });
  const activityQuery = useQuery({
    queryKey: queryKeys.activity,
    queryFn: monitorApi.activityTrend,
    refetchInterval: REFRESH_INTERVAL,
  });
  const failedQuery = useQuery({
    queryKey: queryKeys.logs({ status: 'FAILED', page_size: 5 }),
    queryFn: () => logsApi.list({ status: 'FAILED', page_size: 5, page: 1 }),
    refetchInterval: REFRESH_INTERVAL,
  });
  const nasQuery = useQuery({
    queryKey: queryKeys.nasList,
    queryFn: monitorApi.nasList,
    refetchInterval: REFRESH_INTERVAL,
  });

  const latestLogQueries = useQueries({
    queries:
      nasQuery.data?.items.map((nas) => ({
        queryKey: queryKeys.logs({ nas_id: nas.source_id, page_size: 1 }),
        queryFn: () => logsApi.list({ nas_id: nas.source_id, page_size: 1, page: 1 }),
        enabled: Boolean(nas.source_id),
        refetchInterval: REFRESH_INTERVAL,
      })) ?? [],
  });

  function refreshAll() {
    void queryClient.invalidateQueries({ queryKey: ['monitor'] });
    void queryClient.invalidateQueries({ queryKey: ['logs'] });
  }

  return (
    <Screen
      contentStyle={styles.content}
      scroll
    >
      <SectionHeader
        title="Dashboard"
        subtitle="Ringkasan kondisi backup NAS dan Ceph."
        action={
          <Button variant="outline" onPress={refreshAll}>
            <RefreshCw color={colors.foreground} size={16} />
            <AppText style={styles.refreshText}>Refresh</AppText>
          </Button>
        }
      />

      {summaryQuery.isLoading ? (
        <LoadingState />
      ) : summaryQuery.isError ? (
        <ErrorState message={getApiErrorMessage(summaryQuery.error)} onRetry={() => summaryQuery.refetch()} />
      ) : (
        <View style={styles.grid}>
          <KpiCard
            title="NAS Total"
            value={String(summaryQuery.data?.total_nas ?? 0)}
            subtitle="Monitored endpoints"
            icon={<Server color={colors.primary} size={20} />}
            onPress={() => router.push('/monitor')}
          />
          <Card style={styles.kpi}>
            <View style={styles.kpiHeader}>
              <AppText variant="label">NAS Sync</AppText>
              <AlertCircle color={colors.mutedForeground} size={18} />
            </View>
            <View style={styles.badgeWrap}>
              <FreshnessBadge status="fresh" />
              <AppText>{summaryQuery.data?.nas_fresh ?? 0}</AppText>
              <FreshnessBadge status="stale" />
              <AppText>{summaryQuery.data?.nas_stale ?? 0}</AppText>
              <FreshnessBadge status="offline" />
              <AppText>{summaryQuery.data?.nas_offline ?? 0}</AppText>
            </View>
          </Card>
          <KpiCard
            title="Ceph Health"
            value={summaryQuery.data?.ceph_health?.replace('HEALTH_', '') || 'UNKNOWN'}
            subtitle={`Sync: ${summaryQuery.data?.ceph_status ?? 'offline'}`}
            icon={<Database color={colors.primary} size={20} />}
            tone={summaryQuery.data?.ceph_health === 'HEALTH_OK' ? colors.success : colors.warn}
            onPress={() => router.push('/monitor')}
          />
          <Card style={styles.kpi}>
            <View style={styles.kpiHeader}>
              <AppText variant="label">Ceph Storage</AppText>
              <HardDrive color={colors.mutedForeground} size={18} />
            </View>
            <AppText variant="metric">{summaryQuery.data?.storage_used_pct ?? 'N/A'}%</AppText>
            <ProgressBar value={summaryQuery.data?.storage_used_pct} />
          </Card>
        </View>
      )}

      {activityQuery.isLoading ? <LoadingState label="Memuat tren..." /> : <ActivityBarChart days={activityQuery.data?.days} />}

      <Card>
        <AppText variant="subtitle">Recent Failed Backups</AppText>
        {failedQuery.isLoading ? (
          <LoadingState label="Memuat log gagal..." />
        ) : failedQuery.data?.items.length === 0 ? (
          <EmptyState title="Tidak ada backup gagal" message="Semua tampak aman pada daftar terbaru." />
        ) : (
          failedQuery.data?.items.map((log) => (
            <Button key={log.id} variant="ghost" onPress={() => router.push(`/logs/${log.id}`)}>
              <View style={styles.rowContent}>
                <View style={styles.rowMain}>
                  <AppText style={styles.bold}>{log.nas_id}</AppText>
                  <AppText variant="muted" numberOfLines={1}>
                    {log.job_name} • {formatRelative(log.created_at)}
                  </AppText>
                </View>
                <BackupStatusBadge status={log.status} acknowledged={log.acknowledged} />
              </View>
            </Button>
          ))
        )}
      </Card>

      <Card>
        <AppText variant="subtitle">Backup Terbaru per NAS</AppText>
        {nasQuery.isLoading ? (
          <LoadingState label="Memuat NAS..." />
        ) : nasQuery.data?.items.length === 0 ? (
          <EmptyState title="Belum ada NAS" message="Collector belum mengirim metrik NAS." />
        ) : (
          nasQuery.data?.items.map((nas, index) => {
            const latestLog = latestLogQueries[index]?.data?.items[0];
            return (
              <View key={nas.source_id} style={styles.nasRow}>
                <View style={styles.nasTitle}>
                  <FreshnessDot status={nas.status} />
                  <View style={styles.flex}>
                    <AppText style={styles.bold}>{nas.display_name}</AppText>
                    <AppText variant="muted">{nas.source_id}</AppText>
                  </View>
                </View>
                {latestLog ? (
                  <View style={styles.latestLine}>
                    <BackupStatusBadge status={latestLog.status} acknowledged={latestLog.acknowledged} />
                    <AppText variant="muted">{formatRelative(latestLog.created_at)}</AppText>
                  </View>
                ) : (
                  <AppText variant="muted">Belum ada log backup.</AppText>
                )}
              </View>
            );
          })
        )}
      </Card>
    </Screen>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  tone = colors.foreground,
  onPress,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone?: string;
  onPress?: () => void;
}) {
  return (
    <Card style={styles.kpi}>
      <View style={styles.kpiHeader}>
        <AppText variant="label">{title}</AppText>
        {icon}
      </View>
      <AppText variant="metric" style={{ color: tone }}>
        {value}
      </AppText>
      <AppText variant="muted">{subtitle}</AppText>
      {onPress ? (
        <Button variant="ghost" onPress={onPress}>
          Buka
        </Button>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpi: {
    width: '48%',
    minHeight: 150,
    justifyContent: 'space-between',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  badgeWrap: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rowContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowMain: {
    flex: 1,
    alignItems: 'flex-start',
  },
  bold: {
    fontWeight: '800',
  },
  nasRow: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  nasTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  latestLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  refreshText: {
    fontWeight: '800',
  },
});
