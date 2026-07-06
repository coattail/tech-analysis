const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canShowPriceComparison,
  shouldResetPriceComparison,
  normalizePriceComparisonEnabled,
  dateToUtcMs,
  getVisiblePeriodDateRange,
  extendVisibleLabelsThroughLatestPrice,
  shouldExtendPriceComparisonLabels,
  buildFinancialPeriodEndSeries,
  buildProjectedPriceSeries,
  extendRangeEndThroughLatestPrice,
  getPriceOverlayDatasetOrder,
  getFinancialBarDatasetOrder,
  getChartAxisReservations,
  resolveYAxisBoundsMode,
  shouldPlaceCompanyBadgeAtBottom,
  alignSecondaryAxisZero,
  computeCompactBarZeroBaselineMin,
  shouldHidePrimaryYAxisTickLabel,
  aggregateFlowRollingAnnualEntries,
  aggregatePointRollingAverageEntries,
  aggregateMarginRollingAnnualEntries,
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

function loadStockPriceSourceData() {
  const priceDataJs = fs.readFileSync(path.join(__dirname, "../price-data.js"), "utf8");
  const context = { window: {}, globalThis: {} };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(priceDataJs, context);
  return context.STOCK_PRICE_SOURCE_DATA;
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

test("projects daily adjusted-close data into uniform period slots", () => {
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
  const q3Start = dateToUtcMs("2025-07-01");
  const q3End = dateToUtcMs("2025-09-30");
  const q4Start = dateToUtcMs("2025-10-01");
  const q4End = dateToUtcMs("2025-12-31");
  const slotX = (dateKey, index, start, end) => (
    index - 0.5 + ((dateToUtcMs(dateKey) - start) / (end - start))
  );

  assert.deepEqual(result, [
    { x: slotX("2025-07-01", 0, q3Start, q3End), y: 100, date: "2025-07-01" },
    { x: slotX("2025-09-30", 0, q3Start, q3End), y: 120, date: "2025-09-30" },
    { x: slotX("2025-10-01", 1, q4Start, q4End), y: 125, date: "2025-10-01" },
    { x: slotX("2025-12-31", 1, q4Start, q4End), y: 130, date: "2025-12-31" },
  ]);
});

test("falls back to period-end dates when report dates are unavailable", () => {
  assert.deepEqual(
    buildFinancialPeriodEndSeries({
      values: [10_000_000_000, null, 12_000_000_000],
      visibleLabels: ["2025Q4", "2026Q1", "2026Q2"],
      frequency: "quarterly",
    }).map((point) => ({
      x: point.x,
      y: point.y,
      periodLabel: point.periodLabel,
      reportDate: point.reportDate,
      periodEndDate: point.periodEndDate,
    })),
    [
      {
        x: 0,
        y: 10_000_000_000,
        periodLabel: "2025Q4",
        reportDate: "2025-12-31",
        periodEndDate: "2025-12-31",
      },
      {
        x: 1,
        y: null,
        periodLabel: "2026Q1",
        reportDate: "2026-03-31",
        periodEndDate: "2026-03-31",
      },
      {
        x: 2,
        y: 12_000_000_000,
        periodLabel: "2026Q2",
        reportDate: "2026-06-30",
        periodEndDate: "2026-06-30",
      },
    ],
  );
});

test("keeps report dates as metadata while centering bars in quarter slots", () => {
  const result = buildFinancialPeriodEndSeries({
    values: [22_187_000_000],
    visibleLabels: ["2026Q2"],
    frequency: "quarterly",
    reportDates: {
      "2026Q2": "2026-06-03",
    },
    periodEndDates: {
      "2026Q2": "2026-05-03",
    },
  });

  assert.equal(result[0].reportDate, "2026-06-03");
  assert.equal(result[0].periodEndDate, "2026-05-03");
  assert.equal(result[0].x, 0);
});

test("keeps report dates from changing financial bar slot coordinates", () => {
  const result = buildFinancialPeriodEndSeries({
    values: [22_187_000_000],
    visibleLabels: ["2026Q2"],
    frequency: "quarterly",
    reportDates: {
      "2026Q2": "2026-06-03",
    },
    periodEndDates: {
      "2026Q2": "2026-05-03",
    },
  });

  assert.equal(result[0].reportDate, "2026-06-03");
  assert.equal(result[0].periodEndDate, "2026-05-03");
  assert.equal(result[0].x, 0);
});

test("keeps reported fiscal period ends as metadata in uniform quarter slots", () => {
  const result = buildFinancialPeriodEndSeries({
    values: [68_127_000_000],
    visibleLabels: ["2026Q1"],
    frequency: "quarterly",
    periodEndDates: {
      "2026Q1": "2026-01-25",
    },
  });

  assert.equal(result[0].periodEndDate, "2026-01-25");
  assert.equal(result[0].reportDate, "2026-01-25");
  assert.equal(result[0].y, 68_127_000_000);
  assert.equal(result[0].x, 0);
});

test("uses available reported period ends while bars stay in uniform slots", () => {
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
    reportDate: point.reportDate,
    periodEndDate: point.periodEndDate,
  })), [
    { x: 0, reportDate: "2025-12-31", periodEndDate: "2025-12-31" },
    { x: 1, reportDate: "2026-01-25", periodEndDate: "2026-01-25" },
  ]);
});

