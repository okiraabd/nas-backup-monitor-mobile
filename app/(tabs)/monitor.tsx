import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Cpu, Database, HardDrive, MemoryStick, Server } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { getApiErrorMessage, getApiErrorStatus } from '@/src/api/client';
import { monitorApi } from '@/src/api/monitor';
import { MetricLineChart } from '@/src/components/charts';
import { RefreshButton, UpdatedAt } from '@/src/components/refresh-controls';
import { FreshnessBadge, FreshnessDot } from '@/src/components/status-badges';
import { PillSelector, SegmentedControl } from '@/src/components/selectors';
import { AppText, Card, EmptyState, ErrorState, InlineError, LoadingState, ProgressBar, Screen, SectionHeader } from '@/src/components/ui';
import { useRefreshOnScreenFocus, useScreenPollingInterval } from '@/src/features/query/QueryLifecycleProvider';
import { formatBytes, formatUptimeSeconds, percentText } from '@/src/lib/format';
import { queryKeys } from '@/src/lib/query-keys';
import { ACTIVE_REFRESH_MS } from '@/src/lib/refresh';
import { TAB_BOTTOM_PADDING, colors, spacing } from '@/src/theme/colors';

const TIMEFRAMES = [
  { label: '1h', value: 1 },
  { label: '6h', value: 6 },
  { label: '12h', value: 12 },
  { label: '24h', value: 24 },
  { label: '7d', value: 168 },
  { label: '30d', value: 720 },
];

export default function MonitorScreen() {
  const [segment, setSegment] = useState<'nas' | 'ceph'>('nas');
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const activeQueryKey = segment === 'nas' ? queryKeys.nasList : queryKeys.cephBase;
  const activeFetchCount = useIsFetching({ queryKey: activeQueryKey });

  async function refetchActiveSegment() {
    await queryClient.refetchQueries({ queryKey: activeQueryKey, type: 'active' });
  }

  async function refreshActiveSegment() {
    setIsManualRefreshing(true);
    try {
      await refetchActiveSegment();
      const failedQuery = queryClient
        .getQueryCache()
        .findAll({ queryKey: activeQueryKey })
        .find((query) => query.state.status === 'error');
      if (failedQuery) Alert.alert('Refresh incomplete', getApiErrorMessage(failedQuery.state.error));
    } finally {
      setIsManualRefreshing(false);
    }
  }

  useRefreshOnScreenFocus(() => void refetchActiveSegment());

  return (
    <Screen contentStyle={styles.content}>
      <SectionHeader
        title="Monitoring"
        subtitle="NAS and Ceph metrics from the collector."
        action={
          <RefreshButton
            refreshing={isManualRefreshing || activeFetchCount > 0}
            onPress={() => void refreshActiveSegment()}
          />
        }
      />
      <SegmentedControl
        value={segment}
        onChange={setSegment}
        options={[
          { label: 'NAS', value: 'nas' },
          { label: 'Ceph', value: 'ceph' },
        ]}
      />
      {segment === 'nas' ? <NasMonitor /> : <CephMonitor />}
    </Screen>
  );
}

