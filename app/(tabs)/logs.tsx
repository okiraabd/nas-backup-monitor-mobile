import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Filter, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { logsApi } from '@/src/api/logs';
import { monitorApi } from '@/src/api/monitor';
import { RefreshButton, UpdatedAt } from '@/src/components/refresh-controls';
import { BackupStatusBadge } from '@/src/components/status-badges';
import { AppText, Button, Card, EmptyState, Field, LoadingState, Screen, SectionHeader } from '@/src/components/ui';
import { PillSelector } from '@/src/components/selectors';
import { useRefreshOnScreenFocus } from '@/src/features/query/QueryLifecycleProvider';
import { formatDateTimeWib, jakartaDateToUtcRange } from '@/src/lib/datetime';
import { formatDurationSeconds } from '@/src/lib/format';
import { queryKeys } from '@/src/lib/query-keys';
import { colors, spacing } from '@/src/theme/colors';

const PAGE_SIZE = 15;

export default function LogsScreen() {
  const [status, setStatus] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [nasId, setNasId] = useState('ALL');
  const [jobName, setJobName] = useState('');
  const [dateText, setDateText] = useState('');
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const nasQuery = useQuery({
    queryKey: queryKeys.nasList,
    queryFn: monitorApi.nasList,
  });

  const filters = useMemo(() => {
    const range = dateText ? jakartaDateToUtcRange(dateText) : null;
    return {
      status,
      nasId,
      jobName,
      dateText,
      date_from: range?.date_from,
      date_to: range?.date_to,
    };
  }, [dateText, jobName, nasId, status]);

  const logsQuery = useInfiniteQuery({
    queryKey: queryKeys.logs(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      logsApi.list({
        page: Number(pageParam),
        page_size: PAGE_SIZE,
        status: status === 'ALL' ? undefined : status,
        nas_id: nasId === 'ALL' ? undefined : nasId,
        job_name: jobName.trim() || undefined,
        date_from: filters.date_from,
        date_to: filters.date_to,
      }),
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined),
  });

  const items = logsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isFiltered = status !== 'ALL' || nasId !== 'ALL' || jobName.trim() || dateText;

  async function refetchScreen() {
    await Promise.all([logsQuery.refetch(), nasQuery.refetch()]);
  }

  async function refresh() {
    setIsManualRefreshing(true);
    try {
      await refetchScreen();
    } finally {
      setIsManualRefreshing(false);
    }
  }

  useRefreshOnScreenFocus(() => void refetchScreen());

  return (
    <Screen
      contentStyle={styles.content}
      scroll
    >
      <SectionHeader
        title="Backup Logs"
        subtitle="Backup job history from all NAS devices."
        action={<RefreshButton refreshing={isManualRefreshing} onPress={() => void refresh()} />}
      />
      <UpdatedAt timestamp={Math.max(logsQuery.dataUpdatedAt, nasQuery.dataUpdatedAt)} />

      <Card>
        <View style={styles.filterTitle}>
          <Filter color={colors.primary} size={18} />
          <AppText variant="subtitle">Filter</AppText>
        </View>
        <PillSelector
          value={status}
          onChange={setStatus}
          options={[
            { label: 'All', value: 'ALL' },
            { label: 'Success', value: 'SUCCESS' },
            { label: 'Failed', value: 'FAILED' },
          ]}
        />
        <PillSelector
          value={nasId}
          onChange={setNasId}
          options={[
            { label: 'All NAS', value: 'ALL' },
            ...(nasQuery.data?.items.map((nas) => ({ label: nas.source_id, value: nas.source_id })) ?? []),
          ]}
        />
        <Field label="Job name" value={jobName} onChangeText={setJobName} placeholder="Search jobs..." />
        <Field label="Date (WIB)" value={dateText} onChangeText={setDateText} placeholder="YYYY-MM-DD" />
        {isFiltered ? (
          <Button
            variant="ghost"
            onPress={() => {
              setStatus('ALL');
              setNasId('ALL');
              setJobName('');
              setDateText('');
            }}
          >
            Reset filter
          </Button>
        ) : null}
      </Card>

      {logsQuery.isLoading ? (
        <LoadingState label="Loading backup logs..." />
      ) : items.length === 0 ? (
        <EmptyState
          title={isFiltered ? 'No results found' : 'No backup logs yet'}
          message={isFiltered ? 'Try using fewer filters.' : 'The NAS reporter has not sent any logs yet.'}
        />
      ) : (
        <View style={styles.list}>
          {items.map((log) => (
            <Button key={log.id} variant="ghost" onPress={() => router.push(`/logs/${log.id}`)}>
              <View style={styles.logRow}>
                <View style={styles.logMain}>
                  <View style={styles.inline}>
                    <Search color={colors.mutedForeground} size={15} />
                    <AppText style={styles.bold} numberOfLines={1}>
                      {log.nas_id}
                    </AppText>
                  </View>
                  <AppText variant="muted" numberOfLines={1}>
                    {log.job_name}
                  </AppText>
                  <AppText variant="muted">{formatDateTimeWib(log.created_at, { seconds: false })}</AppText>
                </View>
                <View style={styles.logMeta}>
                  <BackupStatusBadge status={log.status} acknowledged={log.acknowledged} />
                  <AppText variant="muted">{formatDurationSeconds(log.duration_seconds)}</AppText>
                </View>
              </View>
            </Button>
          ))}
          {logsQuery.hasNextPage ? (
            <Button
              variant="outline"
              disabled={logsQuery.isFetchingNextPage}
              onPress={() => logsQuery.fetchNextPage()}
            >
              {logsQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
            </Button>
          ) : (
            <AppText variant="muted" style={styles.center}>
              All matching logs are displayed.
            </AppText>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 100,
  },
  filterTitle: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  list: {
    gap: spacing.md,
  },
  logRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  logMain: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  logMeta: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  inline: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  bold: {
    fontWeight: '800',
  },
  center: {
    textAlign: 'center',
  },
});
