import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  HEALTH_RISK_OPTIONS,
  MEAL_META,
  NUTRIENT_FIELDS,
  PROFILE_LIMITS,
  TRAINING_DAY_OPTIONS,
  WEEK_DAYS,
  WIREFRAME_SCENES,
} from '../src/data.js';
import { createMockDataSource } from '../src/data-source/mock/adapter.js';

function sumMealNutrition(meals) {
  return Object.values(meals).flat().reduce((total, food) => ({
    calories: total.calories + food.calories,
    protein: total.protein + food.protein,
    carbs: total.carbs + food.carbs,
    fat: total.fat + food.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

test('frontend configuration remains complete and presentation-only', () => {
  assert.deepEqual(Object.keys(MEAL_META), ['breakfast', 'lunch', 'dinner', 'snack']);
  assert.deepEqual(NUTRIENT_FIELDS.map((field) => field.id), ['protein', 'carbs', 'fat']);
  assert.equal(WEEK_DAYS.length, 7);
  assert.equal(new Set(WEEK_DAYS.map((day) => day.id)).size, 7);
  assert.equal(GOAL_OPTIONS.length, 3);
  assert.equal(ACTIVITY_OPTIONS.length, 4);
  assert.equal(HEALTH_RISK_OPTIONS.length, 4);
  assert.deepEqual(TRAINING_DAY_OPTIONS, [2, 3, 4, 5]);
  assert.deepEqual(PROFILE_LIMITS.age, { min: 1, max: 120, autoPlanMin: 18, autoPlanMax: 79 });
  assert.equal(WIREFRAME_SCENES.length, 8);
});

test('mock bootstrap data can be assembled into the expected home summary', async () => {
  const source = createMockDataSource({ latencyMs: 0 });
  const data = await source.loadAppData();

  assert.equal(data.dataSource.mode, 'mock');
  assert.equal(data.foodCatalog.length, 6);
  assert.equal(data.workout.exercises.length, 3);
  assert.equal(data.trainingTemplates.length, 3);
  assert.equal(data.trends.diet.length, 7);

  assert.deepEqual(
    Object.fromEntries(Object.entries(data.meals).map(([meal, foods]) => [
      meal,
      foods.reduce((sum, food) => sum + food.calories, 0),
    ])),
    { breakfast: 264, lunch: 174, dinner: 0, snack: 102 },
  );

  const totals = sumMealNutrition(data.meals);
  assert.equal(totals.calories, 540);
  assert.ok(Math.abs(totals.protein - 26) < 1e-9);
  assert.ok(Math.abs(totals.carbs - 78.4) < 1e-9);
  assert.ok(Math.abs(totals.fat - 14.1) < 1e-9);
});