test("does not let price-only extension periods move financial bars off quarter slots", () => {
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
    reportDate: point.reportDate,
    periodEndDate: point.periodEndDate,
  })), [
    { x: 0, y: 57_006_000_000, reportDate: "2025-10-26", periodEndDate: "2025-10-26" },
    { x: 1, y: 68_127_000_000, reportDate: "2026-01-25", periodEndDate: "2026-01-25" },
    { x: 2, y: null, reportDate: "2026-06-30", periodEndDate: "2026-06-30" },
  ]);
});

test("includes Apple latest reported quarter and fiscal period-end metadata", () => {
  const data = loadFinancialSourceData();
  const apple = data.companies.apple;

  assert.equal(apple.revenue["2026Q1"], 111_184_000_000);
  assert.equal(apple.earnings["2026Q1"], 29_578_000_000);
  assert.equal(apple.periodEndDates["2026Q1"], "2026-03-28");
  assert.equal(apple.reportDates["2026Q1"], "2026-04-30");
  assert.ok(Math.abs(apple.revenueGrowth["2026Q1"] - 16.595182415922984) < 1e-12);
});

test("includes Micron fiscal Q3 2026 results in calendar 2026Q2", () => {
  const data = loadFinancialSourceData();
  const micron = data.companies.micron;

  assert.equal(micron.revenue["2026Q2"], 41_456_000_000);
  assert.equal(micron.earnings["2026Q2"], 28_243_000_000);
  assert.equal(micron.periodEndDates["2026Q2"], "2026-05-28");
  assert.equal(micron.reportDates["2026Q2"], "2026-06-24");
  assert.ok(Math.abs(micron.grossMargin["2026Q2"] - 84.562) < 0.001);
  assert.ok(Math.abs(micron.revenueGrowth["2026Q2"] - 345.71551446081065) < 1e-12);
});

test("stores Nvidia fiscal period ends for every available quarter", () => {
  const data = loadFinancialSourceData();
  const nvidia = data.companies.nvidia;
  const availablePeriods = data.periods.filter((period) => nvidia.revenue[period] != null);

  assert.equal(availablePeriods.filter((period) => !nvidia.periodEndDates[period]).length, 0);
  assert.equal(nvidia.periodEndDates["2005Q1"], "2005-01-30");
  assert.equal(nvidia.periodEndDates["2025Q4"], "2025-10-26");
  assert.equal(nvidia.periodEndDates["2026Q1"], "2026-01-25");
  assert.equal(nvidia.periodEndDates["2026Q2"], "2026-04-26");
});

test("uses Nvidia fiscal metadata while keeping uniform bar spacing", () => {
  const data = loadFinancialSourceData();
  const nvidia = data.companies.nvidia;
  const result = buildFinancialPeriodEndSeries({
    values: ["2025Q3", "2025Q4", "2026Q1"].map((period) => nvidia.revenue[period]),
    visibleLabels: ["2025Q3", "2025Q4", "2026Q1"],
    frequency: "quarterly",
    reportDates: nvidia.reportDates,
    periodEndDates: nvidia.periodEndDates,
  });

  assert.deepEqual(result.map((point) => point.reportDate), [
    "2025-08-27",
    "2025-11-19",
    "2026-02-25",
  ]);
  assert.deepEqual(result.map((point) => point.x), [0, 1, 2]);
});

