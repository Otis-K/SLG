import { z } from 'zod';
import { getLocalDate } from '../config/frontendConfig';
import type {
  AppState,
  BootstrapResponse,
  DataSourceMode,
  PlanSuggestion,
  PlanSuggestionResponse,
} from '../domain/types';

export class DataSourceError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(
    message: string,
    options: { code?: string; status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'DataSourceError';
    this.code = options.code ?? 'DATA_SOURCE_ERROR';
    this.status = options.status ?? 0;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
  }
}

const nonNegative = z.number().finite().nonnegative();
const mealId = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
const planStatus = z.enum(['draft', 'active', 'archived']);
const foodTone = z.enum(['yellow', 'coral', 'blue', 'green', 'orange', 'neutral']);

const nutritionSchema = z.object({
  calories: nonNegative,
  protein: nonNegative,
  carbs: nonNegative,
  fat: nonNegative,
});

const foodSchema = nutritionSchema.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  detail: z.string(),
  unit: z.string().min(1),
  amount: z.number().finite().positive(),
  tone: foodTone,
  favorite: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});

const foodEntrySchema = foodSchema.extend({
  entryId: z.string().min(1),
  mealId,
  localDate: z.string().min(1),
  recordedAt: z.string().min(1),
  deletedAt: z.string().nullable().optional(),
});

const dayMealsSchema = z.object({
  breakfast: z.array(foodEntrySchema),
  lunch: z.array(foodEntrySchema),
  dinner: z.array(foodEntrySchema),
  snack: z.array(foodEntrySchema),
});

const trainingPlanDraftSchema = z.object({
  daysPerWeek: z.number().int().min(1).max(7),
  title: z.string().min(1),
  sessionMinutes: z.number().int().positive(),
  place: z.string().min(1),
  sessions: z.array(z.string().min(1)),
});

const bootstrapDataSchema = z.object({
  schemaVersion: z.literal('app-state-v1'),
  onboardingRequired: z.boolean(),
  profile: z.object({
    userId: z.string().min(1),
    displayName: z.string().min(1),
    avatarText: z.string().min(1),
    goalLabel: z.string(),
    units: z.enum(['metric', 'imperial']),
    latestWeightKg: nonNegative,
    targetWeightKg: nonNegative.optional(),
    age: z.number().int().optional(),
    sex: z.enum(['male', 'female']).optional(),
    heightCm: nonNegative.optional(),
    goal: z.enum(['lose', 'maintain', 'gain']).optional(),
    pace: z.enum(['gentle', 'steady']).optional(),
    activity: z.enum(['sedentary', 'light', 'moderate', 'high']).optional(),
    experience: z.enum(['beginner', 'regular', 'advanced']).optional(),
    trainingDays: z.number().int().min(1).max(7).optional(),
    trainingPlace: z.enum(['home', 'gym', 'flexible']).optional(),
    sessionMinutes: z.number().int().positive().optional(),
  }),
  nutritionPlan: z.object({
    planVersionId: z.string().min(1),
    status: planStatus,
    effectiveFromLocalDate: z.string().min(1),
    targets: nutritionSchema,
    mealBudgets: z.array(z.object({ id: mealId, label: z.string().min(1), ratio: z.string().min(1) })),
  }),
  foodCatalog: z.array(foodSchema),
  customFoods: z.array(foodSchema),
  mealsByDate: z.record(z.string(), dayMealsSchema),
  deletedMealEntries: z.record(z.string(), foodEntrySchema),
  favorites: z.array(z.string()),
  workout: z.object({
    sessionId: z.string().min(1),
    title: z.string().min(1),
    active: z.boolean(),
    completed: z.boolean(),
    completedAt: z.string().nullable().optional(),
    exercises: z.array(z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      note: z.string(),
      sets: z.array(z.object({
        id: z.string().min(1),
        weight: nonNegative,
        reps: nonNegative,
        done: z.boolean(),
      })),
    })),
  }),
  trainingPlan: trainingPlanDraftSchema.extend({
    planVersionId: z.string().min(1),
    status: planStatus,
    effectiveFromLocalDate: z.string().min(1),
  }),
  trainingTemplates: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), detail: z.string() })),
  trainingTemplateOptions: z.array(z.string().min(1)),
  trends: z.object({
    periodLabel: z.string(),
    dietAverageKcal: nonNegative,
    validDietDays: z.number().int().nonnegative(),
    diet: z.array(z.object({ day: z.string().min(1), value: nonNegative.nullable() })).length(7),
    training: z.object({
      completedSessions: z.number().int().nonnegative(),
      durationMinutes: z.number().int().nonnegative(),
      completedSets: z.number().int().nonnegative(),
    }),
    weight: z.object({ latestKg: nonNegative, deltaKg: z.number().finite() }),
  }),
  consents: z.object({ healthProfileProcessing: z.boolean(), cloudBackup: z.boolean() }),
  backup: z.object({
    state: z.enum(['synced', 'syncing', 'failed', 'local-only']),
    lastSuccessfulLabel: z.string(),
  }),
});

