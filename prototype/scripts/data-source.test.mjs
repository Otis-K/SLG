import test from 'node:test';
import assert from 'node:assert/strict';
import { DataSourceError } from '../src/data-source/contracts.js';
import { createDataSource } from '../src/data-source/index.js';
import { MOCK_BOOTSTRAP_RESPONSE } from '../src/data-source/mock/seed.js';

const PROFILE = {
  age: 29,
  sex: 'male',
  height: 176,
  currentWeight: 73.2,
  targetWeight: 68,
  goal: 'lose',
  pace: 'gentle',
  activity: 'light',
  experience: 'beginner',
  trainingDays: 3,
  trainingPlace: 'gym',
  sessionMinutes: 45,
};

function apiBootstrapResponse() {
  const response = structuredClone(MOCK_BOOTSTRAP_RESPONSE);
  response.source = 'api';
  response.requestId = 'request-bootstrap-01';
  delete response.fixtureVersion;
  return response;
}

function apiPlanResponse() {
  return {
    schemaVersion: 'plan-suggestion-v1',
    source: 'api',
    requestId: 'request-plan-01',
    data: {
      suggestionId: 'suggestion-api-01',
      eligible: true,
      policy: {
        clinicalPolicyVersion: 'clinical-approved-01',
        trainingPolicyVersion: 'training-approved-01',
        approved: true,
        environment: 'test',
      },
      nutritionPlanDraft: {
        targets: { calories: 1960, protein: 128, carbs: 225, fat: 62 },
        estimatedWeeks: 14,
        meals: [
          { label: '早餐', calories: 490, ratio: '25%' },
          { label: '午餐', calories: 690, ratio: '35%' },
          { label: '晚餐', calories: 590, ratio: '30%' },
          { label: '加餐', calories: 190, ratio: '10%' },
        ],
      },
      trainingPlanDraft: {
        daysPerWeek: 3,
        title: '新手全身三练',
        sessionMinutes: 45,
        place: '健身房',
        sessions: ['全身 A', '全身 B', '全身 C'],
      },
    },
  };
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return structuredClone(payload);
    },
  };
}

function assertDataSourceError(error, expected) {
  assert.ok(error instanceof DataSourceError);
  for (const [key, value] of Object.entries(expected)) assert.equal(error[key], value);
  return true;
}

test('mock source never calls fetch', async () => {
  let fetchCalls = 0;
  const source = createDataSource({
    mode: 'mock',
    mockLatencyMs: 0,
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('mock mode must not use fetch');
    },
  });

  const bootstrap = await source.loadAppData();
  const suggestion = await source.previewPlans(PROFILE);
  await source.activatePlans({
    targets: suggestion.targets,
    trainingPlan: suggestion.training,
    currentWeightKg: PROFILE.currentWeight,
  });

  assert.equal(source.mode, 'mock');
  assert.equal(bootstrap.dataSource.mode, 'mock');
  assert.equal(fetchCalls, 0);
});

test('mock source returns isolated snapshots', async () => {
  const source = createDataSource({ mode: 'mock', mockLatencyMs: 0 });
  const first = await source.loadAppData();

  first.profile.displayName = 'mutated client value';
  first.nutritionPlan.targets.calories = 1;
  first.meals.breakfast[0].name = 'mutated food';
  first.foodCatalog.push({ id: 'client-only' });

  const second = await source.loadAppData();
  assert.equal(second.profile.displayName, '罗志恺');
  assert.equal(second.nutritionPlan.targets.calories, 1800);
  assert.equal(second.meals.breakfast[0].name, '水煮鸡蛋');
  assert.equal(second.foodCatalog.some((food) => food.id === 'client-only'), false);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.meals, second.meals);
});

