# Unified Chart Plot Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the left and right grid boundaries identical across single-company line, bar, and bar-with-price views.

**Architecture:** Add a pure layout policy to `price-comparison.js`, then use its returned primary and price-axis widths in both Chart.js rendering paths. A single-company chart always reserves both axis slots; the price-axis labels and title remain conditional on an active price dataset. Multi-company charts keep their measured primary-axis width and do not gain a right-side price slot.

**Tech Stack:** Vanilla JavaScript, Chart.js 4.4.1, Node.js built-in test runner, static HTML/CSS

---

## File map

- Modify `price-comparison.js`: own the mode-independent axis reservation policy and constants.
- Modify `script.js`: apply the policy during chart construction and refresh.
- Modify `tests/price-comparison.test.cjs`: test the pure policy and both Chart.js integration paths.
- Modify `tests/asset-cache.test.cjs`: require fresh browser cache keys for changed scripts.
- Modify `index.html`: publish new query-string versions for the changed scripts.

### Task 1: Add the axis reservation policy

**Files:**
- Modify: `tests/price-comparison.test.cjs`
- Modify: `price-comparison.js`

- [ ] **Step 1: Write the failing policy tests**

Add `getChartAxisReservations` to the import at the top of `tests/price-comparison.test.cjs`, then add:

```js
test("single-company chart modes share fixed horizontal axis reservations", () => {
  const reservations = [96, 104, 128].map((measuredPrimaryWidth) => (
    getChartAxisReservations({
      visibleCompanyCount: 1,
      measuredPrimaryWidth,
    })
  ));

  assert.deepEqual(reservations, [
    { primaryWidth: 104, priceWidth: 92 },
    { primaryWidth: 104, priceWidth: 92 },
    { primaryWidth: 104, priceWidth: 92 },
  ]);
});

test("multi-company charts keep their measured primary width without a price gutter", () => {
  assert.deepEqual(
    getChartAxisReservations({
      visibleCompanyCount: 3,
      measuredPrimaryWidth: 118,
    }),
    { primaryWidth: 118, priceWidth: 0 },
  );
});
```

- [ ] **Step 2: Run the test and verify the RED state**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: FAIL because `getChartAxisReservations` is not exported.

- [ ] **Step 3: Implement the minimal pure policy**

Near the other layout constants in `price-comparison.js`, add:

```js
const SINGLE_COMPANY_PRIMARY_AXIS_RESERVED_WIDTH = 104;
const SINGLE_COMPANY_PRICE_AXIS_RESERVED_WIDTH = 92;

function getChartAxisReservations({ visibleCompanyCount, measuredPrimaryWidth } = {}) {
  if (Number(visibleCompanyCount) === 1) {
    return {
      primaryWidth: SINGLE_COMPANY_PRIMARY_AXIS_RESERVED_WIDTH,
      priceWidth: SINGLE_COMPANY_PRICE_AXIS_RESERVED_WIDTH,
    };
  }

  const safePrimaryWidth = Number(measuredPrimaryWidth);
  return {
    primaryWidth: Number.isFinite(safePrimaryWidth) ? Math.max(0, safePrimaryWidth) : 0,
    priceWidth: 0,
  };
}
```

Add `getChartAxisReservations` to the exported `api` object.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: all tests in the file pass.

- [ ] **Step 5: Commit the policy**

```bash
git add price-comparison.js tests/price-comparison.test.cjs
git commit -m "test(chart): define shared axis reservations"
```

### Task 2: Apply the shared slots to Chart.js

**Files:**
- Modify: `tests/price-comparison.test.cjs`
- Modify: `script.js`

- [ ] **Step 1: Write the failing integration contract**

Replace the existing test named `price comparison layout reserves a stable right axis and legend area` with:

```js
test("chart build and refresh apply shared single-company axis reservations", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const refreshBody = script.match(/function refreshChart\([\s\S]*?\n\}/)?.[0] ?? "";
  const buildBody = script.match(/function buildChart\(\) \{([\s\S]*?)\nfunction /)?.[1] ?? "";

  assert.match(script, /function computeChartAxisReservations/);
  assert.match(refreshBody, /scales\.y\.reservedWidth = axisReservations\.primaryWidth/);
  assert.match(refreshBody, /scales\.yPrice\.display = axisReservations\.priceWidth > 0/);
  assert.match(refreshBody, /scales\.yPrice\.reservedWidth = axisReservations\.priceWidth/);
  assert.match(buildBody, /reservedWidth: axisReservations\.primaryWidth/);
  assert.match(buildBody, /display: axisReservations\.priceWidth > 0/);
  assert.match(buildBody, /reservedWidth: axisReservations\.priceWidth/);
  assert.match(buildBody, /title:\s*\{\s*display: hasPriceOverlay/);
  assert.match(buildBody, /ticks:\s*\{\s*display: hasPriceOverlay/);
});
```

