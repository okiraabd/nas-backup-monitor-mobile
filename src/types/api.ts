export type UserRole = 'admin' | 'operator' | 'service' | 'collector';
export type BackupStatus = 'SUCCESS' | 'FAILED';
export type FreshnessStatus = 'fresh' | 'stale' | 'offline';

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: UserRole | string;
  is_active?: boolean;
  last_login_at?: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface BackupLogSummary {
  id: number;
  nas_id: string;
  job_name: string;
  status: BackupStatus | string;
  snapshot_id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
  total_size_bytes?: number | null;
  error_count?: number | null;
  acknowledged: boolean;
  created_at: string;
}

export interface BackupLogDetail extends BackupLogSummary {
  source_path?: string | null;
  source_ip?: string | null;
  destination_target?: string | null;
  backup_engine: string;
  total_files?: number | null;
  changed_file_count?: number | null;
  cached_files?: number | null;
  non_cached_files?: number | null;
  dir_count?: number | null;
  ignored_error_count?: number | null;
  retention_reason?: unknown[] | null;
  message?: string | null;
  raw_payload?: Record<string, unknown> | null;
  reported_by?: number | null;
  acknowledged_by?: number | null;
  acknowledged_at?: string | null;
  remark?: string | null;
}

export interface PaginatedLogs {
  items: BackupLogSummary[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface MetricValue {
  value?: number | null;
  text?: string | null;
  unit?: string | null;
}

export interface SourceSnapshot {
  source_id: string;
  display_name: string;
  source_type: 'nas' | 'ceph' | string;
  last_collected_at?: string | null;
  staleness_seconds?: number | null;
  status: FreshnessStatus | string;
  metrics: Record<string, MetricValue>;
}

export interface NasListResponse {
  items: SourceSnapshot[];
}

export interface HistoryPoint {
  collected_at: string;
  value?: number | null;
  text?: string | null;
}

export interface MetricHistory {
  source_id: string;
  metric_name: string;
  points: HistoryPoint[];
}

export interface MonitorSummary {
  total_nas: number;
  nas_fresh: number;
  nas_stale: number;
  nas_offline: number;
  ceph_status: FreshnessStatus | string;
  ceph_health?: string | null;
  storage_used_pct?: number | null;
}

export interface ActivityDay {
  date: string;
  success: number;
  failed: number;
}

export interface ActivityTrendResponse {
  days: ActivityDay[];
}

export interface Report {
  id: number;
  filename: string;
  date_from: string;
  date_to: string;
  nas_filter?: string | null;
  generated_by?: number | null;
  generated_at: string;
  file_size_bytes?: number | null;
}

export interface BulkDeleteResponse {
  deleted_count: number;
}
