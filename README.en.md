# Tech-Analysis · Big Tech Financial Dashboard

English | [简体中文](./README.md)

[![Auto Refresh Financial Data](https://github.com/coattail/tech-analysis/actions/workflows/data-auto-refresh.yml/badge.svg)](https://github.com/coattail/tech-analysis/actions/workflows/data-auto-refresh.yml)
[![Deploy GitHub Pages](https://github.com/coattail/tech-analysis/actions/workflows/pages.yml/badge.svg)](https://github.com/coattail/tech-analysis/actions/workflows/pages.yml)
[![Live Demo](https://img.shields.io/badge/Live-GitHub%20Pages-2ea44f?logo=github)](https://coattail.github.io/tech-analysis/)

A static financial analytics dashboard built with plain frontend technologies and Chart.js. It compares key metrics across leading global technology and mega-cap companies over quarterly, annual, and rolling annual (TTM) views.

The project focuses on three things:

- fast analytical reading across companies, metrics, and time ranges
- long-horizon trend analysis with full-history default views
- simple deployment as a no-build static site

## Live Demo

- [GitHub Pages demo](https://coattail.github.io/tech-analysis/)

## Features

- Metric switching: Revenue, Net Income, Gross Margin, P/E, ROE, Revenue YoY Growth
- Multi-frequency views: Quarterly, Annual, Rolling Annual (TTM)
- Multi-company comparison: per-company visibility toggles, Show All, Hide All
- Enhanced single-company mode: switch between line and bar charts
- Single-company stock-price comparison for revenue/net-income bar charts
- Time-range filtering via dual-handle slider
- Adaptive y-axis bounds based on the currently visible data
- Trailing empty-period trimming: if the selected companies do not have data for the latest year or quarter, empty labels at the end are removed automatically
- High-resolution PNG export
- Refined dark UI tailored for data-product style presentation

## Covered Companies

As of July 6, 2026, the sample covers 46 leading global companies across mega-cap technology, enterprise software, cloud computing, and semiconductors:

- NVIDIA, Alphabet, Apple, Microsoft, Amazon, Broadcom, Meta, TSMC, Tesla, Walmart
- Berkshire Hathaway, JPMorgan Chase, Eli Lilly, Exxon Mobil, Visa, ASML, Micron, Johnson & Johnson, Oracle, AMD
- Mastercard, Costco, Netflix, Bank of America, Caterpillar, Chevron, Palantir, Cisco, AbbVie, Home Depot
- IBM, SAP, CrowdStrike, Salesforce, ServiceNow, Datadog, Snowflake, Cloudflare, Adobe, Zoom
- CoreWeave, Nebius, ChronoScale, SharonAI, Samsung Electronics, SK hynix

Samsung Electronics and SK hynix complete quarterly fundamentals use KRX reporting, are converted to USD with quarterly exchange rates, and extend back to 2018Q1. Their earlier valuation series extend to 2005Q4 and 2007Q4 respectively, while stock prices use KRW quotes from the Korea Exchange.

## Metric Definitions

| Metric | Data Key | Quarterly | Annual | Rolling Annual (TTM) |
| --- | --- | --- | --- | --- |
| Revenue | `revenue` | Raw quarterly value | Sum of four quarters | Sum of the latest complete four quarters; null until four quarters are present |
| Net Income | `earnings` | Raw quarterly value | Sum of four quarters | Sum of the latest complete four quarters; null until four quarters are present |
| Gross Margin | `grossMargin` | Raw quarterly value | Revenue-weighted recomputation | Revenue-weighted recomputation over the latest complete four quarters; null until four quarters are present |
| P/E | `pe` | Raw quarterly value | Q4 snapshot | Complete four-quarter average; null until four quarters are present |
| ROE | `roe` | Raw quarterly value | Q4 snapshot | Complete four-quarter average; null until four quarters are present |
| Revenue YoY Growth | `revenueGrowth` | Raw quarterly value | Calculated from annual revenue | Calculated from complete TTM revenue; null until four quarters are present |

## Stack

- `index.html`: page structure
- `style.css`: layout, colors, and visual system
- `script.js`: data aggregation, interactions, and chart rendering
- `data.js`: browser-loaded data source
- `price-data.js`: browser-loaded daily adjusted-close stock-price data source
- `assets/logos/`: transparent company logos used in single-company views
- `Chart.js 4.4.1`: charting engine

This is a no-build static site. No frontend dependency installation is required for local preview.

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/coattail/tech-analysis.git
cd tech-analysis
```

### 2. Start a static server

Use any static server you prefer, for example:

```bash
python3 -m http.server 8110
```

or

```bash
npx serve .
```

Then open the local server URL in your browser.

## Data Shape

`data.js` exposes data through `window.FINANCIAL_SOURCE_DATA`:

```js
window.FINANCIAL_SOURCE_DATA = {
  meta: {
    generatedAt: "2026-04-22T06:43:00.000Z",
    periodRange: "2004Q2-2026Q2"
  },
  periods: ["2004Q2", "2004Q3", "..."],
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

## Data Refresh

The updater script lives at `scripts/auto-refresh-data.mjs`.

Common commands:

```bash
# Update data.js
node scripts/auto-refresh-data.mjs

# Dry run only
node scripts/auto-refresh-data.mjs --dry-run

# Refresh selected companies only
node scripts/auto-refresh-data.mjs --company nvidia
node scripts/auto-refresh-data.mjs --company msft,tsm
```

The script currently handles:

- financial data fetching
- quarterly P/E from StockAnalysis and CompaniesMarketCap, with auditable gaps derived from historical market cap / TTM earnings
- SEC instant net-assets facts plus CompaniesMarketCap historical net-assets backfills and automatic ROE recalculation
- gross margin from direct SEC gross-profit facts or revenue minus cost of revenue
- selected FX conversion for non-USD reporting
- TSMC override corrections for key periods
- auditable early-quarter corrections from company annual reports and SEC 6-K/10-K filings
- `forecastFlags` cleanup
- recomputation of impacted `revenueGrowth` ranges

Stock-price data uses a standalone refresh script:

```bash
node scripts/auto-refresh-price-data.mjs
```

The script pulls daily adjusted-close values from the Yahoo Finance chart endpoint and writes them into `price-data.js` for the single-company stock-price comparison view.

## Automation and Deployment

### Automated Data Refresh

Workflow: `.github/workflows/data-auto-refresh.yml`

- supports manual runs
- supports scheduled updates
- auto-commits when `data.js` or `price-data.js` changes

### GitHub Pages Deployment

Workflow: `.github/workflows/pages.yml`

- runs on pushes to `main`
- publishes the static site to GitHub Pages
- deploys `index.html`, `style.css`, `script.js`, `data.js`, `price-data.js`, and `price-comparison.js`

If you fork this repository, update the badge links and demo URL in the README files accordingly.

## Project Structure

```text
.
├── .github/workflows/
│   ├── data-auto-refresh.yml
│   └── pages.yml
├── assets/logos/
├── data.js
├── price-data.js
├── index.html
├── script.js
├── style.css
├── scripts/
│   ├── auto-refresh-data.mjs
│   └── auto-refresh-price-data.mjs
├── README.md
└── README.en.md
```

## Troubleshooting

### Blank page or missing chart

- make sure `data.js` is loaded correctly
- run the project from a static server instead of opening files directly
- inspect the browser console for asset loading errors

### Empty year or quarter at the end of the x-axis

- the current version trims trailing empty labels automatically
- if it still happens, inspect the last data points for the selected company set

### PNG export is not sharp enough

- current export uses a high-resolution re-render pass
- the export multiplier can be increased further if needed

## Disclaimer

This project is for visualization, product demonstration, and technical research only. It is not investment advice.