test('API source sends the bootstrap, preview and activation contracts', async () => {
  const calls = [];
  const activationPayload = {
    suggestionId: 'suggestion-api-01',
    targets: { calories: 1960, protein: 128, carbs: 225, fat: 62 },
    trainingPlan: { daysPerWeek: 3, sessions: ['全身 A', '全身 B', '全身 C'] },
    currentWeightKg: 73.2,
  };
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/app-bootstrap?')) return jsonResponse(apiBootstrapResponse());
    if (url.endsWith('/plan-suggestions')) return jsonResponse(apiPlanResponse());
    if (url.endsWith('/plans/activate')) return jsonResponse({ data: { activated: true, ...activationPayload } });
    return jsonResponse({}, 404);
  };
  const source = createDataSource({
    mode: 'api',
    apiBaseUrl: 'https://backend.example.test/api/v1/',
    fetchImpl,
  });

  const bootstrap = await source.loadAppData({ localDate: '2026-08-12', timeZoneId: 'Asia/Shanghai' });
  const suggestion = await source.previewPlans(PROFILE);
  const activated = await source.activatePlans(activationPayload);

  assert.equal(source.mode, 'api');
  assert.equal(bootstrap.dataSource.mode, 'api');
  assert.equal(bootstrap.dataSource.requestId, 'request-bootstrap-01');
  assert.equal(suggestion.suggestionId, 'suggestion-api-01');
  assert.equal(activated.activated, true);
  assert.equal(calls.length, 3);

  assert.equal(
    calls[0].url,
    'https://backend.example.test/api/v1/app-bootstrap?localDate=2026-08-12&timeZoneId=Asia%2FShanghai',
  );
  assert.equal(calls[0].options.method, 'GET');
  assert.deepEqual(calls[0].options.headers, { Accept: 'application/json' });
  assert.equal(calls[0].options.body, undefined);
  assert.ok(calls[0].options.signal instanceof AbortSignal);

  assert.equal(calls[1].url, 'https://backend.example.test/api/v1/plan-suggestions');
  assert.equal(calls[1].options.method, 'POST');
  assert.deepEqual(calls[1].options.headers, {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  assert.deepEqual(JSON.parse(calls[1].options.body), { profile: PROFILE });

  assert.equal(calls[2].url, 'https://backend.example.test/api/v1/plans/activate');
  assert.equal(calls[2].options.method, 'POST');
  assert.deepEqual(calls[2].options.headers, {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  assert.deepEqual(JSON.parse(calls[2].options.body), activationPayload);
});

test('API source exposes non-2xx responses without returning mock data', async () => {
  let fetchCalls = 0;
  const source = createDataSource({
    mode: 'api',
    fetchImpl: async () => {
      fetchCalls += 1;
      return jsonResponse({ error: 'unavailable' }, 503);
    },
  });

  await assert.rejects(
    source.loadAppData({ localDate: '2026-08-12', timeZoneId: 'Asia/Shanghai' }),
    (error) => assertDataSourceError(error, {
      code: 'HTTP_ERROR',
      status: 503,
      retryable: true,
    }),
  );
  assert.equal(fetchCalls, 1);
});

test('API source rejects invalid JSON', async () => {
  const source = createDataSource({
    mode: 'api',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        throw new SyntaxError('Unexpected token');
      },
    }),
  });

  await assert.rejects(
    source.loadAppData(),
    (error) => assertDataSourceError(error, { code: 'INVALID_JSON' }),
  );
});

test('API source rejects responses with missing required fields', async () => {
  const invalid = apiBootstrapResponse();
  delete invalid.data.trainingPlan;
  const source = createDataSource({
    mode: 'api',
    fetchImpl: async () => jsonResponse(invalid),
  });

  await assert.rejects(
    source.loadAppData(),
    (error) => assertDataSourceError(error, { code: 'INVALID_PAYLOAD' }),
  );
});

test('unknown source mode fails fast', () => {
  assert.throws(
    () => createDataSource({ mode: 'staging' }),
    (error) => assertDataSourceError(error, { code: 'UNKNOWN_DATA_SOURCE' }),
  );
});

test('network failure in API mode is surfaced and never falls back to mock', async () => {
  let fetchCalls = 0;
  const source = createDataSource({
    mode: 'api',
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new TypeError('connection refused');
    },
  });

  await assert.rejects(
    source.loadAppData(),
    (error) => assertDataSourceError(error, {
      code: 'NETWORK_ERROR',
      retryable: true,
    }),
  );
  assert.equal(fetchCalls, 1);
});
