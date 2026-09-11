# 食练格交互原型

基于 `PRD-ShiLianGe-v1.0.md` 制作的 React 移动端线框与交互原型。

## 运行

```powershell
npm install
npm run dev
```

浏览器打开终端显示的本地地址。桌面端包含“交互原型 / 线框总览 / PRD”工作台；宽度不超过 700px 时直接显示手机 App。

## 数据来源

项目将数据分成三层：

- `src/config/frontendConfig.js`：前端展示配置，例如标签、单位、建档选项和线框场景。
- `src/data-source/mock`：有明确标记的原型假数据与 Mock 计划策略。
- `src/data-source/real`：真实 HTTP API 适配器。

默认使用 Mock：

```powershell
$env:VITE_DATA_SOURCE='mock'
npm run dev
```

接真实后端：

```powershell
$env:VITE_DATA_SOURCE='api'
$env:VITE_API_BASE_URL='http://127.0.0.1:8080/api/v1'
npm run dev
```

开发时也可用 `?dataSource=mock`、`?dataSource=api` 或 `?dataSource=real` 临时切换。API 模式失败时会显示错误和重试，绝不静默回退 Mock。

真实后端当前需提供：

- `GET /api/v1/app-bootstrap`
- `POST /api/v1/plan-suggestions`
- `POST /api/v1/plans/activate`

Mock 与 API 必须返回相同 schema，响应会通过 `src/data-source/contracts.js` 校验后再交给页面。

## 已覆盖

- 今日页、日期切换、营养汇总和四餐折叠。
- 最近食物快速再记、搜索、份量换算和私人食物。
- 饮食条目编辑、复制、删除与撤销。
- 训练组记录、自动保留状态和完成训练。
- 我的、饮食目标、训练计划、趋势、模板和收藏。
- 数据导出、云备份、换机恢复、隐私同意与账户危险操作。
- 首次使用与未成年人阻断流程。

## 验证

```powershell
npm run check:data
npm run build
node scripts/visual-check.mjs
```

截图位于 `artifacts/`。自动化覆盖 `390x844`、`375x667`、`430x932` 和 `1365x768` 视口，以及 Mock 零 API 请求、真实 API 特征数据、503 错误与重试恢复。