test("keeps Broadcom report dates while bars use uniform quarter slots", () => {
  const data = loadFinancialSourceData();
  const broadcom = data.companies.avgo;
  const visibleLabels = data.periods.filter((period) => broadcom.revenue[period] != null);
  const result = buildFinancialPeriodEndSeries({
    values: visibleLabels.map((period) => broadcom.revenue[period]),
    visibleLabels,
    frequency: "quarterly",
    reportDates: broadcom.reportDates,
    periodEndDates: broadcom.periodEndDates,
  });
  const latest = result.at(-1);
  const byLabel = new Map(result.map((point) => [point.periodLabel, point]));
  const visiblePoints = result.filter((point) => point?.y != null);
  const gaps = visiblePoints.slice(1).map((point, index) => point.x - visiblePoints[index].x);

  assert.equal(latest.periodLabel, "2026Q2");
  assert.equal(latest.reportDate, "2026-06-03");
  assert.equal(latest.periodEndDate, "2026-05-03");
  assert.equal(latest.x, visibleLabels.length - 1);
  assert.equal(byLabel.get("2025Q3").reportDate, "2025-09-10");
  assert.equal(byLabel.get("2025Q4").reportDate, "2025-12-18");
  assert.equal(byLabel.get("2026Q1").reportDate, "2026-03-11");
  assert.equal(byLabel.get("2026Q2").reportDate, "2026-06-03");
  assert.ok(gaps.every((gap) => gap === 1));
});


test("does not annualize rolling flow windows across missing source quarters", () => {
  const result = aggregateFlowRollingAnnualEntries([
    ["2005Q1", 100],
    ["2005Q2", 200],
    ["2005Q3", null],
    ["2005Q4", 400],
    ["2006Q1", 500],
    ["2006Q2", 600],
    ["2006Q3", 700],
    ["2006Q4", 800],
  ]);

  assert.deepEqual(result, [
    ["2005Q1", null],
    ["2005Q2", null],
    ["2005Q3", null],
    ["2005Q4", null],
    ["2006Q1", null],
    ["2006Q2", null],
    ["2006Q3", 2200],
    ["2006Q4", 2600],
  ]);
});

test("does not average rolling point metrics until four quarters are available", () => {
  const result = aggregatePointRollingAverageEntries([
    ["2005Q1", 10],
    ["2005Q2", 20],
    ["2005Q3", 30],
    ["2005Q4", 40],
    ["2006Q1", 50],
  ]);

  assert.deepEqual(result, [
    ["2005Q1", null],
    ["2005Q2", null],
    ["2005Q3", null],
    ["2005Q4", 25],
    ["2006Q1", 35],
  ]);
});

test("does not compute rolling margin until four revenue/margin quarters are available", () => {
  const result = aggregateMarginRollingAnnualEntries([
    ["2005Q1", { margin: 50, revenue: 100 }],
    ["2005Q2", { margin: 40, revenue: 200 }],
    ["2005Q3", { margin: 30, revenue: 300 }],
    ["2005Q4", { margin: 20, revenue: 400 }],
    ["2006Q1", { margin: 10, revenue: null }],
    ["2006Q2", { margin: 60, revenue: 600 }],
    ["2006Q3", { margin: 70, revenue: 700 }],
    ["2006Q4", { margin: 80, revenue: 800 }],
    ["2007Q1", { margin: 90, revenue: 900 }],
  ]);

  assert.deepEqual(result, [
    ["2005Q1", null],
    ["2005Q2", null],
    ["2005Q3", null],
    ["2005Q4", 30],
    ["2006Q1", null],
    ["2006Q2", null],
    ["2006Q3", null],
    ["2006Q4", null],
    ["2007Q1", 76.66666666666667],
  ]);
});


test("keeps quarterly net income populated without internal source gaps", () => {
  const data = loadFinancialSourceData();
  const missing = [];
  const allowedMissing = new Set();
  const firstDisplayPeriod = "2005Q1";

  for (const [companyId, company] of Object.entries(data.companies)) {
    const displayPeriods = data.periods.filter((period) => period >= firstDisplayPeriod);
    const populatedPeriods = displayPeriods.filter((period) => company.earnings?.[period] != null);
    if (populatedPeriods.length === 0) continue;

    const firstIndex = data.periods.indexOf(populatedPeriods[0]);
    const lastIndex = data.periods.indexOf(populatedPeriods.at(-1));
    for (let index = firstIndex; index <= lastIndex; index += 1) {
      const period = data.periods[index];
      const value = company.earnings?.[period];
      if (value == null || Number.isNaN(value)) {
        const key = `${companyId}:${period}`;
        if (!allowedMissing.has(key)) missing.push(key);
      }
    }
  }

  assert.deepEqual(missing, []);
});

