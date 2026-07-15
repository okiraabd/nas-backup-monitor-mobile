import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Cpu, Database, HardDrive, MemoryStick, Server } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getApiErrorMessage } from '@/src/api/client';
import { monitorApi } from '@/src/api/monitor';
import { MetricLineChart } from '@/src/components/charts';
import { RefreshButton, UpdatedAt } from '@/src/components/refresh-controls';
import { FreshnessBadge, FreshnessDot } from '@/src/components/status-badges';
import { PillSelector, SegmentedControl } from '@/src/components/selectors';
import { AppText, Card, EmptyState, ErrorState, LoadingState, ProgressBar, Screen, SectionHeader } from '@/src/components/ui';
import { useRefreshOnScreenFocus, useScreenPollingInterval } from '@/src/features/query/QueryLifecycleProvider';
import { formatBytes, formatUptimeSeconds, percentText } from '@/src/lib/format';
import { queryKeys } from '@/src/lib/query-keys';
import { ACTIVE_REFRESH_MS } from '@/src/lib/refresh';
import { colors, spacing } from '@/src/theme/colors';

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
  const activeQueryKey = segment === 'nas' ? ['monitor', 'nas'] : ['monitor', 'ceph'];
  const activeFetchCount = useIsFetching({ queryKey: activeQueryKey });

  async function refetchActiveSegment() {
    await queryClient.refetchQueries({ queryKey: activeQueryKey, type: 'active' });
  }

  async function refreshActiveSegment() {
    setIsManualRefreshing(true);
    try {
      await refetchActiveSegment();
    } finally {
      setIsManualRefreshing(false);
    }
  }

  useRefreshOnScreenFocus(() => void refetchActiveSegment());

  return (
    <Screen contentStyle={styles.content}>
      <SectionHeader
        title="Monitoring"
        subtitle="Metrik NAS dan Ceph dari collector."
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

  const nasOptions = [
    ...(nasListQuery.data?.items.map((nas) => ({ label: nas.source_id, value: nas.source_id })) ?? []),
  ];

  if (nasListQuery.isLoading) return <LoadingState label="Memuat NAS..." />;
  if (nasListQuery.isError) return <ErrorState message={getApiErrorMessage(nasListQuery.error)} />;
  if (!nasListQuery.data?.items.length) {
    return <EmptyState title="Belum ada NAS" message="Collector belum mengirim metrik NAS." />;
  }

  const snapshot = snapshotQuery.data;
  const metric = (name: string) => snapshot?.metrics?.[name]?.value ?? null;

  return (
    <View style={styles.stack}>
      <PillSelector value={selectedNas} onChange={setSelectedNas} options={nasOptions} />
      <PillSelector value={hours} onChange={setHours} options={TIMEFRAMES} />
      <UpdatedAt timestamp={Math.max(snapshotQuery.dataUpdatedAt, cpuQuery.dataUpdatedAt, ramQuery.dataUpdatedAt)} />
      {snapshotQuery.isLoading ? (
        <LoadingState label="Memuat snapshot NAS..." />
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
      <MetricLineChart title="CPU Usage" points={cpuQuery.data?.points} isPercentage />
      <MetricLineChart title="Memory Usage" points={ramQuery.data?.points} isPercentage />
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

  if (snapshotQuery.isLoading) return <LoadingState label="Memuat Ceph..." />;
  if (snapshotQuery.isError) {
    return <EmptyState title="No Ceph Data" message="Belum ada snapshot Ceph atau collector belum mengirim data." />;
  }

  return (
    <View style={styles.stack}>
      <PillSelector value={hours} onChange={setHours} options={TIMEFRAMES} />
      <UpdatedAt timestamp={Math.max(snapshotQuery.dataUpdatedAt, historyQuery.dataUpdatedAt)} />
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
      <MetricLineChart title="Ceph Storage Used" points={historyQuery.data?.points} isPercentage />
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
    paddingBottom: 100,
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