function NasMonitor() {
  const [selectedNas, setSelectedNas] = useState('');
  const [hours, setHours] = useState(1);
  const refreshInterval = useScreenPollingInterval(ACTIVE_REFRESH_MS);
  const previousSnapshot = useRef<{ sourceId: string; collectedAt: string | null } | null>(null);
  const nasListQuery = useQuery({
    queryKey: queryKeys.nasList,
    queryFn: monitorApi.nasList,
    refetchInterval: refreshInterval,
  });

  useEffect(() => {
    if (!selectedNas && nasListQuery.data?.items.length) {
      const firstNas = nasListQuery.data.items[0];
      if (firstNas) setSelectedNas(firstNas.source_id);
    }
  }, [nasListQuery.data?.items, selectedNas]);

  const snapshotQuery = useQuery({
    queryKey: queryKeys.nasSnapshot(selectedNas),
    queryFn: () => monitorApi.nasSnapshot(selectedNas),
    enabled: Boolean(selectedNas),
    refetchInterval: refreshInterval,
  });
  const cpuQuery = useQuery({
    queryKey: queryKeys.nasHistory(selectedNas, 'cpu_usage', hours),
    queryFn: () => monitorApi.nasHistory(selectedNas, 'cpu_usage', hours),
    enabled: Boolean(selectedNas),
  });
  const ramQuery = useQuery({
    queryKey: queryKeys.nasHistory(selectedNas, 'ram_used_pct', hours),
    queryFn: () => monitorApi.nasHistory(selectedNas, 'ram_used_pct', hours),
    enabled: Boolean(selectedNas),
  });
  const refetchCpu = cpuQuery.refetch;
  const refetchRam = ramQuery.refetch;

  useEffect(() => {
    const collectedAt = snapshotQuery.data?.last_collected_at ?? null;
    if (!selectedNas || !collectedAt) return;

    const previous = previousSnapshot.current;
    if (previous?.sourceId === selectedNas && previous.collectedAt && previous.collectedAt !== collectedAt) {
      void Promise.all([refetchCpu(), refetchRam()]);
    }
    previousSnapshot.current = { sourceId: selectedNas, collectedAt };
  }, [refetchCpu, refetchRam, selectedNas, snapshotQuery.data?.last_collected_at]);

  const nasOptions =
    nasListQuery.data?.items.map((nas) => ({ label: nas.source_id, value: nas.source_id })) ?? [];
  const refreshError = [nasListQuery, snapshotQuery, cpuQuery, ramQuery].find(
    (query) => query.isRefetchError,
  )?.error;

  if (nasListQuery.isLoading) return <LoadingState label="Loading NAS..." />;
  if (nasListQuery.isError && !nasListQuery.data) {
    return <ErrorState message={getApiErrorMessage(nasListQuery.error)} onRetry={() => nasListQuery.refetch()} />;
  }
  if (!nasListQuery.data?.items.length) {
    return <EmptyState title="No NAS found" message="The collector has not sent any NAS metrics yet." />;
  }

  const snapshot = snapshotQuery.data;
  const metric = (name: string) => snapshot?.metrics?.[name]?.value ?? null;

  return (
    <View style={styles.stack}>
      <PillSelector value={selectedNas} onChange={setSelectedNas} options={nasOptions} />
      <PillSelector value={hours} onChange={setHours} options={TIMEFRAMES} />
      <UpdatedAt timestamp={Math.max(snapshotQuery.dataUpdatedAt, cpuQuery.dataUpdatedAt, ramQuery.dataUpdatedAt)} />
      {refreshError ? (
        <InlineError
          message={`Showing the last available NAS data. ${getApiErrorMessage(refreshError)}`}
          onRetry={() => void Promise.all([nasListQuery.refetch(), snapshotQuery.refetch(), cpuQuery.refetch(), ramQuery.refetch()])}
        />
      ) : null}
      {snapshotQuery.isLoading ? (
        <LoadingState label="Loading NAS snapshot..." />
      ) : snapshotQuery.isError && !snapshotQuery.data ? (
        <ErrorState message={getApiErrorMessage(snapshotQuery.error)} onRetry={() => snapshotQuery.refetch()} />
      ) : snapshot ? (
        <>
          <View style={styles.sourceHeader}>
            <View style={styles.inline}>
              <FreshnessDot status={snapshot.status} />
              <View>
                <AppText variant="subtitle">{snapshot.display_name}</AppText>
                <AppText variant="muted">{snapshot.source_id}</AppText>
              </View>
            </View>
            <FreshnessBadge status={snapshot.status} />
          </View>
          <View style={styles.grid}>
            <MetricCard title="CPU" value={percentText(metric('cpu_usage'))} icon={<Cpu color={colors.primary} size={20} />} />
            <MetricCard
              title="Memory"
              value={percentText(metric('ram_used_pct'))}
              icon={<MemoryStick color={colors.primary} size={20} />}
            />
            <Card style={styles.metricCard}>
              <View style={styles.metricTop}>
                <AppText variant="label">Disk</AppText>
                <HardDrive color={colors.primary} size={20} />
              </View>
              <AppText variant="metric">{percentText(metric('disk_used_pct'))}</AppText>
              <AppText variant="muted">
                {formatBytes(metric('storage_used_bytes'))} / {formatBytes(metric('storage_total_bytes'))}
              </AppText>
              <ProgressBar value={metric('disk_used_pct')} />
            </Card>
            <MetricCard
              title="Uptime"
              value={formatUptimeSeconds(metric('system_uptime'))}
              icon={<Activity color={colors.primary} size={20} />}
            />
          </View>
        </>
      ) : null}
      {cpuQuery.isError && !cpuQuery.data ? (
        <InlineError message={`CPU history: ${getApiErrorMessage(cpuQuery.error)}`} onRetry={() => cpuQuery.refetch()} />
      ) : (
        <MetricLineChart title="CPU Usage" points={cpuQuery.data?.points} isPercentage />
      )}
      {ramQuery.isError && !ramQuery.data ? (
        <InlineError message={`Memory history: ${getApiErrorMessage(ramQuery.error)}`} onRetry={() => ramQuery.refetch()} />
      ) : (
        <MetricLineChart title="Memory Usage" points={ramQuery.data?.points} isPercentage />
      )}
    </View>
  );
}

