const MEAL_IDS = ['breakfast', 'lunch', 'dinner', 'snack'];

export class DataSourceError extends Error {
  constructor(message, { code = 'DATA_SOURCE_ERROR', status = 0, retryable = false, cause } = {}) {
    super(message, { cause });
    this.name = 'DataSourceError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function assertPayload(condition, message) {
  if (!condition) throw new DataSourceError(`数据契约错误：${message}`, { code: 'INVALID_PAYLOAD' });
}

function isFiniteNonNegative(value) {
  return value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
}

export function cloneData(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function validateBootstrapResponse(response, expectedSource) {
  assertPayload(response && typeof response === 'object', '响应必须是对象');
  assertPayload(response.schemaVersion === 'app-bootstrap-v1', 'schemaVersion 不受支持');
  assertPayload(response.source === expectedSource, `数据来源应为 ${expectedSource}`);
  const data = response.data;
  assertPayload(data && typeof data === 'object', '缺少 data');
  assertPayload(data.profile?.displayName, '缺少用户资料');
  assertPayload(isFiniteNonNegative(data.profile.latestWeightKg), '当前体重无效');
  assertPayload(data.nutritionPlan?.status === 'active', '缺少生效中的饮食计划');
  assertPayload(['calories', 'protein', 'carbs', 'fat'].every((key) => isFiniteNonNegative(data.nutritionPlan.targets?.[key])), '营养目标无效');
  assertPayload(Array.isArray(data.nutritionPlan.mealBudgets), '餐次预算必须是数组');
  assertPayload(Array.isArray(data.foodCatalog), '食物目录必须是数组');
  assertPayload(new Set(data.foodCatalog.map((food) => food.id)).size === data.foodCatalog.length, '食物 ID 必须唯一');
  assertPayload(MEAL_IDS.every((mealId) => Array.isArray(data.meals?.[mealId])), '四餐记录不完整');
  assertPayload(Array.isArray(data.workout?.exercises), '训练动作必须是数组');
  assertPayload(Array.isArray(data.trainingPlan?.sessions), '训练计划不完整');
  assertPayload(Array.isArray(data.trainingTemplates), '训练模板必须是数组');
  assertPayload(Array.isArray(data.trainingTemplateOptions), '训练模板选项必须是数组');
  assertPayload(Array.isArray(data.trends?.diet) && data.trends.diet.length === 7, '饮食趋势必须包含 7 天');
  assertPayload(typeof data.consents?.healthProfileProcessing === 'boolean', '健康资料同意状态缺失');
  assertPayload(typeof data.consents?.cloudBackup === 'boolean', '云备份同意状态缺失');
  assertPayload(typeof data.backup?.state === 'string', '备份状态缺失');

  return cloneData({
    ...data,
    dataSource: {
      mode: expectedSource,
      schemaVersion: response.schemaVersion,
      fixtureVersion: response.fixtureVersion || null,
      requestId: response.requestId || null,
    },
  });
}

export function validatePlanSuggestionResponse(response, expectedSource) {
  assertPayload(response && typeof response === 'object', '计划响应必须是对象');
  assertPayload(response.schemaVersion === 'plan-suggestion-v1', '计划 schemaVersion 不受支持');
  assertPayload(response.source === expectedSource, `计划数据来源应为 ${expectedSource}`);
  assertPayload(response.data?.eligible === true, '当前输入不能生成自动计划');
  assertPayload(response.data?.nutritionPlanDraft?.targets, '缺少饮食计划草稿');
  assertPayload(response.data?.trainingPlanDraft?.sessions, '缺少训练计划草稿');

  const draft = response.data;
  return cloneData({
    suggestionId: draft.suggestionId,
    targets: draft.nutritionPlanDraft.targets,
    estimatedWeeks: draft.nutritionPlanDraft.estimatedWeeks,
    meals: draft.nutritionPlanDraft.meals,
    training: draft.trainingPlanDraft,
    policy: draft.policy,
  });
}
