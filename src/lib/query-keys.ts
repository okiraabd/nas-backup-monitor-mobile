export const queryKeys = {
  me: ['auth', 'me'] as const,
  summary: ['monitor', 'summary'] as const,
  activity: ['monitor', 'activity'] as const,
  nasList: ['monitor', 'nas'] as const,
  cephBase: ['monitor', 'ceph'] as const,
  nasSnapshot: (id: string) => ['monitor', 'nas', id, 'snapshot'] as const,
  nasHistory: (id: string, metric: string, hours: number) =>
    ['monitor', 'nas', id, 'history', metric, hours] as const,
  cephSnapshot: ['monitor', 'ceph', 'snapshot'] as const,
  cephHistory: (metric: string, hours: number) => ['monitor', 'ceph', 'history', metric, hours] as const,
  logs: (filters?: unknown) => ['logs', filters] as const,
  log: (id: string | number) => ['logs', id] as const,
  reports: ['reports'] as const,
};
