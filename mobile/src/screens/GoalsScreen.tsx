import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { CalendarDays, Check, SlidersHorizontal, X } from 'lucide-react-native';

import { Card, Notice, ToggleRow } from '../components/controls';
import { IconButton, PrimaryButton, Screen, ScreenHeader, StatusPill } from '../components/ui';
import { getLocalDate, NUTRIENT_FIELDS } from '../config/frontendConfig';
import type { NutritionValues } from '../domain/types';
import { useApp } from '../store/AppProvider';
import { colors, layout, radii, spacing, typeScale } from '../theme';

export function GoalsScreen({ onBack }: { onBack: () => void }) {
  const { data, updateNutritionTargets } = useApp();
  const [draft, setDraft] = useState<NutritionValues | null>(data?.nutritionPlan.targets ?? null);
  const [showBudgets, setShowBudgets] = useState(false);
  const [preview, setPreview] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const delta = useMemo(() => {
    if (!data || !draft) return 0;
    return draft.calories - data.nutritionPlan.targets.calories;
  }, [data, draft]);

  if (!data || !draft) return null;

  const setNutrient = (key: keyof NutritionValues, value: string | number) => {
    const numeric = Math.max(0, Number(value) || 0);
    setDraft((current) => current ? { ...current, [key]: numeric } : current);
  };

  const save = async () => {
    if (draft.calories < 800 || draft.calories > 5000) {
      Alert.alert('目标能量不合理', '请输入 800–5000 kcal 之间的目标。');
      return;
    }
    try {
      setSaving(true);
      await updateNutritionTargets(draft, getLocalDate(effectiveDate));
      Alert.alert('饮食目标已更新', '新版本已创建，历史记录仍使用当时生效的目标。', [{ text: '完成', onPress: onBack }]);
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : '无法创建目标版本');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader title="饮食目标" subtitle={`当前版本 · ${data.nutritionPlan.effectiveFromLocalDate} 起`} onBack={onBack} />

      <Card style={styles.block}>
        <View style={styles.heading}>
          <View style={styles.headingText}>
            <Text style={styles.title}>每日能量</Text>
            <Text style={styles.detail}>使用手动目标，不会被建议自动覆盖</Text>
          </View>
          <StatusPill label="手动" />
        </View>
        <View style={styles.valueRow}>
          <Text style={styles.fieldTitle}>目标能量</Text>
          <Text style={styles.calorieValue}>{draft.calories} kcal</Text>
        </View>
        <Slider
          accessibilityLabel="每日目标能量"
          maximumTrackTintColor={colors.borderStrong}
          maximumValue={3000}
          minimumTrackTintColor={colors.primary}
          minimumValue={1200}
          onValueChange={(value) => setNutrient('calories', Math.round(value / 50) * 50)}
          step={50}
          thumbTintColor={colors.primary}
          value={draft.calories}
        />
      </Card>

      <Card style={styles.block}>
        <Text style={styles.title}>三大营养素</Text>
        <View style={styles.numericList}>
          {NUTRIENT_FIELDS.map((field) => (
            <View key={field.id} style={styles.numericRow}>
              <Text style={styles.fieldTitle}>{field.label}</Text>
              <View style={styles.numericInputWrap}>
                <TextInput
                  accessibilityLabel={field.label}
                  keyboardType="number-pad"
                  onChangeText={(value) => setNutrient(field.id, value)}
                  selectionColor={colors.primary}
                  style={styles.numericInput}
                  value={String(draft[field.id])}
                />
                <Text style={styles.unit}>{field.unit}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <ToggleRow
          detail="按早餐、午餐、晚餐和加餐分配"
          label="餐次预算"
          onValueChange={setShowBudgets}
          value={showBudgets}
        />
        {showBudgets ? (
          <View style={styles.budgetGrid}>
            {data.nutritionPlan.mealBudgets.map((meal) => (
              <View key={meal.id} style={styles.budgetItem}>
                <Text style={styles.budgetLabel}>{meal.label}</Text>
                <Text style={styles.budgetValue}>{meal.ratio}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {!preview ? (
        <PrimaryButton icon={<SlidersHorizontal color={colors.white} size={18} />} label="预览变更" onPress={() => setPreview(true)} />
      ) : (
        <Card style={styles.preview}>
          <View style={styles.heading}>
            <View style={styles.headingText}>
              <Text style={styles.eyebrow}>变更预览</Text>
              <Text style={styles.title}>
                {delta === 0 ? '目标数值没有变化' : `每日能量${delta > 0 ? '增加' : '减少'} ${Math.abs(delta)} kcal`}
              </Text>
            </View>
            <IconButton accessibilityLabel="关闭预览" onPress={() => setPreview(false)}>
              <X color={colors.textMuted} size={18} />
            </IconButton>
          </View>

          <Text style={styles.fieldTitle}>生效日期</Text>
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

          <Notice>历史日报仍使用当时生效的目标版本。</Notice>
          <PrimaryButton icon={<Check color={colors.white} size={18} />} label="确认创建新版本" loading={saving} onPress={save} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  block: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headingText: {
    minWidth: 0,
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  detail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
    lineHeight: 17,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldTitle: {
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  calorieValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  numericList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  numericRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  numericInputWrap: {
    width: 112,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  numericInput: {
    minWidth: 0,
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: typeScale.body,
    textAlign: 'right',
  },
  unit: {
    paddingRight: spacing.sm,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  budgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  budgetItem: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  budgetLabel: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  budgetValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '800',
  },
  preview: {
    gap: spacing.md,
    padding: spacing.lg,
    borderColor: colors.primary,
  },
  eyebrow: {
    marginBottom: spacing.xs,
    color: colors.primary,
    fontSize: typeScale.caption,
    fontWeight: '800',
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
    backgroundColor: colors.surface,
  },
  dateText: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
  },
});
