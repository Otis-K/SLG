import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/%E7%BD%97%E5%BF%97%E6%81%BA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { MOCK_BOOTSTRAP_RESPONSE } from '../src/data-source/mock/seed.js';

const baseUrl = process.env.PROTOTYPE_URL || 'http://127.0.0.1:4173/';
const outputDir = new URL('../artifacts/', import.meta.url);
await mkdir(outputDir, { recursive: true });
const artifactPath = (name) => fileURLToPath(new URL(name, outputDir));

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const results = [];

function check(condition, message, detail = '') {
  results.push({ ok: Boolean(condition), message, detail });
}

function withDataSource(mode) {
  const url = new URL(baseUrl);
  url.searchParams.set('dataSource', mode);
  return url.toString();
}

function trackApiRequests(page) {
  const requests = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.includes('/api/')) requests.push(`${request.method()} ${url.pathname}${url.search}`);
  });
  return requests;
}

async function loadMockApp(page, name) {
  await page.goto(withDataSource('mock'), { waitUntil: 'domcontentloaded' });
  const loadingState = page.getByRole('status').filter({ hasText: '正在读取业务数据' });
  await loadingState.waitFor({ state: 'visible', timeout: 5000 });
  const loadingBody = await page.locator('body').innerText();
  const prematureSummaryCount = await page.locator('.main-progress').count();
  check(
    !loadingBody.includes('540') && prematureSummaryCount === 0,
    `${name}: loading state does not expose seeded 540 kcal before bootstrap resolves`,
    loadingBody,
  );
  if (name === '390x844') await page.screenshot({ path: artifactPath(`${name}-loading.png`) });
  await page.locator('.nutrition-summary').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

function createApiBootstrapFixture({
  requestId,
  displayName,
  avatarText,
  calories,
  protein,
  carbs,
  fat,
  weightKg,
  backupLabel,
}) {
  const response = structuredClone(MOCK_BOOTSTRAP_RESPONSE);
  response.source = 'api';
  response.fixtureVersion = 'api-visual-regression-2026.08.12';
  response.requestId = requestId;
  response.data.profile = {
    ...response.data.profile,
    displayName,
    avatarText,
    latestWeightKg: weightKg,
  };
  response.data.nutritionPlan.targets = { calories, protein, carbs, fat };
  response.data.trends.weight = { latestKg: weightKg, deltaKg: -0.7 };
  response.data.backup.lastSuccessfulLabel = backupLabel;
  return response;
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  });
}

