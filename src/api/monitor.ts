import { api } from './client';
import type {
  ActivityTrendResponse,
  MetricHistory,
  MonitorSummary,
  NasListResponse,
  SourceSnapshot,
} from '@/src/types/api';
import { HISTORY_MAX_POINTS } from '@/src/lib/refresh';

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
      params: { metric, hours, max_points: HISTORY_MAX_POINTS },
    });
    return res.data;
  },

  async cephSnapshot() {
    const res = await api.get<SourceSnapshot>('/monitor/ceph');
    return res.data;
  },

  async cephHistory(metric: string, hours: number) {
    const res = await api.get<MetricHistory>('/monitor/ceph/history', {
      params: { metric, hours, max_points: HISTORY_MAX_POINTS },
    });
    return res.data;
  },

};