test("uses official ChronoScale history and fills SharonAI 2025Q2 fundamentals", () => {
  const data = loadFinancialSourceData();
  const chronoscale = data.companies.chronoscale;
  const sharonai = data.companies.sharonai;

  assert.deepEqual(
    Object.keys(chronoscale.revenue),
    ["2024Q3", "2024Q4", "2025Q1", "2025Q2", "2025Q3", "2025Q4", "2026Q1"],
  );
  assert.equal(chronoscale.revenue["2025Q4"], 18_402_000);
  assert.equal(chronoscale.earnings["2026Q1"], -54_252_000);
  assert.equal(chronoscale.revenue["2013Q1"], undefined);

  assert.equal(sharonai.revenue["2025Q2"], 376_985);
  assert.equal(sharonai.earnings["2025Q2"], -2_576_369);
  assert.ok(Number.isFinite(sharonai.grossMargin["2025Q2"]));
});

test("keeps core fundamentals continuous from listing through the latest reported quarter", () => {
  const data = loadFinancialSourceData();
  const prices = loadStockPriceSourceData();
  const missing = [];
  const allowedMissing = new Set();

  for (const [companyId, company] of Object.entries(data.companies)) {
    const priceDates = Object.keys(prices.companies?.[companyId]?.daily || {});
    assert.ok(priceDates.length > 0, `${companyId} should have stock prices`);
    const listingDate = new Date(`${priceDates[0]}T00:00:00Z`);
    const listingPeriod = `${listingDate.getUTCFullYear()}Q${Math.floor(listingDate.getUTCMonth() / 3) + 1}`;
    const availablePeriods = data.periods.filter(
      (period) => period >= listingPeriod && Number.isFinite(company.revenue?.[period]),
    );
    if (availablePeriods.length === 0) continue;

    const firstIndex = data.periods.indexOf(availablePeriods[0]);
    const lastIndex = data.periods.indexOf(availablePeriods.at(-1));
    for (const metricKey of ["revenue", "earnings", "netAssets"]) {
      if (companyId === "chronoscale" && metricKey === "netAssets") continue;
      for (let index = firstIndex; index <= lastIndex; index += 1) {
        const period = data.periods[index];
        if (!Number.isFinite(company[metricKey]?.[period])) {
          const key = `${companyId}:${metricKey}:${period}`;
          if (!allowedMissing.has(key)) missing.push(key);
        }
      }
    }
  }

  assert.deepEqual(missing, []);
});

test("keeps adjusted-close prices complete across normal trading-calendar gaps", () => {
  const prices = loadStockPriceSourceData();
  assert.equal(Object.keys(prices.companies || {}).length, 46);

  const invalid = [];
  for (const [companyId, company] of Object.entries(prices.companies || {})) {
    const maxTradingCalendarGapDays = ["samsung", "sk-hynix"].includes(companyId) ? 12 : 5;
    const entries = Object.entries(company.daily || {});
    if (entries.length === 0) invalid.push(`${companyId}:empty`);
    entries.forEach(([date, value], index) => {
      if (!Number.isFinite(value) || value <= 0) invalid.push(`${companyId}:${date}:value`);
      if (index === 0) return;
      const previousDate = entries[index - 1][0];
      const gapDays = (Date.parse(date) - Date.parse(previousDate)) / 86400000;
      if (gapDays <= 0 || gapDays > maxTradingCalendarGapDays) {
        invalid.push(`${companyId}:${previousDate}->${date}`);
      }
    });
  }

  assert.deepEqual(invalid, []);
});