async function captureMobile(width, height, name) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  const apiRequests = trackApiRequests(page);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await loadMockApp(page, name);
  await page.screenshot({ path: artifactPath(`${name}-home.png`) });

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  check(dimensions.scrollWidth <= dimensions.clientWidth, `${name}: no horizontal overflow`, JSON.stringify(dimensions));

  const visible = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((element) => element.textContent.includes('记录饮食'));
    const meals = [...document.querySelectorAll('.meal-row-main')];
    const nav = document.querySelector('.bottom-nav');
    return {
      summary: Boolean(document.querySelector('.nutrition-summary')),
      recordButton: Boolean(button),
      mealCount: meals.length,
      fourthMealBottom: meals[3]?.getBoundingClientRect().bottom || 0,
      navTop: nav?.getBoundingClientRect().top || height,
    };
  });
  check(visible.summary && visible.recordButton && visible.mealCount === 4, `${name}: summary, CTA and four meals render`, JSON.stringify(visible));
  if (width === 390 && height === 844) {
    check(visible.fourthMealBottom <= visible.navTop, `${name}: four collapsed meals fit above bottom nav`, JSON.stringify(visible));
    const summaryText = await page.locator('.nutrition-summary').innerText();
    const mealTexts = await page.locator('.meal-row').allInnerTexts();
    check(await page.locator('.main-progress').getAttribute('aria-label') === '已摄入 540，目标 1800', `${name}: loaded meal data drives the calorie summary`, summaryText);
    check(summaryText.includes('1,260') && summaryText.includes('26/120g') && summaryText.includes('78/210g') && summaryText.includes('14/60g'), `${name}: loaded targets and macros render correctly`, summaryText);
    check(['2项 · 264 kcal', '1项 · 174 kcal', '尚未记录', '1项 · 102 kcal'].every((value) => mealTexts.some((text) => text.includes(value))), `${name}: loaded food references render in the expected meals`, mealTexts.join(' | '));
  }

  await page.getByRole('button', { name: '记录饮食', exact: true }).click();
  const search = page.getByPlaceholder('搜索食物、品牌或拼音');
  await page.waitForFunction(() => document.activeElement?.getAttribute('placeholder') === '搜索食物、品牌或拼音');
  check(await search.evaluate((element) => element === document.activeElement), `${name}: food sheet autofocuses search`);
  check(await page.getByText('水煮鸡蛋', { exact: true }).first().isVisible(), `${name}: loaded food catalog renders in the food sheet`);
  await page.waitForTimeout(220);
  await page.screenshot({ path: artifactPath(`${name}-food-sheet.png`) });
  if (name === '390x844') {
    await page.locator('.food-result-main').first().click();
    check(await page.getByRole('heading', { name: '确认份量' }).isVisible(), `${name}: food row opens portion editor`);
    await page.screenshot({ path: artifactPath(`${name}-portion.png`) });
    await page.getByRole('button', { name: '返回食物列表' }).click();
  }
  await page.getByRole('button', { name: '快速记录水煮鸡蛋' }).click();
  check(await page.getByText('水煮鸡蛋已记入').isVisible(), `${name}: quick add produces saved toast`);
  if (name === '390x844') {
    check(await page.locator('.main-progress').getAttribute('aria-label') === '已摄入 684，目标 1800', `${name}: loaded food nutrition is used after quick add`);
  }
  await page.screenshot({ path: artifactPath(`${name}-quick-add.png`) });

  const savedToast = await page.locator('.toast').innerText();
  const mealLabel = ['早餐', '午餐', '晚餐', '加餐'].find((label) => savedToast.includes(label));
  const initialMealCounts = { 早餐: 2, 午餐: 1, 晚餐: 0, 加餐: 1 };
  await page.getByRole('button', { name: `展开${mealLabel}` }).click();
  check(await page.locator('.meal-entry').count() === initialMealCounts[mealLabel] + 1, `${name}: expanded meal reflects quick add`);

  await page.getByRole('button', { name: /开始训练|继续训练/ }).click();
  check(await page.getByRole('heading', { name: '上肢 A' }).isVisible(), `${name}: workout opens from home`);
  await page.screenshot({ path: artifactPath(`${name}-workout.png`) });
  const workoutText = await page.locator('.workout-screen').innerText();
  check(!workoutText.includes('kcal') && !workoutText.includes('回补'), `${name}: workout excludes calories and food credit`);
  if (name === '390x844') {
    check(['杠铃卧推', '坐姿划船', '哑铃肩推'].every((exercise) => workoutText.includes(exercise)) && workoutText.includes('2/10 组'), `${name}: loaded exercise data renders with set progress`, workoutText);
  }

  if (name === '390x844') {
    await page.getByRole('button', { name: '完成训练' }).click();
    check(await page.getByText('上肢 A · 已完成').isVisible(), `${name}: completing workout updates home immediately`);
    await page.screenshot({ path: artifactPath(`${name}-workout-completed.png`) });
    await page.getByRole('button', { name: '我的', exact: true }).click();
    check(await page.getByRole('heading', { name: '我的' }).isVisible(), `${name}: personal center opens from bottom tab`);
    const myText = await page.locator('.my-screen').innerText();
    check(!myText.includes('商城') && !myText.includes('拍照识别') && !myText.includes('健康平台'), `${name}: personal center excludes marketing and P1 entries`);
    await page.screenshot({ path: artifactPath(`${name}-my.png`) });

    await page.getByRole('button', { name: /训练模板/ }).click();
    const templateText = await page.locator('.template-list').innerText();
    check(['上肢 A', '卧推、划船、肩推 · 10 组', '下肢 A', '上肢 B'].every((value) => templateText.includes(value)), `${name}: loaded training template catalog renders`, templateText);
    await page.getByRole('button', { name: '返回' }).click();

    await page.getByRole('button', { name: /每周训练计划/ }).click();
    check(await page.locator('.plan-day-row').count() === 7, `${name}: loaded week data renders seven plan rows`);
    await page.getByRole('button', { name: '返回' }).click();

    await page.getByRole('button', { name: /饮食目标与餐次预算/ }).click();
    await page.locator('input[type="range"]').fill('1900');
    await page.getByRole('button', { name: '预览变更' }).click();
    check(await page.getByText('每日能量增加 100 kcal').isVisible(), `${name}: goal editor previews versioned change`);
    await page.screenshot({ path: artifactPath(`${name}-goal-preview.png`) });
    await page.getByRole('button', { name: '返回' }).click();

    await page.getByRole('button', { name: /隐私与账户/ }).click();
    const privacyText = await page.locator('.privacy-screen').innerText();
    check(privacyText.includes('健康记录处理') && privacyText.includes('云备份'), `${name}: privacy shows two P0 consent scopes`);
    check(!privacyText.includes('照片识别') && !privacyText.includes('健康平台'), `${name}: privacy hides P1 consent scopes`);
    await page.screenshot({ path: artifactPath(`${name}-privacy.png`) });
    await page.locator('.consent-row').nth(1).click();
    check(await page.getByRole('heading', { name: '撤回云备份同意？' }).isVisible(), `${name}: cloud withdrawal has specific confirmation`);
    await page.getByRole('button', { name: '取消' }).click();
    await page.getByRole('button', { name: '返回' }).click();

    await page.getByRole('button', { name: /数据导出与云备份/ }).click();
    check(await page.getByText('最后成功：今天 09:36').isVisible(), `${name}: backup page shows last successful time`);
    await page.screenshot({ path: artifactPath(`${name}-data.png`) });
    await page.getByRole('button', { name: '返回' }).click();
    await page.getByRole('button', { name: '今日', exact: true }).click();
    await page.getByRole('button', { name: '后一天' }).click();
    const futureRecordButton = page.getByRole('button', { name: '未来日期仅查看计划' });
    check(await futureRecordButton.isDisabled(), `${name}: future date disables factual food logging`);
    check(await page.getByText('尚未记录').count() === 4, `${name}: future date does not reuse completed meal records`);
    await page.screenshot({ path: artifactPath(`${name}-future-date.png`) });
  }

  check(apiRequests.length === 0, `${name}: mock mode makes no /api/ requests`, apiRequests.join(' | '));
  await page.close();
  check(errors.length === 0, `${name}: no browser console errors`, errors.join(' | '));
}

