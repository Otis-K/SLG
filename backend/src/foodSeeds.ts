import type { Pool, RowDataPacket } from 'mysql2/promise';

export type FoodSeed = {
  id: string;
  name: string;
  detail: string;
  unit: string;
  amount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tone: string;
  emoji: string;
  keywords: string;
  favorite?: boolean;
};

export const FOOD_SEEDS: FoodSeed[] = [
  { id: 'egg-boiled', name: '水煮鸡蛋', detail: '中等大小 · 1 个', unit: '个', amount: 1, calories: 72, protein: 6.3, carbs: 0.6, fat: 4.8, tone: 'yellow', emoji: '🥚', keywords: '鸡蛋 煮蛋 蛋' },
  { id: 'egg-fried', name: '煎鸡蛋', detail: '少油 · 1 个', unit: '个', amount: 1, calories: 95, protein: 6.4, carbs: 0.7, fat: 7.5, tone: 'yellow', emoji: '🍳', keywords: '煎蛋 荷包蛋 蛋' },
  { id: 'milk-lowfat', name: '低脂牛奶', detail: '250 毫升', unit: '毫升', amount: 250, calories: 108, protein: 8.2, carbs: 12.5, fat: 2.8, tone: 'blue', emoji: '🥛', keywords: '牛奶 脱脂 低脂 奶' },
  { id: 'milk-whole', name: '全脂牛奶', detail: '250 毫升', unit: '毫升', amount: 250, calories: 152, protein: 7.8, carbs: 11.7, fat: 8.2, tone: 'blue', emoji: '🥛', keywords: '牛奶 全脂 奶' },
  { id: 'oats-instant', name: '即食燕麦片', detail: '40 克干重', unit: '克', amount: 40, calories: 150, protein: 5.2, carbs: 27.1, fat: 2.7, tone: 'coral', emoji: '🥣', keywords: '燕麦 麦片 早餐' },
  { id: 'rice-cooked', name: '熟米饭', detail: '一碗约 150 克', unit: '碗', amount: 1, calories: 174, protein: 3.9, carbs: 38.4, fat: 0.5, tone: 'green', emoji: '🍚', keywords: '米饭 白米饭 大米饭' },
  { id: 'mantou', name: '馒头', detail: '约 100 克', unit: '个', amount: 1, calories: 223, protein: 7.0, carbs: 47.0, fat: 1.1, tone: 'green', emoji: '🥯', keywords: '馒头 主食 面食' },
  { id: 'bread-whole-wheat', name: '全麦面包', detail: '1 片约 35 克', unit: '片', amount: 1, calories: 86, protein: 3.8, carbs: 15.2, fat: 1.2, tone: 'coral', emoji: '🍞', keywords: '面包 全麦 吐司' },
  { id: 'chicken-breast-grilled', name: '香煎鸡胸肉', detail: '120 克', unit: '克', amount: 120, calories: 198, protein: 36.5, carbs: 1.8, fat: 4.9, tone: 'orange', emoji: '🍗', keywords: '鸡胸 鸡肉 鸡胸肉' },
  { id: 'chicken-breast-boiled', name: '水煮鸡胸肉', detail: '120 克', unit: '克', amount: 120, calories: 158, protein: 33.2, carbs: 0, fat: 2.2, tone: 'orange', emoji: '🍗', keywords: '鸡胸 鸡肉 煮鸡胸' },
  { id: 'beef-lean', name: '瘦牛肉', detail: '熟制 · 100 克', unit: '克', amount: 100, calories: 187, protein: 27.4, carbs: 0, fat: 8.4, tone: 'red', emoji: '🥩', keywords: '牛肉 瘦牛肉 牛' },
  { id: 'fish-steamed', name: '清蒸鱼', detail: '约 150 克', unit: '份', amount: 1, calories: 180, protein: 30.0, carbs: 1.2, fat: 6.3, tone: 'blue', emoji: '🐟', keywords: '鱼 蒸鱼 鱼肉' },
  { id: 'salmon', name: '三文鱼', detail: '100 克', unit: '克', amount: 100, calories: 208, protein: 20.0, carbs: 0, fat: 13.4, tone: 'pink', emoji: '🍣', keywords: '三文鱼 鲑鱼 生鱼片' },
  { id: 'tofu', name: '豆腐', detail: '100 克', unit: '克', amount: 100, calories: 76, protein: 8.1, carbs: 1.9, fat: 3.7, tone: 'yellow', emoji: '🧊', keywords: '豆腐 豆制品' },
  { id: 'broccoli', name: '西兰花', detail: '100 克', unit: '克', amount: 100, calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, tone: 'green', emoji: '🥦', keywords: '西兰花 绿菜花 蔬菜' },
  { id: 'tomato', name: '番茄', detail: '中等大小', unit: '个', amount: 1, calories: 22, protein: 1.1, carbs: 4.8, fat: 0.2, tone: 'red', emoji: '🍅', keywords: '西红柿 番茄' },
  { id: 'cucumber', name: '黄瓜', detail: '1 根约 200 克', unit: '根', amount: 1, calories: 30, protein: 1.3, carbs: 7.2, fat: 0.2, tone: 'green', emoji: '🥒', keywords: '黄瓜 青瓜' },
  { id: 'apple', name: '苹果', detail: '中等大小', unit: '个', amount: 1, calories: 95, protein: 0.5, carbs: 25.1, fat: 0.3, tone: 'red', emoji: '🍎', keywords: '苹果 水果' },
  { id: 'banana', name: '香蕉', detail: '1 根约 110 克', unit: '根', amount: 1, calories: 102, protein: 1.2, carbs: 26.4, fat: 0.3, tone: 'yellow', emoji: '🍌', keywords: '香蕉 水果' },
  { id: 'orange', name: '橙子', detail: '中等大小', unit: '个', amount: 1, calories: 62, protein: 1.2, carbs: 15.4, fat: 0.2, tone: 'orange', emoji: '🍊', keywords: '橙子 橘子 水果' },
  { id: 'blueberry', name: '蓝莓', detail: '100 克', unit: '克', amount: 100, calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, tone: 'blue', emoji: '🫐', keywords: '蓝莓 浆果' },
  { id: 'grape', name: '葡萄', detail: '100 克', unit: '克', amount: 100, calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2, tone: 'purple', emoji: '🍇', keywords: '葡萄 水果' },
  { id: 'yogurt-plain', name: '原味酸奶', detail: '1 杯约 150 克', unit: '杯', amount: 1, calories: 128, protein: 5.2, carbs: 17.3, fat: 4.0, tone: 'blue', emoji: '🥤', keywords: '酸奶 优格 乳制品' },
  { id: 'mixed-nuts', name: '混合坚果', detail: '1 小把约 25 克', unit: '把', amount: 1, calories: 150, protein: 5.0, carbs: 6.0, fat: 12.5, tone: 'brown', emoji: '🥜', keywords: '坚果 腰果 核桃 杏仁' },
  { id: 'peanut', name: '花生', detail: '25 克', unit: '克', amount: 25, calories: 142, protein: 6.5, carbs: 4.0, fat: 12.3, tone: 'brown', emoji: '🥜', keywords: '花生 坚果' },
  { id: 'edamame', name: '毛豆', detail: '100 克', unit: '克', amount: 100, calories: 121, protein: 11.9, carbs: 8.9, fat: 5.2, tone: 'green', emoji: '🫛', keywords: '毛豆 豆' },
  { id: 'pear', name: '梨', detail: '中等大小', unit: '个', amount: 1, calories: 101, protein: 0.6, carbs: 27.1, fat: 0.2, tone: 'green', emoji: '🍐', keywords: '梨 水果' },
  { id: 'peach', name: '桃子', detail: '中等大小', unit: '个', amount: 1, calories: 59, protein: 1.4, carbs: 14.3, fat: 0.4, tone: 'pink', emoji: '🍑', keywords: '桃 桃子 水果' },
  { id: 'watermelon', name: '西瓜', detail: '1 块约 250 克', unit: '块', amount: 1, calories: 75, protein: 1.5, carbs: 19.0, fat: 0.4, tone: 'green', emoji: '🍉', keywords: '西瓜 水果' },
  { id: 'corn', name: '玉米', detail: '1 根约 150 克', unit: '根', amount: 1, calories: 129, protein: 4.5, carbs: 28.2, fat: 1.6, tone: 'yellow', emoji: '🌽', keywords: '玉米 棒子' },
  { id: 'sweet-potato', name: '红薯', detail: '中等大小约 150 克', unit: '个', amount: 1, calories: 129, protein: 2.4, carbs: 30.1, fat: 0.2, tone: 'orange', emoji: '🍠', keywords: '红薯 地瓜 番薯' },
  { id: 'potato', name: '土豆', detail: '中等大小约 150 克', unit: '个', amount: 1, calories: 130, protein: 3.1, carbs: 29.8, fat: 0.2, tone: 'brown', emoji: '🥔', keywords: '土豆 马铃薯' },
  { id: 'carrot', name: '胡萝卜', detail: '100 克', unit: '克', amount: 100, calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, tone: 'orange', emoji: '🥕', keywords: '胡萝卜 蔬菜' },
  { id: 'spinach', name: '菠菜', detail: '100 克', unit: '克', amount: 100, calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, tone: 'green', emoji: '🥬', keywords: '菠菜 蔬菜' },
  { id: 'lettuce', name: '生菜', detail: '100 克', unit: '克', amount: 100, calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, tone: 'green', emoji: '🥬', keywords: '生菜 蔬菜 沙拉' },
  { id: 'noodles', name: '煮面条', detail: '1 碗约 200 克', unit: '碗', amount: 1, calories: 276, protein: 8.8, carbs: 52.0, fat: 3.2, tone: 'coral', emoji: '🍜', keywords: '面条 面 粉面' },
  { id: 'dumplings', name: '水饺', detail: '10 个', unit: '份', amount: 1, calories: 420, protein: 16.0, carbs: 54.0, fat: 15.0, tone: 'orange', emoji: '🥟', keywords: '饺子 水饺' },
  { id: 'wonton', name: '馄饨', detail: '1 碗约 12 个', unit: '碗', amount: 1, calories: 360, protein: 13.0, carbs: 48.0, fat: 12.0, tone: 'orange', emoji: '🥟', keywords: '馄饨 云吞' },
  { id: 'tomato-egg', name: '番茄炒蛋', detail: '家常小份', unit: '份', amount: 1, calories: 240, protein: 13.0, carbs: 12.0, fat: 15.0, tone: 'red', emoji: '🍅', keywords: '番茄炒蛋 西红柿炒鸡蛋 家常菜' },
  { id: 'kungpao-chicken', name: '宫保鸡丁', detail: '家常小份', unit: '份', amount: 1, calories: 420, protein: 28.0, carbs: 20.0, fat: 25.0, tone: 'orange', emoji: '🍗', keywords: '宫保鸡丁 鸡丁 川菜' },
  { id: 'malatang', name: '麻辣烫', detail: '中份', unit: '份', amount: 1, calories: 620, protein: 24.0, carbs: 60.0, fat: 30.0, tone: 'red', emoji: '🍲', keywords: '麻辣烫 火锅 冒菜 香锅' },
  { id: 'hamburger', name: '汉堡', detail: '1 个', unit: '个', amount: 1, calories: 495, protein: 22.0, carbs: 42.0, fat: 26.0, tone: 'orange', emoji: '🍔', keywords: '汉堡 汉堡包 牛肉堡' },
  { id: 'fried-chicken', name: '炸鸡', detail: '2 块', unit: '份', amount: 1, calories: 480, protein: 30.0, carbs: 26.0, fat: 28.0, tone: 'brown', emoji: '🍗', keywords: '炸鸡 鸡块 鸡翅' },
  { id: 'pizza', name: '披萨', detail: '1 片', unit: '片', amount: 1, calories: 285, protein: 12.0, carbs: 36.0, fat: 10.0, tone: 'orange', emoji: '🍕', keywords: '披萨 pizza 比萨' },
  { id: 'milk-tea', name: '奶茶', detail: '中杯约 500 毫升', unit: '杯', amount: 1, calories: 320, protein: 3.5, carbs: 53.0, fat: 11.0, tone: 'brown', emoji: '🧋', keywords: '奶茶 珍珠奶茶 饮料' },
  { id: 'latte', name: '拿铁', detail: '中杯约 350 毫升', unit: '杯', amount: 1, calories: 150, protein: 8.0, carbs: 11.0, fat: 8.0, tone: 'brown', emoji: '☕', keywords: '拿铁 咖啡 latte' },
  { id: 'sushi', name: '寿司', detail: '6 个', unit: '份', amount: 1, calories: 330, protein: 12.0, carbs: 56.0, fat: 6.0, tone: 'pink', emoji: '🍣', keywords: '寿司 日料 生鱼片' },
];

