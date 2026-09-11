import { getLocalDate } from '../config/frontendConfig';
import type {
  ActivatePlanInput,
  ActivatePlanResult,
  BootstrapResponse,
  Food,
  MealId,
  OnboardingProfile,
  PlanSuggestionResponse,
} from '../domain/types';

const MEAL_BUDGETS = [
  { id: 'breakfast' as MealId, label: '早餐', ratio: 0.25 },
  { id: 'lunch' as MealId, label: '午餐', ratio: 0.35 },
  { id: 'dinner' as MealId, label: '晚餐', ratio: 0.3 },
  { id: 'snack' as MealId, label: '加餐', ratio: 0.1 },
] as const;

export const MOCK_PLAN_POLICY = {
  policyVersion: 'prototype-demo-2026.08.15',
  activityFactors: { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 },
  goalFactors: { lose: 0.85, maintain: 1, gain: 1.1 },
  minimumCalories: { male: 1500, female: 1200 },
  maximumCalories: 3200,
  proteinPerKg: { activeGoal: 1.6, maintain: 1.4 },
  fatPerKg: 0.8,
  minimumCarbs: 80,
  weeklyChangeKg: { gentle: 0.25, steady: 0.5 },
  mealBudgets: MEAL_BUDGETS,
  sessionPatterns: {
    2: ['全身 A', '全身 B'],
    3: ['全身 A', '全身 B', '全身 C'],
    4: ['上肢 A', '下肢 A', '上肢 B', '下肢 B'],
    5: ['推', '拉', '腿', '上肢', '下肢'],
  } as Record<number, string[]>,
} as const;