await captureMobile(390, 844, '390x844');
await captureMobile(375, 667, '375x667');
await captureMobile(430, 932, '430x932');

const desktop = await browser.newPage({ viewport: { width: 1365, height: 768 }, deviceScaleFactor: 1 });
const desktopErrors = [];
const desktopApiRequests = trackApiRequests(desktop);
desktop.on('console', (message) => { if (message.type() === 'error') desktopErrors.push(message.text()); });
desktop.on('pageerror', (error) => desktopErrors.push(error.message));
await loadMockApp(desktop, 'desktop');
await desktop.screenshot({ path: artifactPath('desktop-prototype.png') });
check(await desktop.getByText('移动端原型 · v0.1').isVisible(), 'desktop: studio sidebar is visible');
await desktop.getByRole('button', { name: 'PRD', exact: true }).click();
const prdStage = desktop.locator('.studio-stage');
await prdStage.getByText('产品定位', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
const prdText = await prdStage.innerText();
const prdSections = ['产品定位', '目标用户', 'P0 范围', '关键流程', '数据边界', 'API 边界', '验收指标'];
check(prdSections.every((section) => prdText.includes(section)), 'desktop: PRD tab renders all high-signal sections', prdText);
await desktop.screenshot({ path: artifactPath('desktop-prd.png'), fullPage: true });
await desktop.getByRole('button', { name: '线框总览' }).click();
check(await desktop.getByRole('heading', { name: '核心线框总览' }).isVisible(), 'desktop: wireframe overview opens');
check(await desktop.locator('.wire-phone').count() === 8, 'desktop: eight core wireframes render');
await desktop.screenshot({ path: artifactPath('desktop-wireframes.png'), fullPage: true });
await desktop.getByRole('button', { name: '交互原型' }).click();
await desktop.locator('.scene-nav button').filter({ hasText: '首次使用' }).click();
const bodyHeading = desktop.getByRole('heading', { name: '先认识你的身体', exact: true });
await bodyHeading.waitFor();
check(await bodyHeading.isVisible(), 'desktop: onboarding body step opens');

await desktop.getByLabel('身高', { exact: true }).fill('176');
await desktop.getByRole('button', { name: '男', exact: true }).click();
await desktop.getByLabel('年龄', { exact: true }).fill('17');
const bodyNext = desktop.getByRole('button', { name: /下一步|继续/ }).last();
const minorBlock = desktop.getByText(/未成年人|未满\s*18\s*岁/).last();
check(await minorBlock.isVisible(), 'desktop: age 17 shows the minor blocking state');
check(await bodyNext.isDisabled(), 'desktop: a minor cannot continue onboarding');
await desktop.screenshot({ path: artifactPath('desktop-onboarding-minor-blocked.png') });

await desktop.getByLabel('年龄', { exact: true }).fill('29');
check(!(await bodyNext.isDisabled()), 'desktop: a valid adult profile can continue');
await bodyNext.click();

const goalHeading = desktop.getByRole('heading', { name: '你的目标是什么？', exact: true });
await goalHeading.waitFor();
check(await goalHeading.isVisible(), 'desktop: onboarding goal step opens');
await desktop.getByRole('button', { name: '减脂', exact: true }).click();
await desktop.getByLabel('当前体重', { exact: true }).fill('73.2');
await desktop.getByLabel('目标体重', { exact: true }).fill('68');
await desktop.getByRole('button', { name: /下一步|继续/ }).last().click();

const routineHeading = desktop.getByRole('heading', { name: '你的日常与训练条件', exact: true });
await routineHeading.waitFor();
check(await routineHeading.isVisible(), 'desktop: onboarding routine step opens');
for (const choice of ['轻度活动', '新手', '每周3天', '健身房', '每次45分钟']) {
  await desktop.getByRole('button', { name: choice, exact: true }).click();
}
await desktop.getByRole('button', { name: /下一步|继续/ }).last().click();

const consentHeading = desktop.getByRole('heading', { name: '健康边界与数据同意', exact: true });
await consentHeading.waitFor();
check(await consentHeading.isVisible(), 'desktop: onboarding safety and consent step opens');
await desktop.getByRole('button', { name: '以上情况均无', exact: true }).click();
const consentCheckbox = desktop.getByRole('checkbox').last();
const previewButton = desktop.getByRole('button', { name: '生成计划预览', exact: true });
check(await previewButton.isDisabled(), 'desktop: plan preview requires explicit consent');
await consentCheckbox.check();
check(!(await previewButton.isDisabled()), 'desktop: explicit consent enables plan preview');
await previewButton.click();

const previewHeading = desktop.getByRole('heading', { name: '这是为你生成的起步计划', exact: true });
await previewHeading.waitFor({ state: 'visible', timeout: 10000 });
check(await previewHeading.isVisible(), 'desktop: generated plan preview opens');
const previewText = await desktop.locator('.onboarding-screen').innerText();
const kcalMatch = previewText.match(/(?:每日能量|能量目标|能量)[^\d]*([\d,]+)\s*kcal/i)
  || previewText.match(/([\d,]+)\s*kcal/i);
check(previewText.includes('演示估算'), 'desktop: preview labels the estimate as a demo');
check(Boolean(kcalMatch) && ['蛋白质', '碳水', '脂肪'].every((label) => previewText.includes(label)), 'desktop: preview shows energy and all macros', previewText);
check(previewText.includes('每周3天') || previewText.includes('每周 3 天'), 'desktop: preview shows the generated training schedule', previewText);
await desktop.screenshot({ path: artifactPath('desktop-onboarding-plan-preview.png') });

const previewKcal = kcalMatch?.[1].replaceAll(',', '');
await desktop.getByRole('button', { name: '确认并启用计划', exact: true }).click();
await desktop.locator('.record-food-button').waitFor();
const updatedSummary = await desktop.locator('.nutrition-summary').innerText();
const updatedWeight = await desktop.locator('.weight-section').innerText();
check(Boolean(previewKcal) && updatedSummary.includes(`目标 ${previewKcal}`), 'desktop: confirming the plan updates the home calorie target', updatedSummary);
check(updatedWeight.includes('73.2 kg'), 'desktop: confirming onboarding updates the home body weight', updatedWeight);
await desktop.screenshot({ path: artifactPath('desktop-onboarding-confirmed-home.png') });
check(desktopApiRequests.length === 0, 'desktop: mock mode makes no /api/ requests, including plan preview', desktopApiRequests.join(' | '));
check(desktopErrors.length === 0, 'desktop: no browser console errors', desktopErrors.join(' | '));
await desktop.close();

async function captureApiSuccess() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  const apiRequests = trackApiRequests(page);
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  const apiFixture = createApiBootstrapFixture({
    requestId: 'visual-api-success-01',
    displayName: 'API 验收用户',
    avatarText: '验',
    calories: 2460,
    protein: 137,
    carbs: 299,
    fat: 71,
    weightKg: 81.7,
    backupLabel: 'API 08:12',
  });

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/app-bootstrap')) {
      await fulfillJson(route, apiFixture);
      return;
    }
    await fulfillJson(route, { error: { code: 'UNEXPECTED_VISUAL_TEST_REQUEST' } }, 404);
  });

  await page.goto(withDataSource('api'), { waitUntil: 'domcontentloaded' });
  await page.locator('.nutrition-summary').waitFor({ state: 'visible', timeout: 10000 });
  const summaryText = await page.locator('.nutrition-summary').innerText();
  check(
    await page.locator('.main-progress').getAttribute('aria-label') === '已摄入 540，目标 2460',
    'api success: source api fixture drives its distinctive calorie target',
    summaryText,
  );
  check(summaryText.includes('137/137g') || summaryText.includes('/137g'), 'api success: distinctive macro target is rendered', summaryText);
  check((await page.locator('.weight-section').innerText()).includes('81.7 kg'), 'api success: distinctive API weight is rendered');
  await page.screenshot({ path: artifactPath('api-success-home.png') });

  await page.getByRole('button', { name: '我的', exact: true }).click();
  const myText = await page.locator('.my-screen').innerText();
  check(myText.includes('API 验收用户') && (myText.includes('2,460') || myText.includes('2460')), 'api success: distinctive API user and plan render in personal center', myText);
  check(apiRequests.some((request) => request.includes('/api/v1/app-bootstrap')), 'api success: real adapter requests app-bootstrap', apiRequests.join(' | '));
  check(errors.length === 0, 'api success: no browser console errors', errors.join(' | '));
  await page.screenshot({ path: artifactPath('api-success-my.png') });
  await page.close();
}

