import { createHash } from 'node:crypto';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { config } from './config.js';
import { toFoodResponse } from './foodSeeds.js';

type MealCandidate = {
  name: string;
  unit: string;
  amount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type EstimateInput = {
  text?: string;
  imageBase64?: string;
};

type EstimateResult = {
  items: Array<MealCandidate & { confidence: number }>;
  summary: { calories: number; protein: number; carbs: number; fat: number };
  provider: 'ai' | 'mock';
  model: string;
  disclaimer: string;
};

function number(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function clamp360(value: number): number {
  return Math.round(Math.min(3600, Math.max(40, value)));
}

function inferAmountMultiplier(text: string, unit: string): number {
  const source = text.toLowerCase();
  if (/(半碗|半份|小份)/.test(source) && ['碗', '份'].includes(unit)) return 0.5;
  const quantity = source.match(/(\d+(?:\.\d+)?)\s*(个|碗|份|片|杯|根|克|毫升|把|块)/);
  if (!quantity) return 1;
  const value = Number(quantity[1]);
  if (!Number.isFinite(value) || value <= 0) return 1;
  if (quantity[2] === unit) return value;
  return 1;
}

function findMentionedFoods(text: string, foods: Array<ReturnType<typeof toFoodResponse>>): Array<MealCandidate & { confidence: number }> {
  const normalized = text.toLowerCase();
  const matches: Array<MealCandidate & { confidence: number }> = [];

  for (const food of foods) {
    const keywords = `${food.name} ${food.detail}`.toLowerCase();
    const exact = normalized.includes(food.name.toLowerCase());
    const keyword = food.name.length >= 2 && normalized.includes(food.name.slice(0, 2).toLowerCase());
    if (!exact && !keyword) continue;
    const multiplier = inferAmountMultiplier(text, food.unit);
    matches.push({
      name: food.name,
      unit: food.unit,
      amount: Math.max(multiplier * food.amount, 0.1),
      calories: clamp360(food.calories * multiplier),
      protein: Number((food.protein * multiplier).toFixed(1)),
      carbs: Number((food.carbs * multiplier).toFixed(1)),
      fat: Number((food.fat * multiplier).toFixed(1)),
      confidence: exact ? 0.88 : 0.62,
    });
  }

  return matches.slice(0, 8);
}

function genericMeal(text: string): EstimateResult {
  const hasMeat = /(鸡|猪|牛|鱼|肉|虾|蛋)/.test(text);
  const hasRice = /(米饭|面|米线|粉|粥|馒头|饺子|馄饨)/.test(text);
  const hasVegetable = /(菜|番茄|黄瓜|生菜|西兰花)/.test(text);

  let calories = 420;
  if (hasRice && hasMeat) calories = 560;
  else if (hasRice) calories = 340;
  else if (hasMeat) calories = 390;
  if (hasVegetable) calories = Math.max(160, calories - 40);

  const items = [{
    name: hasRice && hasMeat ? '家常荤素套餐' : hasRice ? '主食简餐' : hasMeat ? '蛋白质餐' : '家常便餐',
    unit: '份',
    amount: 1,
    calories,
    protein: Math.round(calories * 0.17 / 4),
    carbs: Math.round(calories * 0.48 / 4),
    fat: Math.round(calories * 0.35 / 9),
    confidence: 0.46,
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
    model: 'local-food-keyword-matcher',
    disclaimer: '演示估算：未配置 AI Key，结果仅按关键词粗估，确认前请核对。',
  };
}

function parseAiContent(content: string): Array<MealCandidate & { confidence: number }> {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);
  const list = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(list)) throw new Error('AI 返回格式不正确');

  return list.slice(0, 8).map((item: Record<string, unknown>) => ({
    name: String(item.name ?? '未知食物'),
    unit: String(item.unit ?? '份'),
    amount: number(item.amount, 1),
    calories: clamp360(number(item.calories, 120)),
    protein: Number(number(item.protein, 4).toFixed(1)),
    carbs: Number(number(item.carbs, 10).toFixed(1)),
    fat: Number(number(item.fat, 4).toFixed(1)),
    confidence: Math.min(0.98, Math.max(0.3, number(item.confidence, 0.7))),
  }));
}

async function callAiProvider(input: EstimateInput): Promise<Array<MealCandidate & { confidence: number }>> {
  if (!config.ai.apiKey) throw new Error('AI provider not configured');

  const content = [
    '你是一名保守、负责的营养估算助手。请只返回 JSON，不要 Markdown。',
    'JSON 结构：{"items":[{"name":"食物名称","unit":"份","amount":1,"calories":0,"protein":0,"carbs":0,"fat":0,"confidence":0.7}]}',
    input.text ? `用户描述：${input.text}` : '用户只提供了餐食照片。',
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ai.timeoutMs);
  try {
    const endpoint = `${config.ai.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.ai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ai.model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: '你只能输出合法 JSON，不得给出医疗建议，不得高估或低估热量。',
          },
          {
            role: 'user',
            content: input.imageBase64
              ? [
                  { type: 'text', text: content },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${input.imageBase64}` } },
                ]
              : content,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AI provider HTTP ${response.status}: ${body.slice(0, 260)}`);
    }
    const body = await response.json();
    const message = body?.choices?.[0]?.message?.content;
    if (typeof message !== 'string') throw new Error('AI provider returned empty content');
    return parseAiContent(message);
  } finally {
    clearTimeout(timeout);
  }
}

export async function estimateMeal(pool: Pool, accountId: string, input: EstimateInput): Promise<EstimateResult> {
  const text = String(input.text ?? '').trim();
  const imageHash = input.imageBase64
    ? createHash('sha256').update(input.imageBase64).digest('hex')
    : null;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM foods
     WHERE account_id IS NULL OR account_id = ?
     ORDER BY name ASC`,
    [accountId],
  );
  const foodKnowledge = rows.map(toFoodResponse);
  const keywordMatches = text ? findMentionedFoods(text, foodKnowledge) : [];
  let items = keywordMatches;
  let provider: EstimateResult['provider'] = 'mock';
  let model = 'local-food-keyword-matcher';
  let disclaimer = '本地演示估算：已按关键词匹配食物，确认后才会记入当日热量。';

  if (config.ai.apiKey) {
    try {
      items = await callAiProvider(input);
      provider = 'ai';
      model = config.ai.model;
      disclaimer = 'AI 估算仅用于记录参考，确认前请核对份量和营养成分。';
    } catch {
      items = keywordMatches;
      provider = 'mock';
      model = `${config.ai.model}（调用失败后回退）`;
      disclaimer = 'AI 服务暂时不可用，已回退到本地关键词估算。';
    }
  }

  if (!items.length) {
    const fallback = genericMeal(text || (input.imageBase64 ? '家常便餐' : ''));
    items = fallback.items;
    provider = 'mock';
    model = fallback.model;
    disclaimer = fallback.disclaimer;
  }

  const summary = items.reduce((total, item) => ({
    calories: total.calories + item.calories,
    protein: total.protein + item.protein,
    carbs: total.carbs + item.carbs,
    fat: total.fat + item.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const result = {
    items,
    summary: {
      calories: Math.round(summary.calories),
      protein: Number(summary.protein.toFixed(1)),
      carbs: Number(summary.carbs.toFixed(1)),
      fat: Number(summary.fat.toFixed(1)),
    },
    provider,
    model,
    disclaimer,
  };

  await pool.execute(
    `INSERT INTO ai_estimates
      (account_id, input_text, image_sha256, provider, model, result)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [accountId, text, imageHash, provider, model, JSON.stringify(result)],
  );

  return result;
}
