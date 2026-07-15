import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Download, FileText, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Modal, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { getApiErrorMessage } from '@/src/api/client';
import { monitorApi } from '@/src/api/monitor';
import { reportsApi } from '@/src/api/reports';
import { RefreshButton, UpdatedAt } from '@/src/components/refresh-controls';
import { PillSelector } from '@/src/components/selectors';
import { AppText, Button, Card, EmptyState, Field, IconButton, LoadingState, Screen, SectionHeader } from '@/src/components/ui';
import { useRefreshOnScreenFocus } from '@/src/features/query/QueryLifecycleProvider';
import { formatDateTimeWib, todayJakartaDate } from '@/src/lib/datetime';
import { formatBytes } from '@/src/lib/format';
import { queryKeys } from '@/src/lib/query-keys';
import { useAuthStore } from '@/src/store/auth-store';
import { colors, spacing } from '@/src/theme/colors';
import type { Report } from '@/src/types/api';

const generateSchema = z
  .object({
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Gunakan format YYYY-MM-DD'),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Gunakan format YYYY-MM-DD'),
    nas_id: z.string(),
    custom_name: z.string().optional(),
  })
  .refine((value) => value.date_to >= value.date_from, {
    message: 'Tanggal akhir harus sama atau setelah tanggal awal',
    path: ['date_to'],
  });

type GenerateValues = z.infer<typeof generateSchema>;

