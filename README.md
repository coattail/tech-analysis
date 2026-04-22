# Tech-Analysis · 科技公司财务可视化仪表盘

[English](./README.en.md) | 简体中文

[![Auto Refresh Financial Data](https://github.com/coattail/tech-analysis/actions/workflows/data-auto-refresh.yml/badge.svg)](https://github.com/coattail/tech-analysis/actions/workflows/data-auto-refresh.yml)
[![Deploy GitHub Pages](https://github.com/coattail/tech-analysis/actions/workflows/pages.yml/badge.svg)](https://github.com/coattail/tech-analysis/actions/workflows/pages.yml)
[![Live Demo](https://img.shields.io/badge/Live-GitHub%20Pages-2ea44f?logo=github)](https://coattail.github.io/tech-analysis/)

一个基于原生前端与 Chart.js 的静态财务分析看板，用来对比头部科技公司的核心财务指标，并支持季度、年度、滚动年度（TTM）三种时间粒度。

项目强调三件事：

- 数据阅读效率：同一套视图内切换指标、公司与时间区间
- 面向长期分析：默认展示完整历史，再通过底部滑块聚焦局部周期
- 可直接发布：无打包依赖，可本地运行，也可直接部署到 GitHub Pages

## 在线体验

- [GitHub Pages 演示](https://coattail.github.io/tech-analysis/)

## 功能特性

- 多指标切换：营收、净利润、毛利率、P/E、ROE、营收同比增速
- 多时间粒度：季度、年度、滚动年度（TTM）
- 多公司对比：支持单独显隐、全部显示、全部隐藏
- 单公司增强视图：单公司时可切换折线图与柱状图
- 时间区间过滤：底部双端滑块快速聚焦任意时间窗
- 自适应纵轴：根据当前可见数据动态计算上下界
- 尾部空区间裁剪：当当前样本公司在末尾年份或季度无数据时，横轴会自动裁掉尾部空标签
- 高清导出：一键导出当前图表为高分辨率 PNG
- 深色质感界面：面向数据产品场景优化的深色视觉与对比层级

## 覆盖公司

- Apple
- Microsoft
- Alphabet
- Amazon
- Meta
- NVIDIA
- TSMC
- Broadcom
- Tesla

## 指标说明

| 指标 | 数据键 | 季度口径 | 年度口径 | 滚动年度（TTM）口径 |
| --- | --- | --- | --- | --- |
| 营收 | `revenue` | 原始季度值 | 四季度求和 | 近四季度求和 |
| 净利润 | `earnings` | 原始季度值 | 四季度求和 | 近四季度求和 |
| 毛利率 | `grossMargin` | 原始季度值 | 以营收加权重算 | 近四季度营收加权重算 |
| 市盈率 | `pe` | 原始季度值 | 取 Q4 | 近四季度均值 |
| ROE | `roe` | 原始季度值 | 取 Q4 | 近四季度均值 |
| 营收同比增速 | `revenueGrowth` | 原始季度值 | 基于年度营收同比计算 | 基于 TTM 营收同比计算 |

## 技术栈

- `index.html`：页面结构
- `style.css`：布局、配色与视觉样式
- `script.js`：数据聚合、交互逻辑、图表渲染
- `data.js`：浏览器直接加载的数据源
- `assets/logos/`：单公司视图使用的透明底公司 Logo
- `Chart.js 4.4.1`：图表引擎

这是一个无构建步骤的静态站点，不需要安装前端依赖即可运行。

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/coattail/tech-analysis.git
cd tech-analysis
```

### 2. 启动静态服务器

任选一种方式：

```bash
python3 -m http.server 8110
```

或

```bash
npx serve .
```

浏览器打开本地静态服务地址即可。

## 数据文件结构

`data.js` 以 `window.FINANCIAL_SOURCE_DATA` 的形式暴露数据，大致结构如下：

```js
window.FINANCIAL_SOURCE_DATA = {
  meta: {
    generatedAt: "2026-04-22T06:43:00.000Z",
    periodRange: "2005Q1-2026Q1"
  },
  periods: ["2005Q1", "2005Q2", "..."],
  companies: {
    microsoft: {
      revenue: { "2025Q4": 81273000000 },
      earnings: { "2025Q4": 25824000000 },
      grossMargin: { "2025Q4": 69.4 },
      pe: { "2025Q4": 34.1 },
      roe: { "2025Q4": 31.2 },
      revenueGrowth: { "2025Q4": 15.7 },
      forecastFlags: {
        revenue: [],
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

## 数据更新

更新脚本位于 `scripts/auto-refresh-data.mjs`。

常用命令：

```bash
# 正式更新 data.js
node scripts/auto-refresh-data.mjs

# 仅预览，不写回文件
node scripts/auto-refresh-data.mjs --dry-run

# 只更新指定公司
node scripts/auto-refresh-data.mjs --company nvidia
node scripts/auto-refresh-data.mjs --company msft,tsm
```

脚本当前会处理：

- 财务数据抓取
- 部分非美元口径的汇率换算
- 台积电关键季度覆盖修正
- `forecastFlags` 清理
- `revenueGrowth` 受影响区间重算

## 自动化与部署

### 自动刷新数据

仓库内置工作流：`.github/workflows/data-auto-refresh.yml`

- 支持手动触发
- 支持定时更新
- 当 `data.js` 发生变化时自动提交到 `main`

### GitHub Pages 发布

仓库内置工作流：`.github/workflows/pages.yml`

- `main` 分支有新提交时自动触发
- 将静态文件发布到 GitHub Pages
- 默认发布文件：`index.html`、`style.css`、`script.js`、`data.js`

如果你 fork 本项目，请同步调整 README 中的徽章链接与 Pages 地址。

## 项目结构

```text
.
├── .github/workflows/
│   ├── data-auto-refresh.yml
│   └── pages.yml
├── assets/logos/
├── data.js
├── index.html
├── script.js
├── style.css
├── scripts/
│   └── auto-refresh-data.mjs
├── README.md
└── README.en.md
```

## 常见问题

### 页面打开后空白或无图表

- 确认 `data.js` 已被正确加载
- 确认使用的是静态服务器，而不是直接双击本地文件
- 检查浏览器控制台是否有资源加载错误

### 横轴末尾出现空年份或空季度

- 当前版本会自动裁掉尾部全空标签
- 如仍出现异常，请检查对应公司的末尾数据是否为 `null` 或被误写入

### 导出 PNG 不够清晰

- 当前导出为高分辨率重绘
- 若仍不满足需求，可继续上调导出倍率

## 免责声明

本项目仅用于数据可视化、产品演示与技术研究，不构成任何投资建议。
