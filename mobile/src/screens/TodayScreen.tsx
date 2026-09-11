import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cloud,
  CloudOff,
  Dumbbell,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Weight,
  X,
} from 'lucide-react-native';

import { createEmptyDayMeals, getLocalDate, MEAL_IDS, MEAL_META } from '../config/frontendConfig';
import type { DayMeals, FoodEntry, FoodTone, LocalDate, MealId, NutritionValues } from '../domain/types';
import { useApp } from '../store/AppProvider';
import { colors, layout, radii, spacing, typeScale } from '../theme';
import { FoodRecordModal } from '../components/FoodRecordModal';
import {
  AppLogo,
  IconButton,
  LoadingState,
  PrimaryButton,
  ProgressBar,
  QuietButton,
  Screen,
  SecondaryButton,
  StatusPill,
} from '../components/ui';

export interface TodayScreenProps {
  onOpenWorkout: () => void;
  onOpenPrivacy?: () => void;
  onOpenData?: () => void;
}

type FoodModalState = {
  mealId: MealId;
  entry?: FoodEntry;
};

const EMPTY_MEALS = createEmptyDayMeals() as DayMeals;

function parseLocalDate(value: LocalDate) {
  return new Date(`${value}T12:00:00`);
}

function shiftLocalDate(value: LocalDate, days: number) {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return getLocalDate(date);
}

function formatDate(value: LocalDate, isToday: boolean) {
  const formatted = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(parseLocalDate(value));
  return isToday ? `今天 · ${formatted}` : formatted;
}

