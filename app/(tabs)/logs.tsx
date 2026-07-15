import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Filter, RefreshCw, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { logsApi } from '@/src/api/logs';
import { monitorApi } from '@/src/api/monitor';
import { BackupStatusBadge } from '@/src/components/status-badges';
import { AppText, Button, Card, EmptyState, Field, LoadingState, Screen, SectionHeader } from '@/src/components/ui';
import { PillSelector } from '@/src/components/selectors';
import { formatDateTimeWib, jakartaDateToUtcRange } from '@/src/lib/datetime';
import { formatDurationSeconds } from '@/src/lib/format';
import { queryKeys } from '@/src/lib/query-keys';
import { colors, spacing } from '@/src/theme/colors';

const PAGE_SIZE = 15;

export default function LogsScreen() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [nasId, setNasId] = useState('ALL');
  const [jobName, setJobName] = useState('');
  const [dateText, setDateText] = useState('');

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

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['logs'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.nasList });
  }

  return (
    <Screen
      contentStyle={styles.content}
      scroll
    >
      <SectionHeader
        title="Backup Logs"
        subtitle="Riwayat job backup dari semua NAS."
        action={
          <Button variant="outline" onPress={refresh}>
            <RefreshCw color={colors.foreground} size={16} />
            <AppText style={styles.actionLabel}>Refresh</AppText>
          </Button>
        }
      />

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
        <Field label="Job name" value={jobName} onChangeText={setJobName} placeholder="Cari job..." />
        <Field label="Tanggal WIB" value={dateText} onChangeText={setDateText} placeholder="YYYY-MM-DD" />
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
        <LoadingState label="Memuat backup logs..." />
      ) : items.length === 0 ? (
        <EmptyState
          title={isFiltered ? 'Tidak ada hasil' : 'Belum ada backup log'}
          message={isFiltered ? 'Coba longgarkan filter pencarian.' : 'Reporter NAS belum mengirim log.'}
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
              {logsQuery.isFetchingNextPage ? 'Memuat...' : 'Load more'}
            </Button>
          ) : (
            <AppText variant="muted" style={styles.center}>
              Semua log yang cocok sudah ditampilkan.
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
  actionLabel: {
    fontWeight: '800',
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