async function captureApiRetryRecovery() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  const apiRequests = trackApiRequests(page);
  let bootstrapAttempts = 0;
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  const recoveredFixture = createApiBootstrapFixture({
    requestId: 'visual-api-retry-02',
    displayName: 'API 重试用户',
    avatarText: '重',
    calories: 2710,
    protein: 149,
    carbs: 326,
    fat: 77,
    weightKg: 83.6,
    backupLabel: '重试后 08:13',
  });

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.endsWith('/app-bootstrap')) {
      await fulfillJson(route, { error: { code: 'UNEXPECTED_VISUAL_TEST_REQUEST' } }, 404);
      return;
    }
    bootstrapAttempts += 1;
    if (bootstrapAttempts === 1) {
      await fulfillJson(route, { error: { code: 'SERVICE_UNAVAILABLE', requestId: 'visual-api-503-01' } }, 503);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
    await fulfillJson(route, recoveredFixture);
  });

  await page.goto(withDataSource('api'), { waitUntil: 'domcontentloaded' });
  const errorState = page.getByRole('alert');
  await errorState.waitFor({ state: 'visible', timeout: 10000 });
  const errorText = await errorState.innerText();
  check(errorText.includes('业务数据读取失败') && errorText.includes('HTTP 503') && errorText.includes('真实 API'), 'api retry: 503 produces a retryable data error state', errorText);
  await page.screenshot({ path: artifactPath('api-503-error.png') });

  await page.getByRole('button', { name: '重新读取', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '正在读取业务数据' }).waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('.nutrition-summary').waitFor({ state: 'visible', timeout: 10000 });
  const recoveredSummary = await page.locator('.nutrition-summary').innerText();
  check(
    await page.locator('.main-progress').getAttribute('aria-label') === '已摄入 540，目标 2710',
    'api retry: clicking retry recovers with the second API fixture',
    recoveredSummary,
  );
  check((await page.locator('.weight-section').innerText()).includes('83.6 kg'), 'api retry: recovered API weight is rendered');
  check(bootstrapAttempts === 2, 'api retry: app-bootstrap is requested exactly twice', `attempts=${bootstrapAttempts}`);
  check(apiRequests.filter((request) => request.includes('/api/v1/app-bootstrap')).length === 2, 'api retry: request log contains the failed request and retry', apiRequests.join(' | '));
  const unexpectedErrors = errors.filter((message) => !message.includes('Failed to load resource') || !message.includes('503'));
  check(unexpectedErrors.length === 0, 'api retry: no unexpected browser errors', unexpectedErrors.join(' | '));
  await page.screenshot({ path: artifactPath('api-503-recovered.png') });
  await page.close();
}

await captureApiSuccess();
await captureApiRetryRecovery();

await browser.close();

for (const result of results) {
  const prefix = result.ok ? 'PASS' : 'FAIL';
  console.log(`${prefix}\t${result.message}${result.detail ? `\t${result.detail}` : ''}`);
}

if (results.some((result) => !result.ok)) process.exitCode = 1;
