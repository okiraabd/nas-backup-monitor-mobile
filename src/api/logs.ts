import { api } from './client';
import type { BackupLogDetail, BulkDeleteResponse, PaginatedLogs } from '@/src/types/api';

export interface LogFilters {
  nas_id?: string;
  status?: string;
  job_name?: string;
  date_from?: string;
  date_to?: string;
  acknowledged?: boolean;
  page?: number;
  page_size?: number;
}

export const logsApi = {
  async list(params: LogFilters) {
    const res = await api.get<PaginatedLogs>('/logs', { params });
    return res.data;
  },

  async detail(id: string | number) {
    const res = await api.get<BackupLogDetail>(`/logs/${id}`);
    return res.data;
  },

  async acknowledge(id: string | number, remark: string) {
    const res = await api.patch<BackupLogDetail>(`/logs/${id}/acknowledge`, { remark });
    return res.data;
  },

  async bulkDelete(payload: { log_ids?: number[]; date_from?: string; date_to?: string }) {
    const res = await api.delete<BulkDeleteResponse>('/logs/bulk', { data: payload });
    return res.data;
  },
};