const FOOD_CATALOG: Food[] = [
  { id: 'egg', name: '水煮鸡蛋', detail: '2 个 · 沿用上次份量', unit: '个', amount: 2, calories: 144, protein: 12.6, carbs: 1.1, fat: 9.5, tone: 'yellow', favorite: true },
  { id: 'oats', name: '即食燕麦片', detail: '桂格 · 40 克', unit: '克', amount: 40, calories: 150, protein: 5.2, carbs: 27.1, fat: 2.7, tone: 'coral', favorite: true },
  { id: 'milk', name: '低脂牛奶', detail: '蒙牛 · 250 毫升', unit: '毫升', amount: 250, calories: 120, protein: 8.3, carbs: 12.5, fat: 3.8, tone: 'blue', favorite: false },
  { id: 'rice', name: '熟米饭', detail: '1 碗 · 150 克', unit: '碗', amount: 1, calories: 174, protein: 3.9, carbs: 38.4, fat: 0.5, tone: 'green', favorite: true },
  { id: 'chicken', name: '香煎鸡胸肉', detail: '家常做法 · 120 克', unit: '克', amount: 120, calories: 198, protein: 36.5, carbs: 1.8, fat: 4.9, tone: 'orange', favorite: false },
  { id: 'banana', name: '香蕉', detail: '1 根 · 约 110 克', unit: '根', amount: 1, calories: 102, protein: 1.2, carbs: 26.4, fat: 0.3, tone: 'yellow', favorite: false },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createMockBootstrapResponse(localDate = getLocalDate()): BootstrapResponse {
  const foods = clone(FOOD_CATALOG);

  return {
    schemaVersion: 'app-bootstrap-v1',
    source: 'mock',
    fixtureVersion: '2026.08.15',
    data: {
      schemaVersion: 'app-state-v1',
      onboardingRequired: true,
      profile: {
        userId: 'demo-user-01',
        displayName: '食练格用户',
        avatarText: '食',
        goalLabel: '未设置',
        units: 'metric',
        latestWeightKg: 0,
      },
      nutritionPlan: {
        planVersionId: 'nutrition-plan-demo-01',
        status: 'active',
        effectiveFromLocalDate: localDate,
        targets: { calories: 1800, protein: 120, carbs: 210, fat: 60 },
        mealBudgets: MEAL_BUDGETS.map(({ id, label, ratio }) => ({ id, label, ratio: `${Math.round(ratio * 100)}%` })),
      },
      foodCatalog: foods,
      customFoods: [],
      mealsByDate: {
        [localDate]: {
          breakfast: [],
          lunch: [],
          dinner: [],
          snack: [],
        },
      },
      deletedMealEntries: {},
      favorites: [],
      workout: {
        sessionId: 'workout-session-demo-01',
        title: '上肢 A',
        active: false,
        completed: false,
        completedAt: null,
        exercises: [
          { id: 'bench', name: '杠铃卧推', note: '目标 4 组 · 8 次', sets: [{ id: 'bench-1', weight: 45, reps: 8, done: false }, { id: 'bench-2', weight: 45, reps: 8, done: false }, { id: 'bench-3', weight: 45, reps: 8, done: false }, { id: 'bench-4', weight: 45, reps: 8, done: false }] },
          { id: 'row', name: '坐姿划船', note: '目标 3 组 · 10 次', sets: [{ id: 'row-1', weight: 40, reps: 10, done: false }, { id: 'row-2', weight: 40, reps: 10, done: false }, { id: 'row-3', weight: 40, reps: 10, done: false }] },
          { id: 'press', name: '哑铃肩推', note: '目标 3 组 · 10 次', sets: [{ id: 'press-1', weight: 12, reps: 10, done: false }, { id: 'press-2', weight: 12, reps: 10, done: false }, { id: 'press-3', weight: 12, reps: 10, done: false }] },
        ],
      },
      trainingPlan: {
        planVersionId: 'training-plan-demo-01',
        status: 'active',
        effectiveFromLocalDate: localDate,
        daysPerWeek: 4,
        title: '上/下肢四练',
        sessionMinutes: 50,
        place: '健身房',
        sessions: ['上肢 A', '下肢 A', '上肢 B', '下肢 B'],
      },
      trainingTemplates: [
        { id: 'upper-a', name: '上肢 A', detail: '卧推、划船、肩推 · 10 组' },
        { id: 'lower-a', name: '下肢 A', detail: '深蹲、硬拉、箭步蹲 · 11 组' },
        { id: 'upper-b', name: '上肢 B', detail: '上斜推、下拉、侧平举 · 12 组' },
      ],
      trainingTemplateOptions: ['全身 A', '全身 B', '全身 C', '上肢 A', '下肢 A', '上肢 B', '下肢 B', '推', '拉', '腿', '上肢', '下肢', '轻有氧'],
      trends: {
        periodLabel: '本周',
        dietAverageKcal: 0,
        validDietDays: 0,
        diet: [{ day: '一', value: null }, { day: '二', value: null }, { day: '三', value: null }, { day: '四', value: null }, { day: '五', value: null }, { day: '六', value: null }, { day: '日', value: null }],
        training: { completedSessions: 0, durationMinutes: 0, completedSets: 0 },
        weight: { latestKg: 0, deltaKg: 0 },
      },
      consents: { healthProfileProcessing: false, cloudBackup: false },
      backup: { state: 'local-only', lastSuccessfulLabel: '尚未备份' },
    },
  };
}

function stableProfileHash(profile: OnboardingProfile): string {
  const source = JSON.stringify(profile, Object.keys(profile).sort());
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildMockPlanResponse(profile: OnboardingProfile): PlanSuggestionResponse {
  const policy = MOCK_PLAN_POLICY;
  const targetWeight = profile.goal === 'maintain' ? profile.currentWeight : profile.targetWeight;
  const sexAdjustment = profile.sex === 'male' ? 5 : -161;
  const bmr = (10 * profile.currentWeight) + (6.25 * profile.height) - (5 * profile.age) + sexAdjustment;
  const rawCalories = bmr * policy.activityFactors[profile.activity] * policy.goalFactors[profile.goal];
  const calories = Math.round(Math.min(policy.maximumCalories, Math.max(policy.minimumCalories[profile.sex], rawCalories)) / 10) * 10;
  const proteinRate = profile.goal === 'maintain' ? policy.proteinPerKg.maintain : policy.proteinPerKg.activeGoal;
  const protein = Math.round(profile.currentWeight * proteinRate);
  const fat = Math.round(profile.currentWeight * policy.fatPerKg);
  const carbs = Math.max(policy.minimumCarbs, Math.round((calories - (protein * 4) - (fat * 9)) / 4));
  const weeklyChange = policy.weeklyChangeKg[profile.pace];
  const estimatedWeeks = profile.goal === 'maintain' ? 0 : Math.max(1, Math.ceil(Math.abs(profile.currentWeight - targetWeight) / weeklyChange));
  const firstThree = MEAL_BUDGETS.slice(0, -1).map((meal) => Math.round((calories * meal.ratio) / 10) * 10);
  const mealCalories = [...firstThree, calories - firstThree.reduce((sum, value) => sum + value, 0)];
  const sessions = policy.sessionPatterns[profile.trainingDays] ?? policy.sessionPatterns[3];
  const title = profile.trainingDays === 3 && profile.experience === 'beginner'
    ? '新手全身三练'
    : profile.trainingDays === 4
      ? '上/下肢四练'
      : `每周 ${profile.trainingDays} 练`;
  const place = { home: '居家', gym: '健身房', flexible: '灵活场地' }[profile.trainingPlace];

  return {
    schemaVersion: 'plan-suggestion-v1',
    source: 'mock',
    data: {
      suggestionId: `mock-suggestion-${stableProfileHash(profile)}`,
      eligible: true,
      policy: {
        clinicalPolicyVersion: policy.policyVersion,
        trainingPolicyVersion: policy.policyVersion,
        approved: false,
        environment: 'prototype',
      },
      nutritionPlanDraft: {
        targets: { calories, protein, carbs, fat },
        estimatedWeeks,
        meals: MEAL_BUDGETS.map((meal, index) => ({
          id: meal.id,
          label: meal.label,
          calories: mealCalories[index],
          ratio: `${Math.round(meal.ratio * 100)}%`,
        })),
      },
      trainingPlanDraft: {
        daysPerWeek: profile.trainingDays,
        title,
        sessionMinutes: profile.sessionMinutes,
        place,
        sessions: clone(sessions),
      },
    },
  };
}

export function buildMockActivationResult(payload: ActivatePlanInput): ActivatePlanResult {
  return {
    targets: clone(payload.targets),
    currentWeightKg: payload.currentWeightKg,
    trainingPlan: {
      ...clone(payload.trainingPlan),
      planVersionId: `training-${payload.suggestionId}`,
      status: 'active',
      effectiveFromLocalDate: getLocalDate(),
    },
  };
}