const TONE_COLORS: Record<string, string> = {
  green: '#dff3e4',
  yellow: '#fff2c9',
  orange: '#ffe3cf',
  red: '#ffdcdc',
  blue: '#d9edff',
  pink: '#ffe4f0',
  purple: '#ece2ff',
  brown: '#efe0d2',
  coral: '#ffe1d6',
  neutral: '#eef1ef',
};

function imageDataUrl(food: FoodSeed): string {
  const background = TONE_COLORS[food.tone] ?? TONE_COLORS.neutral;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="24" fill="${background}"/><text x="60" y="76" font-size="52" text-anchor="middle" dominant-baseline="middle">${food.emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function ensureSeedFoods(pool: Pool): Promise<void> {
  for (const food of FOOD_SEEDS) {
    await pool.execute(
      `INSERT INTO foods
        (id, account_id, source, name, detail, unit, amount, calories, protein, carbs, fat, image_url, image_emoji, search_keywords, tone, favorite, is_custom)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        name=VALUES(name), detail=VALUES(detail), unit=VALUES(unit), amount=VALUES(amount), calories=VALUES(calories),
        protein=VALUES(protein), carbs=VALUES(carbs), fat=VALUES(fat), image_url=VALUES(image_url),
        image_emoji=VALUES(image_emoji), search_keywords=VALUES(search_keywords), tone=VALUES(tone)`,
      [
        food.id, null, 'system', food.name, food.detail, food.unit, food.amount, food.calories, food.protein, food.carbs, food.fat,
        imageDataUrl(food), food.emoji, food.keywords, food.tone, 0, 0,
      ],
    );
  }
}

export function toFoodResponse(row: RowDataPacket) {
  const value = {
    id: row.id,
    source: row.source,
    name: row.name,
    detail: row.detail,
    unit: row.unit,
    amount: Number(row.amount),
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    imageUrl: row.image_url ?? '',
    imageEmoji: row.image_emoji ?? '🍽️',
    tone: row.tone ?? 'neutral',
    favorite: Boolean(row.favorite),
    isCustom: Boolean(row.is_custom),
  };
  return value;
}