test("preserves audited historical starts and does not invent pre-IPO prices", () => {
  const data = loadFinancialSourceData();
  const prices = loadStockPriceSourceData();
  const expectedRevenueStarts = {
    ibm: "2004Q2",
    sap: "2004Q2",
    salesforce: "2004Q2",
    adobe: "2004Q2",
    servicenow: "2011Q1",
    crowdstrike: "2018Q1",
    datadog: "2017Q1",
    snowflake: "2018Q4",
    cloudflare: "2017Q1",
    zoom: "2018Q1",
  };
  const expectedPriceStarts = {
    crowdstrike: "2019-06-12",
    servicenow: "2012-06-29",
    datadog: "2019-09-19",
    snowflake: "2020-09-16",
    cloudflare: "2019-09-13",
    zoom: "2019-04-18",
  };

  for (const [companyId, expectedPeriod] of Object.entries(expectedRevenueStarts)) {
    const firstPeriod = data.periods.find((period) => Number.isFinite(data.companies[companyId].revenue?.[period]));
    assert.equal(firstPeriod, expectedPeriod, `${companyId} revenue should start at ${expectedPeriod}`);
  }
  for (const [companyId, expectedDate] of Object.entries(expectedPriceStarts)) {
    assert.equal(Object.keys(prices.companies[companyId].daily)[0], expectedDate);
  }

  assert.ok(
    data.companies.sap.earnings["2018Q1"] > 700_000_000 &&
      data.companies.sap.earnings["2018Q1"] < 1_000_000_000,
    "SAP 2018Q1 should use quarterly profit after tax rather than the full-year value",
  );
});

test("real rolling annual flow values only appear after four complete source quarters", () => {
  const data = loadFinancialSourceData();
  const missingWindows = [];

  for (const [companyId, company] of Object.entries(data.companies)) {
    for (const [metricKey, sourceKey] of [["revenue", "revenue"], ["netIncome", "earnings"]]) {
      const rolling = aggregateFlowRollingAnnualEntries(
        data.periods.map((period) => [period, company[sourceKey]?.[period]]),
      );

      rolling.forEach(([period, value], index) => {
        if (!Number.isFinite(value)) return;
        const windowPeriods = data.periods.slice(index - 3, index + 1);
        const hasCompleteSourceWindow =
          windowPeriods.length === 4 &&
          windowPeriods.every((windowPeriod) => Number.isFinite(company[sourceKey]?.[windowPeriod]));
        if (!hasCompleteSourceWindow) {
          missingWindows.push(`${companyId}:${metricKey}:${period}`);
        }
      });
    }
  }

  assert.deepEqual(missingWindows, []);
});

