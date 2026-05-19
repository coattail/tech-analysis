# Nvidia Default Latest Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Tech-Analysis open on Nvidia quarterly net income with stock price comparison, and reset the visible time range to the latest available value whenever company selection is applied.

**Architecture:** Keep the existing static Chart.js app structure. Add small pure selection defaults/helpers in `company-selection.js` so default view intent and range-reset decision are testable, then wire those values into `script.js` without changing chart rendering architecture.

**Tech Stack:** Plain browser JavaScript, Chart.js, Node `node:test` CommonJS tests.

---

## File Structure

- Modify `/Users/coattail/Documents/New project/Tech-Analysis/company-selection.js`: export default initial view config and a pure helper indicating that applying a changed company selection should reset the range.
- Modify `/Users/coattail/Documents/New project/Tech-Analysis/tests/company-selection.test.cjs`: add failing tests for the initial view defaults and range reset decision.
- Modify `/Users/coattail/Documents/New project/Tech-Analysis/script.js`: consume the new defaults and reset range controls after applying selected companies.

### Task 1: Test default view contract

**Files:**
- Test: `/Users/coattail/Documents/New project/Tech-Analysis/tests/company-selection.test.cjs`
- Modify: `/Users/coattail/Documents/New project/Tech-Analysis/company-selection.js`
- Modify: `/Users/coattail/Documents/New project/Tech-Analysis/script.js`

- [ ] **Step 1: Write the failing tests**

Add tests expecting:

```js
assert.deepEqual(DEFAULT_INITIAL_COMPANIES, ["nvidia"]);
assert.deepEqual(DEFAULT_INITIAL_VIEW, {
  metric: "netIncome",
  frequency: "quarterly",
  chartMode: "bar",
  priceComparisonEnabled: true,
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/company-selection.test.cjs`
Expected: FAIL because the constants are not exported yet.

- [ ] **Step 3: Implement minimal defaults**

Add the constants to `company-selection.js`, export them in CommonJS and browser API, then update `script.js` to initialize state from `DEFAULT_INITIAL_VIEW` and `DEFAULT_INITIAL_COMPANIES`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/company-selection.test.cjs`
Expected: PASS.

### Task 2: Test company-apply range reset decision

**Files:**
- Test: `/Users/coattail/Documents/New project/Tech-Analysis/tests/company-selection.test.cjs`
- Modify: `/Users/coattail/Documents/New project/Tech-Analysis/company-selection.js`
- Modify: `/Users/coattail/Documents/New project/Tech-Analysis/script.js`

- [ ] **Step 1: Write the failing tests**

Add tests expecting `shouldResetRangeAfterApplyingCompanies()` to return `true` when pending companies differ from applied companies and `false` when they match.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/company-selection.test.cjs`
Expected: FAIL because the helper is not exported yet.

- [ ] **Step 3: Implement minimal helper and wire it**

Add:

```js
function shouldResetRangeAfterApplyingCompanies({ appliedCompanies, pendingCompanies }) {
  return hasCompanySelectionChanged(appliedCompanies, pendingCompanies);
}
```

In `generateSelectedCompanies()`, compute this before applying companies. If true, call `setRangeToVisibleDataBounds(state.frequency, state.metric)` and `syncRangeControls()` before refreshing the chart.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/company-selection.test.cjs`
Expected: PASS.

### Task 3: Full verification and browser smoke test

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run all unit tests**

Run: `node --test tests/*.cjs`
Expected: PASS.

- [ ] **Step 2: Start local static server**

Run: `python3 -m http.server 8110`
Expected: server responds on `http://127.0.0.1:8110/`.

- [ ] **Step 3: Browser smoke check**

Open the page and verify:

- active metric label is `净利润`;
- active frequency label is `季度`;
- visible companies count is `1 / 30`;
- range label ends at the latest visible Nvidia quarter;
- stock price comparison control is enabled/checked when price data is available.
