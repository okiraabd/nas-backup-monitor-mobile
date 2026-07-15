import { useQuery } from '@tanstack/react-query';

import { monitorApi } from '@/src/api/monitor';
import { Card, LoadingState, Screen, SectionHeader, AppText } from '@/src/components/ui';
import { formatLongDateTimeWib } from '@/src/lib/datetime';

export default function CollectorScreen() {
  const statusQuery = useQuery({
    queryKey: ['monitor', 'collector-status'],
    queryFn: monitorApi.collectorStatus,
    refetchInterval: 2000,
  });

  return (
    <Screen>
      <SectionHeader title="Collector Status" subtitle="Status daemon pengumpul metrik." />
      {statusQuery.isLoading ? (
        <LoadingState />
      ) : (
        <Card>
          <AppText variant="subtitle">{statusQuery.data?.last_status ?? 'No run recorded'}</AppText>
          <AppText variant="muted">Mode: {statusQuery.data?.is_mock ? 'MOCK' : 'LIVE'}</AppText>
          <AppText variant="muted">Last: {formatLongDateTimeWib(statusQuery.data?.last_run_at)}</AppText>
          <AppText variant="muted">
            Sources: {statusQuery.data?.success_sources ?? 0}/{statusQuery.data?.total_sources ?? 0} success
          </AppText>
          <AppText>{statusQuery.data?.message ?? 'No message.'}</AppText>
        </Card>
      )}
    </Screen>
  );
}