function sumMeals(meals: DayMeals): NutritionValues {
  return MEAL_IDS.flatMap((id) => meals[id]).reduce<NutritionValues>(
    (total, entry) => ({
      calories: total.calories + (Number(entry.calories) || 0),
      protein: total.protein + (Number(entry.protein) || 0),
      carbs: total.carbs + (Number(entry.carbs) || 0),
      fat: total.fat + (Number(entry.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function mealCalories(entries: FoodEntry[]) {
  return Math.round(entries.reduce((total, entry) => total + (Number(entry.calories) || 0), 0));
}

function toneColor(tone: FoodTone) {
  switch (tone) {
    case 'yellow': return colors.amberSoft;
    case 'coral': return colors.coralSoft;
    case 'blue': return colors.blueSoft;
    case 'green': return colors.primarySoft;
    case 'orange': return '#F5E7D8';
    default: return colors.surfaceMuted;
  }
}

export function TodayScreen({ onOpenWorkout, onOpenPrivacy, onOpenData }: TodayScreenProps) {
  const {
    data,
    deleteMealEntry,
    restoreMealEntry,
    saveWeight,
    startWorkout,
  } = useApp();
  const today = getLocalDate();
  const [selectedDate, setSelectedDate] = useState<LocalDate>(today);
  const [expandedMeal, setExpandedMeal] = useState<MealId | null>(null);
  const [foodModal, setFoodModal] = useState<FoodModalState | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightValue, setWeightValue] = useState(String(data?.profile.latestWeightKg ?? ''));
  const [weightSaving, setWeightSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoEntry, setUndoEntry] = useState<FoodEntry | null>(null);

  useEffect(() => {
    if (data) setWeightValue(String(data.profile.latestWeightKg));
  }, [data?.profile.latestWeightKg]);

  const meals = data?.mealsByDate[selectedDate] ?? EMPTY_MEALS;
  const totals = useMemo(() => sumMeals(meals), [meals]);

  if (!data) {
    return <Screen><LoadingState /></Screen>;
  }

  const targets = data.nutritionPlan.targets;
  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;
  const canWrite = !isFuture && data.consents.healthProfileProcessing;
  const remaining = targets.calories - Math.round(totals.calories);
  const completedSets = data.workout.exercises.reduce(
    (count, exercise) => count + exercise.sets.filter((set) => set.done).length,
    0,
  );

  const showNotice = (message: string) => {
    setUndoEntry(null);
    setNotice(message);
  };

  const openWorkout = async () => {
    try {
      if (!data.workout.active) await startWorkout();
      onOpenWorkout();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : '无法开始训练');
    }
  };

  const openFoodModal = (mealId?: MealId, entry?: FoodEntry) => {
    if (!canWrite) return;
    setFoodModal({ mealId: mealId ?? inferMealForNow(), entry });
  };

  const requestDelete = (mealId: MealId, entry: FoodEntry) => {
    if (!canWrite) return;
    Alert.alert('删除记录', `确定删除“${entry.name}”吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const removed = await deleteMealEntry(selectedDate, mealId, entry.entryId);
            if (removed) {
              setNotice(`已删除${removed.name}`);
              setUndoEntry(removed);
            }
          } catch (reason) {
            Alert.alert('删除失败', reason instanceof Error ? reason.message : '请稍后重试。');
          }
        },
      },
    ]);
  };

  const undoDelete = async () => {
    if (!undoEntry) return;
    try {
      await restoreMealEntry(undoEntry);
      setUndoEntry(null);
      setNotice('记录已恢复');
    } catch (reason) {
      Alert.alert('恢复失败', reason instanceof Error ? reason.message : '请稍后重试。');
    }
  };

  const submitWeight = async () => {
    const parsed = Number(weightValue.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 30 || parsed > 250) {
      Alert.alert('请检查体重', '请输入 30–250 kg 之间的数值。');
      return;
    }
    setWeightSaving(true);
    try {
      await saveWeight(parsed);
      setWeightOpen(false);
      showNotice('体重已保存');
    } catch (reason) {
      Alert.alert('保存失败', reason instanceof Error ? reason.message : '请稍后重试。');
    } finally {
      setWeightSaving(false);
    }
  };

  return (
    <>
      <Screen contentContainerStyle={styles.screenContent} testID="today-screen">
        <View style={styles.appHeader}>
          <AppLogo compact />
          {onOpenPrivacy ? (
            <IconButton accessibilityLabel="隐私与账户" onPress={onOpenPrivacy}>
              <ShieldCheck color={colors.text} size={21} />
            </IconButton>
          ) : <View style={styles.headerSpacer} />}
        </View>

        <View style={styles.dateSwitcher}>
          <IconButton accessibilityLabel="前一天" onPress={() => setSelectedDate((date) => shiftLocalDate(date, -1))}>
            <ChevronLeft color={colors.text} size={22} />
          </IconButton>
          <Pressable
            accessibilityHint={isToday ? undefined : '返回今天'}
            accessibilityRole="button"
            onPress={() => setSelectedDate(today)}
            style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
          >
            <Text numberOfLines={1} style={styles.dateText}>{formatDate(selectedDate, isToday)}</Text>
            <CalendarDays color={colors.textMuted} size={17} />
          </Pressable>
          <IconButton accessibilityLabel="后一天" onPress={() => setSelectedDate((date) => shiftLocalDate(date, 1))}>
            <ChevronRight color={colors.text} size={22} />
          </IconButton>
        </View>

        {!data.consents.healthProfileProcessing ? (
          <Pressable
            accessibilityRole="button"
            disabled={!onOpenPrivacy}
            onPress={onOpenPrivacy}
            style={({ pressed }) => [styles.consentBanner, pressed && styles.pressed]}
          >
            <LockKeyhole color={colors.amber} size={19} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>健康记录已关闭</Text>
              <Text style={styles.bannerBody}>重新同意后才能保存记录</Text>
            </View>
            <ChevronRight color={colors.amber} size={18} />
          </Pressable>
        ) : null}

        {isFuture ? (
          <View style={styles.futureBanner}>
            <CalendarDays color={colors.blue} size={18} />
            <Text style={styles.futureText}>未来日期仅用于查看计划，不能写入记录。</Text>
          </View>
        ) : null}

        {notice ? (
          <View accessibilityLiveRegion="polite" style={styles.notice}>
            <Check color={colors.primary} size={18} />
            <Text style={styles.noticeText}>{notice}</Text>
            {undoEntry ? <QuietButton label="撤销" onPress={undoDelete} style={styles.noticeAction} /> : null}
            <IconButton accessibilityLabel="关闭提示" onPress={() => { setNotice(null); setUndoEntry(null); }} style={styles.noticeClose}>
              <X color={colors.textMuted} size={17} />
            </IconButton>
          </View>
        ) : null}

        <View accessibilityLabel="当日营养概览" style={styles.nutritionSummary}>
          <View style={styles.calorieHeadline}>
            <View>
              <Text style={styles.eyebrow}>{remaining >= 0 ? '当日剩余' : '当日已超过'}</Text>
              <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={styles.calorieValue}>
                {Math.abs(remaining).toLocaleString()} <Text style={styles.calorieUnit}>kcal</Text>
              </Text>
            </View>
            <View style={styles.calorieRatio}>
              <Text style={styles.ratioText}>已摄入 {Math.round(totals.calories)}</Text>
              <Text style={styles.ratioText}>目标 {targets.calories}</Text>
            </View>
          </View>
          <ProgressBar
            accessibilityLabel={`已摄入 ${Math.round(totals.calories)} 千卡，目标 ${targets.calories} 千卡`}
            color={remaining < 0 ? colors.coral : colors.primary}
            value={(totals.calories / Math.max(targets.calories, 1)) * 100}
          />
          <View style={styles.macroGrid}>
            <Macro label="蛋白质" target={targets.protein} tone="green" value={totals.protein} />
            <Macro label="碳水" target={targets.carbs} tone="yellow" value={totals.carbs} />
            <Macro label="脂肪" target={targets.fat} tone="coral" value={totals.fat} />
          </View>
        </View>

        <PrimaryButton
          disabled={!canWrite}
          icon={<Plus color={colors.white} size={21} />}
          label={isFuture ? '未来日期仅查看' : !data.consents.healthProfileProcessing ? '需要开启健康记录' : '记录饮食'}
          onPress={() => openFoodModal()}
          style={styles.mainAction}
        />

        <View accessibilityLabel="当天餐次" style={styles.mealList}>
          {MEAL_IDS.map((mealId) => (
            <MealRow
              disabled={!canWrite}
              entries={meals[mealId]}
              expanded={expandedMeal === mealId}
              key={mealId}
              mealId={mealId}
              onAdd={() => openFoodModal(mealId)}
              onDelete={(entry) => requestDelete(mealId, entry)}
              onEdit={(entry) => openFoodModal(mealId, entry)}
              onToggle={() => setExpandedMeal((current) => current === mealId ? null : mealId)}
            />
          ))}
        </View>

        <View style={styles.secondarySection}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, styles.sectionIconCoral]}>
              <Dumbbell color={colors.coral} size={20} />
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.eyebrow}>当日训练</Text>
              <Text style={styles.sectionTitle}>
                {data.workout.title}{data.workout.completed ? ' · 已完成' : data.workout.active ? ' · 进行中' : ''}
              </Text>
            </View>
            {data.workout.completed ? <StatusPill label={`${completedSets} 组`} tone="success" /> : null}
          </View>
          <Text style={styles.sectionBody}>
            {data.workout.completed
              ? `${data.trainingPlan.sessionMinutes} 分钟 · 训练量已记入趋势`
              : `${data.trainingPlan.title} · 预计 ${data.trainingPlan.sessionMinutes} 分钟`}
          </Text>
          <SecondaryButton
            disabled={isFuture}
            icon={data.workout.active ? <RefreshCw color={colors.primary} size={18} /> : <Dumbbell color={colors.primary} size={18} />}
            label={data.workout.completed ? '开始下一次训练' : data.workout.active ? '继续训练' : '开始训练'}
            onPress={openWorkout}
          />
        </View>

        <View style={styles.secondarySection}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: weightOpen }}
            onPress={() => setWeightOpen((open) => !open)}
            style={({ pressed }) => [styles.disclosureRow, pressed && styles.pressed]}
          >
            <View style={[styles.sectionIcon, styles.sectionIconBlue]}>
              <Weight color={colors.blue} size={20} />
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.eyebrow}>体重</Text>
              <Text style={styles.sectionTitle}>{data.profile.latestWeightKg > 0 ? `${data.profile.latestWeightKg} kg` : '未记录'}</Text>
            </View>
            {weightOpen ? <ChevronUp color={colors.textMuted} size={20} /> : <ChevronDown color={colors.textMuted} size={20} />}
          </Pressable>
          {weightOpen ? (
            <View style={styles.weightEditor}>
              <View style={styles.weightInputShell}>
                <TextInput
                  accessibilityLabel="当前体重"
                  editable={canWrite}
                  keyboardType="decimal-pad"
                  onChangeText={setWeightValue}
                  selectTextOnFocus
                  style={styles.weightInput}
                  value={weightValue}
                />
                <Text style={styles.weightUnit}>kg</Text>
              </View>
              <SecondaryButton
                disabled={!canWrite}
                label="保存"
                loading={weightSaving}
                onPress={submitWeight}
                style={styles.weightSave}
              />
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!onOpenData}
          onPress={onOpenData}
          style={({ pressed }) => [styles.backupRow, pressed && styles.pressed]}
        >
          {data.backup.state === 'failed' || !data.consents.cloudBackup
            ? <CloudOff color={colors.textMuted} size={17} />
            : <Cloud color={colors.textMuted} size={17} />}
          <Text numberOfLines={2} style={styles.backupText}>
            {!data.consents.cloudBackup
              ? '仅保存在本机'
              : data.backup.state === 'syncing'
                ? '正在备份…'
                : data.backup.state === 'failed'
                  ? '备份失败，本地记录不受影响'
                  : `已备份 · ${data.backup.lastSuccessfulLabel}`}
          </Text>
          {onOpenData ? <ChevronRight color={colors.textMuted} size={17} /> : null}
        </Pressable>
      </Screen>

      <FoodRecordModal
        editingEntry={foodModal?.entry}
        initialMealId={foodModal?.mealId}
        localDate={selectedDate}
        onClose={() => setFoodModal(null)}
        onSaved={showNotice}
        visible={Boolean(foodModal)}
      />
    </>
  );
}

function inferMealForNow(): MealId {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10.5) return 'breakfast';
  if (hour >= 10.5 && hour < 14.5) return 'lunch';
  if (hour >= 17 && hour < 21.5) return 'dinner';
  return 'snack';
}

function Macro({
  label,
  value,
  target,
  tone,
}: {
  label: string;
  value: number;
  target: number;
  tone: 'green' | 'yellow' | 'coral';
}) {
  const rounded = Math.round(value);
  const color = tone === 'green' ? colors.primary : tone === 'yellow' ? colors.amber : colors.coral;
  return (
    <View style={styles.macroItem}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.macroValue}>
        {rounded}<Text style={styles.macroTarget}>/{target}g</Text>
      </Text>
      <ProgressBar color={color} value={(rounded / Math.max(target, 1)) * 100} />
    </View>
  );
}

function MealRow({
  mealId,
  entries,
  expanded,
  disabled,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
}: {
  mealId: MealId;
  entries: FoodEntry[];
  expanded: boolean;
  disabled: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onEdit: (entry: FoodEntry) => void;
  onDelete: (entry: FoodEntry) => void;
}) {
  return (
    <View style={styles.mealRow}>
      <View style={styles.mealRowMain}>
        <Pressable
          accessibilityLabel={`${expanded ? '收起' : '展开'}${MEAL_META[mealId].label}`}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={onToggle}
          style={({ pressed }) => [styles.mealDisclosure, pressed && styles.pressed]}
        >
          {expanded ? <ChevronUp color={colors.textMuted} size={18} /> : <ChevronDown color={colors.textMuted} size={18} />}
          <View style={styles.mealLabelBlock}>
            <Text style={styles.mealLabel}>{MEAL_META[mealId].label}</Text>
            <Text style={styles.mealMeta}>{entries.length ? `${entries.length} 项 · ${mealCalories(entries)} kcal` : '尚未记录'}</Text>
          </View>
        </Pressable>
        <IconButton accessibilityLabel={`添加${MEAL_META[mealId].label}`} disabled={disabled} onPress={onAdd}>
          <Plus color={colors.primary} size={21} />
        </IconButton>
      </View>

      {expanded ? (
        <View style={styles.mealEntries}>
          {entries.length ? entries.map((entry) => (
            <View key={entry.entryId} style={styles.mealEntry}>
              <Pressable
                accessibilityLabel={`编辑${entry.name}`}
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => onEdit(entry)}
                style={({ pressed }) => [styles.entryBody, pressed && styles.rowPressed, disabled && styles.disabled]}
              >
                <View style={[styles.entrySwatch, { backgroundColor: toneColor(entry.tone) }]}>
                  <Text style={styles.entrySwatchText}>{entry.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.entryText}>
                  <Text numberOfLines={1} style={styles.entryName}>{entry.name}</Text>
                  <Text style={styles.entryDetail}>{entry.amount} {entry.unit}</Text>
                </View>
                <Text style={styles.entryCalories}>{Math.round(entry.calories)} kcal</Text>
                {!disabled ? <Pencil color={colors.textSubtle} size={15} /> : null}
              </Pressable>
              <IconButton accessibilityLabel={`删除${entry.name}`} danger disabled={disabled} onPress={() => onDelete(entry)}>
                <Trash2 color={colors.danger} size={17} />
              </IconButton>
            </View>
          )) : (
            <Text style={styles.emptyMeal}>还没有记录，点击右侧加号开始。</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.lg,
  },
  appHeader: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: layout.tapTarget,
    height: layout.tapTarget,
  },
  dateSwitcher: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    minWidth: 0,
    minHeight: layout.tapTarget,
    flex: 1,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dateText: {
    flexShrink: 1,
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
  consentBanner: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#E8D4A9',
    borderRadius: radii.md,
    backgroundColor: colors.amberSoft,
  },
  bannerText: {
    flex: 1,
    minWidth: 0,
  },
  bannerTitle: {
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '800',
  },
  bannerBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  futureBanner: {
    minHeight: layout.tapTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.blueSoft,
  },
  futureText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    lineHeight: 20,
  },
  notice: {
    minHeight: layout.tapTarget,
    paddingLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#BFDCCF',
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  noticeText: {
    flex: 1,
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  noticeAction: {
    minWidth: 58,
    paddingHorizontal: spacing.sm,
  },
  noticeClose: {
    width: 40,
  },
  nutritionSummary: {
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  calorieHeadline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    fontWeight: '700',
  },
  calorieValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: typeScale.display,
    fontWeight: '900',
  },
  calorieUnit: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '600',
  },
  calorieRatio: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  ratioText: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroItem: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  macroLabel: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  macroValue: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  macroTarget: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  mainAction: {
    minHeight: 54,
  },
  mealList: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  mealRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  mealRowMain: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealDisclosure: {
    minHeight: 64,
    minWidth: 0,
    flex: 1,
    paddingLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealLabelBlock: {
    minWidth: 0,
    flex: 1,
  },
  mealLabel: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  mealMeta: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  mealEntries: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  mealEntry: {
    minHeight: 64,
    paddingLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  entryBody: {
    minWidth: 0,
    minHeight: 64,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.surfaceStrong,
  },
  entrySwatch: {
    width: 34,
    height: 34,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  entrySwatchText: {
    color: colors.text,
    fontSize: typeScale.caption,
    fontWeight: '800',
  },
  entryText: {
    flex: 1,
    minWidth: 0,
  },
  entryName: {
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  entryDetail: {
    marginTop: spacing.xxs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  entryCalories: {
    color: colors.text,
    fontSize: typeScale.caption,
    fontWeight: '700',
  },
  emptyMeal: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    lineHeight: 20,
  },
  secondarySection: {
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  sectionIconCoral: {
    backgroundColor: colors.coralSoft,
  },
  sectionIconBlue: {
    backgroundColor: colors.blueSoft,
  },
  sectionTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  sectionBody: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    lineHeight: 21,
  },
  disclosureRow: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weightEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weightInputShell: {
    minWidth: 0,
    flex: 1,
    height: layout.inputHeight,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  weightInput: {
    minWidth: 0,
    flex: 1,
    height: layout.inputHeight,
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
  },
  weightUnit: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
  },
  weightSave: {
    minWidth: 88,
  },
  backupRow: {
    minHeight: layout.tapTarget,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backupText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
});
