import * as Crypto from 'expo-crypto';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createEmptyDayMeals, getLocalDate } from '../config/frontendConfig';
import type {
  ActivatePlanInput,
  ActivatePlanResult,
  AppDataSource,
  AppLoadStatus,
  AppState,
  BackupState,
  Consents,
  Food,
  FoodEntry,
  MealEntryPatch,
  MealId,
  NewCustomFood,
  NutritionValues,
  OnboardingProfile,
  PlanSuggestion,
  TrainingPlan,
  TrainingPlanDraft,
  WorkoutSet,
  WorkoutSetPatch,
} from '../domain/types';
import { cloneData, DataSourceError } from '../data/contracts';
import { appDataSource } from '../data/dataSource';
import { appRepository, type AppRepository } from '../data/repository';

export interface AppContextValue {
  status: AppLoadStatus;
  error: Error | null;
  retry: () => Promise<void>;
  data: AppState | null;
  mode: AppDataSource['mode'];
  label: string;
  previewPlan: (profile: OnboardingProfile) => Promise<PlanSuggestion>;
  activatePlan: (input: ActivatePlanInput) => Promise<ActivatePlanResult>;
  addMealEntry: (
    localDate: string,
    mealId: MealId,
    food: Food,
    amount?: number,
    unit?: string,
  ) => Promise<FoodEntry>;
  updateMealEntry: (
    localDate: string,
    mealId: MealId,
    entryId: string,
    patch: MealEntryPatch,
  ) => Promise<void>;
  deleteMealEntry: (localDate: string, mealId: MealId, entryId: string) => Promise<FoodEntry | null>;
  restoreMealEntry: (entryOrId: FoodEntry | string) => Promise<void>;
  toggleFavorite: (foodId: string) => Promise<void>;
  addCustomFood: (input: NewCustomFood) => Promise<Food>;
  saveWeight: (weightKg: number) => Promise<void>;
  updateWorkoutSet: (exerciseId: string, setId: string, patch: WorkoutSetPatch) => Promise<void>;
  toggleWorkoutSet: (exerciseId: string, setId: string) => Promise<void>;
  addWorkoutSet: (exerciseId: string) => Promise<WorkoutSet>;
  deleteWorkoutSet: (exerciseId: string, setId: string) => Promise<WorkoutSet | null>;
  startWorkout: () => Promise<void>;
  completeWorkout: () => Promise<void>;
  updateNutritionTargets: (targets: NutritionValues, effectiveFromLocalDate?: string) => Promise<void>;
  updateTrainingPlan: (
    plan: TrainingPlanDraft | TrainingPlan,
    effectiveFromLocalDate?: string,
  ) => Promise<void>;
  updateConsents: (
    patch: Partial<Consents>,
    options?: { completeOnboarding?: boolean; profile?: OnboardingProfile },
  ) => Promise<void>;
  setBackupState: (state: BackupState, lastSuccessfulLabel?: string) => Promise<void>;
  resetAll: () => Promise<void>;
}

type AppProviderProps = {
  children: ReactNode;
  source?: AppDataSource;
  repository?: AppRepository;
};

const AppContext = createContext<AppContextValue | null>(null);

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function assertPositiveFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DataSourceError(`${label}必须是大于 0 的数字`, { code: 'INVALID_INPUT' });
  }
}

function assertNonNegativeFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new DataSourceError(`${label}不能小于 0`, { code: 'INVALID_INPUT' });
  }
}

function applyOnboardingProfile(next: AppState, profile: OnboardingProfile) {
  next.profile.age = profile.age;
  next.profile.sex = profile.sex;
  next.profile.heightCm = profile.height;
  next.profile.latestWeightKg = profile.currentWeight;
  next.profile.targetWeightKg = profile.targetWeight;
  next.profile.goal = profile.goal;
  next.profile.pace = profile.pace;
  next.profile.activity = profile.activity;
  next.profile.experience = profile.experience;
  next.profile.trainingDays = profile.trainingDays;
  next.profile.trainingPlace = profile.trainingPlace;
  next.profile.sessionMinutes = profile.sessionMinutes;
  next.profile.goalLabel = profile.goal === 'lose'
    ? '减脂'
    : profile.goal === 'gain'
      ? '增肌'
      : '保持体重';
  next.trends.weight.latestKg = profile.currentWeight;
  next.trends.weight.deltaKg = 0;
}

