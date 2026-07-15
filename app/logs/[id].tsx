import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { getApiErrorMessage, getApiErrorStatus } from '@/src/api/client';
import { modalStyles } from '@/src/components/modal-styles';
import { logsApi } from '@/src/api/logs';
import { BackupStatusBadge, KeyValue } from '@/src/components/status-badges';
import { AppText, Button, Card, ErrorState, Field, LoadingState, Screen } from '@/src/components/ui';
import { formatDateTimeWib, formatLongDateTimeWib } from '@/src/lib/datetime';
import { formatBytes, formatDurationSeconds } from '@/src/lib/format';
import { queryKeys } from '@/src/lib/query-keys';
import { useAuthStore } from '@/src/store/auth-store';
import { TAB_BOTTOM_PADDING, colors, spacing } from '@/src/theme/colors';

const ackSchema = z.object({
  remark: z.string().min(1, 'Remark is required').max(2000, 'Remark is too long'),
});

type AckValues = z.infer<typeof ackSchema>;

export default function LogDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const logId = Number(id);
  const validId = Number.isInteger(logId) && logId > 0;
  const user = useAuthStore((state) => state.user);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);
  const bootstrapError = useAuthStore((state) => state.bootstrapError);
  const retryBootstrap = useAuthStore((state) => state.retryBootstrap);
  const queryClient = useQueryClient();
  const form = useForm<AckValues>({
    resolver: zodResolver(ackSchema),
    defaultValues: { remark: '' },
  });
  const [ackOpen, setAckOpen] = useState(false);

  const logQuery = useQuery({
    queryKey: queryKeys.log(validId ? logId : id ?? 'invalid'),
    queryFn: () => logsApi.detail(logId),
    enabled: validId && bootstrapped && Boolean(user),
  });

  const ackMutation = useMutation({
    mutationFn: (values: AckValues) => logsApi.acknowledge(logId, values.remark),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.log(logId) });
      void queryClient.invalidateQueries({ queryKey: ['logs'] });
      setAckOpen(false);
      form.reset();
    },
    onError: (error) => Alert.alert('Acknowledge failed', getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => logsApi.bulkDelete({ log_ids: [logId] }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['logs'] });
      router.replace('/logs');
    },
    onError: (error) => Alert.alert('Delete failed', getApiErrorMessage(error)),
  });

  if (!bootstrapped) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparing your session..." />
      </Screen>
    );
  }

  if (bootstrapError) {
    return (
      <Screen scroll={false}>
        <ErrorState message={bootstrapError} onRetry={retryBootstrap} />
      </Screen>
    );
  }

  if (!user) return <Redirect href="/login" />;

  if (!validId) {
    return (
      <Screen>
        <Card>
          <AppText variant="subtitle" style={{ color: colors.destructiveBright }}>Invalid log link</AppText>
          <AppText variant="muted">The requested log ID is not valid.</AppText>
          <Button variant="outline" onPress={() => router.replace('/logs')}>Back to logs</Button>
        </Card>
      </Screen>
    );
  }

  if (logQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading log details..." />
      </Screen>
    );
  }

  if (logQuery.isError && !logQuery.data && getApiErrorStatus(logQuery.error) !== 404) {
    return (
      <Screen>
        <ErrorState message={getApiErrorMessage(logQuery.error)} onRetry={() => logQuery.refetch()} />
      </Screen>
    );
  }

  if (!logQuery.data) {
    return (
      <Screen>
        <Card>
          <AppText variant="subtitle" style={{ color: colors.destructiveBright }}>
            Log not found
          </AppText>
        </Card>
      </Screen>
    );
  }

  const log = logQuery.data;
  const failed = log.status === 'FAILED';
  const canAcknowledge = failed && !log.acknowledged && (user?.role === 'admin' || user?.role === 'operator');

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <AppText variant="title">Log #{log.id}</AppText>
          <AppText variant="muted" numberOfLines={2}>
            {log.nas_id} • {log.job_name}
          </AppText>
        </View>
        <BackupStatusBadge status={log.status} acknowledged={log.acknowledged} />
      </View>

      {failed && !log.acknowledged ? (
        <Card style={styles.failedCard}>
          <View style={styles.inline}>
            <AlertTriangle color={colors.destructiveBright} size={22} />
            <AppText variant="subtitle" style={{ color: colors.destructiveBright }}>
              Backup Failed
            </AppText>
          </View>
          <AppText style={{ color: colors.destructiveBright }}>{log.message || 'No error message provided.'}</AppText>
          {canAcknowledge ? (
            <Button variant="destructive" onPress={() => setAckOpen(true)}>
              Acknowledge
            </Button>
          ) : null}
        </Card>
      ) : null}

      {log.acknowledged ? (
        <Card>
          <View style={styles.inline}>
            <CheckCircle2 color={colors.success} size={22} />
            <AppText variant="subtitle">Acknowledged</AppText>
          </View>
          <AppText>{log.remark || 'No remark provided.'}</AppText>
          <AppText variant="muted">
            {log.acknowledged_at ? formatLongDateTimeWib(log.acknowledged_at) : 'Time unknown'}
          </AppText>
        </Card>
      ) : null}

      <Card>
        <AppText variant="subtitle">Execution Details</AppText>
        <View style={styles.kvGrid}>
          <KeyValue label="Started" value={formatDateTimeWib(log.started_at)} />
          <KeyValue label="Ended" value={formatDateTimeWib(log.ended_at)} />
          <KeyValue label="Duration" value={formatDurationSeconds(log.duration_seconds)} />
          <KeyValue label="Engine" value={log.backup_engine} />
        </View>
        <View style={styles.monoBox}>
          <AppText variant="label">Source Path</AppText>
          <AppText style={styles.mono}>{log.source_path || '-'}</AppText>
        </View>
      </Card>

      <Card>
        <AppText variant="subtitle">Transfer Stats</AppText>
        <View style={styles.kvGrid}>
          <KeyValue label="Size" value={formatBytes(log.total_size_bytes)} />
          <KeyValue label="Files" value={log.total_files ?? '-'} />
          <KeyValue label="Changed" value={log.changed_file_count ?? '-'} />
          <KeyValue label="Errors" value={log.error_count ?? '-'} />
        </View>
      </Card>

      <Card>
        <AppText variant="subtitle">Raw Payload</AppText>
        <ScrollView horizontal style={styles.rawScroll}>
          <AppText style={styles.rawText}>
            {log.raw_payload ? JSON.stringify(log.raw_payload, null, 2) : 'No raw payload stored.'}
          </AppText>
        </ScrollView>
      </Card>

      {user?.role === 'admin' ? (
        <Button
          variant="destructive"
          disabled={deleteMutation.isPending}
          onPress={() =>
            Alert.alert('Delete log?', 'This action is permanent and cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
            ])
          }
        >
          <Trash2 color={colors.white} size={17} />
          <AppText style={styles.deleteText}>{deleteMutation.isPending ? 'Deleting...' : 'Delete Log'}</AppText>
        </Button>
      ) : null}

      <Modal visible={ackOpen} transparent animationType="slide" onRequestClose={() => setAckOpen(false)}>
        <View style={modalStyles.backdrop}>
          <Card style={modalStyles.card}>
            <AppText variant="subtitle">Acknowledge Failure</AppText>
            <AppText variant="muted">Add a remark describing how this failure was handled.</AppText>
            <Controller
              control={form.control}
              name="remark"
              render={({ field, fieldState }) => (
                <View style={modalStyles.fieldWrap}>
                  <Field label="Remark" value={field.value} onChangeText={field.onChange} multiline />
                  {fieldState.error ? <AppText style={modalStyles.error}>{fieldState.error.message}</AppText> : null}
                </View>
              )}
            />
            <View style={modalStyles.actions}>
              <Button variant="outline" onPress={() => setAckOpen(false)}>
                Cancel
              </Button>
              <Button disabled={ackMutation.isPending} onPress={form.handleSubmit((values) => ackMutation.mutate(values))}>
                {ackMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: TAB_BOTTOM_PADDING,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  failedCard: {
    borderColor: `${colors.destructiveBright}66`,
    backgroundColor: `${colors.destructiveBright}10`,
  },
  kvGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  monoBox: {
    gap: spacing.xs,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  rawScroll: {
    maxHeight: 360,
  },
  rawText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: colors.mutedForeground,
  },
  deleteText: {
    color: colors.white,
    fontWeight: '800',
  },
});