test("keeps latest quarter populated across companies except non-applicable metrics", () => {
  const data = loadFinancialSourceData();
  const metricKeys = ["revenue", "earnings", "grossMargin", "pe", "roe", "revenueGrowth"];
  const allowedMissing = new Set([
    "bankofamerica:grossMargin",
    "jpmorgan:grossMargin",
    "chronoscale:roe",
  ]);
  const missing = [];

  for (const [companyId, company] of Object.entries(data.companies)) {
    for (const metricKey of metricKeys) {
      const value = company[metricKey]?.["2026Q1"];
      if (value == null || Number.isNaN(value)) {
        const key = `${companyId}:${metricKey}`;
        if (metricKey === "pe") {
          const latestFourEarnings = ["2025Q2", "2025Q3", "2025Q4", "2026Q1"]
            .map((period) => company.earnings?.[period]);
          const hasNonPositiveTtmEarnings =
            latestFourEarnings.every(Number.isFinite) &&
            latestFourEarnings.reduce((sum, earnings) => sum + earnings, 0) <= 0;
          if (hasNonPositiveTtmEarnings) continue;
          if (!latestFourEarnings.every(Number.isFinite)) continue;
        }
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

test("allows price labels to extend when range ends at the latest financial value", () => {
  assert.equal(
    shouldExtendPriceComparisonLabels({
      rangeEnd: 84,
      latestVisibleFinancialIndex: 84,
      allLabelsLength: 86,
    }),
    true,
  );

  assert.equal(
    shouldExtendPriceComparisonLabels({
      rangeEnd: 60,
      latestVisibleFinancialIndex: 84,
      allLabelsLength: 86,
    }),
    false,
  );
});

test("extends the range control end through the latest price period", () => {
  assert.equal(
    extendRangeEndThroughLatestPrice({
      rangeStart: 0,
      rangeEnd: 1,
      allLabels: ["2025Q4", "2026Q1", "2026Q2"],
      dailyPrices: {
        "2026-05-18": 120,
      },
      frequency: "quarterly",
    }),
    2,
  );
});

test("initial chart build applies the same price overlay options as refresh", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const buildChartBody = script.match(/function buildChart\(\) \{([\s\S]*?)\nfunction /)?.[1] ?? "";

  assert.match(buildChartBody, /const priceBounds = computeAlignedPriceYAxisBounds\(datasets, yBounds\);/);
  assert.match(buildChartBody, /const hasPriceOverlay = datasets\.some\(\(dataset\) => dataset\.priceOverlay\);/);
  assert.match(buildChartBody, /display: hasPriceOverlay,/);
  assert.match(buildChartBody, /min: priceBounds\.min,/);
  assert.match(buildChartBody, /max: priceBounds\.max,/);
});

test("visible-data range uses the longest continuous fundamental-or-price interval", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const boundsBody = script.match(/function getVisibleDataBounds\([\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(boundsBody, /allFundamentalsPresent/);
  assert.match(boundsBody, /pricePeriods\.has\(label\)/);
  assert.match(boundsBody, /findLongestContiguousDataRange/);
});

test("Nebius datasets start at 2024Q2 and never expose pre-spinoff history", () => {
  const data = loadFinancialSourceData();
  const prices = loadStockPriceSourceData();
  const nebius = data.companies.nebius;

  for (const key of ["revenue", "earnings", "pe", "netAssets", "roe", "grossMargin", "revenueGrowth", "periodEndDates", "reportDates"]) {
    assert.equal(Object.keys(nebius[key] || {}).some((period) => period < "2024Q2"), false, key);
  }
  assert.equal(Object.keys(prices.companies.nebius.daily).some((date) => date < "2024-04-01"), false);
});

test("company generation rebuilds the chart after applying pending selection", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const generateBody = script.match(/function generateSelectedCompanies\(\) \{([\s\S]*?)\nfunction /)?.[1] ?? "";

  assert.match(generateBody, /state\.visibleCompanies = applyPendingCompanies\(state\.pendingCompanies\);/);
  assert.match(generateBody, /rebuildChartForCurrentView\(\);/);
  assert.doesNotMatch(generateBody, /refreshChart\("none"\);/);
  assert.doesNotMatch(generateBody, /applyVisibilityStateToChart\(\);/);
});

test("metric changes rebuild the chart to avoid stale dataset shapes", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const metricHandlerBody = script.match(/metricInputs\.forEach\(\(input\) => \{([\s\S]*?)\n  \}\);\n\n  frequencyInputs/)?.[1] ?? "";

  assert.match(metricHandlerBody, /state\.metric = input\.value;/);
  assert.match(metricHandlerBody, /setRangeToVisibleDataBounds\(\);/);
  assert.match(metricHandlerBody, /syncRangeControls\(\);/);
  assert.match(metricHandlerBody, /rebuildChartForCurrentView\(\);/);
  assert.doesNotMatch(metricHandlerBody, /refreshChart\(\);/);
});

test("price comparison toggle refreshes in place without rebuilding the chart", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const priceComparisonBody = script.match(/function setPriceComparisonEnabled\([\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(priceComparisonBody, /refreshChart\("none"\);/);
  assert.doesNotMatch(priceComparisonBody, /rebuildChartForCurrentView\(\);/);
});

test("single-company chart modes share fixed horizontal axis reservations", () => {
  for (const measuredPrimaryWidth of [96, 104, 128]) {
    assert.deepEqual(
      getChartAxisReservations({ visibleCompanyCount: 1, measuredPrimaryWidth }),
      { primaryWidth: 104, priceWidth: 76 },
    );
  }

  assert.deepEqual(
    getChartAxisReservations({ visibleCompanyCount: 1, measuredPrimaryWidth: 104, compact: true }),
    { primaryWidth: 58, priceWidth: 52 },
  );
});

test("multi-company charts keep their measured primary width without a price gutter", () => {
  assert.deepEqual(
    getChartAxisReservations({ visibleCompanyCount: 3, measuredPrimaryWidth: 118 }),
    { primaryWidth: 118, priceWidth: 0 },
  );
});

test("single-company line and bar charts share bar-style y-axis bounds", () => {
  assert.equal(resolveYAxisBoundsMode({ visibleCompanyCount: 1, chartMode: "line" }), "bar");
  assert.equal(resolveYAxisBoundsMode({ visibleCompanyCount: 1, chartMode: "bar" }), "bar");
  assert.equal(resolveYAxisBoundsMode({ visibleCompanyCount: 3, chartMode: "line" }), "line");
});

test("places the company badge at the bottom when bar values are mostly negative", () => {
  assert.equal(
    shouldPlaceCompanyBadgeAtBottom({ chartMode: "bar", values: [-4, -3, -2, -1, 0.2] }),
    true,
  );
  assert.equal(
    shouldPlaceCompanyBadgeAtBottom({ chartMode: "bar", values: [-2, -1, 1, 2] }),
    false,
  );
  assert.equal(
    shouldPlaceCompanyBadgeAtBottom({ chartMode: "line", values: [-4, -3, -2, -1] }),
    false,
  );
});

test("chart rendering applies unified zero bounds, adaptive badge placement, and bounded tick hiding", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

  assert.match(script, /const boundsMode = PriceComparisonUtils\.resolveYAxisBoundsMode/);
  assert.match(script, /function shouldReserveSingleCompanyLegendLayout/);
  assert.match(script, /plugins\.legend\.display = reserveLegendLayout/);
  assert.match(script, /display: reserveLegendLayout/);
  assert.match(script, /shouldPlaceCompanyBadgeAtBottom/);
  assert.match(script, /badgeVerticalPosition === "bottom"/);
  assert.match(script, /\{ min: this\.min, max: this\.max \}/);
});

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

test("price comparison keeps the expanded single-company plot width when toggled off", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const paddingBody = script.match(/function buildChartLayoutPadding\([\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(script, /const SINGLE_COMPANY_CHART_RIGHT_PADDING = 12;/);
  assert.match(paddingBody, /right:\s*compact \? COMPACT_SINGLE_COMPANY_RIGHT_PADDING : SINGLE_COMPANY_CHART_RIGHT_PADDING/);
  assert.doesNotMatch(paddingBody, /hasPriceOverlay/);
  assert.match(script, /buildChartLayoutPadding\(effectiveChartMode\)/g);
});

test("compact charts reduce axes, labels, logo, and watermark pressure", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

  assert.match(script, /const COMPACT_CHART_MAX_WIDTH = 520;/);
  assert.match(script, /if \(isCompactChartLayout\(\)\) return;/);
  assert.match(script, /const targetArea = compact \? 36 \* 36 : BAR_CHART_LOGO_TARGET_AREA/);
  assert.match(script, /COMPACT_SINGLE_COMPANY_WATERMARK_MIN_FONT_SIZE/);
  assert.match(script, /maxYearTicks = getChartContainerWidth\(\) <= 380 \? 5 : 6/);
  assert.match(script, /return numericValue < 0 \? "" : `\$\$\{decimalFormatter\.format\(numericValue\)\}`/);
});

test("single-company financial bars keep uniform quarter slots with price comparison", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

  assert.match(script, /const shouldUseFinancialQuarterSlotPoints = useBarForSingleCompany;/);
  assert.doesNotMatch(script, /const shouldUseDateXAxis = usesDateXAxis\(\);/);
  assert.doesNotMatch(script, /useDateXAxis/);
  assert.match(script, /const shouldReservePriceComparisonRange = canEnablePriceComparisonForCurrentView\(\);/);
  assert.match(script, /const visibleLabels = shouldReservePriceComparisonRange/);
  assert.doesNotMatch(script, /const visibleLabels = state\.priceComparisonEnabled/);
  assert.match(script, /function usesDateXAxis\(_effectiveChartMode = getEffectiveChartMode\(\)\) \{\s*return false;/);
});

test("bar chart tooltips choose nearby anchors without covering the active bar", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

  assert.match(script, /function registerInteractionModes/);
  assert.match(script, /Chart\.Interaction\.modes\.barPriority/);
  assert.match(script, /findVisibleBarInteractionItem\(chart, eventPosition, useFinalPosition\)/);
  assert.match(script, /mode:\s*usesDateXAxis\(effectiveChartMode\) \? "nearest" : "barPriority"/);
  assert.match(script, /Chart\.Tooltip\.positioners\.barAbove/);
  assert.match(script, /const barActiveItem =/);
  assert.match(script, /Chart\.Tooltip\.positioners\.nearest\.call\(this, activeItems, eventPosition\)/);
  assert.match(script, /const x = clampNumber\(preferredX, chartArea\.left, chartArea\.right\);/);
  assert.match(script, /if \(x \+ halfWidth > chartArea\.right\) \{\s*xAlign = "right";/);
  assert.match(script, /else if \(x - halfWidth < chartArea\.left\) \{\s*xAlign = "left";/);
  assert.match(script, /function getBarRectFromElement/);
  assert.match(script, /const activeBarRect = getBarRectFromElement\(activeElement\);/);
  assert.match(script, /function getRectIntersectionArea/);
  assert.match(script, /function rectsNearlyEqual/);
  assert.match(script, /const activeOverlapArea = getRectIntersectionArea\(rect, activeBarRect\);/);
  assert.match(script, /\.filter\(\(\{ activeOverlapArea \}\) => activeOverlapArea === 0\)/);
  assert.match(script, /const otherOverlapArea = otherBarRects\.reduce/);
  assert.match(script, /BAR_TOOLTIP_OTHER_BAR_MAX_PENALTY/);
  assert.match(script, /score:\s*distance \+ otherBarPenalty/);
  assert.match(script, /left\.activeOverlapArea - right\.activeOverlapArea \|\| left\.score - right\.score/);
  assert.match(script, /function collectVisibleBarRects/);
  assert.match(script, /function tooltipRectIntersectsBar/);
  assert.match(script, /function shouldAvoidBarTooltipCollisions/);
  assert.match(script, /return metricKey === "revenue" \|\| metricKey === "netIncome";/);
  assert.match(script, /avoidBarCollisions:\s*shouldAvoidBarTooltipCollisions\(state\.metric\)/);
  assert.match(script, /findNonOverlappingTooltipPosition/);
  assert.match(script, /xAlign:\s*"right"/);
  assert.match(script, /xAlign:\s*"left"/);
  assert.match(script, /position:\s*"barAbove"/);
});

test("bar tooltip titles prefer financial report dates before stock-price dates", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const titleBody = script.match(/title\(context\) \{([\s\S]*?)\n              const prefix =/)?.[1] ?? "";

  assert.match(titleBody, /const reportDateContext =/);
  assert.match(titleBody, /const priceContext =/);
  assert.ok(titleBody.indexOf("const reportDateContext =") < titleBody.indexOf("const priceContext ="));
});

test("single-company bars pin thickness when price overlay is dense", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

  assert.match(script, /function computeSingleCompanyBarThickness/);
  assert.match(script, /barThickness:\s*useBarDataset\s*\?\s*computeSingleCompanyBarThickness\(rangeLabels\.length\)/);
  assert.match(script, /currentDataset\.barThickness = nextDataset\.barThickness;/);
});

test("single-company bars disable grouping so the bar center stays on the quarter slot", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

  assert.match(script, /grouped:\s*useBarDataset\s*\?\s*false\s*:\s*undefined/);
  assert.match(script, /currentDataset\.grouped = nextDataset\.grouped;/);
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

test("keeps positive net-income bar charts slightly below zero for stable slider baseline", () => {
  assert.equal(
    computeCompactBarZeroBaselineMin({
      metricKey: "netIncome",
      chartMode: "bar",
      min: 0.2,
      max: 43,
    }),
    -1.075,
  );
});

test("compresses tiny negative net-income history instead of rounding it to a large floor", () => {
  assert.equal(
    computeCompactBarZeroBaselineMin({
      metricKey: "netIncome",
      chartMode: "bar",
      min: -0.201338,
      max: 42.96,
    }),
    -1.074,
  );
});

test("preserves substantial net-income losses instead of hiding them in a compact baseline", () => {
  assert.equal(
    computeCompactBarZeroBaselineMin({
      metricKey: "netIncome",
      chartMode: "bar",
      min: -49.746,
      max: 39.8,
    }),
    null,
  );
});

test("hides only compact padding ticks and keeps real negative units visible", () => {
  assert.equal(
    shouldHidePrimaryYAxisTickLabel({
      metricKey: "netIncome",
      chartMode: "bar",
      value: -1_000_000_000,
      axisMin: -1_075_000_000,
      axisMax: 43_000_000_000,
    }),
    true,
  );
  assert.equal(
    shouldHidePrimaryYAxisTickLabel({
      metricKey: "netIncome",
      chartMode: "bar",
      value: -10_000_000,
      axisMin: -400_000_000,
      axisMax: 50_000_000,
    }),
    false,
  );
  assert.equal(
    shouldHidePrimaryYAxisTickLabel({
      metricKey: "netIncome",
      chartMode: "bar",
      value: 0,
      axisMin: -400_000_000,
      axisMax: 50_000_000,
    }),
    false,
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
