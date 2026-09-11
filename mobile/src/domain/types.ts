export type DataSourceMode = 'mock' | 'api';

export type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type NutrientKey = 'protein' | 'carbs' | 'fat';
export type GoalId = 'lose' | 'maintain' | 'gain';
export type PaceId = 'gentle' | 'steady';
export type SexId = 'male' | 'female';
export type ActivityId = 'sedentary' | 'light' | 'moderate' | 'high';
export type ExperienceId = 'beginner' | 'regular' | 'advanced';
export type TrainingPlaceId = 'home' | 'gym' | 'flexible';
export type PlanStatus = 'draft' | 'active' | 'archived';
export type BackupState = 'synced' | 'syncing' | 'failed' | 'local-only';
export type FoodTone = 'yellow' | 'coral' | 'blue' | 'green' | 'orange' | 'neutral';
export type LocalDate = string;

export interface NutritionValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Food extends NutritionValues {
  id: string;
  name: string;
  detail: string;
  unit: string;
  amount: number;
  tone: FoodTone;
  favorite?: boolean;
  isCustom?: boolean;
}

export interface FoodEntry extends Food {
  entryId: string;
  mealId: MealId;
  localDate: LocalDate;
  recordedAt: string;
  deletedAt?: string | null;
}

export type DayMeals = Record<MealId, FoodEntry[]>;
export type MealsByDate = Record<LocalDate, DayMeals>;

export interface UserProfile {
  userId: string;
  displayName: string;
  avatarText: string;
  goalLabel: string;
  units: 'metric' | 'imperial';
  latestWeightKg: number;
  targetWeightKg?: number;
  age?: number;
  sex?: SexId;
  heightCm?: number;
  goal?: GoalId;
  pace?: PaceId;
  activity?: ActivityId;
  experience?: ExperienceId;
  trainingDays?: number;
  trainingPlace?: TrainingPlaceId;
  sessionMinutes?: number;
}

export interface MealBudget {
  id: MealId;
  label: string;
  ratio: string;
}

export interface NutritionPlan {
  planVersionId: string;
  status: PlanStatus;
  effectiveFromLocalDate: LocalDate;
  targets: NutritionValues;
  mealBudgets: MealBudget[];
}

export interface WorkoutSet {
  id: string;
  weight: number;
  reps: number;
  done: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  note: string;
  sets: WorkoutSet[];
}

export interface WorkoutState {
  sessionId: string;
  title: string;
  active: boolean;
  completed: boolean;
  completedAt?: string | null;
  exercises: WorkoutExercise[];
}

export interface TrainingPlan {
  planVersionId: string;
  status: PlanStatus;
  effectiveFromLocalDate: LocalDate;
  daysPerWeek: number;
  title: string;
  sessionMinutes: number;
  place: string;
  sessions: string[];
}

export interface TrainingPlanDraft {
  daysPerWeek: number;
  title: string;
  sessionMinutes: number;
  place: string;
  sessions: string[];
}

export interface TrainingTemplate {
  id: string;
  name: string;
  detail: string;
}

export interface DietTrendPoint {
  day: string;
  value: number | null;
}

export interface Trends {
  periodLabel: string;
  dietAverageKcal: number;
  validDietDays: number;
  diet: DietTrendPoint[];
  training: {
    completedSessions: number;
    durationMinutes: number;
    completedSets: number;
  };
  weight: {
    latestKg: number;
    deltaKg: number;
  };
}

export interface Consents {
  healthProfileProcessing: boolean;
  cloudBackup: boolean;
}

export interface BackupInfo {
  state: BackupState;
  lastSuccessfulLabel: string;
}

export interface DataSourceInfo {
  mode: DataSourceMode;
  schemaVersion: 'app-bootstrap-v1';
  fixtureVersion: string | null;
  requestId: string | null;
}

export interface AppState {
  schemaVersion: 'app-state-v1';
  onboardingRequired: boolean;
  profile: UserProfile;
  nutritionPlan: NutritionPlan;
  foodCatalog: Food[];
  customFoods: Food[];
  mealsByDate: MealsByDate;
  deletedMealEntries: Record<string, FoodEntry>;
  favorites: string[];
  workout: WorkoutState;
  trainingPlan: TrainingPlan;
  trainingTemplates: TrainingTemplate[];
  trainingTemplateOptions: string[];
  trends: Trends;
  consents: Consents;
  backup: BackupInfo;
  dataSource: DataSourceInfo;
}

export type BootstrapData = Omit<AppState, 'dataSource'>;

export interface BootstrapResponse {
  schemaVersion: 'app-bootstrap-v1';
  source: DataSourceMode;
  fixtureVersion?: string;
  requestId?: string;
  data: BootstrapData;
}

export interface OnboardingProfile {
  age: number;
  sex: SexId;
  height: number;
  currentWeight: number;
  targetWeight: number;
  goal: GoalId;
  pace: PaceId;
  activity: ActivityId;
  experience: ExperienceId;
  trainingDays: number;
  trainingPlace: TrainingPlaceId;
  sessionMinutes: number;
}

export interface PlanMealBudget {
  id: MealId;
  label: string;
  calories: number;
  ratio: string;
}

export interface PlanPolicy {
  clinicalPolicyVersion: string;
  trainingPolicyVersion: string;
  approved: boolean;
  environment: string;
}

export interface PlanSuggestion {
  suggestionId: string;
  targets: NutritionValues;
  estimatedWeeks: number;
  meals: PlanMealBudget[];
  training: TrainingPlanDraft;
  policy: PlanPolicy;
}

export interface PlanSuggestionResponse {
  schemaVersion: 'plan-suggestion-v1';
  source: DataSourceMode;
  requestId?: string;
  data: {
    suggestionId: string;
    eligible: true;
    nutritionPlanDraft: {
      targets: NutritionValues;
      estimatedWeeks: number;
      meals: PlanMealBudget[];
    };
    trainingPlanDraft: TrainingPlanDraft;
    policy: PlanPolicy;
  };
}

export interface ActivatePlanInput {
  suggestionId: string;
  targets: NutritionValues;
  trainingPlan: TrainingPlanDraft;
  currentWeightKg: number;
  profile?: OnboardingProfile;
}

export interface ActivatePlanResult {
  targets: NutritionValues;
  trainingPlan: TrainingPlan;
  currentWeightKg: number;
}

export interface AppDataSource {
  mode: DataSourceMode;
  label: string;
  loadAppData(options?: {
    signal?: AbortSignal;
    localDate?: LocalDate;
    timeZoneId?: string;
  }): Promise<AppState>;
  previewPlans(profile: OnboardingProfile, options?: { signal?: AbortSignal }): Promise<PlanSuggestion>;
  activatePlans(payload: ActivatePlanInput, options?: { signal?: AbortSignal }): Promise<ActivatePlanResult>;
}

export interface NewCustomFood extends NutritionValues {
  name: string;
  amount: number;
  unit: string;
  tone?: FoodTone;
}

export type MealEntryPatch = Partial<
  Pick<FoodEntry, 'amount' | 'unit' | 'calories' | 'protein' | 'carbs' | 'fat' | 'detail'>
>;

export type WorkoutSetPatch = Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'done'>>;

export type AppLoadStatus = 'loading' | 'ready' | 'error';
