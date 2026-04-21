# Tech-Analysis · Big Tech Financial Dashboard

English | [简体中文](./README.md)

[![Auto Refresh Financial Data](https://github.com/coattail/tech-analysis/actions/workflows/data-auto-refresh.yml/badge.svg)](https://github.com/coattail/tech-analysis/actions/workflows/data-auto-refresh.yml)
[![Live Demo](https://img.shields.io/badge/Live-GitHub%20Pages-2ea44f?logo=github)](https://coattail.github.io/tech-analysis/)

An interactive financial analytics dashboard built with plain frontend + Chart.js, designed to compare key metrics across leading technology companies over multiple time granularities.

## Live Demo

- [GitHub Pages](https://coattail.github.io/tech-analysis/)

## Key Features

- Metric switching: Revenue, Net Income, Gross Margin, P/E, ROE, Revenue YoY Growth
- Multi-frequency views: Quarterly / Annual / Rolling Annual (TTM)
- Multi-company comparison: per-company toggles, Show All, Hide All
- Time-range filtering: dual-handle slider for focused analysis windows
- Forecast tagging: tooltips mark forecasted points (`(Forecast)`)
- Right-side ticker labels: dynamic ticker tags on chart edge (AAPL, MSFT, etc.)
- PNG export: download current chart as an image

## Covered Companies

Apple, Microsoft, Alphabet, Amazon, Meta, NVIDIA, TSMC, Broadcom, Tesla

## Metric Definitions and Aggregation Rules

| Metric | Quarterly | Annual | Rolling Annual (TTM) |
| --- | --- | --- | --- |
| Revenue (`revenue`) | Raw quarterly value | Sum of Q1-Q4 | Sum of latest 4 quarters (annualized at dataset start if <4) |
| Net Income (`earnings`) | Raw quarterly value | Sum of Q1-Q4 | Sum of latest 4 quarters (annualized at dataset start if <4) |
| Gross Margin (`grossMargin`) | Raw quarterly value | Revenue-weighted recomputation | Revenue-weighted recomputation on trailing 4 quarters |
| P/E (`pe`) | Raw quarterly value | Q4 snapshot | 4-quarter moving average |
| ROE (`roe`) | Raw quarterly value | Q4 snapshot | 4-quarter moving average |
| Revenue YoY (`revenueGrowth`) | Raw quarterly value | Calculated from annual revenue | Calculated from TTM revenue vs 4 quarters earlier |

## Tech Stack

- `index.html`: page layout and controls
- `style.css`: dashboard styling and dark theme visuals
- `script.js`: loading, aggregation, chart rendering, and interactions
- `data.js`: local data source (`window.FINANCIAL_SOURCE_DATA`)
- `Chart.js 4.4.1`: line chart engine

> This is a no-build static project. No frontend dependency installation is required.

## Quick Start

### 1) Clone

```bash
git clone https://github.com/coattail/tech-analysis.git
cd Tech-Analysis
```

### 2) Run a local static server

```bash
python3 -m http.server 8110
```

Open: `http://127.0.0.1:8110`

## Data Shape (`data.js`)

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

## Auto Refresh Script

Built-in updater: `scripts/auto-refresh-data.mjs`

What it does:

- Pulls quarterly revenue/net income/gross margin from StockAnalysis
- Converts non-USD financials to USD via FRED FX series (TWD currently configured)
- Applies official TSMC overrides for key quarters (`2024Q4` to `2025Q4`)
- Expands `periods`, clears forecast flags replaced by actuals
- Recomputes impacted `revenueGrowth` points
- Skips file writes when there is no effective change

Commands:

```bash
# Update data.js
node scripts/auto-refresh-data.mjs

# Dry run (no file write)
node scripts/auto-refresh-data.mjs --dry-run

# Update specific companies (id/ticker/slug, comma-separated)
node scripts/auto-refresh-data.mjs --company nvidia
node scripts/auto-refresh-data.mjs --company nvda,tsm
```

## GitHub Actions Automation

Workflow: `.github/workflows/data-auto-refresh.yml`

- Manual trigger via `workflow_dispatch`
- Daily schedule at `23:15 UTC` (`cron: 15 23 * * *`)
- Runs `node scripts/auto-refresh-data.mjs`
- Auto-commits to `main` when `data.js` changes

## Project Structure

```text
Tech-Analysis/
├── .github/workflows/data-auto-refresh.yml  # Auto-refresh workflow
├── data.js                                  # Financial data source
├── index.html                               # UI and controls
├── script.js                                # Core logic (aggregation/chart/interactions)
├── style.css                                # Styles
├── scripts/auto-refresh-data.mjs            # Data refresh script
├── README.md                                # Chinese README
└── README.en.md                             # This file
```

## Troubleshooting

- Blank page / missing chart
  - Check browser Console for `data.js` loading errors
  - Verify `window.FINANCIAL_SOURCE_DATA` exists
- Empty values after metric switch
  - Verify metric/company fields in `data.js`
- PNG download does not trigger
  - Ensure chart is loaded and browser download blocking is disabled

## Disclaimer

This project is for visualization and technical research only, not investment advice.
