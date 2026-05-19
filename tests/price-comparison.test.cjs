const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canShowPriceComparison,
  shouldResetPriceComparison,
  normalizePriceComparisonEnabled,
  getVisiblePeriodDateRange,
  extendVisibleLabelsThroughLatestPrice,
  buildFinancialPeriodEndSeries,
  buildProjectedPriceSeries,
  getPriceOverlayDatasetOrder,
  getFinancialBarDatasetOrder,
  alignSecondaryAxisZero,
  aggregateFlowRollingAnnualEntries,
} = require("../price-comparison.js");
const {
  normalizeAdjustedCloseRows,
  normalizeYahooChartPayload,
} = require("../price-refresh-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadFinancialSourceData() {
  const dataJs = fs.readFileSync(path.join(__dirname, "../data.js"), "utf8");
  const context = { window: {}, globalThis: {} };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(dataJs, context);
  return context.FINANCIAL_SOURCE_DATA;
}

test("shows price comparison only for one visible company in revenue/net-income bar mode", () => {
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: "bar", metric: "revenue" }), true);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: "bar", metric: "netIncome" }), true);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 2, chartMode: "bar", metric: "revenue" }), false);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: "line", metric: "revenue" }), false);
  assert.equal(canShowPriceComparison({ visibleCompanyCount: 1, chartMode: "bar", metric: "grossMargin" }), false);
});


