import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Download,
  Dumbbell,
  LockKeyhole,
  ShieldCheck,
  Target,
  Utensils,
  WifiOff,
} from 'lucide-react-native';

import {
  Card,
  ChoiceGrid,
  FieldLabel,
  Notice,
  NumberField,
  SegmentedControl,
  ToggleRow,
} from '../components/controls';
import {
  AppLogo,
  PrimaryButton,
  ProgressBar,
  QuietButton,
  Screen,
  SecondaryButton,
  StatusPill,
} from '../components/ui';
import {
  ACTIVITY_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  HEALTH_RISK_OPTIONS,
  ONBOARDING_DEFAULTS,
  PACE_OPTIONS,
  PROFILE_LIMITS,
  SEX_OPTIONS,
  TRAINING_DAY_OPTIONS,
  TRAINING_PLACE_OPTIONS,
  TRAINING_SESSION_MINUTES,
} from '../config/frontendConfig';
import type {
  GoalId,
  OnboardingProfile,
  PlanSuggestion,
  SexId,
} from '../domain/types';
import { useApp } from '../store/AppProvider';
import { colors, layout, radii, spacing, typeScale } from '../theme';

type OnboardingDraft = typeof ONBOARDING_DEFAULTS;
type HealthStatus = '' | 'none' | 'risk';
type BusyAction = 'preview' | 'activate' | 'manual' | 'browse' | null;

const SEX_CONTROL_OPTIONS = SEX_OPTIONS.map(({ id, label }) => ({ value: id, label }));
const GOAL_CONTROL_OPTIONS = GOAL_OPTIONS.map(({ id, label }) => ({ value: id, label }));
const PACE_CONTROL_OPTIONS = PACE_OPTIONS.map(({ id, label }) => ({ value: id, label }));
const ACTIVITY_CONTROL_OPTIONS = ACTIVITY_OPTIONS.map(({ id, label, detail }) => ({
  value: id,
  label,
  detail,
}));
const EXPERIENCE_CONTROL_OPTIONS = EXPERIENCE_OPTIONS.map(({ id, label }) => ({ value: id, label }));
const TRAINING_DAY_CONTROL_OPTIONS = TRAINING_DAY_OPTIONS.map((days) => ({
  value: days,
  label: `每周 ${days} 天`,
}));
const TRAINING_PLACE_CONTROL_OPTIONS = TRAINING_PLACE_OPTIONS.map(({ id, label }) => ({ value: id, label }));
const SESSION_MINUTE_CONTROL_OPTIONS = TRAINING_SESSION_MINUTES.map((minutes) => ({
  value: minutes,
  label: `${minutes} 分钟`,
}));
const HEALTH_STATUS_OPTIONS = [
  { value: 'none' as const, label: '以上情况均无', detail: '可生成一般健康管理计划' },
  { value: 'risk' as const, label: '存在特殊情况', detail: '仅保留手动记录，不生成自动计划' },
];

function createHealthRiskState(): Record<string, boolean> {
  return Object.fromEntries(HEALTH_RISK_OPTIONS.map((option) => [option.id, false]));
}