const dataSourceInfoSchema = z.object({
  mode: z.enum(['mock', 'api']),
  schemaVersion: z.literal('app-bootstrap-v1'),
  fixtureVersion: z.string().nullable(),
  requestId: z.string().nullable(),
});

const appStateSchema = bootstrapDataSchema.extend({ dataSource: dataSourceInfoSchema });

const bootstrapResponseSchema = z.object({
  schemaVersion: z.literal('app-bootstrap-v1'),
  source: z.enum(['mock', 'api']),
  fixtureVersion: z.string().optional(),
  requestId: z.string().optional(),
  data: bootstrapDataSchema,
});

const planSuggestionResponseSchema = z.object({
  schemaVersion: z.literal('plan-suggestion-v1'),
  source: z.enum(['mock', 'api']),
  requestId: z.string().optional(),
  data: z.object({
    suggestionId: z.string().min(1),
    eligible: z.literal(true),
    nutritionPlanDraft: z.object({
      targets: nutritionSchema,
      estimatedWeeks: z.number().int().nonnegative(),
      meals: z.array(z.object({
        id: mealId,
        label: z.string().min(1),
        calories: nonNegative,
        ratio: z.string().min(1),
      })).length(4),
    }),
    trainingPlanDraft: trainingPlanDraftSchema,
    policy: z.object({
      clinicalPolicyVersion: z.string().min(1),
      trainingPolicyVersion: z.string().min(1),
      approved: z.boolean(),
      environment: z.string().min(1),
    }),
  }),
});