- [ ] **Step 2: Run the test and verify the RED state**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: FAIL because `axisReservations` is not used by `script.js`.

- [ ] **Step 3: Add the script-level adapter**

Remove `PRICE_AXIS_RESERVED_WIDTH` from `script.js`. After `computeYAxisReservedWidth`, add:

```js
function computeChartAxisReservations(datasets, chartMode, themeTokens) {
  return PriceComparisonUtils.getChartAxisReservations({
    visibleCompanyCount: state.visibleCompanies.size,
    measuredPrimaryWidth: computeYAxisReservedWidth(datasets, chartMode, themeTokens),
  });
}
```

- [ ] **Step 4: Use the adapter in both render paths**

In `refreshChart`, replace `yReservedWidth` with:

```js
const axisReservations = computeChartAxisReservations(datasets, effectiveChartMode, themeTokens);
```

Apply the returned values:

```js
state.chart.options.scales.y.reservedWidth = axisReservations.primaryWidth;
state.chart.options.scales.yPrice.display = axisReservations.priceWidth > 0;
state.chart.options.scales.yPrice.reservedWidth = axisReservations.priceWidth;
```

In `buildChart`, compute the same `axisReservations`. Configure the primary and price scales with:

```js
reservedWidth: axisReservations.primaryWidth,
```

and:

```js
display: axisReservations.priceWidth > 0,
reservedWidth: axisReservations.priceWidth,
```

Keep `title.display` and `ticks.display` tied to `hasPriceOverlay`. Keep the legend tied to `reservePriceComparisonLayout`, which preserves its existing behavior when toggling the overlay.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
node --test tests/price-comparison.test.cjs
```

Expected: all tests in the file pass.

- [ ] **Step 6: Commit the Chart.js integration**

```bash
git add script.js tests/price-comparison.test.cjs
git commit -m "fix(chart): unify single-company plot width"
```

### Task 3: Publish fresh cache keys

**Files:**
- Modify: `tests/asset-cache.test.cjs`
- Modify: `index.html`

- [ ] **Step 1: Write the failing cache test**

Update the current local-asset cache test so unchanged assets keep their old version while the two modified scripts require the new one:

```js
test("cache-busts assets changed by the unified plot-width fix", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  for (const asset of ["data.js", "company-selection.js"]) {
    assert.match(html, new RegExp(`${asset.replace(".", "\\.")}\\?v=20260605-tooltip-near-target-bar`));
  }

  for (const asset of ["price-comparison.js", "script.js"]) {
    assert.match(html, new RegExp(`${asset.replace(".", "\\.")}\\?v=20260628-unified-plot-width`));
  }
});
```

Retain the existing assertions that reject stale historical versions.

- [ ] **Step 2: Run the test and verify the RED state**

Run:

```bash
node --test tests/asset-cache.test.cjs
```

Expected: FAIL because `index.html` still references the old script versions.

- [ ] **Step 3: Update the changed script URLs**

In `index.html`, use:

```html
<script defer src="price-comparison.js?v=20260628-unified-plot-width"></script>
<script defer src="script.js?v=20260628-unified-plot-width"></script>
```

Leave `data.js`, `price-data.js`, and `company-selection.js` unchanged.

- [ ] **Step 4: Run the cache test and verify GREEN**

Run:

```bash
node --test tests/asset-cache.test.cjs
```

Expected: all tests in the file pass.

- [ ] **Step 5: Commit the cache update**

```bash
git add index.html tests/asset-cache.test.cjs
git commit -m "fix(cache): refresh unified chart layout assets"
```

### Task 4: Verify the complete behavior

**Files:**
- Verify: `price-comparison.js`
- Verify: `script.js`
- Verify: `index.html`

- [ ] **Step 1: Run the full automated suite**

```bash
node --test tests/*.test.cjs
```

Expected: zero failures.

- [ ] **Step 2: Check patch hygiene**

```bash
git diff --check HEAD~3..HEAD
git status --short --branch
```

Expected: no whitespace errors and a clean worktree.

- [ ] **Step 3: Verify the three browser states**

Start the static site with `python3 -m http.server 8110`, open `http://127.0.0.1:8110/`, and keep the company, metric, time range, and viewport unchanged. Capture these states:

1. single-company line;
2. single-company bar with price comparison off;
3. single-company bar with price comparison on.

For all three, confirm the first and last vertical grid lines occupy the same pixels. Confirm the right price ticks and title are hidden in states 1 and 2, visible in state 3, and the range slider endpoints remain aligned with the grid.

- [ ] **Step 4: Verify PNG export in the widest-axis state**

With price comparison still enabled, click `导出 PNG` and wait for the download. Confirm the file is non-empty and the rendered image includes the financial bars, price line, left financial axis, and right price axis without clipping.

- [ ] **Step 5: Check browser errors**

Read the page console after the three interactions.

Expected: no new errors or warnings from the layout change.
