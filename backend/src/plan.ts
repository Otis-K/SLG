type Profile = Record<string, unknown>;

const MEAL_BUDGETS = [
  { id: 'breakfast', label: '早餐', ratio: 0.25 },
  { id: 'lunch', label: '午餐', ratio: 0.35 },
  { id: 'dinner', label: '晚餐', ratio: 0.3 },
  { id: 'snack', label: '加餐', ratio: 0.1 },
] as const;

const SESSION_PATTERNS: Record<number, string[]> = {
  2: ['全身 A', '全身 B'],
  3: ['全身 A', '全身 B', '全身 C'],
  4: ['上肢 A', '下肢 A', '上肢 B', '下肢 B'],
  5: ['推', '拉', '腿', '上肢', '下肢'],
};

function number(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function string(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function stableHash(value: Record<string, unknown>): string {
  const source = JSON.stringify(value, Object.keys(value).sort());
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createPlanSuggestion(profileInput: Record<string, unknown>) {
  const profile = profileInput as Record<string, any>;
  const currentWeight = number(profile.currentWeight, 70);
  const targetWeight = number(profile.targetWeight, currentWeight);
  const height = number(profile.height, 170);
  const age = number(profile.age, 28);
  const sex = (typeof profile.sex === 'string' ? profile.sex : 'male') as 'male' | 'female';
  const activity = string(profile.activity, 'moderate');
  const goal = string(profile.goal, 'maintain');
  const pace = string(profile.pace, 'steady');
  const trainingDays = number(profile.trainingDays, 3);
  const sessionMinutes = number(profile.sessionMinutes, 45);
  const trainingPlace = string(profile.trainingPlace, 'flexible');
  const experience = string(profile.experience, 'beginner');

  const activityFactors: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };
  const goalFactors: Record<string, number> = { lose: 0.85, maintain: 1, gain: 1.1 };
  const weeklyChangeKg: Record<string, number> = { gentle: 0.25, steady: 0.5 };
  const sexAdjustment = sex === 'male' ? 5 : -161;
  const bmr = 10 * currentWeight + 6.25 * height - 5 * age + sexAdjustment;
  const rawCalories = bmr * (activityFactors[activity] ?? 1.375) * (goalFactors[goal] ?? 1);
  const calories = Math.round(Math.min(3200, Math.max(sex === 'male' ? 1500 : 1200, rawCalories)) / 10) * 10;
  const proteinRate = goal === 'maintain' ? 1.4 : 1.6;
  const protein = Math.round(currentWeight * proteinRate);
  const fat = Math.round(currentWeight * 0.8);
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));
  const effectiveTargetWeight = goal === 'maintain' ? currentWeight : targetWeight;
  const weeklyChange = weeklyChangeKg[pace] ?? 0.5;
  const estimatedWeeks = goal === 'maintain'
    ? 0
    : Math.max(1, Math.ceil(Math.abs(currentWeight - effectiveTargetWeight) / weeklyChange));
  const firstThree = MEAL_BUDGETS.slice(0, -1).map((meal) => Math.round((calories * meal.ratio) / 10) * 10);
  const mealCalories = [...firstThree, calories - firstThree.reduce((sum, value) => sum + value, 0)];
  const sessions = SESSION_PATTERNS[trainingDays] ?? SESSION_PATTERNS[3];
  const place = ({ home: '居家', gym: '健身房', flexible: '灵活场地' } as Record<string, string>)[trainingPlace] ?? '灵活场地';
  const title = trainingDays === 3 && experience === 'beginner'
    ? '新手全身三练'
    : trainingDays === 4
      ? '上/下肢四练'
      : `每周 ${trainingDays} 练`;

  return {
    schemaVersion: 'plan-suggestion-v1',
    source: 'api',
    requestId: `req-${Date.now()}`,
    data: {
      suggestionId: `api-suggestion-${stableHash(profile)}`,
      eligible: true,
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
        daysPerWeek: trainingDays,
        title,
        sessionMinutes,
        place,
        sessions,
      },
      policy: {
        clinicalPolicyVersion: 'backend-local-2026.09',
        trainingPolicyVersion: 'backend-local-2026.09',
        approved: true,
        environment: 'local-mysql',
      },
    },
  };
}

export function createActivationResult(payload: Record<string, any>) {
  const trainingPlan = typeof payload.trainingPlan === 'object' && payload.trainingPlan ? payload.trainingPlan : {
    daysPerWeek: 3,
    title: '新手全身三练',
    sessionMinutes: 45,
    place: '灵活场地',
    sessions: ['全身 A', '全身 B', '全身 C'],
  };
  const today = new Date();
  const localDate = today.toISOString().slice(0, 10);
  return {
    targets: payload.targets ?? { calories: 1800, protein: 120, carbs: 210, fat: 60 },
    currentWeightKg: typeof payload.currentWeightKg === 'number' ? payload.currentWeightKg : 70,
    trainingPlan: {
      ...trainingPlan,
      planVersionId: `training-${payload.suggestionId ?? 'unknown'}`,
      status: 'active',
      effectiveFromLocalDate: localDate,
    },
  };
}
