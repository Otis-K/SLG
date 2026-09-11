export const MEAL_META = {
  breakfast: { label: '早餐', range: '05:00–10:29' },
  lunch: { label: '午餐', range: '10:30–14:29' },
  dinner: { label: '晚餐', range: '17:00–21:29' },
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
];

export const NUTRIENT_FIELDS = [
  { id: 'protein', label: '蛋白质', unit: 'g' },
  { id: 'carbs', label: '碳水', unit: 'g' },
  { id: 'fat', label: '脂肪', unit: 'g' },
];

export const ONBOARDING_DEFAULTS = {
  age: '',
  sex: '',
  height: '',
  currentWeight: '',
  targetWeight: '',
  goal: 'lose',
  pace: 'gentle',
  activity: '',
  experience: '',
  trainingDays: 3,
  trainingPlace: '',
  sessionMinutes: 45,
};

// Client limits provide immediate feedback. The API must validate again.
export const PROFILE_LIMITS = {
  age: { min: 1, max: 120, autoPlanMin: 18, autoPlanMax: 79 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 250 },
};

export const SEX_OPTIONS = [
  { id: 'male', label: '男' },
  { id: 'female', label: '女' },
];

export const GOAL_OPTIONS = [
  { id: 'lose', label: '减脂', summaryLabel: '减脂' },
  { id: 'maintain', label: '保持', summaryLabel: '保持体重' },
  { id: 'gain', label: '增肌', summaryLabel: '增肌' },
];

export const PACE_OPTIONS = [
  { id: 'gentle', label: '温和' },
  { id: 'steady', label: '稳步' },
];

export const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: '久坐为主', detail: '大部分时间坐着' },
  { id: 'light', label: '轻度活动', detail: '日常有走动' },
  { id: 'moderate', label: '中度活动', detail: '经常走动或站立' },
  { id: 'high', label: '高活动量', detail: '体力劳动为主' },
];

export const EXPERIENCE_OPTIONS = [
  { id: 'beginner', label: '新手' },
  { id: 'regular', label: '有基础' },
  { id: 'advanced', label: '进阶' },
];

export const TRAINING_DAY_OPTIONS = [2, 3, 4, 5];

export const TRAINING_PLACE_OPTIONS = [
  { id: 'home', label: '居家', planLabel: '居家' },
  { id: 'gym', label: '健身房', planLabel: '健身房' },
  { id: 'flexible', label: '灵活安排', planLabel: '灵活场地' },
];

export const TRAINING_SESSION_MINUTES = [30, 45, 60];

export const HEALTH_RISK_OPTIONS = [
  { id: 'pregnancy', label: '孕期或哺乳期' },
  { id: 'eating', label: '进食障碍风险' },
  { id: 'clinical', label: '疾病处方或康复治疗' },
  { id: 'injury', label: '当前受伤或动作禁忌' },
];

export const WIREFRAME_SCENES = [
  { id: 'onboarding', label: '01 · 首次资料建档', type: 'onboarding' },
  { id: 'preview', label: '02 · 双计划预览', type: 'preview' },
  { id: 'today', label: '03 · 今日', type: 'today' },
  { id: 'food', label: '04 · 记录饮食', type: 'food' },
  { id: 'workout', label: '05 · 训练执行', type: 'workout' },
  { id: 'my', label: '06 · 我的', type: 'my' },
  { id: 'goal', label: '07 · 目标与计划', type: 'goal' },
  { id: 'privacy', label: '08 · 数据与隐私', type: 'privacy' },
];