export default function ReportsScreen() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const reportsQuery = useQuery({
    queryKey: queryKeys.reports,
    queryFn: reportsApi.list,
  });
  const nasQuery = useQuery({
    queryKey: queryKeys.nasList,
    queryFn: monitorApi.nasList,
  });

  useRefreshOnScreenFocus(() => void reportsQuery.refetch());

  async function refreshReports() {
    setIsManualRefreshing(true);
    try {
      await reportsQuery.refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  }

  const form = useForm<GenerateValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      date_from: todayJakartaDate(),
      date_to: todayJakartaDate(),
      nas_id: 'ALL',
      custom_name: '',
    },
  });

  const filteredReports = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const all = reportsQuery.data ?? [];
    if (!needle) return all;
    return all.filter((report) => report.filename.toLowerCase().includes(needle));
  }, [reportsQuery.data, search]);

  const generateMutation = useMutation({
    mutationFn: (values: GenerateValues) =>
      reportsApi.generate({
        date_from: values.date_from,
        date_to: values.date_to,
        nas_id: values.nas_id === 'ALL' ? null : values.nas_id,
        custom_name: values.custom_name?.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      setGenerateOpen(false);
      form.reset();
    },
    onError: (error) => Alert.alert('Generate gagal', getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => reportsApi.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
    onError: (error) => Alert.alert('Hapus gagal', getApiErrorMessage(error)),
  });

  async function downloadReport(report: Report) {
    try {
      setDownloadingId(report.id);
      const safeName = report.filename.replace(/[^A-Za-z0-9_.-]/g, '_') || `report-${report.id}.pdf`;
      const destination = `${FileSystem.documentDirectory}${safeName}`;
      const result = await FileSystem.downloadAsync(reportsApi.downloadUrl(report.id), destination, {
        headers: reportsApi.downloadHeaders(),
      });
      if (result.status !== 200) {
        throw new Error(result.status === 410 ? 'File report tidak tersedia lagi.' : `Download gagal (${result.status}).`);
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: report.filename });
      } else {
        Alert.alert('Download selesai', result.uri);
      }
    } catch (error) {
      Alert.alert('Download gagal', error instanceof Error ? error.message : 'Tidak dapat mengunduh report.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <SectionHeader title="Reports" subtitle="Generate dan unduh PDF backup." />
      <View style={styles.toolbar}>
        <RefreshButton refreshing={isManualRefreshing} onPress={() => void refreshReports()} />
        <Button onPress={() => setGenerateOpen(true)}>
          <Plus color={colors.white} size={17} />
          <AppText style={styles.primaryButtonText}>Generate</AppText>
        </Button>
      </View>
      <UpdatedAt timestamp={reportsQuery.dataUpdatedAt} />

      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Cari filename..." />

      {reportsQuery.isLoading ? (
        <LoadingState label="Memuat reports..." />
      ) : filteredReports.length === 0 ? (
        <EmptyState
          title={search ? 'Report tidak ditemukan' : 'Belum ada report'}
          message={search ? 'Coba kata kunci lain.' : 'Buat report PDF dari tombol Generate.'}
        />
      ) : (
        <View style={styles.stack}>
          {filteredReports.map((report) => (
            <Card key={report.id}>
              <View style={styles.reportHeader}>
                <View style={styles.reportTitle}>
                  <FileText color={colors.primary} size={20} />
                  <View style={styles.flex}>
                    <AppText style={styles.bold} numberOfLines={2}>
                      {report.filename}
                    </AppText>
                    <AppText variant="muted">
                      {report.date_from} sampai {report.date_to}
                    </AppText>
                  </View>
                </View>
                <View style={styles.actions}>
                  <IconButton disabled={downloadingId === report.id} onPress={() => downloadReport(report)}>
                    <Download color={colors.foreground} size={18} />
                  </IconButton>
                  {isAdmin ? (
                    <IconButton
                      destructive
                      disabled={deleteMutation.isPending}
                      onPress={() =>
                        Alert.alert('Hapus report?', 'File dan metadata report akan dihapus.', [
                          { text: 'Batal', style: 'cancel' },
                          { text: 'Hapus', style: 'destructive', onPress: () => deleteMutation.mutate(report.id) },
                        ])
                      }
                    >
                      <Trash2 color={colors.destructiveBright} size={18} />
                    </IconButton>
                  ) : null}
                </View>
              </View>
              <View style={styles.metaRow}>
                <AppText variant="muted">Filter: {report.nas_filter || 'All NAS'}</AppText>
                <AppText variant="muted">{formatBytes(report.file_size_bytes)}</AppText>
              </View>
              <AppText variant="muted">{formatDateTimeWib(report.generated_at, { seconds: false })}</AppText>
            </Card>
          ))}
        </View>
      )}

      <Modal visible={generateOpen} transparent animationType="slide" onRequestClose={() => setGenerateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <AppText variant="subtitle">Generate Report</AppText>
            <Controller
              control={form.control}
              name="date_from"
              render={({ field, fieldState }) => (
                <View style={styles.fieldWrap}>
                  <Field label="Tanggal awal" value={field.value} onChangeText={field.onChange} placeholder="YYYY-MM-DD" />
                  {fieldState.error ? <AppText style={styles.error}>{fieldState.error.message}</AppText> : null}
                </View>
              )}
            />
            <Controller
              control={form.control}
              name="date_to"
              render={({ field, fieldState }) => (
                <View style={styles.fieldWrap}>
                  <Field label="Tanggal akhir" value={field.value} onChangeText={field.onChange} placeholder="YYYY-MM-DD" />
                  {fieldState.error ? <AppText style={styles.error}>{fieldState.error.message}</AppText> : null}
                </View>
              )}
            />
            <Controller
              control={form.control}
              name="custom_name"
              render={({ field }) => (
                <Field
                  label="Nama report opsional"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  placeholder="monthly_backup"
                />
              )}
            />
            <Controller
              control={form.control}
              name="nas_id"
              render={({ field }) => (
                <View style={styles.fieldWrap}>
                  <AppText variant="label">NAS filter</AppText>
                  <PillSelector
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { label: 'All NAS', value: 'ALL' },
                      ...(nasQuery.data?.items.map((nas) => ({ label: nas.source_id, value: nas.source_id })) ?? []),
                    ]}
                  />
                </View>
              )}
            />
            <View style={styles.modalActions}>
              <Button variant="outline" onPress={() => setGenerateOpen(false)}>
                Batal
              </Button>
              <Button disabled={generateMutation.isPending} onPress={form.handleSubmit((values) => generateMutation.mutate(values))}>
                {generateMutation.isPending ? 'Generating...' : 'Generate'}
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
    paddingBottom: 100,
  },
  stack: {
    gap: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  reportHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  reportTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontWeight: '800',
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: `${colors.black}99`,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  modalCard: {
    gap: spacing.lg,
  },
  fieldWrap: {
    gap: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  error: {
    color: colors.destructiveBright,
    fontSize: 12,
  },
});
