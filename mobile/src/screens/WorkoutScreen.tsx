import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Check,
  CircleCheck,
  Plus,
  Save,
  Trash2,
} from 'lucide-react-native';

import type { WorkoutSet } from '../domain/types';
import { useApp } from '../store/AppProvider';
import { colors, layout, radii, spacing, typeScale } from '../theme';
import {
  IconButton,
  LoadingState,
  PrimaryButton,
  ProgressBar,
  QuietButton,
  Screen,
  ScreenHeader,
  StatusPill,
} from '../components/ui';

export interface WorkoutScreenProps {
  onBack: () => void;
}

export function WorkoutScreen({ onBack }: WorkoutScreenProps) {
  const {
    data,
    updateWorkoutSet,
    toggleWorkoutSet,
    addWorkoutSet,
    deleteWorkoutSet,
    completeWorkout,
  } = useApp();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data) {
    return <Screen><LoadingState /></Screen>;
  }

  const { workout, trainingPlan } = data;
  const completedSets = workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.done).length,
    0,
  );
  const totalSets = workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const progress = totalSets ? (completedSets / totalSets) * 100 : 0;

  const runAction = async (id: string, action: () => Promise<unknown>) => {
    setPendingAction(id);
    setError(null);
    try {
      await action();
      return true;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '操作失败，请重试。';
      setError(message);
      Alert.alert('未能保存', message);
      return false;
    } finally {
      setPendingAction(null);
    }
  };

  const requestDeleteSet = (exerciseId: string, set: WorkoutSet, index: number) => {
    Alert.alert('删除训练组', `确定删除第 ${index + 1} 组吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => runAction(`delete-${set.id}`, () => deleteWorkoutSet(exerciseId, set.id)),
      },
    ]);
  };

  const finishWorkout = () => {
    const save = async () => {
      const saved = await runAction('complete-workout', completeWorkout);
      if (saved) onBack();
    };
    if (completedSets < totalSets) {
      Alert.alert(
        '完成训练',
        `当前完成 ${completedSets}/${totalSets} 组，未勾选的组将保留为未完成。`,
        [
          { text: '继续训练', style: 'cancel' },
          { text: '仍然完成', onPress: save },
        ],
      );
      return;
    }
    save();
  };

  return (
    <Screen contentContainerStyle={styles.screenContent} testID="workout-screen">
      <ScreenHeader
        onBack={onBack}
        subtitle={workout.completed ? '已保存到训练趋势' : workout.active ? '更改会自动保存' : `预计 ${trainingPlan.sessionMinutes} 分钟`}
        title={workout.title}
      />

      <View style={styles.progressSection}>
        <View style={styles.progressHeading}>
          <View>
            <Text style={styles.eyebrow}>训练进度</Text>
            <Text style={styles.progressValue}>{completedSets}/{totalSets} 组</Text>
          </View>
          {workout.completed ? <StatusPill label="已完成" tone="success" /> : <StatusPill label={workout.active ? '进行中' : '未开始'} />}
        </View>
        <ProgressBar
          accessibilityLabel={`已完成 ${completedSets} 组，共 ${totalSets} 组`}
          color={workout.completed ? colors.primary : colors.coral}
          value={progress}
        />
      </View>

      {error ? <Text accessibilityLiveRegion="assertive" style={styles.errorText}>{error}</Text> : null}

      <View style={styles.exerciseList}>
        {workout.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseBlock}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseHeadingText}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseNote}>{exercise.note}</Text>
              </View>
              <StatusPill
                label={`${exercise.sets.filter((set) => set.done).length}/${exercise.sets.length}`}
                tone={exercise.sets.length > 0 && exercise.sets.every((set) => set.done) ? 'success' : 'neutral'}
              />
            </View>

            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.indexColumn]}>组</Text>
              <Text style={[styles.tableHeaderText, styles.inputColumn]}>kg</Text>
              <Text style={[styles.tableHeaderText, styles.inputColumn]}>次数</Text>
              <Text style={[styles.tableHeaderText, styles.actionColumn]}>完成</Text>
              <View style={styles.actionColumn} />
            </View>

            {exercise.sets.map((set, index) => (
              <SetRow
                disabled={workout.completed || pendingAction !== null}
                exerciseId={exercise.id}
                exerciseName={exercise.name}
                index={index}
                key={set.id}
                onCommit={(patch) => runAction(`update-${set.id}`, () => updateWorkoutSet(exercise.id, set.id, patch))}
                onDelete={() => requestDeleteSet(exercise.id, set, index)}
                onToggle={() => runAction(`toggle-${set.id}`, () => toggleWorkoutSet(exercise.id, set.id))}
                pending={pendingAction?.endsWith(set.id) ?? false}
                set={set}
              />
            ))}

            {!workout.completed ? (
              <QuietButton
                disabled={pendingAction !== null}
                icon={<Plus color={colors.primary} size={18} />}
                label="添加一组"
                loading={pendingAction === `add-${exercise.id}`}
                onPress={() => runAction(`add-${exercise.id}`, () => addWorkoutSet(exercise.id))}
                style={styles.addSetButton}
              />
            ) : null}
          </View>
        ))}
      </View>

      {workout.exercises.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>当前计划还没有训练动作</Text>
          <Text style={styles.emptyBody}>请先在训练计划中选择模板。</Text>
        </View>
      ) : null}

      <PrimaryButton
        disabled={workout.completed || totalSets === 0}
        icon={workout.completed ? <CircleCheck color={colors.white} size={20} /> : <Check color={colors.white} size={20} />}
        label={workout.completed ? '训练已完成' : '完成训练'}
        loading={pendingAction === 'complete-workout'}
        onPress={finishWorkout}
        style={styles.completeButton}
      />

      <View style={styles.autoSaveNote}>
        <Save color={colors.textMuted} size={16} />
        <Text style={styles.autoSaveText}>重量、次数和完成状态会自动保存。</Text>
      </View>
    </Screen>
  );
}

function SetRow({
  exerciseId,
  exerciseName,
  index,
  set,
  disabled,
  pending,
  onCommit,
  onToggle,
  onDelete,
}: {
  exerciseId: string;
  exerciseName: string;
  index: number;
  set: WorkoutSet;
  disabled: boolean;
  pending: boolean;
  onCommit: (patch: { weight?: number; reps?: number }) => Promise<unknown>;
  onToggle: () => Promise<unknown>;
  onDelete: () => void;
}) {
  const [weight, setWeight] = useState(String(set.weight));
  const [reps, setReps] = useState(String(set.reps));

  useEffect(() => setWeight(String(set.weight)), [set.weight]);
  useEffect(() => setReps(String(set.reps)), [set.reps]);

  const commitNumber = async (kind: 'weight' | 'reps', value: string) => {
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      if (kind === 'weight') setWeight(String(set.weight));
      else setReps(String(set.reps));
      Alert.alert('请检查数值', '重量和次数不能小于 0。');
      return;
    }
    const normalized = kind === 'reps' ? Math.round(parsed) : parsed;
    if (normalized === set[kind]) return;
    await onCommit({ [kind]: normalized });
  };

  return (
    <View
      accessibilityLabel={`${exerciseName}第${index + 1}组`}
      style={[styles.setRow, set.done && styles.setRowDone]}
    >
      <View style={styles.indexColumn}>
        <Text style={[styles.setIndex, set.done && styles.setIndexDone]}>{index + 1}</Text>
      </View>
      <TextInput
        accessibilityLabel={`${exerciseName}第${index + 1}组重量`}
        editable={!disabled}
        keyboardType="decimal-pad"
        onBlur={() => commitNumber('weight', weight)}
        onChangeText={setWeight}
        selectTextOnFocus
        style={[styles.setInput, styles.inputColumn, set.done && styles.setInputDone]}
        value={weight}
      />
      <TextInput
        accessibilityLabel={`${exerciseName}第${index + 1}组次数`}
        editable={!disabled}
        keyboardType="number-pad"
        onBlur={() => commitNumber('reps', reps)}
        onChangeText={setReps}
        selectTextOnFocus
        style={[styles.setInput, styles.inputColumn, set.done && styles.setInputDone]}
        value={reps}
      />
      <Pressable
        accessibilityLabel={set.done ? `取消完成第${index + 1}组` : `完成第${index + 1}组`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.done, disabled, busy: pending }}
        disabled={disabled}
        onPress={onToggle}
        style={({ pressed }) => [styles.checkButton, styles.actionColumn, set.done && styles.checkButtonDone, pressed && styles.pressed, disabled && styles.disabled]}
      >
        {set.done ? <Check color={colors.white} size={18} strokeWidth={3} /> : null}
      </Pressable>
      <IconButton
        accessibilityLabel={`删除第${index + 1}组`}
        danger
        disabled={disabled}
        onPress={onDelete}
        style={styles.actionColumn}
      >
        <Trash2 color={colors.danger} size={17} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.lg,
  },
  progressSection: {
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  progressHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    fontWeight: '700',
  },
  progressValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: typeScale.title,
    fontWeight: '900',
  },
  errorText: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontSize: typeScale.bodySmall,
    lineHeight: 20,
  },
  exerciseList: {
    gap: spacing.lg,
  },
  exerciseBlock: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  exerciseHeader: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exerciseHeadingText: {
    flex: 1,
    minWidth: 0,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  exerciseNote: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  tableHeader: {
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  tableHeaderText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  setRow: {
    minHeight: 60,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  setRowDone: {
    backgroundColor: colors.primarySoft,
  },
  indexColumn: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  inputColumn: {
    width: 64,
  },
  actionColumn: {
    width: layout.tapTarget,
  },
  setIndex: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '800',
  },
  setIndexDone: {
    color: colors.primary,
  },
  setInput: {
    height: layout.tapTarget,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  setInputDone: {
    borderColor: '#AED2C2',
    backgroundColor: colors.surface,
    color: colors.primary,
  },
  checkButton: {
    height: layout.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  checkButtonDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.42,
  },
  addSetButton: {
    minHeight: layout.tapTarget,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderRadius: 0,
  },
  completeButton: {
    minHeight: 54,
  },
  autoSaveNote: {
    minHeight: layout.tapTarget,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  autoSaveText: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: typeScale.caption,
    textAlign: 'center',
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    textAlign: 'center',
  },
});
