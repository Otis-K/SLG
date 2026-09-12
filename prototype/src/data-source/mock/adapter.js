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
  let accessToken = null;

  return {
    mode: 'mock',
    label: '模拟后端',
    getAccessToken: () => accessToken,
    setAccessToken(token) { accessToken = token || null; },
    clearAccessToken() { accessToken = null; },

    async requestSmsCode(phone) {
      await delay(latencyMs);
      return {
        phone,
        debug: true,
        debugCode: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        message: 'Mock 验证码：123456',
      };
    },

    async loginWithCode(_phone, code) {
      await delay(latencyMs);
      if (String(code ?? '') !== '123456') {
        const error = new Error('验证码错误');
        error.code = 'INVALID_SMS_CODE';
        throw error;
      }
      accessToken = 'mock-access-token';
      return {
        accessToken,
        account: { id: 'mock-account-01', phone: '138****8000', status: 'active' },
        onboardingCompleted: false,
        displayName: '新用户',
      };
    },

    async saveProfile(profile) {
      await delay(latencyMs);
      state.data.profile = {
        ...state.data.profile,
        ...profile,
        onboardingCompleted: true,
      };
      return state.data.profile;
    },

    async searchFoods({ q = '', page = 1, pageSize = 40 } = {}) {
      await delay(latencyMs);
      const all = state.data.foodCatalog.slice();
      const filtered = q.trim()
        ? all.filter((food) => food.name.toLowerCase().includes(q.trim().toLowerCase()))
        : all;
      const start = (page - 1) * pageSize;
      const data = filtered.slice(start, start + pageSize);
      return {
        data,
        pagination: {
          page,
          pageSize,
          total: filtered.length,
          totalPages: Math.max(0, Math.ceil(filtered.length / pageSize)),
        },
      };
    },

    async estimateMeal({ text = '' } = {}) {
      await delay(latencyMs);
      const calories = /鸡|肉|蛋|鱼/.test(text) ? 380 : 290;
      const items = [{
        name: /鸡/.test(text) ? '鸡肉餐' : '家常便餐',
        unit: '份',
        amount: 1,
        calories,
        protein: Math.round(calories * 0.18 / 4),
        carbs: Math.round(calories * 0.5 / 4),
        fat: Math.round(calories * 0.32 / 9),
        confidence: 0.72,
      }];
      return {
        items,
        summary: {
          calories,
          protein: items[0].protein,
          carbs: items[0].carbs,
          fat: items[0].fat,
        },
        provider: 'mock',
        model: 'mock-ai-estimator',
        disclaimer: 'Mock 模式估算结果，确认后才会记录。',
      };
    },

    async createMealEntry(payload) {
      await delay(latencyMs);
      const meal = payload.mealId || 'snack';
      const entry = {
        ...payload,
        id: payload.entryId || `meal-${Date.now()}`,
        entryId: payload.entryId || `meal-${Date.now()}`,
        tone: payload.tone || 'green',
      };
      state.data.meals[meal].push(entry);
      return entry;
    },

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
