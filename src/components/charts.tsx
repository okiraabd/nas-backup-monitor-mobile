import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';

import { AppText, Card, EmptyState } from '@/src/components/ui';
import { formatDateTimeWib, formatTimeWib } from '@/src/lib/datetime';
import { colors, spacing } from '@/src/theme/colors';
import type { ActivityDay, HistoryPoint } from '@/src/types/api';

interface MetricLineChartProps {
  title: string;
  points?: HistoryPoint[];
  isPercentage?: boolean;
  height?: number;
}

const MAX_RENDERED_HISTORY_POINTS = 120;

function sampleEvenly<T>(items: T[], maxPoints: number) {
  if (items.length <= maxPoints) return items;
  return Array.from({ length: maxPoints }, (_, index) => {
    const sourceIndex = Math.round((index * (items.length - 1)) / (maxPoints - 1));
    return items[sourceIndex]!;
  });
}

export function MetricLineChart({ title, points = [], isPercentage = true, height = 230 }: MetricLineChartProps) {
  const chartData = useMemo(
    () => {
      const numericPoints = points.filter((point) => point.value !== null && point.value !== undefined);
      const renderedPoints = sampleEvenly(numericPoints, MAX_RENDERED_HISTORY_POINTS);
      return renderedPoints
        .map((point, index) => ({
          value: Number(point.value),
          label:
            index % Math.ceil(Math.max(renderedPoints.length, 1) / 5) === 0
              ? formatTimeWib(point.collected_at)
              : '',
          dataPointText: '',
          fullDate: formatDateTimeWib(point.collected_at),
        }));
    },
    [points],
  );

  if (chartData.length === 0) {
    return <EmptyState title="No historical data" message={title} />;
  }

  return (
    <Card>
      <AppText variant="subtitle">{title}</AppText>
      <View style={[styles.chartBox, { height }]}>
        <LineChart
          areaChart
          curved
          data={chartData}
          height={height - 36}
          adjustToWidth
          disableScroll
          spacing={Math.max(2, 260 / Math.max(chartData.length - 1, 1))}
          initialSpacing={18}
          endSpacing={28}
          color={colors.primary}
          thickness={2}
          startFillColor={colors.primary}
          startOpacity={0.3}
          endOpacity={0.03}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          rulesColor={`${colors.border}aa`}
          noOfSections={4}
          maxValue={isPercentage ? 100 : undefined}
          yAxisLabelSuffix={isPercentage ? '%' : ''}
          hideDataPoints
          pointerConfig={{
            pointerStripColor: colors.border,
            pointerColor: colors.primary,
            radius: 4,
          }}
        />
      </View>
    </Card>
  );
}

export function ActivityBarChart({ days = [] }: { days?: ActivityDay[] }) {
  const data = days.flatMap((day) => [
    {
      value: day.success,
      label: day.date.length === 10 ? day.date.slice(5) : day.date,
      frontColor: colors.success,
    },
    {
      value: day.failed,
      label: '',
      frontColor: colors.destructiveBright,
    },
  ]);

  if (data.length === 0) {
    return <EmptyState title="No backup trend" message="No data is available for the last 7 days." />;
  }

  return (
    <Card>
      <View style={styles.legendRow}>
        <AppText variant="subtitle">7-Day Backup Trend</AppText>
        <View style={styles.legendItems}>
          <LegendDot color={colors.success} label="Success" />
          <LegendDot color={colors.destructiveBright} label="Failed" />
        </View>
      </View>
      <View style={styles.chartBox}>
        <BarChart
          data={data}
          height={210}
          barWidth={11}
          spacing={11}
          initialSpacing={10}
          endSpacing={24}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          rulesColor={`${colors.border}aa`}
          noOfSections={4}
          roundedTop
          roundedBottom
          hideRules={false}
        />
      </View>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendDotWrap}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText variant="muted">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chartBox: {
    height: 240,
    overflow: 'hidden',
  },
  axisText: {
    color: colors.mutedForeground,
    fontSize: 10,
  },
  legendRow: {
    gap: spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  legendDotWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
