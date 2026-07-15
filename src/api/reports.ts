import { getApiBaseUrl } from '@/src/lib/env';
import type { BulkDeleteResponse, Report } from '@/src/types/api';
import { api } from './client';
import { getAccessToken } from './token';

export interface ReportGeneratePayload {
  date_from: string;
  date_to: string;
  nas_id?: string | null;
  custom_name?: string;
  sla_target?: number;
}

export const reportsApi = {
  async list() {
    const res = await api.get<Report[]>('/reports');
    return res.data;
  },

  async generate(payload: ReportGeneratePayload) {
    const res = await api.post<Report>('/reports/generate', payload);
    return res.data;
  },

  async delete(id: number) {
    await api.delete(`/reports/${id}`);
  },

  async bulkDelete(payload: { report_ids?: number[]; date_from?: string; date_to?: string }) {
    const res = await api.delete<BulkDeleteResponse>('/reports', { data: payload });
    return res.data;
  },

  downloadUrl(id: number) {
    return `${getApiBaseUrl()}/reports/${id}/download`;
  },

  downloadHeaders() {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  },
};