export function AppProvider({
  children,
  source = appDataSource,
  repository = appRepository,
}: AppProviderProps) {
  const [status, setStatus] = useState<AppLoadStatus>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<AppState | null>(null);
  const dataRef = useRef<AppState | null>(null);
  const mutationQueue = useRef<Promise<unknown>>(Promise.resolve());
  const suggestions = useRef(new Map<string, PlanSuggestion>());
  const mounted = useRef(true);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const publish = useCallback((next: AppState | null) => {
    dataRef.current = next;
    if (mounted.current) setData(next);
  }, []);

  const load = useCallback(async () => {
    if (mounted.current) {
      setStatus('loading');
      setError(null);
    }

    try {
      await repository.initialize();
      const persisted = await repository.load();
      const next = persisted?.dataSource.mode === source.mode
        ? persisted
        : await source.loadAppData();

      if (persisted !== next) await repository.save(next);
      publish(next);
      if (mounted.current) setStatus('ready');
    } catch (cause) {
      const nextError = asError(cause);
      publish(null);
      if (mounted.current) {
        setError(nextError);
        setStatus('error');
      }
      throw nextError;
    }
  }, [publish, repository, source]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const retry = useCallback(async () => {
    await load();
  }, [load]);

  const commit = useCallback(<T,>(mutate: (current: AppState) => { next: AppState; result: T }): Promise<T> => {
    const operation = mutationQueue.current
      .catch(() => undefined)
      .then(async () => {
        const current = dataRef.current;
        if (!current) {
          throw new DataSourceError('业务数据尚未就绪', { code: 'STATE_NOT_READY', retryable: true });
        }
        const { next, result } = mutate(current);
        await repository.save(next);
        publish(next);
        return result;
      });
    mutationQueue.current = operation.then(() => undefined, () => undefined);
    return operation;
  }, [publish, repository]);

  const previewPlan = useCallback(async (profile: OnboardingProfile) => {
    const suggestion = await source.previewPlans(profile);
    suggestions.current.set(suggestion.suggestionId, suggestion);
    return suggestion;
  }, [source]);

  const activatePlan = useCallback(async (input: ActivatePlanInput) => {
    const activated = await source.activatePlans(input);
    const suggestion = suggestions.current.get(input.suggestionId);

    return commit((current) => {
      const next = cloneData(current);
      const effectiveFromLocalDate = activated.trainingPlan.effectiveFromLocalDate ?? getLocalDate();
      next.nutritionPlan = {
        ...next.nutritionPlan,
        planVersionId: `nutrition-${input.suggestionId}`,
        status: 'active',
        effectiveFromLocalDate,
        targets: cloneData(activated.targets),
        mealBudgets: suggestion?.meals.map(({ id, label, ratio }) => ({ id, label, ratio }))
          ?? next.nutritionPlan.mealBudgets,
      };
      next.trainingPlan = cloneData(activated.trainingPlan);
      next.profile.latestWeightKg = activated.currentWeightKg;
      next.trends.weight.latestKg = activated.currentWeightKg;
      if (input.profile) {
        applyOnboardingProfile(next, input.profile);
      }
      next.consents.healthProfileProcessing = true;
      next.onboardingRequired = false;
      return { next, result: activated };
    });
  }, [commit, source]);

  const addMealEntry = useCallback(async (
    localDate: string,
    mealId: MealId,
    food: Food,
    amount = food.amount,
    unit = food.unit,
  ) => {
    assertPositiveFinite(amount, '份量');
    const ratio = amount / food.amount;
    const entry: FoodEntry = {
      ...cloneData(food),
      entryId: Crypto.randomUUID(),
      mealId,
      localDate,
      recordedAt: new Date().toISOString(),
      deletedAt: null,
      amount,
      unit,
      detail: `${amount} ${unit}`,
      calories: food.calories * ratio,
      protein: food.protein * ratio,
      carbs: food.carbs * ratio,
      fat: food.fat * ratio,
    };

    return commit((current) => {
      const next = cloneData(current);
      const day = next.mealsByDate[localDate] ?? createEmptyDayMeals();
      next.mealsByDate[localDate] = { ...day, [mealId]: [...day[mealId], entry] };
      return { next, result: cloneData(entry) };
    });
  }, [commit]);

  const updateMealEntry = useCallback(async (
    localDate: string,
    mealId: MealId,
    entryId: string,
    patch: MealEntryPatch,
  ) => {
    if (patch.amount !== undefined) assertPositiveFinite(patch.amount, '份量');
    await commit((current) => {
      const next = cloneData(current);
      const day = next.mealsByDate[localDate];
      const index = day?.[mealId].findIndex((item) => item.entryId === entryId) ?? -1;
      if (!day || index < 0) {
        throw new DataSourceError('找不到要修改的饮食记录', { code: 'MEAL_ENTRY_NOT_FOUND' });
      }

      const previous = day[mealId][index];
      const updatedAmount = patch.amount ?? previous.amount;
      const ratio = updatedAmount / previous.amount;
      const hasExplicitNutrition = ['calories', 'protein', 'carbs', 'fat'].some((key) => key in patch);
      const updated: FoodEntry = {
        ...previous,
        ...patch,
        amount: updatedAmount,
        detail: patch.detail ?? `${updatedAmount} ${patch.unit ?? previous.unit}`,
        ...(patch.amount !== undefined && !hasExplicitNutrition ? {
          calories: previous.calories * ratio,
          protein: previous.protein * ratio,
          carbs: previous.carbs * ratio,
          fat: previous.fat * ratio,
        } : {}),
      };
      day[mealId][index] = updated;
      return { next, result: undefined };
    });
  }, [commit]);

  const deleteMealEntry = useCallback(async (localDate: string, mealId: MealId, entryId: string) => {
    return commit((current) => {
      const next = cloneData(current);
      const day = next.mealsByDate[localDate];
      const index = day?.[mealId].findIndex((item) => item.entryId === entryId) ?? -1;
      if (!day || index < 0) return { next, result: null };
      const [removed] = day[mealId].splice(index, 1);
      next.deletedMealEntries[entryId] = { ...removed, deletedAt: new Date().toISOString() };
      return { next, result: cloneData(removed) };
    });
  }, [commit]);

  const restoreMealEntry = useCallback(async (entryOrId: FoodEntry | string) => {
    await commit((current) => {
      const next = cloneData(current);
      const restored = typeof entryOrId === 'string'
        ? next.deletedMealEntries[entryOrId]
        : entryOrId;
      if (!restored) return { next, result: undefined };
      const day = next.mealsByDate[restored.localDate] ?? createEmptyDayMeals();
      if (!day[restored.mealId].some((item) => item.entryId === restored.entryId)) {
        day[restored.mealId].push({ ...cloneData(restored), deletedAt: null });
      }
      next.mealsByDate[restored.localDate] = day;
      delete next.deletedMealEntries[restored.entryId];
      return { next, result: undefined };
    });
  }, [commit]);

  const toggleFavorite = useCallback(async (foodId: string) => {
    await commit((current) => {
      const next = cloneData(current);
      const favorite = !next.favorites.includes(foodId);
      next.favorites = favorite
        ? [...next.favorites, foodId]
        : next.favorites.filter((id) => id !== foodId);
      next.foodCatalog = next.foodCatalog.map((food) => food.id === foodId ? { ...food, favorite } : food);
      next.customFoods = next.customFoods.map((food) => food.id === foodId ? { ...food, favorite } : food);
      return { next, result: undefined };
    });
  }, [commit]);

  const addCustomFood = useCallback(async (input: NewCustomFood) => {
    const name = input.name.trim();
    if (!name) throw new DataSourceError('请输入食物名称', { code: 'INVALID_INPUT' });
    assertPositiveFinite(input.amount, '标准份量');
    assertNonNegativeFinite(input.calories, '能量');
    assertNonNegativeFinite(input.protein, '蛋白质');
    assertNonNegativeFinite(input.carbs, '碳水');
    assertNonNegativeFinite(input.fat, '脂肪');
    const food: Food = {
      ...input,
      id: `custom-${Crypto.randomUUID()}`,
      name,
      detail: `${input.amount} ${input.unit} · 私人食物`,
      tone: input.tone ?? 'green',
      favorite: false,
      isCustom: true,
    };
    return commit((current) => {
      const next = cloneData(current);
      next.customFoods.push(food);
      return { next, result: cloneData(food) };
    });
  }, [commit]);

  const saveWeight = useCallback(async (weightKg: number) => {
    assertPositiveFinite(weightKg, '体重');
    await commit((current) => {
      const next = cloneData(current);
      const previous = next.trends.weight.latestKg;
      next.profile.latestWeightKg = weightKg;
      next.trends.weight.latestKg = weightKg;
      next.trends.weight.deltaKg = Number((weightKg - previous).toFixed(1));
      return { next, result: undefined };
    });
  }, [commit]);

  const updateWorkoutSet = useCallback(async (exerciseId: string, setId: string, patch: WorkoutSetPatch) => {
    if (patch.weight !== undefined) assertNonNegativeFinite(patch.weight, '重量');
    if (patch.reps !== undefined) assertNonNegativeFinite(patch.reps, '次数');
    await commit((current) => {
      const next = cloneData(current);
      const exercise = next.workout.exercises.find((item) => item.id === exerciseId);
      const set = exercise?.sets.find((item) => item.id === setId);
      if (!set) throw new DataSourceError('找不到训练组', { code: 'WORKOUT_SET_NOT_FOUND' });
      Object.assign(set, patch);
      next.workout.active = true;
      return { next, result: undefined };
    });
  }, [commit]);

  const toggleWorkoutSet = useCallback(async (exerciseId: string, setId: string) => {
    await commit((current) => {
      const next = cloneData(current);
      const target = next.workout.exercises
        .find((exercise) => exercise.id === exerciseId)?.sets
        .find((set) => set.id === setId);
      if (!target) throw new DataSourceError('找不到训练组', { code: 'WORKOUT_SET_NOT_FOUND' });
      target.done = !target.done;
      next.workout.active = true;
      return { next, result: undefined };
    });
  }, [commit]);

  const addWorkoutSet = useCallback(async (exerciseId: string) => {
    return commit((current) => {
      const next = cloneData(current);
      const exercise = next.workout.exercises.find((item) => item.id === exerciseId);
      if (!exercise) throw new DataSourceError('找不到训练动作', { code: 'WORKOUT_EXERCISE_NOT_FOUND' });
      const previous = exercise.sets.at(-1);
      const set: WorkoutSet = {
        id: Crypto.randomUUID(),
        weight: previous?.weight ?? 0,
        reps: previous?.reps ?? 10,
        done: false,
      };
      exercise.sets.push(set);
      next.workout.active = true;
      return { next, result: cloneData(set) };
    });
  }, [commit]);

  const deleteWorkoutSet = useCallback(async (exerciseId: string, setId: string) => {
    return commit((current) => {
      const next = cloneData(current);
      const exercise = next.workout.exercises.find((item) => item.id === exerciseId);
      const index = exercise?.sets.findIndex((item) => item.id === setId) ?? -1;
      if (!exercise || index < 0) return { next, result: null };
      const [removed] = exercise.sets.splice(index, 1);
      next.workout.active = true;
      return { next, result: cloneData(removed) };
    });
  }, [commit]);

  const startWorkout = useCallback(async () => {
    await commit((current) => {
      const next = cloneData(current);
      const sessions = next.trainingPlan.sessions;
      const nextSessionIndex = sessions.length
        ? next.trends.training.completedSessions % sessions.length
        : 0;
      next.workout.sessionId = Crypto.randomUUID();
      next.workout.title = sessions[nextSessionIndex] ?? next.workout.title;
      next.workout.active = true;
      next.workout.completed = false;
      next.workout.completedAt = null;
      next.workout.exercises.forEach((exercise) => {
        exercise.sets.forEach((set) => {
          set.id = Crypto.randomUUID();
          set.done = false;
        });
      });
      return { next, result: undefined };
    });
  }, [commit]);

  const completeWorkout = useCallback(async () => {
    await commit((current) => {
      const next = cloneData(current);
      if (!next.workout.completed) {
        const completedSets = next.workout.exercises.reduce(
          (total, exercise) => total + exercise.sets.filter((set) => set.done).length,
          0,
        );
        next.trends.training.completedSessions += 1;
        next.trends.training.durationMinutes += next.trainingPlan.sessionMinutes;
        next.trends.training.completedSets += completedSets;
      }
      next.workout.active = false;
      next.workout.completed = true;
      next.workout.completedAt = new Date().toISOString();
      return { next, result: undefined };
    });
  }, [commit]);

  const updateNutritionTargets = useCallback(async (
    targets: NutritionValues,
    effectiveFromLocalDate = getLocalDate(),
  ) => {
    Object.entries(targets).forEach(([key, value]) => assertNonNegativeFinite(value, key));
    await commit((current) => {
      const next = cloneData(current);
      next.nutritionPlan = {
        ...next.nutritionPlan,
        planVersionId: `nutrition-${Crypto.randomUUID()}`,
        status: 'active',
        effectiveFromLocalDate,
        targets: cloneData(targets),
      };
      return { next, result: undefined };
    });
  }, [commit]);

  const updateTrainingPlan = useCallback(async (
    plan: TrainingPlanDraft | TrainingPlan,
    effectiveFromLocalDate = getLocalDate(),
  ) => {
    if (!plan.sessions.length) {
      throw new DataSourceError('训练计划至少需要一个训练日', { code: 'INVALID_INPUT' });
    }
    await commit((current) => {
      const next = cloneData(current);
      next.trainingPlan = {
        ...cloneData(plan),
        planVersionId: `training-${Crypto.randomUUID()}`,
        status: 'active',
        effectiveFromLocalDate,
      };
      return { next, result: undefined };
    });
  }, [commit]);

  const updateConsents = useCallback(async (
    patch: Partial<Consents>,
    options: { completeOnboarding?: boolean; profile?: OnboardingProfile } = {},
  ) => {
    await commit((current) => {
      const next = cloneData(current);
      const consents = { ...next.consents, ...patch };
      if (consents.cloudBackup && !consents.healthProfileProcessing) {
        throw new DataSourceError('开启云备份前必须先同意健康资料处理', { code: 'CONSENT_REQUIRED' });
      }
      if (!consents.healthProfileProcessing) {
        consents.cloudBackup = false;
        next.backup.state = 'local-only';
      }
      next.consents = consents;
      if (options.profile && consents.healthProfileProcessing) {
        applyOnboardingProfile(next, options.profile);
      }
      if (options.completeOnboarding) next.onboardingRequired = false;
      return { next, result: undefined };
    });
  }, [commit]);

  const setBackupState = useCallback(async (backupState: BackupState, lastSuccessfulLabel?: string) => {
    await commit((current) => {
      const next = cloneData(current);
      next.backup.state = next.consents.cloudBackup ? backupState : 'local-only';
      if (lastSuccessfulLabel !== undefined) next.backup.lastSuccessfulLabel = lastSuccessfulLabel;
      return { next, result: undefined };
    });
  }, [commit]);

  const resetAll = useCallback(async () => {
    if (mounted.current) {
      setStatus('loading');
      setError(null);
    }
    suggestions.current.clear();
    await mutationQueue.current.catch(() => undefined);
    try {
      await repository.clear();
      publish(null);
      const next = await source.loadAppData();
      await repository.save(next);
      publish(next);
      if (mounted.current) setStatus('ready');
    } catch (cause) {
      const nextError = asError(cause);
      if (mounted.current) {
        setError(nextError);
        setStatus(dataRef.current ? 'ready' : 'error');
      }
      throw nextError;
    }
  }, [publish, repository, source]);

  const value = useMemo<AppContextValue>(() => ({
    status,
    error,
    retry,
    data,
    mode: source.mode,
    label: source.label,
    previewPlan,
    activatePlan,
    addMealEntry,
    updateMealEntry,
    deleteMealEntry,
    restoreMealEntry,
    toggleFavorite,
    addCustomFood,
    saveWeight,
    updateWorkoutSet,
    toggleWorkoutSet,
    addWorkoutSet,
    deleteWorkoutSet,
    startWorkout,
    completeWorkout,
    updateNutritionTargets,
    updateTrainingPlan,
    updateConsents,
    setBackupState,
    resetAll,
  }), [
    activatePlan,
    addCustomFood,
    addMealEntry,
    addWorkoutSet,
    completeWorkout,
    data,
    deleteMealEntry,
    deleteWorkoutSet,
    error,
    previewPlan,
    resetAll,
    restoreMealEntry,
    retry,
    saveWeight,
    setBackupState,
    startWorkout,
    source.label,
    source.mode,
    status,
    toggleFavorite,
    toggleWorkoutSet,
    updateConsents,
    updateMealEntry,
    updateNutritionTargets,
    updateTrainingPlan,
    updateWorkoutSet,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp 必须在 AppProvider 内使用');
  return context;
}