function CephMonitor() {
  const [hours, setHours] = useState(1);
  const refreshInterval = useScreenPollingInterval(ACTIVE_REFRESH_MS);
  const previousCollectedAt = useRef<string | null>(null);
  const snapshotQuery = useQuery({
    queryKey: queryKeys.cephSnapshot,
    queryFn: monitorApi.cephSnapshot,
    refetchInterval: refreshInterval,
    retry: false,
  });
  const historyQuery = useQuery({
    queryKey: queryKeys.cephHistory('storage_used_pct', hours),
    queryFn: () => monitorApi.cephHistory('storage_used_pct', hours),
    retry: false,
  });
  const refetchHistory = historyQuery.refetch;

  useEffect(() => {
    const collectedAt = snapshotQuery.data?.last_collected_at ?? null;
    if (previousCollectedAt.current && collectedAt && previousCollectedAt.current !== collectedAt) {
      void refetchHistory();
    }
    if (collectedAt) previousCollectedAt.current = collectedAt;
  }, [refetchHistory, snapshotQuery.data?.last_collected_at]);

  const snapshot = snapshotQuery.data;
  const getMetric = (name: string) => snapshot?.metrics?.[name];
  const storagePct = getMetric('storage_used_pct')?.value;
  const health = getMetric('health_status')?.text ?? 'UNKNOWN';
  const healthDetail = getMetric('health_detail')?.text;
  const osdUp = getMetric('osd_up')?.value;
  const osdIn = getMetric('osd_in')?.value;
  const osdTotal = getMetric('osd_total')?.value;
  const refreshError = [snapshotQuery, historyQuery].find((query) => query.isRefetchError)?.error;

  if (snapshotQuery.isLoading) return <LoadingState label="Loading Ceph..." />;
  if (snapshotQuery.isError && !snapshotQuery.data && getApiErrorStatus(snapshotQuery.error) === 404) {
    return <EmptyState title="No Ceph data" message="No Ceph snapshot is available, or the collector has not sent data yet." />;
  }
  if (snapshotQuery.isError && !snapshotQuery.data) {
    return <ErrorState message={getApiErrorMessage(snapshotQuery.error)} onRetry={() => snapshotQuery.refetch()} />;
  }

  return (
    <View style={styles.stack}>
      <PillSelector value={hours} onChange={setHours} options={TIMEFRAMES} />
      <UpdatedAt timestamp={Math.max(snapshotQuery.dataUpdatedAt, historyQuery.dataUpdatedAt)} />
      {refreshError ? (
        <InlineError
          message={`Showing the last available Ceph data. ${getApiErrorMessage(refreshError)}`}
          onRetry={() => void Promise.all([snapshotQuery.refetch(), historyQuery.refetch()])}
        />
      ) : null}
      <View style={styles.sourceHeader}>
        <View style={styles.inline}>
          <Database color={colors.primary} size={22} />
          <View>
            <AppText variant="subtitle">Ceph Cluster</AppText>
            <AppText variant="muted">{snapshot?.source_id ?? 'ceph-cluster'}</AppText>
          </View>
        </View>
        <FreshnessBadge status={snapshot?.status} />
      </View>
      <View style={styles.grid}>
        <MetricCard
          title="Health"
          value={health.replace('HEALTH_', '')}
          icon={<Activity color={health === 'HEALTH_OK' ? colors.success : colors.warn} size={20} />}
          tone={health === 'HEALTH_OK' ? colors.success : colors.warn}
        />
        <Card style={styles.metricCard}>
          <View style={styles.metricTop}>
            <AppText variant="label">OSD</AppText>
            <Server color={colors.primary} size={20} />
          </View>
          <AppText variant="metric">
            {osdUp ?? '-'} / {osdIn ?? '-'} / {osdTotal ?? '-'}
          </AppText>
          <AppText variant="muted">UP / IN / TOTAL</AppText>
        </Card>
        <Card style={styles.metricWide}>
          <View style={styles.metricTop}>
            <AppText variant="label">Storage Used</AppText>
            <HardDrive color={colors.primary} size={20} />
          </View>
          <AppText variant="metric">{percentText(storagePct)}</AppText>
          <AppText variant="muted">
            {formatBytes(getMetric('storage_used_bytes')?.value)} / {formatBytes(getMetric('storage_total_bytes')?.value)}
          </AppText>
          <ProgressBar value={storagePct} />
        </Card>
      </View>
      {healthDetail && healthDetail !== 'None' ? (
        <Card style={styles.warnCard}>
          <AppText variant="label">Health detail</AppText>
          <AppText style={{ color: colors.warn }}>{healthDetail}</AppText>
        </Card>
      ) : null}
      {historyQuery.isError && !historyQuery.data ? (
        <InlineError message={`Ceph history: ${getApiErrorMessage(historyQuery.error)}`} onRetry={() => historyQuery.refetch()} />
      ) : (
        <MetricLineChart title="Ceph Storage Used" points={historyQuery.data?.points} isPercentage />
      )}
    </View>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone = colors.foreground,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone?: string;
}) {
  return (
    <Card style={styles.metricCard}>
      <View style={styles.metricTop}>
        <AppText variant="label">{title}</AppText>
        {icon}
      </View>
      <AppText variant="metric" style={{ color: tone }}>
        {value}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: TAB_BOTTOM_PADDING,
  },
  stack: {
    gap: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    width: '48%',
    minHeight: 130,
    justifyContent: 'space-between',
  },
  metricWide: {
    width: '100%',
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warnCard: {
    borderColor: `${colors.warn}66`,
  },
});
