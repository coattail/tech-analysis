# Stock Price Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stock-price comparison toggle for single-company revenue/net-income bar charts, backed by a separate daily adjusted-close dataset and rendered as a right-axis line overlay.

**Architecture:** Keep the existing static-site structure, but isolate the new price-comparison logic in a small browser-compatible utility file that can also be required by Node tests. Preserve the current category-axis chart architecture in `script.js`; when the toggle is valid and enabled, derive an auxiliary price overlay dataset from `price-data.js`, attach it to a secondary Y axis, and leave the existing finance dataset pipeline intact.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Chart.js 4.4.1, Node.js built-in test runner (`node --test`), static data files loaded in the browser.

---

## File Structure

- **Create** `price-comparison.js` — browser/global utility module for pure price-comparison helpers such as visibility gating, date-window resolution, and daily-price projection onto the active finance-label window.
- **Create** `tests/price-comparison.test.cjs` — Node unit tests for the new helper module.
- **Create** `price-data.js` — browser-loaded stock-price dataset shaped as `window.STOCK_PRICE_SOURCE_DATA`.
- **Create** `scripts/auto-refresh-price-data.mjs` — standalone price refresh script that normalizes daily adjusted-close data into `price-data.js`.
- **Modify** `index.html` — load the new scripts and add the stock-price toggle markup.
- **Modify** `style.css` — style the new toggle and the comparison legend state.
- **Modify** `script.js` — wire toggle state, price overlay rendering, right-axis behavior, tooltip formatting, missing-data messaging, and export compatibility.
- **Modify** `README.md` and `README.en.md` — document the new feature, new data file, and refresh script.

## Data-Source Decision

Use a provider that exposes daily adjusted-close history explicitly. The implementation should normalize provider output into the local `price-data.js` schema so the frontend is provider-agnostic. If the chosen provider changes later, only `scripts/auto-refresh-price-data.mjs` should need to change.

## Task 1: Add a testable price-comparison utility module

**Files:**
- Create: `price-comparison.js`
- Create: `tests/price-comparison.test.cjs`

- [ ] **Step 1: Write the failing unit tests**

