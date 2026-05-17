const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canShowPriceComparison,
  shouldResetPriceComparison,
  getVisiblePeriodDateRange,
  extendVisibleLabelsThroughLatestPrice,
  buildFinancialPeriodEndSeries,
  buildProjectedPriceSeries,
  getPriceOverlayDatasetOrder,
  getFinancialBarDatasetOrder,
  alignSecondaryAxisZero,
} = require("../price-comparison.js");
const {
  normalizeAdjustedCloseRows,
  normalizeYahooChartPayload,
} = require("../price-refresh-helpers.cjs");

test("shows price comparison only for one visible company in revenue/net-income bar mode", () => {
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: "bar", metric: "revenue" }), true);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: "bar", metric: "netIncome" }), true);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 2, chartMode: "bar", metric: "revenue" }), false);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: "line", metric: "revenue" }), false);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: "bar", metric: "grossMargin" }), false);
});

test("resets price comparison when the current chart context becomes invalid", () => {
  assert.equal(shouldResetPriceComparison({
    enabled: true,
    visibleCompanyCount: 1,
    chartMode: "line",
    metric: "revenue",
  }), true);
  assert.equal(shouldResetPriceComparison({
    enabled: true,
    visibleCompanyCount: 1,
    chartMode: "bar",
    metric: "revenue",
  }), false);
});

test("maps visible quarterly labels to an inclusive calendar-date window", () => {
  assert.deepEqual(getVisiblePeriodDateRange(["2025Q3", "2025Q4"], "quarterly"), {
    startDate: "2025-07-01",
    endDate: "2025-12-31",
  });
});

test("maps visible annual labels to an inclusive calendar-date window", () => {
  assert.deepEqual(getVisiblePeriodDateRange(["2024", "2025"], "annual"), {
    startDate: "2024-01-01",
    endDate: "2025-12-31",
  });
});

test("projects daily adjusted-close data into the same period slots used by bars", () => {
  const result = buildProjectedPriceSeries({
    dailyPrices: {
      "2025-06-30": 90,
      "2025-07-01": 100,
      "2025-09-30": 120,
      "2025-10-01": 125,
      "2025-12-31": 130,
      "2026-01-02": 140,
    },
    visibleLabels: ["2025Q3", "2025Q4"],
    frequency: "quarterly",
  });

  assert.deepEqual(result, [
    { x: -0.5, y: 100, date: "2025-07-01" },
    { x: 0.5, y: 120, date: "2025-09-30" },
    { x: 0.5, y: 125, date: "2025-10-01" },
    { x: 1.5, y: 130, date: "2025-12-31" },
  ]);
});

test("anchors quarterly financial bars at the period-end date on the shared price axis", () => {
  assert.deepEqual(
    buildFinancialPeriodEndSeries({
      values: [10_000_000_000, null, 12_000_000_000],
      visibleLabels: ["2025Q4", "2026Q1", "2026Q2"],
      frequency: "quarterly",
    }),
    [
      {
        x: 0.5,
        y: 10_000_000_000,
        periodLabel: "2025Q4",
        periodEndDate: "2025-12-31",
      },
      {
        x: 1.5,
        y: null,
        periodLabel: "2026Q1",
        periodEndDate: "2026-03-31",
      },
      {
        x: 2.5,
        y: 12_000_000_000,
        periodLabel: "2026Q2",
        periodEndDate: "2026-06-30",
      },
    ],
  );
});

test("keeps the price overlay above financial bars in mixed charts", () => {
  assert.ok(getPriceOverlayDatasetOrder() < getFinancialBarDatasetOrder());
});

test("extends visible period labels through the latest available stock price", () => {
  assert.deepEqual(
    extendVisibleLabelsThroughLatestPrice({
      visibleLabels: ["2025Q4"],
      allLabels: ["2025Q4", "2026Q1"],
      dailyPrices: {
        "2025-12-31": 100,
        "2026-05-15": 120,
      },
      frequency: "quarterly",
    }),
    ["2025Q4", "2026Q1", "2026Q2"],
  );
});

test("aligns the secondary-axis zero baseline with the primary axis", () => {
  assert.deepEqual(
    alignSecondaryAxisZero({
      primaryBounds: { min: -20, max: 140 },
      secondaryBounds: { min: 0, max: 250 },
    }),
    { min: -35.714285714285715, max: 250 },
  );
});

test("normalizes provider rows into sorted adjusted-close records", () => {
  assert.deepEqual(
    normalizeAdjustedCloseRows([
      { date: "2025-01-03", adjustedClose: "103.5" },
      { date: "bad-date", adjustedClose: "99" },
      { date: "2025-01-02", adjustedClose: "101.25" },
      { date: "2025-01-04", adjustedClose: null },
    ]),
    {
      "2025-01-02": 101.25,
      "2025-01-03": 103.5,
    },
  );
});

test("normalizes Yahoo chart payload into adjusted-close records", () => {
  assert.deepEqual(
    normalizeYahooChartPayload({
      chart: {
        result: [{
          timestamp: [1735776000, 1735862400, 1735948800],
          indicators: {
            adjclose: [{ adjclose: [101.25, null, 103.5] }],
          },
        }],
      },
    }),
    {
      "2025-01-02": 101.25,
      "2025-01-04": 103.5,
    },
  );
});
