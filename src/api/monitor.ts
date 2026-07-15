import { api } from './client';
import type {
  ActivityTrendResponse,
  CollectorStatus,
  MetricHistory,
  MonitorSummary,
  NasListResponse,
  SourceSnapshot,
} from '@/src/types/api';

export const monitorApi = {
  async summary() {
    const res = await api.get<MonitorSummary>('/monitor/summary');
    return res.data;
  },

  async activityTrend() {
    const res = await api.get<ActivityTrendResponse>('/monitor/activity-trend');
    return res.data;
  },

  async nasList() {
    const res = await api.get<NasListResponse>('/monitor/nas');
    return res.data;
  },

  async nasSnapshot(id: string) {
    const res = await api.get<SourceSnapshot>(`/monitor/nas/${id}`);
    return res.data;
  },

  async nasHistory(id: string, metric: string, hours: number) {
    const res = await api.get<MetricHistory>(`/monitor/nas/${id}/history`, {
      params: { metric, hours },
    });
    return res.data;
  },

  async cephSnapshot() {
    const res = await api.get<SourceSnapshot>('/monitor/ceph');
    return res.data;
  },

  async cephHistory(metric: string, hours: number) {
    const res = await api.get<MetricHistory>('/monitor/ceph/history', {
      params: { metric, hours },
    });
    return res.data;
  },

  async collectorStatus() {
    const res = await api.get<CollectorStatus>('/monitor/collector/status');
    return res.data;
  },
};
