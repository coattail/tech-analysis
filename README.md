# Tech-Analysis · 科技公司财务可视化看板

[English](./README.en.md) | 简体中文

[![Auto Refresh Financial Data](https://github.com/coattail/tech-analysis/actions/workflows/data-auto-refresh.yml/badge.svg)](https://github.com/coattail/tech-analysis/actions/workflows/data-auto-refresh.yml)
[![Live Demo](https://img.shields.io/badge/Live-GitHub%20Pages-2ea44f?logo=github)](https://coattail.github.io/tech-analysis/)

基于纯前端与 Chart.js 的交互式财务分析页面，用于横向对比头部科技公司在不同时间粒度下的核心财务指标。

## 在线体验

- [GitHub Pages 演示](https://coattail.github.io/tech-analysis/)

## 核心能力

- 多指标切换：营收、净利润、毛利率、市盈率（P/E）、ROE、营收同比增速
- 多时间粒度：季度（Quarterly）/ 年度（Annual）/ 滚动年度（TTM）
- 多公司同图：支持单公司显隐、全部显示、全部隐藏
- 时间区间筛选：双端滑块快速定位分析窗口
- 预测标记：Tooltip 对预测数据打标（`（预测）`）
- 右侧代码标签：图表右缘动态显示股票代码（AAPL、MSFT 等）
- 图片导出：一键下载当前图表为 PNG

## 支持公司

Apple、Microsoft、Alphabet、Amazon、Meta、NVIDIA、TSMC、Broadcom、Tesla

## 指标口径与聚合规则

| 指标 | 季度口径 | 年度口径 | 滚动年度（TTM）口径 |
| --- | --- | --- | --- |
| 营收 (`revenue`) | 原始季度值 | 四季度求和 | 近四季度求和（起始不足四季时按年化） |
| 净利润 (`earnings`) | 原始季度值 | 四季度求和 | 近四季度求和（起始不足四季时按年化） |
| 毛利率 (`grossMargin`) | 原始季度值 | 以营收加权重算 | 近四季度营收加权重算 |
| 市盈率 (`pe`) | 原始季度值 | 取 Q4 | 近四季度均值 |
| ROE (`roe`) | 原始季度值 | 取 Q4 | 近四季度均值 |
| 营收同比增速 (`revenueGrowth`) | 原始季度值 | 基于年度营收同比计算 | 基于 TTM 营收同比计算（与前 4 季对比） |

## 技术栈

- `index.html`：页面结构与交互控件
- `style.css`：界面布局与深色风格样式
- `script.js`：数据加载、聚合计算、图表绘制、交互逻辑
- `data.js`：本地数据源（`window.FINANCIAL_SOURCE_DATA`）
- `Chart.js 4.4.1`：折线图渲染

> 本项目是无打包工具的静态站点，无需安装前端依赖。

## 快速开始

### 1) 克隆仓库

```bash
git clone https://github.com/coattail/tech-analysis.git
cd Tech-Analysis
```

### 2) 启动本地静态服务

```bash
python3 -m http.server 8110
```

浏览器打开：`http://127.0.0.1:8110`

## 数据结构（`data.js`）

```js
window.FINANCIAL_SOURCE_DATA = {
  meta: {
    generatedAt: "2026-02-27T00:01:07.073Z",
    periodRange: "2005Q1-2025Q4",
    autoRefresh: { ... }
  },
  periods: ["2005Q1", "2005Q2", ...],
  companies: {
    apple: {
      revenue: { "2025Q4": 124300000000, ... },
      earnings: { ... },
      grossMargin: { ... },
      pe: { ... },
      roe: { ... },
      revenueGrowth: { ... },
      forecastFlags: {
        revenue: ["2026Q1"],
        netIncome: [],
        grossMargin: [],
        pe: [],
        roe: [],
        revenueGrowth: []
      }
    }
  }
};
```

## 自动更新数据

项目内置脚本：`scripts/auto-refresh-data.mjs`

能力概览：

- 从 StockAnalysis 抓取季度财务数据（营收、净利润、毛利率）
- 非 USD 口径按 FRED 汇率换算为 USD（当前配置 TWD）
- 对台积电关键季度应用官方口径覆盖（含 `2024Q4` 至 `2025Q4`）
- 自动扩展 `periods`、清理被真实值覆盖的 `forecastFlags`
- 自动重算受影响区间的 `revenueGrowth`
- 无实质变化时跳过写入，避免空提交

常用命令：

```bash
# 正式更新 data.js
node scripts/auto-refresh-data.mjs

# 仅预览变更，不落盘
node scripts/auto-refresh-data.mjs --dry-run

# 仅更新指定公司（支持 id/ticker/slug，逗号分隔）
node scripts/auto-refresh-data.mjs --company nvidia
node scripts/auto-refresh-data.mjs --company nvda,tsm
```

## GitHub Actions 自动任务

工作流：`.github/workflows/data-auto-refresh.yml`

- 支持手动触发（`workflow_dispatch`）
- 每日定时执行（`cron: 15 23 * * *`，即 UTC 23:15）
- 运行 `node scripts/auto-refresh-data.mjs`
- `data.js` 有变化时自动提交到 `main`

## 项目结构

```text
Tech-Analysis/
├── .github/workflows/data-auto-refresh.yml  # 数据自动更新工作流
├── data.js                                  # 财务数据源
├── index.html                               # 页面与控件
├── script.js                                # 核心逻辑（聚合/图表/交互）
├── style.css                                # 样式文件
├── scripts/auto-refresh-data.mjs            # 数据自动刷新脚本
├── README.md                                # 中文文档（当前文件）
└── README.en.md                             # English README
```

## 常见问题

- 页面无图或空白
  - 检查浏览器 Console 是否有 `data.js` 加载错误
  - 确认 `window.FINANCIAL_SOURCE_DATA` 存在
- 切换后指标为空
  - 检查 `data.js` 对应公司与指标字段是否完整
- 图片下载无响应
  - 确认图表已加载完成，且浏览器未拦截下载

## 声明

本项目仅用于数据可视化与技术研究，不构成任何投资建议。