function payloadError(kind: string, error: z.ZodError): DataSourceError {
  const issue = error.issues[0];
  const path = issue?.path.length ? `（${issue.path.join('.')}）` : '';
  return new DataSourceError(`${kind}数据契约错误${path}：${issue?.message ?? '结构无效'}`, {
    code: 'INVALID_PAYLOAD',
    cause: error,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeBootstrapWireResponse(response: unknown): unknown {
  if (!isRecord(response) || !isRecord(response.data)) return response;
  const normalized = cloneData(response) as Record<string, unknown>;
  const data = normalized.data as Record<string, unknown>;
  const nutritionPlan = isRecord(data.nutritionPlan) ? data.nutritionPlan : {};
  const localDate = typeof nutritionPlan.effectiveFromLocalDate === 'string'
    ? nutritionPlan.effectiveFromLocalDate
    : getLocalDate();

  data.schemaVersion ??= 'app-state-v1';
  const profile = isRecord(data.profile) ? data.profile : {};
  const consents = isRecord(data.consents) ? data.consents : {};
  const hasCompleteProfile = typeof profile.age === 'number'
    && (profile.sex === 'male' || profile.sex === 'female')
    && typeof profile.heightCm === 'number'
    && typeof profile.latestWeightKg === 'number'
    && typeof profile.targetWeightKg === 'number';
  data.onboardingRequired ??= !(hasCompleteProfile && consents.healthProfileProcessing === true);
  data.customFoods ??= [];
  data.deletedMealEntries ??= {};

  const foodCatalog = Array.isArray(data.foodCatalog) ? data.foodCatalog : [];
  data.favorites ??= foodCatalog
    .filter((food) => isRecord(food) && food.favorite === true)
    .map((food) => (food as Record<string, unknown>).id)
    .filter((id): id is string => typeof id === 'string');

  if (!data.mealsByDate && isRecord(data.meals)) {
    const legacyMeals = data.meals;
    const mealIds = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
    const day = Object.fromEntries(mealIds.map((mealId) => {
      const items = Array.isArray(legacyMeals[mealId]) ? legacyMeals[mealId] as unknown[] : [];
      return [mealId, items.map((item, index) => {
        if (!isRecord(item)) return item;
        return {
          ...item,
          entryId: typeof item.entryId === 'string'
            ? item.entryId
            : `legacy-${localDate}-${mealId}-${String(item.id ?? index)}`,
          mealId,
          localDate,
          recordedAt: typeof item.recordedAt === 'string'
            ? item.recordedAt
            : `${localDate}T12:00:00.000Z`,
          deletedAt: item.deletedAt ?? null,
        };
      })];
    }));
    data.mealsByDate = { [localDate]: day };
  }

  if (isRecord(data.trainingPlan)) {
    data.trainingPlan.effectiveFromLocalDate ??= localDate;
  }
  if (isRecord(data.workout)) data.workout.completedAt ??= null;
  return normalized;
}

function normalizePlanWireResponse(response: unknown): unknown {
  if (!isRecord(response) || !isRecord(response.data)) return response;
  const normalized = cloneData(response) as Record<string, unknown>;
  const data = normalized.data as Record<string, unknown>;
  const nutritionDraft = isRecord(data.nutritionPlanDraft) ? data.nutritionPlanDraft : null;
  if (!nutritionDraft || !Array.isArray(nutritionDraft.meals)) return normalized;
  const mealIds = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
  nutritionDraft.meals = nutritionDraft.meals.map((meal, index) => (
    isRecord(meal) ? { ...meal, id: meal.id ?? mealIds[index] } : meal
  ));
  return normalized;
}

export function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function validateBootstrapResponse(response: unknown, expectedSource: DataSourceMode): AppState {
  const parsed = bootstrapResponseSchema.safeParse(normalizeBootstrapWireResponse(response));
  if (!parsed.success) throw payloadError('启动', parsed.error);
  if (parsed.data.source !== expectedSource) {
    throw new DataSourceError(`启动数据来源应为 ${expectedSource}`, { code: 'INVALID_PAYLOAD' });
  }

  const duplicateFoodIds = new Set(parsed.data.data.foodCatalog.map((food) => food.id)).size
    !== parsed.data.data.foodCatalog.length;
  if (duplicateFoodIds) {
    throw new DataSourceError('启动数据契约错误：食物 ID 必须唯一', { code: 'INVALID_PAYLOAD' });
  }

  return cloneData({
    ...parsed.data.data,
    dataSource: {
      mode: expectedSource,
      schemaVersion: parsed.data.schemaVersion,
      fixtureVersion: parsed.data.fixtureVersion ?? null,
      requestId: parsed.data.requestId ?? null,
    },
  });
}

export function validatePlanSuggestionResponse(
  response: unknown,
  expectedSource: DataSourceMode,
): PlanSuggestion {
  const parsed = planSuggestionResponseSchema.safeParse(normalizePlanWireResponse(response));
  if (!parsed.success) throw payloadError('计划', parsed.error);
  if (parsed.data.source !== expectedSource) {
    throw new DataSourceError(`计划数据来源应为 ${expectedSource}`, { code: 'INVALID_PAYLOAD' });
  }

  const draft = parsed.data.data;
  return cloneData({
    suggestionId: draft.suggestionId,
    targets: draft.nutritionPlanDraft.targets,
    estimatedWeeks: draft.nutritionPlanDraft.estimatedWeeks,
    meals: draft.nutritionPlanDraft.meals,
    training: draft.trainingPlanDraft,
    policy: draft.policy,
  });
}

export function validatePersistedAppState(value: unknown): AppState {
  const parsed = appStateSchema.safeParse(value);
  if (!parsed.success) throw payloadError('本地', parsed.error);
  return cloneData(parsed.data);
}

export type ValidBootstrapResponse = BootstrapResponse;
export type ValidPlanSuggestionResponse = PlanSuggestionResponse;