test("normalizes price comparison before chart data is rebuilt", () => {
  assert.equal(
    normalizePriceComparisonEnabled({
      enabled: true,
      visibleCompanyCount: 2,
      chartMode: "line",
      metric: "netIncome",
      hasDailyPrices: true,
    }),
    false,
  );

  assert.equal(
    normalizePriceComparisonEnabled({
      enabled: true,
      visibleCompanyCount: 1,
      chartMode: "bar",
      metric: "netIncome",
      hasDailyPrices: false,
    }),
    false,
  );

  assert.equal(
    normalizePriceComparisonEnabled({
      enabled: true,
      visibleCompanyCount: 1,
      chartMode: "bar",
      metric: "netIncome",
      hasDailyPrices: true,
    }),
    true,
  );
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

test("anchors financial bars at reported fiscal period-end dates when provided", () => {
  const result = buildFinancialPeriodEndSeries({
    values: [68_127_000_000],
    visibleLabels: ["2026Q1"],
    frequency: "quarterly",
    periodEndDates: {
      "2026Q1": "2026-01-25",
    },
  });

  assert.equal(result[0].periodEndDate, "2026-01-25");
  assert.equal(result[0].y, 68_127_000_000);
  assert.ok(Math.abs(result[0].x - (-0.2303370786516854)) < 1e-12);
});

test("falls back to calendar period ends when reported period-end dates are incomplete", () => {
  const result = buildFinancialPeriodEndSeries({
    values: [57_006_000_000, 68_127_000_000],
    visibleLabels: ["2025Q4", "2026Q1"],
    frequency: "quarterly",
    periodEndDates: {
      "2026Q1": "2026-01-25",
    },
  });

  assert.deepEqual(result.map((point) => ({
    x: point.x,
    periodEndDate: point.periodEndDate,
  })), [
    { x: 0.5, periodEndDate: "2025-12-31" },
    { x: 1.5, periodEndDate: "2026-03-31" },
  ]);
});

test("does not let price-only extension periods force financial bars back to calendar dates", () => {
  const result = buildFinancialPeriodEndSeries({
    values: [57_006_000_000, 68_127_000_000, null],
    visibleLabels: ["2025Q4", "2026Q1", "2026Q2"],
    frequency: "quarterly",
    periodEndDates: {
      "2025Q4": "2025-10-26",
      "2026Q1": "2026-01-25",
    },
  });

  assert.deepEqual(result.map((point) => ({
    x: point.x,
    y: point.y,
    periodEndDate: point.periodEndDate,
  })), [
    { x: -0.22527472527472525, y: 57_006_000_000, periodEndDate: "2025-10-26" },
    { x: 0.7696629213483146, y: 68_127_000_000, periodEndDate: "2026-01-25" },
    { x: 2.5, y: null, periodEndDate: "2026-06-30" },
  ]);
});

test("includes Apple latest reported quarter and fiscal period-end metadata", () => {
  const data = loadFinancialSourceData();
  const apple = data.companies.apple;

  assert.equal(apple.revenue["2026Q1"], 111_184_000_000);
  assert.equal(apple.earnings["2026Q1"], 29_578_000_000);
  assert.equal(apple.periodEndDates["2026Q1"], "2026-03-28");
  assert.ok(Math.abs(apple.revenueGrowth["2026Q1"] - 16.595182415922984) < 1e-12);
});

test("stores Nvidia fiscal period ends for every available quarter", () => {
  const data = loadFinancialSourceData();
  const nvidia = data.companies.nvidia;
  const availablePeriods = data.periods.filter((period) => nvidia.revenue[period] != null);

  assert.equal(Object.keys(nvidia.periodEndDates).length, availablePeriods.length);
  assert.equal(nvidia.periodEndDates["2005Q1"], "2005-01-30");
  assert.equal(nvidia.periodEndDates["2025Q4"], "2025-10-26");
  assert.equal(nvidia.periodEndDates["2026Q1"], "2026-01-25");
});

test("uses Nvidia fiscal period ends without collapsing bar spacing", () => {
  const data = loadFinancialSourceData();
  const nvidia = data.companies.nvidia;
  const result = buildFinancialPeriodEndSeries({
    values: ["2025Q3", "2025Q4", "2026Q1"].map((period) => nvidia.revenue[period]),
    visibleLabels: ["2025Q3", "2025Q4", "2026Q1"],
    frequency: "quarterly",
    periodEndDates: nvidia.periodEndDates,
  });

  assert.deepEqual(result.map((point) => point.periodEndDate), [
    "2025-07-27",
    "2025-10-26",
    "2026-01-25",
  ]);
  assert.ok(result[1].x - result[0].x > 0.9);
  assert.ok(result[2].x - result[1].x > 0.9);
});


test("annualizes rolling flow windows with one missing quarter", () => {
  const result = aggregateFlowRollingAnnualEntries([
    ["2005Q1", 100],
    ["2005Q2", 200],
    ["2005Q3", null],
    ["2005Q4", 400],
  ]);

  assert.deepEqual(result, [
    ["2005Q1", 400],
    ["2005Q2", 600],
    ["2005Q3", 600],
    ["2005Q4", 933.3333333333334],
  ]);
});


test("keeps Costco rolling net income visible across isolated source gaps", () => {
  const data = loadFinancialSourceData();
  const labels = data.periods.filter((period) => period >= "2005Q1" && period <= "2008Q4");
  const entries = labels.map((label) => [label, data.companies.costco.earnings[label] ?? null]);
  const nullLabels = aggregateFlowRollingAnnualEntries(entries)
    .filter(([, value]) => value == null)
    .map(([label]) => label);

  assert.equal(nullLabels.length, 0);
});

test("keeps latest quarter populated across companies except non-applicable bank gross margin", () => {
  const data = loadFinancialSourceData();
  const metricKeys = ["revenue", "earnings", "grossMargin", "pe", "roe", "revenueGrowth"];
  const allowedMissing = new Set([
    "bankofamerica:grossMargin",
    "jpmorgan:grossMargin",
  ]);
  const missing = [];

  for (const [companyId, company] of Object.entries(data.companies)) {
    for (const metricKey of metricKeys) {
      const value = company[metricKey]?.["2026Q1"];
      if (value == null || Number.isNaN(value)) {
        const key = `${companyId}:${metricKey}`;
        if (!allowedMissing.has(key)) missing.push(key);
      }
    }
  }

  assert.deepEqual(missing, []);
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

test("does not extend price comparison labels beyond a user-limited range", () => {
  assert.deepEqual(
    extendVisibleLabelsThroughLatestPrice({
      visibleLabels: ["2022Q1", "2022Q2"],
      allLabels: ["2022Q1", "2022Q2", "2022Q3", "2022Q4", "2023Q1"],
      dailyPrices: {
        "2022-06-30": 100,
        "2023-02-15": 120,
      },
      frequency: "quarterly",
      allowExtension: false,
    }),
    ["2022Q1", "2022Q2"],
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
