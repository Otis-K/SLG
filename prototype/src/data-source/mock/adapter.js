import { cloneData, validateBootstrapResponse, validatePlanSuggestionResponse } from '../contracts.js';
import { MOCK_BOOTSTRAP_RESPONSE, MOCK_PLAN_POLICY } from './seed.js';

function delay(milliseconds) {
  return milliseconds > 0 ? new Promise((resolve) => setTimeout(resolve, milliseconds)) : Promise.resolve();
}

function buildMockPlanResponse(profile) {
  const policy = MOCK_PLAN_POLICY;
  const age = Number(profile.age);
  const height = Number(profile.height);
  const weight = Number(profile.currentWeight);
  const targetWeight = profile.goal === 'maintain' ? weight : Number(profile.targetWeight);
  const sexAdjustment = profile.sex === 'male' ? 5 : -161;
  const bmr = (10 * weight) + (6.25 * height) - (5 * age) + sexAdjustment;
  const rawCalories = bmr * policy.activityFactors[profile.activity] * policy.goalFactors[profile.goal];
  const calories = Math.round(Math.min(policy.maximumCalories, Math.max(policy.minimumCalories[profile.sex], rawCalories)) / 10) * 10;
  const proteinRate = profile.goal === 'maintain' ? policy.proteinPerKg.maintain : policy.proteinPerKg.activeGoal;
  const protein = Math.round(weight * proteinRate);
  const fat = Math.round(weight * policy.fatPerKg);
  const carbs = Math.max(policy.minimumCarbs, Math.round((calories - (protein * 4) - (fat * 9)) / 4));
  const weeklyChange = policy.weeklyChangeKg[profile.pace];
  const estimatedWeeks = profile.goal === 'maintain' ? 0 : Math.max(1, Math.ceil(Math.abs(weight - targetWeight) / weeklyChange));
  const roundedMeals = policy.mealBudgets.slice(0, -1).map((meal) => Math.round((calories * meal.ratio) / 10) * 10);
  const mealCalories = [...roundedMeals, calories - roundedMeals.reduce((sum, value) => sum + value, 0)];
  const sessions = policy.sessionPatterns[profile.trainingDays];
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
      suggestionId: `mock-suggestion-${Date.now()}`,
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
        meals: policy.mealBudgets.map((meal, index) => ({ label: meal.label, calories: mealCalories[index], ratio: `${Math.round(meal.ratio * 100)}%` })),
      },
      trainingPlanDraft: {
        daysPerWeek: Number(profile.trainingDays),
        title,
        sessionMinutes: Number(profile.sessionMinutes),
        place,
        sessions,
      },
    },
  };
}

export function createMockDataSource({ latencyMs = 90 } = {}) {
  let state = cloneData(MOCK_BOOTSTRAP_RESPONSE);

  return {
    mode: 'mock',
    label: '模拟后端',

    async loadAppData() {
      await delay(latencyMs);
      return validateBootstrapResponse(state, 'mock');
    },

    async previewPlans(profile) {
      await delay(latencyMs);
      return validatePlanSuggestionResponse(buildMockPlanResponse(profile), 'mock');
    },

    async activatePlans({ targets, trainingPlan, currentWeightKg }) {
      await delay(latencyMs);
      state.data.nutritionPlan.targets = cloneData(targets);
      state.data.trainingPlan = { ...state.data.trainingPlan, ...cloneData(trainingPlan), status: 'active' };
      state.data.profile.latestWeightKg = Number(currentWeightKg);
      return { targets: cloneData(targets), trainingPlan: cloneData(state.data.trainingPlan), currentWeightKg: Number(currentWeightKg) };
    },
  };
}
