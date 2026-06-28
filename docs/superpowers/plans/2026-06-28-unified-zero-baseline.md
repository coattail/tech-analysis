# Unified Zero Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make single-company line, bar, and bar-with-price views use identical primary Y-axis bounds and zero-line positions.

**Architecture:** Add a pure mode resolver to `price-comparison.js`. `computeYAxisBounds` will resolve single-company views to the existing bar-compatible bounds algorithm before running its current calculations, while multi-company line charts keep the line algorithm. This reuses the tested negative-value behavior and automatically keeps the secondary price axis aligned.

**Tech Stack:** Vanilla JavaScript, Chart.js 4.4.1, Node.js built-in test runner, static HTML

---

## File map

- Modify `price-comparison.js`: expose the pure Y-axis bounds-mode policy.
- Modify `script.js`: resolve the bounds mode once inside `computeYAxisBounds`.
- Modify `tests/price-comparison.test.cjs`: cover the pure policy and script integration.
- Modify `tests/asset-cache.test.cjs`: require fresh versions for both changed scripts.
- Modify `index.html`: publish the new script cache keys.

### Task 1: Define the shared bounds-mode policy

**Files:**
- Modify: `tests/price-comparison.test.cjs`
- Modify: `price-comparison.js`

- [ ] **Step 1: Write the failing policy test**

Add `getYAxisBoundsMode` to the imports in `tests/price-comparison.test.cjs`, then add:

```js
test("single-company line and bar views share bar-compatible y-axis bounds", () => {
  assert.equal(getYAxisBoundsMode({ visibleCompanyCount: 1, chartMode: "line" }), "bar");
  assert.equal(getYAxisBoundsMode({ visibleCompanyCount: 1, chartMode: "bar" }), "bar");
  assert.equal(getYAxisBoundsMode({ visibleCompanyCount: 3, chartMode: "line" }), "line");
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
node --test tests/price-comparison.test.cjs
```

Expected: FAIL because `getYAxisBoundsMode` is not exported.

- [ ] **Step 3: Add the minimal resolver**

Near `getChartAxisReservations` in `price-comparison.js`, add:

```js
function getYAxisBoundsMode({ visibleCompanyCount, chartMode } = {}) {
  return Number(visibleCompanyCount) === 1 ? "bar" : chartMode;
}
```

Add `getYAxisBoundsMode` to the exported `api` object.

- [ ] **Step 4: Run the focused test and verify GREEN**

```bash
node --test tests/price-comparison.test.cjs
```

Expected: every test in the file passes.

- [ ] **Step 5: Commit the policy**

```bash
git add price-comparison.js tests/price-comparison.test.cjs
git commit -m "test(chart): define shared y-axis bounds mode"
```

### Task 2: Use the shared mode in Y-axis calculations

**Files:**
- Modify: `tests/price-comparison.test.cjs`
- Modify: `script.js`

- [ ] **Step 1: Write the failing integration contract**

Add:

```js
test("primary y-axis bounds resolve single-company line mode before calculation", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const body = script.match(/function computeYAxisBounds\([\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(body, /const boundsMode = PriceComparisonUtils\.getYAxisBoundsMode/);
  assert.match(body, /visibleCompanyCount: state\.visibleCompanies\.size/);
  assert.match(body, /chartMode,/);
  assert.doesNotMatch(body, /if \(chartMode === "bar"\)/);
  assert.match(body, /if \(boundsMode === "bar"\)/);
  assert.match(body, /computeCompactBarZeroBaselineMin\(min, max, boundsMode\)/);
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
node --test tests/price-comparison.test.cjs
```

Expected: FAIL because `computeYAxisBounds` does not resolve `boundsMode`.

- [ ] **Step 3: Resolve the bounds mode at the source**

At the start of `computeYAxisBounds`, add:

```js
const boundsMode = PriceComparisonUtils.getYAxisBoundsMode({
  visibleCompanyCount: state.visibleCompanies.size,
  chartMode,
});
```

Within that function only, replace both `if (chartMode === "bar")` checks with `if (boundsMode === "bar")`. Pass `boundsMode` to every `computeCompactBarZeroBaselineMin` call. Do not change `formatPrimaryYAxisTick`; line views may continue to display valid negative tick labels even though both modes share the same range.

- [ ] **Step 4: Run the focused test and verify GREEN**

```bash
node --test tests/price-comparison.test.cjs
```

Expected: every test in the file passes.

- [ ] **Step 5: Commit the integration**

```bash
git add script.js tests/price-comparison.test.cjs
git commit -m "fix(chart): align single-company zero baselines"
```

### Task 3: Publish fresh cache keys

**Files:**
- Modify: `tests/asset-cache.test.cjs`
- Modify: `index.html`

- [ ] **Step 1: Write the failing cache test**

In the current chart-asset cache test, change the expected version for `price-comparison.js` and `script.js` to `20260628-shared-zero-baseline`:

```js
for (const asset of ["price-comparison.js", "script.js"]) {
  assert.match(
    html,
    new RegExp(`${asset.replace(".", "\\.")}\\?v=20260628-shared-zero-baseline`),
    `${asset} should use the shared zero-baseline cache version`,
  );
}
```

- [ ] **Step 2: Run the cache test and verify RED**

```bash
node --test tests/asset-cache.test.cjs
```

Expected: FAIL because `index.html` still has the unified-width version.

- [ ] **Step 3: Update only the changed script URLs**

Use:

```html
<script defer src="price-comparison.js?v=20260628-shared-zero-baseline"></script>
<script defer src="script.js?v=20260628-shared-zero-baseline"></script>
```

- [ ] **Step 4: Run the cache test and verify GREEN**

```bash
node --test tests/asset-cache.test.cjs
```

Expected: every test in the file passes.

- [ ] **Step 5: Commit the cache update**

```bash
git add index.html tests/asset-cache.test.cjs
git commit -m "fix(cache): refresh shared baseline assets"
```

### Task 4: Verify behavior and regressions

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

- [ ] **Step 3: Verify single-company primary-axis stability**

At `http://127.0.0.1:8111/`, keep company, metric, range, and viewport unchanged. Compare line, bar, and bar-with-price for quarterly net income. Confirm the 0 grid line and all primary-axis tick positions remain fixed. Repeat with revenue and a metric containing substantial negative values to confirm the range is shared without clipping.

- [ ] **Step 4: Verify unchanged surrounding behavior**

Confirm multi-company line charts still use their original non-bar range. In price-comparison mode, confirm the right axis remains aligned with the primary 0 line. Export PNG and confirm both axes and all datasets are complete.

- [ ] **Step 5: Check browser errors**

Read the browser console after all interactions.

Expected: no new errors or warnings.
