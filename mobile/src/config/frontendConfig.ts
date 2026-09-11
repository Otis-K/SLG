import type {
  ActivityId,
  ExperienceId,
  GoalId,
  MealId,
  PaceId,
  SexId,
  TrainingPlaceId,
} from '../domain/types';

export const MEAL_IDS = ['breakfast', 'lunch', 'dinner', 'snack'] as const satisfies readonly MealId[];

export const MEAL_META: Record<MealId, { label: string; range: string }> = {
  breakfast: { label: '早餐', range: '05:00-10:29' },
  lunch: { label: '午餐', range: '10:30-14:29' },
  dinner: { label: '晚餐', range: '17:00-21:29' },
  snack: { label: '加餐', range: '其他时间' },
};

export const WEEK_DAYS = [
  { id: 'mon', short: '一', label: '周一' },
  { id: 'tue', short: '二', label: '周二' },
  { id: 'wed', short: '三', label: '周三' },
  { id: 'thu', short: '四', label: '周四' },
  { id: 'fri', short: '五', label: '周五' },
  { id: 'sat', short: '六', label: '周六' },
  { id: 'sun', short: '日', label: '周日' },
] as const;

export const NUTRIENT_FIELDS = [
  { id: 'protein', label: '蛋白质', unit: 'g' },
  { id: 'carbs', label: '碳水', unit: 'g' },
  { id: 'fat', label: '脂肪', unit: 'g' },
] as const;

export const ONBOARDING_DEFAULTS = {
  age: '',
  sex: '' as SexId | '',
  height: '',
  currentWeight: '',
  targetWeight: '',
  goal: 'lose' as GoalId,
  pace: 'gentle' as PaceId,
  activity: '' as ActivityId | '',
  experience: '' as ExperienceId | '',
  trainingDays: 3,
  trainingPlace: '' as TrainingPlaceId | '',
  sessionMinutes: 45,
};

export const PROFILE_LIMITS = {
  age: { min: 1, max: 120, autoPlanMin: 18, autoPlanMax: 79 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 250 },
} as const;

export const SEX_OPTIONS = [
  { id: 'male' as SexId, label: '男' },
  { id: 'female' as SexId, label: '女' },
] as const;

export const GOAL_OPTIONS = [
  { id: 'lose' as GoalId, label: '减脂', summaryLabel: '减脂' },
  { id: 'maintain' as GoalId, label: '保持', summaryLabel: '保持体重' },
  { id: 'gain' as GoalId, label: '增肌', summaryLabel: '增肌' },
] as const;

export const PACE_OPTIONS = [
  { id: 'gentle' as PaceId, label: '温和' },
  { id: 'steady' as PaceId, label: '稳步' },
] as const;

export const ACTIVITY_OPTIONS = [
  { id: 'sedentary' as ActivityId, label: '久坐为主', detail: '大部分时间坐着' },
  { id: 'light' as ActivityId, label: '轻度活动', detail: '日常有走动' },
  { id: 'moderate' as ActivityId, label: '中度活动', detail: '经常走动或站立' },
  { id: 'high' as ActivityId, label: '高活动量', detail: '体力劳动为主' },
] as const;

export const EXPERIENCE_OPTIONS = [
  { id: 'beginner' as ExperienceId, label: '新手' },
  { id: 'regular' as ExperienceId, label: '有基础' },
  { id: 'advanced' as ExperienceId, label: '进阶' },
] as const;

export const TRAINING_DAY_OPTIONS = [2, 3, 4, 5] as const;

export const TRAINING_PLACE_OPTIONS = [
  { id: 'home' as TrainingPlaceId, label: '居家', planLabel: '居家' },
  { id: 'gym' as TrainingPlaceId, label: '健身房', planLabel: '健身房' },
  { id: 'flexible' as TrainingPlaceId, label: '灵活安排', planLabel: '灵活场地' },
] as const;

export const TRAINING_SESSION_MINUTES = [30, 45, 60] as const;

export const HEALTH_RISK_OPTIONS = [
  { id: 'pregnancy', label: '孕期或哺乳期' },
  { id: 'eating', label: '进食障碍风险' },
  { id: 'clinical', label: '疾病处方或康复治疗' },
  { id: 'injury', label: '当前受伤或动作禁忌' },
] as const;

export function getLocalDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createEmptyDayMeals() {
  return {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}

export function inferMeal(date = new Date()): MealId {
  const minutes = (date.getHours() * 60) + date.getMinutes();
  if (minutes >= 300 && minutes <= 629) return 'breakfast';
  if (minutes >= 630 && minutes <= 869) return 'lunch';
  if (minutes >= 1020 && minutes <= 1289) return 'dinner';
  return 'snack';
}