Create `tests/price-comparison.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canShowPriceComparison,
  getVisiblePeriodDateRange,
  buildProjectedPriceSeries,
} = require('../price-comparison.js');

test('shows price comparison only for one visible company in revenue/net-income bar mode', () => {
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: 'bar', metric: 'revenue' }), true);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: 'bar', metric: 'netIncome' }), true);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 2, chartMode: 'bar', metric: 'revenue' }), false);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: 'line', metric: 'revenue' }), false);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: 'bar', metric: 'grossMargin' }), false);
});

test('maps visible quarterly labels to an inclusive calendar-date window', () => {
  assert.deepEqual(getVisiblePeriodDateRange(['2025Q3', '2025Q4'], 'quarterly'), {
    startDate: '2025-07-01',
    endDate: '2025-12-31',
  });
});

test('maps visible annual labels to an inclusive calendar-date window', () => {
  assert.deepEqual(getVisiblePeriodDateRange(['2024', '2025'], 'annual'), {
    startDate: '2024-01-01',
    endDate: '2025-12-31',
  });
});

test('projects daily adjusted-close data into chart points within the active window', () => {
  const result = buildProjectedPriceSeries({
    dailyPrices: {
      '2025-06-30': 90,
      '2025-07-01': 100,
      '2025-08-15': 110,
      '2025-12-31': 130,
      '2026-01-02': 140,
    },
    visibleLabels: ['2025Q3', '2025Q4'],
    frequency: 'quarterly',
  });

  assert.deepEqual(result, [
    { x: 0, y: 100, date: '2025-07-01' },
    { x: 0.4945652173913043, y: 110, date: '2025-08-15' },
    { x: 1, y: 130, date: '2025-12-31' },
  ]);
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: FAIL because `price-comparison.js` does not exist yet.

- [ ] **Step 3: Implement the minimal utility module**

Create `price-comparison.js`:

```js
(function attachPriceComparison(globalScope) {
  const ALLOWED_PRICE_COMPARISON_METRICS = new Set(['revenue', 'netIncome']);

  function canShowPriceComparison({ visibleCompanyCount, chartMode, metric }) {
    return visibleCompanyCount === 1 && chartMode === 'bar' && ALLOWED_PRICE_COMPARISON_METRICS.has(metric);
  }

  function quarterToDateRange(label) {
    const match = /^(\d{4})Q([1-4])$/.exec(label);
    if (!match) return null;
    const year = Number(match[1]);
    const quarter = Number(match[2]);
    const monthStarts = ['01', '04', '07', '10'];
    const monthEnds = ['03-31', '06-30', '09-30', '12-31'];
    return {
      startDate: `${year}-${monthStarts[quarter - 1]}-01`,
      endDate: `${year}-${monthEnds[quarter - 1]}`,
    };
  }

  function annualToDateRange(label) {
    if (!/^\d{4}$/.test(label)) return null;
    return { startDate: `${label}-01-01`, endDate: `${label}-12-31` };
  }

  function getVisiblePeriodDateRange(visibleLabels, frequency) {
    if (!Array.isArray(visibleLabels) || visibleLabels.length === 0) return null;
    const first = visibleLabels[0];
    const last = visibleLabels.at(-1);
    const resolver = frequency === 'annual' ? annualToDateRange : quarterToDateRange;
    const firstRange = resolver(first);
    const lastRange = resolver(last);
    if (!firstRange || !lastRange) return null;
    return { startDate: firstRange.startDate, endDate: lastRange.endDate };
  }

  function dateToUtcMs(dateKey) {
    const ms = Date.parse(`${dateKey}T00:00:00Z`);
    return Number.isFinite(ms) ? ms : null;
  }

  function buildProjectedPriceSeries({ dailyPrices, visibleLabels, frequency }) {
    const range = getVisiblePeriodDateRange(visibleLabels, frequency);
    if (!range || !dailyPrices || typeof dailyPrices !== 'object') return [];

    const startMs = dateToUtcMs(range.startDate);
    const endMs = dateToUtcMs(range.endDate);
    if (startMs == null || endMs == null || endMs <= startMs) return [];

    return Object.entries(dailyPrices)
      .map(([date, value]) => ({ date, value: Number(value), ms: dateToUtcMs(date) }))
      .filter((item) => item.ms != null && Number.isFinite(item.value) && item.ms >= startMs && item.ms <= endMs)
      .sort((left, right) => left.ms - right.ms)
      .map((item) => ({
        x: ((item.ms - startMs) / (endMs - startMs)) * Math.max(visibleLabels.length - 1, 1),
        y: item.value,
        date: item.date,
      }));
  }

  const api = { canShowPriceComparison, getVisiblePeriodDateRange, buildProjectedPriceSeries };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.PriceComparisonUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run the tests to verify GREEN**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add price-comparison.js tests/price-comparison.test.cjs
git commit -m "test: add price comparison helpers"
```

## Task 2: Add standalone price data refresh plumbing

**Files:**
- Create: `scripts/auto-refresh-price-data.mjs`
- Create: `price-data.js`
- Modify: `README.md`
- Modify: `README.en.md`

- [ ] **Step 1: Write the failing refresh-script test fixture check**

Extend `tests/price-comparison.test.cjs` with a provider-normalization test that imports helper functions from the future script module:

```js
const { normalizeAdjustedCloseRows } = require('../price-refresh-helpers.cjs');

test('normalizes provider rows into sorted adjusted-close records', () => {
  assert.deepEqual(
    normalizeAdjustedCloseRows([
      { date: '2025-01-03', adjustedClose: '103.5' },
      { date: 'bad-date', adjustedClose: '99' },
      { date: '2025-01-02', adjustedClose: '101.25' },
      { date: '2025-01-04', adjustedClose: null },
    ]),
    {
      '2025-01-02': 101.25,
      '2025-01-03': 103.5,
    },
  );
});
```

Create `price-refresh-helpers.cjs` only after the failing test proves the need for it.

- [ ] **Step 2: Run the tests to verify RED**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: FAIL because `price-refresh-helpers.cjs` does not exist yet.

- [ ] **Step 3: Implement the minimal refresh helper and script**

Create `price-refresh-helpers.cjs`:

```js
function normalizeAdjustedCloseRows(rows) {
  return Object.fromEntries(
    rows
      .map((row) => ({ date: String(row?.date || ''), value: Number(row?.adjustedClose) }))
      .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.value))
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((row) => [row.date, row.value]),
  );
}

