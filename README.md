# 企业财务可视化（Tech）

一个基于纯前端技术实现的企业财务对比看板，支持在同一张图中对多家科技公司进行多指标、跨时间粒度分析，并可导出当前视图为 CSV。

在线访问地址：[https://sunny-1991.github.io/Tech/](https://sunny-1991.github.io/Tech/)

---

## 1. 项目能做什么

这个页面主要用于对比头部科技公司在不同时间区间内的财务表现，核心能力包括：

- 指标切换：营收、净利润、毛利率、市盈率（P/E）、ROE、营收同比增速
- 粒度切换：季度 / 年度 / 滚动年度（TTM）
- 公司显隐：支持单独开关公司，也可以一键全部显示/隐藏
- 区间筛选：通过双端滑块快速聚焦某个时间段
- 主题切换：清新风格与深色专业风格
- 数据导出：下载当前图表视图的 CSV（包含预测标记）

---

## 2. 技术栈与实现方式

本项目是一个**无构建工具**的静态站点，直接可部署在 GitHub Pages。

- HTML：页面结构和交互控件
- CSS：布局、主题、视觉样式
- JavaScript：数据处理、图表绘制、交互逻辑
- Chart.js：折线图绘制
- 数据载入：通过 `data.js` 注入全局对象 `window.FINANCIAL_SOURCE_DATA`

这意味着你无需安装依赖即可运行和修改，改完直接提交即可发布。

---

## 3. 本地开发快速开始

### 3.1 克隆仓库（首次）

```bash
git clone https://github.com/sunny-1991/Tech.git
cd Tech
```

### 3.2 本地预览

在项目根目录启动一个静态服务器（推荐 Python）：

```bash
/usr/bin/python3 -m http.server 8110
```

浏览器打开：`http://127.0.0.1:8110`

---

## 4. 项目目录说明

```text
Tech/
├── index.html   # 页面结构与控件（指标、粒度、公司开关、区间滑块、按钮）
├── style.css    # 页面样式与主题（清新/深色）
├── script.js    # 数据聚合、图表渲染、交互事件、CSV 导出
├── data.js      # 财务数据源（全局对象 FINANCIAL_SOURCE_DATA）
└── README.md    # 项目文档（本文件）
```

---

## 5. 数据结构说明（`data.js`）

`data.js` 提供一个全局对象：

```js
window.FINANCIAL_SOURCE_DATA = {
  meta: { ... },
  periods: ["2005Q1", "2005Q2", ...],
  companies: {
    apple: {
      revenue: { "2024Q4": 1234567890, ... },
      earnings: { ... },
      grossMargin: { ... },
      pe: { ... },
      roe: { ... },
      revenueGrowth: { ... },
      forecastFlags: {
        revenue: ["2025Q3", "2025Q4"],
        ...
      }
    },
    ...
  }
}
```

说明：

- `periods`：季度序列（X 轴基准）
- `companies`：各公司原始季度数据
- `forecastFlags`：预测数据标记，图表 tooltip 与 CSV 会显示/导出
- `meta.generatedAt`：数据生成时间，用于页面状态提示

---

## 6. 关键逻辑速读（`script.js`）

为了方便后续维护，建议先理解这几块：

- 聚合逻辑
  - `aggregateFlowAnnual`：季度流量指标 -> 年度求和（营收/净利润）
  - `aggregatePointAnnual`：季度点位指标 -> 年度取 Q4（P/E、ROE）
  - `aggregateFlowRollingAnnual`：季度 -> 滚动年度（TTM）
  - `aggregateMarginAnnual` / `aggregateMarginRollingAnnual`：毛利率按加权方式重算
- 增速逻辑
  - `computeAnnualRevenueGrowth`：年度同比
  - `computeRollingAnnualRevenueGrowth`：滚动年度同比
- 交互逻辑
  - 指标/粒度切换
  - 公司显隐
  - 时间范围双滑块
  - 主题切换（`fresh` / `deep`）
- 导出逻辑
  - `buildCurrentMetricCsv` + `downloadCurrentMetricCsv`

---

## 7. 常见修改任务怎么做

### 7.1 改页面文案/标题

- 修改 `index.html` 里的 `<h1>`、说明文案、按钮文本等。

### 7.2 改视觉样式

- 修改 `style.css`。
- 如果要新增主题变量，建议沿用现有 `body[data-theme="deep"]` 机制。

### 7.3 新增或调整指标

1. 在 `index.html` 的指标单选区增加选项
2. 在 `script.js` 的 `METRICS` 中新增指标定义
3. 在 `loadFromLocalData` 中补充该指标的数据读入与聚合
4. 校准 `formatYAxisTick`、`formatMetricValue`、CSV 导出格式

### 7.4 更新数据

- 直接替换 `data.js`（保持字段结构一致）。
- 刷新页面后看状态栏是否提示“加载完成”。

### 7.5 自动获取最新财报数据（新增）

项目已内置自动更新脚本：`scripts/auto-refresh-data.mjs`，会从 StockAnalysis 的季度财务页面抓取最新：

- 营收（`revenue`）
- 净利润（`netinc`）
- 毛利率（`grossMargin`）

并自动写回 `data.js`，同时：

- 自动扩展新季度（例如从 `2025Q4` 扩展到 `2026Q1`）
- 用真实值覆盖后，自动清理对应季度的预测标记（`forecastFlags`）
- 更新 `meta.generatedAt` 与 `meta.periodRange`
- 对 TWD 财务口径自动按 FRED 汇率换算为 USD（当前用于台积电）
- 其他未配置的非 USD 口径会自动跳过，避免单位污染
- 若无真实数据变化则不写入 `data.js`（避免空提交）

本地手动执行：

```bash
node scripts/auto-refresh-data.mjs
```

仅验证不落盘（Dry Run）：

```bash
node scripts/auto-refresh-data.mjs --dry-run
```

仅更新单个公司（例如英伟达）：

```bash
node scripts/auto-refresh-data.mjs --company nvidia
```

`--company` 也支持 ticker / slug（例如 `--company nvda`、`--company tsm`）。

---

## 8. 发布到 GitHub Pages

本项目默认由 `main` 分支驱动 GitHub Pages。

本地修改后执行：

```bash
git add .
git commit -m "docs: update README"
git push origin main
```

推送后等待 GitHub Pages 构建完成，线上地址通常在几十秒到几分钟内更新。

> 仓库已新增 GitHub Actions 工作流：`.github/workflows/data-auto-refresh.yml`。  
> 它会每日定时运行自动更新脚本，并在 `data.js` 有变化时自动提交到 `main`。

---

## 9. 常见问题排查

- 页面空白或图表不显示
  - 打开浏览器开发者工具 Console，检查 `data.js` 是否加载报错
  - 检查 `window.FINANCIAL_SOURCE_DATA` 是否存在
- 切换指标后全是空值
  - 检查对应指标在 `data.js` 中是否有该公司数据
- CSV 下载没有触发
  - 检查浏览器是否拦截下载
  - 确认图表已成功加载（页面状态栏会提示）

---

## 10. 后续优化建议（可选）

- 增加数据更新脚本，自动生成 `data.js`
- 增加公司筛选分组（平台、半导体、电商等）
- 增加“同环比切换”与“统一单位切换”
- 引入简单测试（例如数据结构校验）减少发布风险

---

如需继续迭代，建议优先保持 `data.js` 字段稳定，再扩展 `script.js`，这样最不容易引入回归问题。
