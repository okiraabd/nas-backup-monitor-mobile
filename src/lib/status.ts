import { colors } from '@/src/theme/colors';

export const DASHBOARD_ACCESS_MESSAGE =
  'This account cannot access the dashboard. Only admin and operator accounts are allowed.';

export function freshnessColor(status: string | undefined) {
  if (status === 'fresh') return colors.success;
  if (status === 'stale') return colors.warn;
  return colors.destructiveBright;
}

export function backupStatusColor(status: string | undefined) {
  if (status === 'SUCCESS') return colors.success;
  if (status === 'FAILED') return colors.destructiveBright;
  return colors.mutedForeground;
}

export function titleCaseStatus(value: string | undefined | null) {
  if (!value) return 'Unknown';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function isHumanRole(role: string | undefined | null) {
  return role === 'admin' || role === 'operator';
}