module.exports = { normalizeAdjustedCloseRows };
```

Create `scripts/auto-refresh-price-data.mjs` with these responsibilities:

```js
#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizeAdjustedCloseRows } = require('../price-refresh-helpers.cjs');

const PRICE_DATA_JS_PATH = new URL('../price-data.js', import.meta.url);
const COMPANY_SOURCES = [
  { id: 'nvidia', ticker: 'NVDA' },
  { id: 'alphabet', ticker: 'GOOGL' },
  { id: 'apple', ticker: 'AAPL' },
  { id: 'microsoft', ticker: 'MSFT' },
  // keep the remaining 26 companies aligned with script.js
];

async function fetchDailyAdjustedSeries(company) {
  throw new Error(`Provider integration not configured for ${company.ticker}`);
}

function formatPriceDataJs(data) {
  return `window.STOCK_PRICE_SOURCE_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

async function main() {
  const companies = {};
  for (const company of COMPANY_SOURCES) {
    const rows = await fetchDailyAdjustedSeries(company);
    companies[company.id] = { daily: normalizeAdjustedCloseRows(rows) };
  }

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: '<provider>',
      priceType: 'adjusted-close',
    },
    companies,
  };

  await writeFile(PRICE_DATA_JS_PATH, formatPriceDataJs(payload), 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Seed `price-data.js` with a valid empty payload so the browser can load safely before the first data refresh:

```js
window.STOCK_PRICE_SOURCE_DATA = {
  "meta": {
    "generatedAt": null,
    "source": null,
    "priceType": "adjusted-close"
  },
  "companies": {}
};
```

Update both README files to document:

- the new stock-price comparison capability;
- `price-data.js` as a separate data source;
- `scripts/auto-refresh-price-data.mjs` as a standalone updater.

- [ ] **Step 4: Run the tests to verify GREEN**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add price-refresh-helpers.cjs scripts/auto-refresh-price-data.mjs price-data.js README.md README.en.md tests/price-comparison.test.cjs
git commit -m "feat: add stock price data plumbing"
```

## Task 3: Add the comparison toggle UI and lifecycle rules

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `script.js`
- Test: `tests/price-comparison.test.cjs`

- [ ] **Step 1: Write failing helper tests for lifecycle reset behavior**

Extend `tests/price-comparison.test.cjs`:

```js
const { shouldResetPriceComparison } = require('../price-comparison.js');

test('resets price comparison when the current chart context becomes invalid', () => {
  assert.equal(shouldResetPriceComparison({
    enabled: true,
    visibleCompanyCount: 1,
    chartMode: 'line',
    metric: 'revenue',
  }), true);
  assert.equal(shouldResetPriceComparison({
    enabled: true,
    visibleCompanyCount: 1,
    chartMode: 'bar',
    metric: 'revenue',
  }), false);
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: FAIL because `shouldResetPriceComparison` is not implemented yet.

- [ ] **Step 3: Implement the minimal helper and UI wiring**

Update `price-comparison.js`:

```js
function shouldResetPriceComparison({ enabled, visibleCompanyCount, chartMode, metric }) {
  return Boolean(enabled) && !canShowPriceComparison({ visibleCompanyCount, chartMode, metric });
}
```

Expose it through the exported `api` object.

Update `index.html`:

```html
<div id="priceComparisonControl" class="price-comparison-control" hidden>
  <label class="price-comparison-toggle">
    <input id="priceComparisonToggle" type="checkbox" />
    <span>股价对比</span>
  </label>
</div>
```

Place that block beside the existing `chartModeControl` within `.chart-side-tools`.

Also load the new browser scripts before `script.js`:

```html
<script defer src="price-data.js"></script>
<script defer src="price-comparison.js"></script>
```

Update `style.css` with matching control styles that visually align with the existing single-company controls.

Update `script.js`:

```js
const priceComparisonControlEl = document.getElementById('priceComparisonControl');
const priceComparisonToggleEl = document.getElementById('priceComparisonToggle');

state.priceComparisonEnabled = false;

function syncPriceComparisonControl() {
  const singleCompanyId = getSingleVisibleCompanyId();
  const canShow = PriceComparisonUtils.canShowPriceComparison({
    visibleCompanyCount: state.visibleCompanies.size,
    chartMode: getEffectiveChartMode(),
    metric: state.metric,
  });

  if (PriceComparisonUtils.shouldResetPriceComparison({
    enabled: state.priceComparisonEnabled,
    visibleCompanyCount: state.visibleCompanies.size,
    chartMode: getEffectiveChartMode(),
    metric: state.metric,
  })) {
    state.priceComparisonEnabled = false;
  }

  if (priceComparisonControlEl) priceComparisonControlEl.hidden = !canShow;
  if (priceComparisonToggleEl) priceComparisonToggleEl.checked = canShow && state.priceComparisonEnabled;
  return Boolean(singleCompanyId) && canShow;
}
```

Call `syncPriceComparisonControl()` from `updateViewSummary()` and bind toggle changes to update `state.priceComparisonEnabled` followed by `refreshChart('none')`.

- [ ] **Step 4: Run the tests to verify GREEN**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add price-comparison.js index.html style.css script.js tests/price-comparison.test.cjs
git commit -m "feat: add stock price comparison toggle"
```

## Task 4: Render the right-axis stock-price overlay

**Files:**
- Modify: `script.js`
- Test: `tests/price-comparison.test.cjs`

- [ ] **Step 1: Write the failing test for active price-overlay dataset creation**

Extend `tests/price-comparison.test.cjs` with a pure helper test:

```js
const { buildProjectedPriceSeries } = require('../price-comparison.js');

test('returns no projected points when the active window has no price data', () => {
  assert.deepEqual(buildProjectedPriceSeries({
    dailyPrices: { '2024-01-02': 100 },
    visibleLabels: ['2025Q1'],
    frequency: 'quarterly',
  }), []);
});
```

- [ ] **Step 2: Run the tests to verify RED or confirm coverage gap**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: PASS if the previous implementation already covers this behavior. If it passes immediately, add one more edge-case test for annual mode projection over multiple years so the next implementation step still begins from an uncovered behavior.

- [ ] **Step 3: Implement the overlay dataset in `script.js`**

Add helper functions:

```js
function getSingleCompanyDailyPrices() {
  const singleCompanyId = getSingleVisibleCompanyId();
  return window.STOCK_PRICE_SOURCE_DATA?.companies?.[singleCompanyId]?.daily ?? null;
}

function buildPriceOverlayDataset(visibleLabels) {
  if (!state.priceComparisonEnabled) return null;
  const dailyPrices = getSingleCompanyDailyPrices();
  const projected = PriceComparisonUtils.buildProjectedPriceSeries({
    dailyPrices,
    visibleLabels,
    frequency: state.frequency,
  });
  if (projected.length === 0) return null;

  return {
    type: 'line',
    label: '股价',
    priceOverlay: true,
    data: projected,
    parsing: false,
    yAxisID: 'yPrice',
    borderColor: '#4da3ff',
    backgroundColor: '#4da3ff',
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 3,
    tension: 0.12,
    hidden: false,
  };
}
```

Inside `buildDatasetsForView()`:

- keep the existing finance datasets unchanged;
- after visible labels are finalized, append `buildPriceOverlayDataset(visibleLabels)` when present;
- ensure hidden/visibility loops skip datasets marked `priceOverlay`.

Update `syncChartDatasets()` so price overlay datasets are keyed separately from finance-company datasets and are not accidentally recycled into company datasets.

Add a second scale in `buildChart()`:

```js
yPrice: {
  display: false,
  position: 'right',
  title: {
    display: true,
    text: '股价（USD）',
  },
  grid: { drawOnChartArea: false },
  ticks: {
    callback(value) {
      return `$${decimalFormatter.format(Number(value))}`;
    },
  },
}
```

In `refreshChart()`:

- set `yPrice.display = state.priceComparisonEnabled && Boolean(priceOverlayDataset)`;
- compute right-axis min/max from the projected price values only;
- leave left-axis finance bounds unchanged.

- [ ] **Step 4: Run automated tests**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add script.js tests/price-comparison.test.cjs
git commit -m "feat: render stock price overlay"
```

## Task 5: Update tooltips, legend, missing-data status, and export behavior

**Files:**
- Modify: `script.js`
- Modify: `style.css`
- Test: browser/manual verification

- [ ] **Step 1: Add tooltip and legend branches in `script.js`**

Update the tooltip callbacks so `context.dataset.priceOverlay` formats as:

```js
return `股价：$${decimalFormatter.format(context.parsed.y)}`;
```

For normal finance datasets, keep the existing metric formatter path unchanged.

Update chart plugins/options so the legend is displayed only when `state.priceComparisonEnabled` is true, and labels distinguish the finance metric from `股价`.

When the toggle is enabled but `buildPriceOverlayDataset()` returns `null`, call:

```js
setStatus('当前区间暂无可用股价数据，已保留财务柱状图。', false);
```

When valid price data exists again, return to the normal loaded status.

- [ ] **Step 2: Add any needed style refinements**

Adjust legend spacing/colors in `style.css` so the added legend does not visually fight with the existing dark chart styling.

- [ ] **Step 3: Verify the exported PNG path needs no branching**

Confirm `downloadCurrentChartImage()` already exports the current rendered canvas. If the overlay appears on screen and the right axis is part of the current chart, no extra export branch is required; only document this in the implementation notes.

- [ ] **Step 4: Commit**

```bash
git add script.js style.css
git commit -m "feat: polish stock price comparison UX"
```

## Task 6: Browser verification and docs cleanup

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Optionally modify: `.gitignore`

- [ ] **Step 1: Start the local site**

Run:

```bash
python3 -m http.server 8110
```

Expected: local site available at `http://localhost:8110`.

- [ ] **Step 2: Verify legal/illegal toggle states in the browser**

Check these flows:

1. Single company + line chart + revenue → toggle hidden.
2. Single company + bar chart + revenue → toggle visible.
3. Single company + bar chart + net income → toggle visible.
4. Single company + bar chart + gross margin → toggle hidden and reset off.
5. Two companies visible + bar chart attempt → chart mode returns to line and toggle hidden.

- [ ] **Step 3: Verify overlay behavior**

With valid sample price data present:

1. Turn the toggle on.
2. Confirm finance bars remain on the left axis.
3. Confirm the stock-price line appears with a right axis labeled `股价（USD）`.
4. Confirm legend shows finance metric + stock price.
5. Confirm tooltips distinguish finance values from price values.
6. Move the range slider and confirm both layers remain within the same visible period window.
7. Export PNG and visually inspect that bars, line, right axis, and legend are all present.

- [ ] **Step 4: Verify graceful degradation**

Temporarily remove or blank the selected company’s price data and confirm:

1. Financial bars still render.
2. The page shows the missing-price status message.
3. No uncaught console error occurs.

- [ ] **Step 5: Finish docs and housekeeping**

Ensure both README files mention:

- the stock-price comparison feature;
- `price-data.js`;
- `scripts/auto-refresh-price-data.mjs`.

If `.superpowers/` was created only for local brainstorming artifacts, add it to `.gitignore` before the final cleanup commit.

- [ ] **Step 6: Final verification pass**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: PASS.

Then perform the browser checks above one final time.

- [ ] **Step 7: Commit**

```bash
git add README.md README.en.md .gitignore
git commit -m "docs: document stock price comparison"
```

## Self-Review

### Spec coverage

- Toggle visibility and reset rules → Tasks 1 and 3.
- Independent `price-data.js` data boundary → Task 2.
- Daily adjusted-close overlay with right Y axis → Task 4.
- Tooltip, legend, missing-data degradation, and PNG export → Task 5.
- Slider/window behavior and browser verification → Task 6.

### Placeholder scan

- No `TODO`, `TBD`, or unspecified implementation steps remain.
- The only intentionally abstracted piece is the eventual provider integration inside `scripts/auto-refresh-price-data.mjs`; the frontend remains provider-agnostic by design.

### Type consistency

- `priceComparisonEnabled`, `priceOverlay`, `dailyPrices`, and helper names are consistent across tasks.
- New helper exports used by tests match the names defined in the implementation snippets.
