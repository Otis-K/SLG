import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  BarChart3,
  ClipboardList,
  CloudOff,
  DatabaseBackup,
  Dumbbell,
  HelpCircle,
  Pencil,
  Settings2,
  ShieldCheck,
  Target,
  Utensils,
} from 'lucide-react-native';

import { Card, MenuRow, SectionLabel } from '../components/controls';
import { AppLogo, PrimaryButton, QuietButton, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { useApp } from '../store/AppProvider';
import { colors, layout, radii, spacing, typeScale } from '../theme';

type DetailRoute = Exclude<keyof RootStackParamList, 'Main'>;

export function MyScreen({ onNavigate }: { onNavigate: (route: DetailRoute) => void }) {
  const { data, saveWeight } = useApp();
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightDraft, setWeightDraft] = useState('');
  const [saving, setSaving] = useState(false);

  if (!data) return null;

  const completedTrainingCount = data.trends.training.completedSessions;
  const backupEnabled = data.consents.cloudBackup;
  const currentWeightLabel = data.profile.latestWeightKg > 0 ? `${data.profile.latestWeightKg} kg` : '未记录';
  const targetWeightLabel = data.profile.targetWeightKg ? ` · 目标 ${data.profile.targetWeightKg} kg` : '';

  const beginWeightEdit = () => {
    setWeightDraft(String(data.profile.latestWeightKg));
    setEditingWeight(true);
  };

  const commitWeight = async () => {
    const value = Number(weightDraft);
    if (!Number.isFinite(value) || value < 30 || value > 250) {
      Alert.alert('体重不在有效范围', '请输入 30–250 kg 之间的数值。');
      return;
    }
    try {
      setSaving(true);
      await saveWeight(value);
      setEditingWeight(false);
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : '无法保存体重');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content} testID="my-screen">
      <View style={styles.topRow}>
        <Text style={styles.pageTitle}>我的</Text>
        <AppLogo compact />
      </View>

      <Pressable accessibilityRole="button" onPress={beginWeightEdit} style={({ pressed }) => [styles.profile, pressed && styles.pressed]}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{data.profile.avatarText}</Text></View>
        <View style={styles.profileText}>
          <Text style={styles.name}>{data.profile.displayName}</Text>
          <Text style={styles.profileDetail}>{data.profile.goalLabel} · 当前 {currentWeightLabel}{targetWeightLabel}</Text>
          {data.profile.age && data.profile.heightCm ? (
            <Text style={styles.profileMeta}>{data.profile.age} 岁 · {data.profile.heightCm} cm</Text>
          ) : null}
        </View>
        <Pencil color={colors.textMuted} size={18} />
      </Pressable>

      {editingWeight ? (
        <Card style={styles.weightEditor}>
          <View style={styles.editorHeading}>
            <View>
              <Text style={styles.editorTitle}>记录当前体重</Text>
              <Text style={styles.editorDetail}>本次记录会更新体重趋势</Text>
            </View>
            <QuietButton label="取消" onPress={() => setEditingWeight(false)} />
          </View>
          <View style={styles.weightInputRow}>
            <TextInput
              accessibilityLabel="当前体重"
              autoFocus
              keyboardType="decimal-pad"
              onChangeText={setWeightDraft}
              selectionColor={colors.primary}
              style={styles.weightInput}
              value={weightDraft}
            />
            <Text style={styles.weightUnit}>kg</Text>
          </View>
          <PrimaryButton label="保存体重" loading={saving} onPress={commitWeight} />
        </Card>
      ) : null}

      <View style={styles.goalStrip} accessibilityLabel="当前目标摘要">
        <Stat label="每日目标" value={String(data.nutritionPlan.targets.calories)} unit="kcal" />
        <Stat label="蛋白质" value={String(data.nutritionPlan.targets.protein)} unit="g" bordered />
        <Stat label="本周训练" value={`${completedTrainingCount}/${data.trainingPlan.daysPerWeek}`} bordered />
      </View>

      <SectionLabel>目标与计划</SectionLabel>
      <Card>
        <MenuRow
          icon={Target}
          label="饮食目标与餐次预算"
          onPress={() => onNavigate('Goals')}
          tone="green"
          value={`${data.nutritionPlan.targets.calories} kcal`}
        />
        <MenuRow
          icon={ClipboardList}
          label="每周训练计划"
          onPress={() => onNavigate('TrainingPlan')}
          tone="coral"
          value={`${data.trainingPlan.daysPerWeek} 天`}
          last
        />
      </Card>

      <SectionLabel>数据与内容</SectionLabel>
      <Card>
        <MenuRow icon={BarChart3} label="数据趋势" onPress={() => onNavigate('Trends')} tone="blue" value="本周" />
        <MenuRow icon={Utensils} label="我的食物与收藏" onPress={() => onNavigate('Foods')} tone="amber" />
        <MenuRow icon={Dumbbell} label="训练模板" onPress={() => onNavigate('Templates')} tone="coral" value={`${data.trainingTemplates.length} 个`} last />
      </Card>

      <SectionLabel>设置</SectionLabel>
      <Card>
        <MenuRow icon={Settings2} label="单位与显示" onPress={() => Alert.alert('单位与显示', '当前版本使用公制单位。')} value="公制" />
        <MenuRow
          icon={backupEnabled ? DatabaseBackup : CloudOff}
          label="数据导出与云备份"
          onPress={() => onNavigate('Data')}
          tone={backupEnabled ? 'green' : 'neutral'}
          value={backupEnabled ? (data.backup.state === 'failed' ? '需重试' : '已开启') : '仅本机'}
        />
        <MenuRow icon={ShieldCheck} label="隐私与账户" onPress={() => onNavigate('Privacy')} tone="blue" />
        <MenuRow icon={HelpCircle} label="帮助与反馈" onPress={() => Alert.alert('帮助与反馈', '反馈通道将在公开测试前接入。')} last />
      </Card>

      <Text style={styles.buildLabel}>食练格 v1.0 · 数据属于你</Text>
    </Screen>
  );
}

function Stat({ label, value, unit, bordered = false }: { label: string; value: string; unit?: string; bordered?: boolean }) {
  return (
    <View style={[styles.stat, bordered && styles.statBorder]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}<Text style={styles.statUnit}>{unit ? ` ${unit}` : ''}</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  topRow: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  profile: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '800',
  },
  profileText: {
    minWidth: 0,
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  profileDetail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
  },
  profileMeta: {
    marginTop: spacing.xs,
    color: colors.textSubtle,
    fontSize: typeScale.caption,
  },
  weightEditor: {
    gap: spacing.md,
    padding: spacing.md,
  },
  editorHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorTitle: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  editorDetail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  weightInputRow: {
    height: layout.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  weightInput: {
    minWidth: 0,
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  weightUnit: {
    paddingRight: spacing.md,
    color: colors.textMuted,
  },
  goalStrip: {
    minHeight: 68,
    flexDirection: 'row',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  statValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  statUnit: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  buildLabel: {
    color: colors.textSubtle,
    fontSize: typeScale.caption,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.68,
  },
});
