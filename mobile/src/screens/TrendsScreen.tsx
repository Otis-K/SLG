import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Info } from 'lucide-react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Card, SegmentedControl } from '../components/controls';
import { Screen, ScreenHeader } from '../components/ui';
import { useApp } from '../store/AppProvider';
import { colors, radii, spacing, typeScale } from '../theme';

type Metric = 'diet' | 'training' | 'weight';

export function TrendsScreen({ onBack }: { onBack: () => void }) {
  const { data } = useApp();
  const [metric, setMetric] = useState<Metric>('diet');
  if (!data) return null;

  const targets = data.nutritionPlan.targets;
  const trends = data.trends;
  const maxValue = Math.max(targets.calories, ...trends.diet.map((item) => item.value ?? 0), 1);

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader title="数据趋势" subtitle={trends.periodLabel} onBack={onBack} />
      <SegmentedControl
        onChange={setMetric}
        options={[
          { value: 'diet', label: '饮食' },
          { value: 'training', label: '训练' },
          { value: 'weight', label: '体重' },
        ] as const}
        value={metric}
      />

      {metric === 'diet' ? (
        <>
          <Card style={styles.summary}>
            <Text style={styles.summaryLabel}>本周日均</Text>
            <Text style={styles.summaryValue}>{trends.dietAverageKcal.toLocaleString()} <Text style={styles.summaryUnit}>kcal</Text></Text>
            <Text style={styles.summaryDetail}>{trends.validDietDays} 个有效记录日</Text>
          </Card>

          <Card style={styles.chartCard}>
            <View style={styles.chartPlot} accessibilityLabel="本周能量摄入柱状图">
              <View style={[styles.targetLine, { bottom: `${Math.max(0, Math.min(100, (targets.calories / maxValue) * 100))}%` }]}>
                <Text style={styles.targetLabel}>目标</Text>
              </View>
              {trends.diet.map((item) => {
                const height = item.value === null ? 2 : Math.max(6, (item.value / maxValue) * 100);
                return (
                  <View key={item.day} style={styles.barColumn}>
                    <View style={styles.barSpace}>
                      <View style={[styles.bar, item.value === null && styles.barMissing, { height: `${height}%` }]}>
                        <Text numberOfLines={1} style={styles.barValue}>{item.value ?? '缺'}</Text>
                      </View>
                    </View>
                    <Text style={styles.dayLabel}>{item.day}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
          <View style={styles.insight}>
            <Info color={colors.blue} size={17} />
            <Text style={styles.insightText}>缺少记录的日期保持空缺，不进行插值。</Text>
          </View>
        </>
      ) : null}

      {metric === 'training' ? (
        <Card>
          <MetricRow label="完成训练" value={`${trends.training.completedSessions} 次`} />
          <MetricRow label="训练时长" value={`${trends.training.durationMinutes} 分钟`} />
          <MetricRow label="完成组数" value={`${trends.training.completedSets} 组`} last />
        </Card>
      ) : null}

      {metric === 'weight' ? (
        <Card style={styles.weightCard}>
          <Text style={styles.summaryLabel}>最新体重</Text>
          <Text style={styles.weightValue}>{trends.weight.latestKg} kg</Text>
          <Text style={[styles.weightDelta, trends.weight.deltaKg <= 0 && styles.weightDeltaGood]}>
            较周初 {trends.weight.deltaKg > 0 ? '+' : ''}{trends.weight.deltaKg} kg
          </Text>
          <Svg accessibilityLabel="体重变化示意图" height={116} viewBox="0 0 300 116" width="100%">
            <Polyline fill="none" points="8,30 76,42 148,45 220,67 292,78" stroke={colors.primary} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            {[['8', '30'], ['76', '42'], ['148', '45'], ['220', '67'], ['292', '78']].map(([cx, cy]) => (
              <Circle cx={cx} cy={cy} fill={colors.surface} key={`${cx}-${cy}`} r="5" stroke={colors.primary} strokeWidth="3" />
            ))}
          </Svg>
        </Card>
      ) : null}
    </Screen>
  );
}

function MetricRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.metricRow, !last && styles.metricBorder]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  summary: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  summaryValue: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 31,
    fontWeight: '800',
  },
  summaryUnit: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  summaryDetail: {
    marginTop: spacing.xs,
    color: colors.textSubtle,
    fontSize: typeScale.caption,
  },
  chartCard: {
    height: 270,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  chartPlot: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  targetLine: {
    position: 'absolute',
    right: 0,
    left: 0,
    height: StyleSheet.hairlineWidth,
    zIndex: 2,
    backgroundColor: colors.coral,
  },
  targetLabel: {
    position: 'absolute',
    top: -18,
    right: 0,
    color: colors.coral,
    fontSize: 10,
    fontWeight: '700',
  },
  barColumn: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center',
  },
  barSpace: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xs,
  },
  bar: {
    minHeight: 6,
    alignItems: 'center',
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  barMissing: {
    backgroundColor: colors.borderStrong,
  },
  barValue: {
    position: 'absolute',
    top: -18,
    color: colors.textMuted,
    fontSize: 9,
  },
  dayLabel: {
    height: 25,
    paddingTop: spacing.sm,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.blueSoft,
  },
  insightText: {
    flex: 1,
    color: colors.blue,
    fontSize: typeScale.bodySmall,
  },
  metricRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  metricBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: typeScale.body,
  },
  metricValue: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  weightCard: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  weightValue: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
  weightDelta: {
    marginTop: spacing.xs,
    color: colors.coral,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  weightDeltaGood: {
    color: colors.primary,
  },
});
