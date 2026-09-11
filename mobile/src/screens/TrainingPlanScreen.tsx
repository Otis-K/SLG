import { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, Check, ChevronDown, X } from 'lucide-react-native';

import { Card, Notice } from '../components/controls';
import { IconButton, PrimaryButton, Screen, ScreenHeader } from '../components/ui';
import { getLocalDate, WEEK_DAYS } from '../config/frontendConfig';
import type { TrainingPlanDraft } from '../domain/types';
import { useApp } from '../store/AppProvider';
import { colors, layout, radii, spacing, typeScale } from '../theme';

type DayPlan = (typeof WEEK_DAYS)[number] & { template: string | null };

const SLOTS_BY_FREQUENCY: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
};

function planToWeekDays(daysPerWeek: number, sessions: string[]): DayPlan[] {
  const slots = SLOTS_BY_FREQUENCY[daysPerWeek] ?? SLOTS_BY_FREQUENCY[3];
  return WEEK_DAYS.map((day, index) => {
    const sessionIndex = slots.indexOf(index);
    return { ...day, template: sessionIndex >= 0 ? sessions[sessionIndex] ?? sessions[0] ?? null : null };
  });
}

export function TrainingPlanScreen({ onBack }: { onBack: () => void }) {
  const { data, updateTrainingPlan } = useApp();
  const [days, setDays] = useState<DayPlan[]>(() => data ? planToWeekDays(data.trainingPlan.daysPerWeek, data.trainingPlan.sessions) : []);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeDays = useMemo(() => days.filter((day) => day.template), [days]);
  if (!data) return null;

  const chooseTemplate = (template: string | null) => {
    setDays((current) => current.map((day) => day.id === selectedDayId ? { ...day, template } : day));
    setSelectedDayId(null);
  };

  const save = async () => {
    const sessions = activeDays.map((day) => day.template).filter((item): item is string => Boolean(item));
    if (!sessions.length) return;
    const plan: TrainingPlanDraft = {
      daysPerWeek: sessions.length,
      title: sessions.length === 3 ? '全身三练' : `${sessions.length} 日训练`,
      sessionMinutes: data.trainingPlan.sessionMinutes,
      place: data.trainingPlan.place,
      sessions,
    };
    try {
      setSaving(true);
      await updateTrainingPlan(plan, getLocalDate(effectiveDate));
      Alert.alert('训练计划已启用', '旧计划已截止，历史训练保持不变。', [{ text: '完成', onPress: onBack }]);
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : '无法创建训练计划版本');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader title="每周训练计划" subtitle={`当前计划 · 每周 ${activeDays.length} 天`} onBack={onBack} />

      <View style={styles.weekOverview} accessibilityLabel="一周计划概览">
        {days.map((day) => (
          <View key={day.id} style={[styles.weekDay, day.template && styles.weekDayActive]}>
            <Text style={[styles.weekShort, day.template && styles.weekTextActive]}>{day.short}</Text>
            <Text style={[styles.weekState, day.template && styles.weekTextActive]}>{day.template ? '练' : '休'}</Text>
          </View>
        ))}
      </View>

      <Card style={styles.block}>
        <Text style={styles.title}>一周安排</Text>
        <View style={styles.dayList}>
          {days.map((day) => (
            <View key={day.id} style={styles.dayRow}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              <Pressable accessibilityRole="button" onPress={() => setSelectedDayId(day.id)} style={({ pressed }) => [styles.templateButton, pressed && styles.pressed]}>
                <Text numberOfLines={1} style={[styles.templateText, !day.template && styles.restText]}>{day.template ?? '休息'}</Text>
                <ChevronDown color={colors.textMuted} size={16} />
              </Pressable>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.block}>
        <Text style={styles.title}>版本生效</Text>
        <Text style={styles.fieldLabel}>生效日期</Text>
        <Pressable accessibilityRole="button" onPress={() => setDatePickerOpen(true)} style={styles.dateButton}>
          <Text style={styles.dateText}>{getLocalDate(effectiveDate)}</Text>
          <CalendarDays color={colors.textMuted} size={18} />
        </Pressable>
        {datePickerOpen ? (
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            mode="date"
            onChange={(_event, date) => {
              if (Platform.OS !== 'ios') setDatePickerOpen(false);
              if (date) setEffectiveDate(date);
            }}
            value={effectiveDate}
          />
        ) : null}
        <Notice>新计划生效后，旧计划会截止，但历史训练不会改变。</Notice>
      </Card>

      <PrimaryButton
        disabled={!activeDays.length}
        icon={<Check color={colors.white} size={18} />}
        label="确认计划"
        loading={saving}
        onPress={save}
      />

      <Modal animationType="slide" onRequestClose={() => setSelectedDayId(null)} transparent visible={Boolean(selectedDayId)}>
        <Pressable onPress={() => setSelectedDayId(null)} style={styles.scrim}>
          <Pressable onPress={() => undefined} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>选择训练模板</Text>
                <Text style={styles.sheetDetail}>{days.find((day) => day.id === selectedDayId)?.label}</Text>
              </View>
              <IconButton accessibilityLabel="关闭" onPress={() => setSelectedDayId(null)}>
                <X color={colors.textMuted} size={20} />
              </IconButton>
            </View>
            <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
              <Pressable onPress={() => chooseTemplate(null)} style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
                <Text style={styles.optionText}>休息</Text>
              </Pressable>
              {data.trainingTemplateOptions.map((template) => (
                <Pressable key={template} onPress={() => chooseTemplate(template)} style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
                  <Text style={styles.optionText}>{template}</Text>
                  {days.find((day) => day.id === selectedDayId)?.template === template ? <Check color={colors.primary} size={18} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  weekOverview: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  weekDay: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceStrong,
  },
  weekDayActive: {
    backgroundColor: colors.primary,
  },
  weekShort: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '800',
  },
  weekState: {
    color: colors.textSubtle,
    fontSize: typeScale.caption,
  },
  weekTextActive: {
    color: colors.white,
  },
  block: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  dayList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  dayRow: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dayLabel: {
    width: 48,
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  templateButton: {
    minWidth: 0,
    minHeight: layout.tapTarget,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  templateText: {
    minWidth: 0,
    flex: 1,
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  restText: {
    color: colors.textMuted,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    fontWeight: '700',
  },
  dateButton: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  dateText: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  sheet: {
    maxHeight: '78%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  sheetHeader: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  optionList: {
    flexGrow: 0,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: typeScale.title,
    fontWeight: '800',
  },
  sheetDetail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  optionRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.68,
  },
});