function parseNumber(value: string): number {
  const normalized = value.trim().replace(',', '.');
  return normalized ? Number(normalized) : Number.NaN;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function OnboardingScreen() {
  const { data, previewPlan, activatePlan, updateConsents } = useApp();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({ ...ONBOARDING_DEFAULTS });
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('');
  const [healthRisks, setHealthRisks] = useState(createHealthRiskState);
  const [healthConsent, setHealthConsent] = useState(false);
  const [suggestion, setSuggestion] = useState<PlanSuggestion | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const age = parseNumber(draft.age);
  const height = parseNumber(draft.height);
  const currentWeight = parseNumber(draft.currentWeight);
  const targetWeight = draft.goal === 'maintain' ? currentWeight : parseNumber(draft.targetWeight);
  const { age: ageLimits, heightCm: heightLimits, weightKg: weightLimits } = PROFILE_LIMITS;

  const ageValid = Number.isInteger(age)
    && age >= ageLimits.autoPlanMin
    && age <= ageLimits.max;
  const heightValid = Number.isFinite(height)
    && height >= heightLimits.min
    && height <= heightLimits.max;
  const basicValid = ageValid && heightValid && Boolean(draft.sex);
  const weightsInRange = Number.isFinite(currentWeight)
    && Number.isFinite(targetWeight)
    && currentWeight >= weightLimits.min
    && currentWeight <= weightLimits.max
    && targetWeight >= weightLimits.min
    && targetWeight <= weightLimits.max;
  const targetDirectionValid = draft.goal === 'lose'
    ? targetWeight < currentWeight
    : draft.goal === 'gain'
      ? targetWeight > currentWeight
      : targetWeight === currentWeight;
  const targetValid = weightsInRange && targetDirectionValid;
  const trainingValid = Boolean(draft.activity && draft.experience && draft.trainingPlace);
  const selectedRisk = Object.values(healthRisks).some(Boolean);
  const healthAnswered = healthStatus === 'none' || (healthStatus === 'risk' && selectedRisk);
  const automaticPlanEligible = age <= ageLimits.autoPlanMax && healthStatus === 'none';
  const sourceMode = data?.dataSource.mode ?? 'mock';
  const goalLabel = GOAL_OPTIONS.find((option) => option.id === draft.goal)?.summaryLabel ?? '体重管理';
  const busy = busyAction !== null;

  const setField = <Key extends keyof OnboardingDraft>(key: Key, value: OnboardingDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setOperationError(null);
  };

  const selectGoal = (goal: GoalId) => {
    setDraft((current) => ({
      ...current,
      goal,
      targetWeight: goal === 'maintain' ? current.currentWeight : current.targetWeight,
    }));
    setOperationError(null);
  };

  const updateCurrentWeight = (value: string) => {
    setDraft((current) => ({
      ...current,
      currentWeight: value,
      targetWeight: current.goal === 'maintain' ? value : current.targetWeight,
    }));
    setOperationError(null);
  };

  const selectHealthStatus = (value: Exclude<HealthStatus, ''>) => {
    setHealthStatus(value);
    if (value === 'none') setHealthRisks(createHealthRiskState());
    setOperationError(null);
  };

  const buildProfile = (): OnboardingProfile | null => {
    if (!basicValid || !targetValid || !trainingValid) return null;
    if (!draft.sex || !draft.activity || !draft.experience || !draft.trainingPlace) return null;

    return {
      age,
      sex: draft.sex,
      height,
      currentWeight,
      targetWeight,
      goal: draft.goal,
      pace: draft.pace,
      activity: draft.activity,
      experience: draft.experience,
      trainingDays: Number(draft.trainingDays),
      trainingPlace: draft.trainingPlace,
      sessionMinutes: Number(draft.sessionMinutes),
    };
  };

  const requestPlanPreview = async () => {
    const profile = buildProfile();
    if (!profile || !automaticPlanEligible || !healthConsent) return;

    setBusyAction('preview');
    setOperationError(null);
    try {
      const nextSuggestion = await previewPlan(profile);
      setSuggestion(nextSuggestion);
      setStep(4);
    } catch (error) {
      setSuggestion(null);
      setOperationError(`计划生成失败：${errorMessage(error, '无法读取计划服务')}。不会改用 Mock 计划。`);
    } finally {
      setBusyAction(null);
    }
  };

  const finishWithoutPlan = async (hasConsent: boolean) => {
    setBusyAction(hasConsent ? 'manual' : 'browse');
    setOperationError(null);
    try {
      const profile = hasConsent ? buildProfile() : null;
      if (hasConsent && !profile) {
        setOperationError('资料不完整，请返回检查后重试。');
        return;
      }
      await updateConsents(
        { healthProfileProcessing: hasConsent },
        { completeOnboarding: true, profile: profile ?? undefined },
      );
    } catch (error) {
      setOperationError(errorMessage(error, '无法保存你的选择，请重试。'));
    } finally {
      setBusyAction(null);
    }
  };

  const confirmPlan = async () => {
    const profile = buildProfile();
    if (!suggestion || !profile) return;

    setBusyAction('activate');
    setOperationError(null);
    try {
      await activatePlan({
        suggestionId: suggestion.suggestionId,
        targets: suggestion.targets,
        trainingPlan: suggestion.training,
        currentWeightKg: currentWeight,
        profile,
      });
    } catch (error) {
      setOperationError(`启用失败：${errorMessage(error, '无法保存计划')}。当前计划仍未生效。`);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content} testID="onboarding-screen">
      <View style={styles.header}>
        <AppLogo />
        <Text style={styles.stepLabel}>步骤 {step + 1}/5</Text>
      </View>
      <ProgressBar accessibilityLabel="首次设置进度" value={((step + 1) / 5) * 100} />

      {step === 0 ? (
        <>
          <StepIntro
            icon={<CircleUserRound color={colors.primary} size={28} />}
            title="先认识你的身体"
            detail="这些信息用于估算基础能量需求。生理性别只参与公式计算，不用于公开展示。"
          />

          <View style={styles.twoColumns}>
            <NumberField
              keyboardType="number-pad"
              label="年龄"
              onChangeText={(value) => setField('age', value)}
              placeholder="例如 28"
              unit="岁"
              value={draft.age}
            />
            <NumberField
              label="身高"
              onChangeText={(value) => setField('height', value)}
              placeholder="例如 175"
              unit="cm"
              value={draft.height}
            />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel hint="仅用于能量估算">生理性别</FieldLabel>
            <SegmentedControl<SexId | ''>
              onChange={(value) => setField('sex', value)}
              options={SEX_CONTROL_OPTIONS}
              value={draft.sex}
            />
          </View>

          {draft.age && Number.isFinite(age) && age < ageLimits.autoPlanMin ? (
            <Notice tone="danger">当前版本无法为未成年人创建健康档案或计划。</Notice>
          ) : null}
          {draft.age && Number.isFinite(age) && age > ageLimits.autoPlanMax && age <= ageLimits.max ? (
            <Notice tone="warning">
              {ageLimits.autoPlanMax + 1} 岁及以上用户可使用手动记录，当前版本不生成自动计划。
            </Notice>
          ) : null}
          {draft.height && !heightValid ? (
            <Notice tone="danger">身高请输入 {heightLimits.min}-{heightLimits.max} cm。</Notice>
          ) : null}
          <Text style={styles.helper}>
            年龄范围 {ageLimits.autoPlanMin}-{ageLimits.max} 岁，身高范围 {heightLimits.min}-{heightLimits.max} cm。
          </Text>

          <PrimaryButton
            disabled={!basicValid}
            icon={<ChevronRight color={colors.white} size={18} />}
            label="继续"
            onPress={() => setStep(1)}
          />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <StepIntro
            icon={<Target color={colors.primary} size={28} />}
            title="你的目标是什么？"
            detail="选择方向，再填写当前体重和希望达到的体重。"
          />

          <View style={styles.fieldGroup}>
            <FieldLabel>体重目标</FieldLabel>
            <SegmentedControl<GoalId>
              onChange={selectGoal}
              options={GOAL_CONTROL_OPTIONS}
              value={draft.goal}
            />
          </View>

          <View style={styles.twoColumns}>
            <NumberField
              label="当前体重"
              onChangeText={updateCurrentWeight}
              placeholder="例如 72.4"
              unit="kg"
              value={draft.currentWeight}
            />
            <NumberField
              disabled={draft.goal === 'maintain'}
              label="目标体重"
              onChangeText={(value) => setField('targetWeight', value)}
              placeholder="例如 68"
              unit="kg"
              value={draft.goal === 'maintain' ? draft.currentWeight : draft.targetWeight}
            />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel hint="不会采用极端热量方案">期望速度</FieldLabel>
            <SegmentedControl
              onChange={(value) => setField('pace', value)}
              options={PACE_CONTROL_OPTIONS}
              value={draft.pace}
            />
          </View>

          {(draft.currentWeight || draft.targetWeight) && !weightsInRange ? (
            <Notice tone="danger">当前和目标体重都需在 {weightLimits.min}-{weightLimits.max} kg 之间。</Notice>
          ) : null}
          {weightsInRange && !targetDirectionValid ? (
            <Notice tone="danger">
              {draft.goal === 'lose'
                ? '减脂目标需低于当前体重。'
                : draft.goal === 'gain'
                  ? '增肌目标需高于当前体重。'
                  : '保持体重时，目标体重应与当前体重相同。'}
            </Notice>
          ) : null}
          {targetValid ? (
            <View accessibilityLabel={`${goalLabel}，从 ${currentWeight} 千克到 ${targetWeight} 千克`} style={styles.goalSummary}>
              <Text style={styles.summaryWeight}>{currentWeight} kg</Text>
              <ChevronRight color={colors.textSubtle} size={17} />
              <Text style={styles.summaryTarget}>{targetWeight} kg</Text>
              <StatusPill label={goalLabel} tone="success" />
            </View>
          ) : null}

          <ActionRow
            onBack={() => setStep(0)}
            onContinue={() => setStep(2)}
            continueDisabled={!targetValid}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <StepIntro
            icon={<Dumbbell color={colors.primary} size={28} />}
            title="你的日常与训练条件"
            detail="日常活动不含计划训练，计划会根据经验、时间和场地调整。"
          />

          <View style={styles.fieldGroup}>
            <FieldLabel hint="不含健身训练">日常活动水平</FieldLabel>
            <ChoiceGrid
              onChange={(value) => setField('activity', value)}
              options={ACTIVITY_CONTROL_OPTIONS}
              value={draft.activity}
            />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>训练经验</FieldLabel>
            <SegmentedControl
              onChange={(value) => setField('experience', value)}
              options={EXPERIENCE_CONTROL_OPTIONS}
              value={draft.experience}
            />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>每周可训练</FieldLabel>
            <SegmentedControl
              columns={2}
              onChange={(value) => setField('trainingDays', value)}
              options={TRAINING_DAY_CONTROL_OPTIONS}
              value={draft.trainingDays}
            />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>训练场地</FieldLabel>
            <SegmentedControl
              onChange={(value) => setField('trainingPlace', value)}
              options={TRAINING_PLACE_CONTROL_OPTIONS}
              value={draft.trainingPlace}
            />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>单次可用时间</FieldLabel>
            <SegmentedControl
              onChange={(value) => setField('sessionMinutes', value)}
              options={SESSION_MINUTE_CONTROL_OPTIONS}
              value={draft.sessionMinutes}
            />
          </View>

          <ActionRow
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
            continueDisabled={!trainingValid}
          />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <StepIntro
            icon={<ShieldCheck color={colors.primary} size={28} />}
            title="健康边界与数据同意"
            detail="自动计划只用于一般健康管理。请确认是否有需要专业指导的情况。"
          />

          <ChoiceGrid
            onChange={selectHealthStatus}
            options={HEALTH_STATUS_OPTIONS}
            value={healthStatus}
          />

          {healthStatus === 'risk' ? (
            <View style={styles.fieldGroup}>
              <FieldLabel hint="至少选择一项">适用情况</FieldLabel>
              <Card>
                {HEALTH_RISK_OPTIONS.map((option, index) => (
                  <View key={option.id} style={index > 0 ? styles.riskDivider : undefined}>
                    <ToggleRow
                      label={option.label}
                      onValueChange={(value) => {
                        setHealthRisks((current) => ({ ...current, [option.id]: value }));
                        setOperationError(null);
                      }}
                      value={healthRisks[option.id] ?? false}
                    />
                  </View>
                ))}
              </Card>
            </View>
          ) : null}

          {healthStatus === 'risk' || age > ageLimits.autoPlanMax ? (
            <Notice tone="warning">
              你仍可记录饮食、训练和体重；个性化方案请咨询医生、注册营养师或专业教练。
            </Notice>
          ) : null}

          <Card>
            <ToggleRow
              detail="用于在本机保存健康资料、记录并生成计划；不包含云备份授权。"
              label="我已阅读并单独同意健康资料处理"
              onValueChange={(value) => {
                setHealthConsent(value);
                setOperationError(null);
              }}
              value={healthConsent}
            />
          </Card>

          <View style={styles.privacyFacts}>
            <View style={styles.privacyFact}>
              <LockKeyhole color={colors.textMuted} size={16} />
              <Text style={styles.privacyFactText}>资料保存在本机</Text>
            </View>
            <View style={styles.privacyFact}>
              <Download color={colors.textMuted} size={16} />
              <Text style={styles.privacyFactText}>支持导出和删除</Text>
            </View>
          </View>

          {operationError ? <OperationError message={operationError} /> : null}

          <View style={styles.actionRow}>
            <SecondaryButton
              disabled={busy}
              label="返回"
              onPress={() => {
                setOperationError(null);
                setStep(2);
              }}
              style={styles.backButton}
            />
            <PrimaryButton
              disabled={busy || !healthConsent || !healthAnswered}
              icon={busyAction === 'preview' || busyAction === 'manual' ? undefined : <ChevronRight color={colors.white} size={18} />}
              label={automaticPlanEligible
                ? operationError
                  ? '重试生成计划'
                  : '生成计划预览'
                : '进入手动记录'}
              loading={busyAction === 'preview' || busyAction === 'manual'}
              onPress={automaticPlanEligible ? requestPlanPreview : () => finishWithoutPlan(true)}
              style={styles.continueButton}
            />
          </View>

          {automaticPlanEligible ? (
            <QuietButton
              disabled={!healthConsent || busy}
              label="不生成计划，直接手动记录"
              loading={busyAction === 'manual'}
              onPress={() => finishWithoutPlan(true)}
            />
          ) : null}
          <QuietButton
            disabled={busy}
            label="暂不同意，仅浏览公开资料"
            loading={busyAction === 'browse'}
            onPress={() => finishWithoutPlan(false)}
            textStyle={styles.browseLabel}
          />
        </>
      ) : null}

      {step === 4 && suggestion ? (
        <>
          <StepIntro
            icon={<ClipboardList color={colors.primary} size={28} />}
            title="这是为你生成的起步计划"
            detail={`${goalLabel} · ${currentWeight} → ${targetWeight} kg${suggestion.estimatedWeeks ? ` · 约 ${suggestion.estimatedWeeks} 周` : ''}`}
          />

          <View style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>计划数据来源</Text>
            <StatusPill
              label={sourceMode === 'api' ? '真实 API 建议' : 'Mock 演示估算'}
              tone={sourceMode === 'api' ? 'success' : 'warning'}
            />
          </View>

          <Card style={styles.planCard}>
            <PlanHeader
              detail="每日目标与四餐预算"
              icon={<Utensils color={colors.primary} size={19} />}
              title="饮食控制计划"
            />
            <View style={styles.calorieRow}>
              <Text style={styles.calorieLabel}>每日能量</Text>
              <Text style={styles.calorieValue}>
                {suggestion.targets.calories.toLocaleString('zh-CN')}
                <Text style={styles.calorieUnit}> kcal</Text>
              </Text>
            </View>
            <View style={styles.macroRow}>
              <PlanMetric label="蛋白质" value={`${suggestion.targets.protein} g`} />
              <PlanMetric bordered label="碳水" value={`${suggestion.targets.carbs} g`} />
              <PlanMetric bordered label="脂肪" value={`${suggestion.targets.fat} g`} />
            </View>
            <View style={styles.mealGrid}>
              {suggestion.meals.map((meal) => (
                <View key={meal.id} style={styles.mealItem}>
                  <Text style={styles.mealLabel}>{meal.label} · {meal.ratio}</Text>
                  <Text style={styles.mealValue}>{meal.calories} kcal</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card style={styles.planCard}>
            <PlanHeader
              detail={`${suggestion.training.place} · 每次 ${suggestion.training.sessionMinutes} 分钟`}
              icon={<Dumbbell color={colors.coral} size={19} />}
              title="训练计划"
            />
            <View style={styles.trainingHeading}>
              <Text style={styles.trainingTitle}>{suggestion.training.title}</Text>
              <StatusPill label={`每周 ${suggestion.training.daysPerWeek} 天`} tone="neutral" />
            </View>
            <View style={styles.sessionList}>
              {suggestion.training.sessions.map((session, index) => (
                <View key={`${session}-${index}`} style={styles.sessionRow}>
                  <Text style={styles.sessionIndex}>第 {index + 1} 次</Text>
                  <Text style={styles.sessionName}>{session}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Notice>
            {sourceMode === 'mock'
              ? '此计划使用明确标记的 Mock 策略，仅用于验证交互。'
              : `此计划由真实接口返回，策略版本为 ${suggestion.policy.clinicalPolicyVersion}。`}
            计划不构成医疗建议，可在“我的”中调整。
          </Notice>

          {operationError ? <OperationError message={operationError} /> : null}

          <View style={styles.actionRow}>
            <SecondaryButton
              disabled={busy}
              label="返回修改"
              onPress={() => {
                setOperationError(null);
                setStep(3);
              }}
              style={styles.backButton}
            />
            <PrimaryButton
              icon={busyAction === 'activate' ? undefined : <Check color={colors.white} size={18} />}
              label={operationError ? '重试启用计划' : '确认并启用计划'}
              loading={busyAction === 'activate'}
              onPress={confirmPlan}
              style={styles.continueButton}
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function StepIntro({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <View style={styles.intro}>
      <View style={styles.introIcon}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

function ActionRow({
  onBack,
  onContinue,
  continueDisabled,
}: {
  onBack: () => void;
  onContinue: () => void;
  continueDisabled?: boolean;
}) {
  return (
    <View style={styles.actionRow}>
      <SecondaryButton label="返回" onPress={onBack} style={styles.backButton} />
      <PrimaryButton
        disabled={continueDisabled}
        icon={<ChevronRight color={colors.white} size={18} />}
        label="继续"
        onPress={onContinue}
        style={styles.continueButton}
      />
    </View>
  );
}

function OperationError({ message }: { message: string }) {
  return (
    <View accessibilityLiveRegion="assertive" style={styles.errorNotice}>
      <WifiOff color={colors.danger} size={18} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function PlanHeader({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <View style={styles.planHeader}>
      <View style={styles.planIcon}>{icon}</View>
      <View style={styles.planHeaderText}>
        <Text style={styles.planTitle}>{title}</Text>
        <Text style={styles.planDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function PlanMetric({ label, value, bordered = false }: { label: string; value: string; bordered?: boolean }) {
  return (
    <View style={[styles.metric, bordered && styles.metricBorder]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    minHeight: layout.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepLabel: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  intro: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  introIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.primarySoft,
  },
  title: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  detail: {
    maxWidth: 420,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    lineHeight: 21,
    textAlign: 'center',
  },
  twoColumns: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  helper: {
    marginTop: -spacing.sm,
    color: colors.textSubtle,
    fontSize: typeScale.caption,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
  goalSummary: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryWeight: {
    color: colors.textMuted,
    fontSize: typeScale.body,
    fontWeight: '700',
  },
  summaryTarget: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  riskDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  privacyFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  privacyFact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  privacyFactText: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  browseLabel: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: typeScale.bodySmall,
    lineHeight: 20,
  },
  sourceRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sourceLabel: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
  planCard: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  planHeaderText: {
    minWidth: 0,
    flex: 1,
  },
  planTitle: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: '800',
  },
  planDetail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  calorieLabel: {
    color: colors.textMuted,
    fontSize: typeScale.bodySmall,
  },
  calorieValue: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '800',
  },
  calorieUnit: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    fontWeight: '600',
  },
  macroRow: {
    minHeight: 62,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  metricBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  metricValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '800',
  },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mealItem: {
    minHeight: 56,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  mealLabel: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  mealValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '800',
  },
  trainingHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  trainingTitle: {
    minWidth: 0,
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sessionList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sessionRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sessionIndex: {
    width: 54,
    color: colors.textMuted,
    fontSize: typeScale.caption,
  },
  sessionName: {
    flex: 1,
    color: colors.text,
    fontSize: typeScale.bodySmall,
    fontWeight: '700',
  },
});
