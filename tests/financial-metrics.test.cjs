const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const {
  computeYearOverYearGrowth,
  getGrowthOverlayMetric,
  canShowGrowthOverlay,
  normalizeGrowthOverlayEnabled,
  shouldCarryGrowthOverlay,
  alignYAxisZeroPositions,
  computeGrowthChartExpansionRatio,
  resolveWatermarkReferencePlotHeight,
} = require("../financial-metrics.js");

function loadFinancialSourceData() {
  const dataJs = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
  const context = { window: {} };
  vm.runInNewContext(dataJs, context);
  return context.window.FINANCIAL_SOURCE_DATA;
}

test("computes quarterly profit growth against the same quarter one year earlier", () => {
  const labels = ["2025Q1", "2025Q2", "2025Q3", "2025Q4", "2026Q1"];
  const earnings = new Map([
    ["2025Q1", 100],
    ["2025Q2", 120],
    ["2025Q3", 130],
    ["2025Q4", 140],
    ["2026Q1", 150],
  ]);

  const growth = computeYearOverYearGrowth(labels, earnings, 4);

  assert.equal(growth.get("2025Q4"), null);
  assert.equal(growth.get("2026Q1"), 50);
});

test("uses the absolute prior profit as denominator across losses and profits", () => {
  const labels = ["2024", "2025", "2026"];
  const earnings = new Map([
    ["2024", -20],
    ["2025", -10],
    ["2026", 10],
  ]);

  const growth = computeYearOverYearGrowth(labels, earnings, 1);

  assert.equal(growth.get("2025"), 50);
  assert.equal(growth.get("2026"), 200);
});

test("leaves profit growth empty when the comparison value is missing or zero", () => {
  const labels = ["2023", "2024", "2025", "2026"];
  const earnings = new Map([
    ["2023", null],
    ["2024", 10],
    ["2025", 0],
    ["2026", 20],
  ]);

  const growth = computeYearOverYearGrowth(labels, earnings, 1);

  assert.equal(growth.get("2024"), null);
  assert.equal(growth.get("2025"), -100);
  assert.equal(growth.get("2026"), null);
});

test("uses reported Google quarters instead of annual totals divided by four", () => {
  const sourceData = loadFinancialSourceData();
  const alphabet = sourceData.companies.alphabet;
  const labels = sourceData.periods.filter((period) => period >= "2005Q1" && period <= "2007Q4");
  const revenue = new Map(labels.map((period) => [period, alphabet.revenue[period]]));
  const growth = computeYearOverYearGrowth(labels, revenue, 4);

  assert.equal(alphabet.revenue["2005Q1"], 1_256_516_000);
  assert.equal(alphabet.revenue["2005Q4"], 1_919_093_000);
  assert.equal(alphabet.revenue["2013Q1"], 12_951_000_000);
  assert.equal(alphabet.earnings["2008Q4"], 382_443_000);
  assert.equal(new Set(labels.slice(0, 4).map((period) => alphabet.revenue[period])).size, 4);
  assert.ok(Math.abs(growth.get("2006Q1") - 79.364) < 0.01);
  assert.ok(Math.abs(growth.get("2006Q4") - 67.031) < 0.01);
  assert.ok(Math.abs(alphabet.revenueGrowth["2006Q1"] - growth.get("2006Q1")) < 1e-9);
  assert.ok(Math.abs(alphabet.revenueGrowth["2006Q4"] - growth.get("2006Q4")) < 1e-9);
  assert.ok(new Set(labels.slice(4).map((period) => growth.get(period)?.toFixed(2))).size > 4);

  const updater = fs.readFileSync(path.join(__dirname, "..", "scripts", "auto-refresh-data.mjs"), "utf8");
  const dashboard = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  assert.match(updater, /alphabet:\s*\{[\s\S]*"2005Q1": \{ revenue: 1_256_516_000/);
  assert.match(dashboard, /const quarterGrowth = computeQuarterlyGrowth\(quarterRevenue\)/);
});

test("uses NVIDIA reported quarters instead of annual averages and operating-income plugs", () => {
  const sourceData = loadFinancialSourceData();
  const nvidia = sourceData.companies.nvidia;
  const labels = sourceData.periods.filter((period) => period >= "2005Q1" && period <= "2009Q1");
  const revenue = new Map(labels.map((period) => [period, nvidia.revenue[period]]));
  const earnings = new Map(labels.map((period) => [period, nvidia.earnings[period]]));
  const revenueGrowth = computeYearOverYearGrowth(labels, revenue, 4);
  const earningsGrowth = computeYearOverYearGrowth(labels, earnings, 4);

  assert.equal(nvidia.revenue["2005Q1"], 583_846_000);
  assert.equal(nvidia.revenue["2007Q4"], 1_202_730_000);
  assert.equal(nvidia.revenue["2008Q1"], 1_153_388_000);
  assert.equal(nvidia.earnings["2005Q1"], 65_522_000);
  assert.equal(nvidia.earnings["2007Q4"], 256_993_000);
  assert.equal(nvidia.earnings["2008Q1"], 176_805_000);
  assert.equal(nvidia.periodEndDates["2005Q1"], "2005-04-30");
  assert.equal(nvidia.periodEndDates["2008Q1"], "2008-04-27");
  assert.equal(new Set(labels.slice(0, 4).map((period) => nvidia.revenue[period])).size, 4);
  assert.equal(new Set(labels.slice(0, 4).map((period) => nvidia.earnings[period])).size, 4);
  assert.ok(Math.abs(revenueGrowth.get("2006Q1") - 16.7785683211) < 1e-9);
  assert.ok(Math.abs(revenueGrowth.get("2006Q2") - 19.6076282332) < 1e-9);
  assert.ok(Math.abs(earningsGrowth.get("2006Q1") - 40.5085314856) < 1e-9);
  assert.ok(Math.abs(earningsGrowth.get("2006Q2") - 17.4989503339) < 1e-9);
  assert.ok(Math.abs(nvidia.revenueGrowth["2008Q1"] - revenueGrowth.get("2008Q1")) < 1e-9);

  const updater = fs.readFileSync(path.join(__dirname, "..", "scripts", "auto-refresh-data.mjs"), "utf8");
  assert.match(updater, /nvidia:\s*\{[\s\S]*"2005Q1": \{ revenue: 583_846_000/);
});

test("wires bilingual profit growth into all dashboard frequencies", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

  assert.match(html, /name="metric" value="profitGrowth"/);
  assert.match(html, /data-i18n="profitGrowth">利润增速<\/span>/);
  assert.match(script, /profitGrowth: "Profit Growth"/);
  assert.match(script, /quarterly\.profitGrowth\.set\(company\.id, quarterProfitGrowth\)/);
  assert.match(script, /annual\.profitGrowth\.set\(company\.id, annualProfitGrowth\)/);
  assert.match(script, /rollingAnnual\.profitGrowth\.set\(company\.id, rollingProfitGrowth\)/);
});

test("maps revenue and net income bars to their matching growth series", () => {
  assert.equal(getGrowthOverlayMetric("revenue"), "revenueGrowth");
  assert.equal(getGrowthOverlayMetric("netIncome"), "profitGrowth");
  assert.equal(getGrowthOverlayMetric("grossMargin"), null);
});

test("only allows growth overlays for one-company revenue or net-income bars", () => {
  assert.equal(canShowGrowthOverlay({ visibleCompanyCount: 1, chartMode: "bar", metric: "revenue" }), true);
  assert.equal(canShowGrowthOverlay({ visibleCompanyCount: 1, chartMode: "bar", metric: "netIncome" }), true);
  assert.equal(canShowGrowthOverlay({ visibleCompanyCount: 2, chartMode: "bar", metric: "revenue" }), false);
  assert.equal(canShowGrowthOverlay({ visibleCompanyCount: 1, chartMode: "line", metric: "revenue" }), false);
  assert.equal(canShowGrowthOverlay({ visibleCompanyCount: 1, chartMode: "bar", metric: "grossMargin" }), false);
});

test("normalizes growth overlay state when the chart context stops supporting it", () => {
  assert.equal(normalizeGrowthOverlayEnabled({
    enabled: true,
    visibleCompanyCount: 1,
    chartMode: "bar",
    metric: "netIncome",
  }), true);
  assert.equal(normalizeGrowthOverlayEnabled({
    enabled: true,
    visibleCompanyCount: 1,
    chartMode: "line",
    metric: "netIncome",
  }), false);
});

test("carries an enabled growth overlay between revenue and net income metrics", () => {
  assert.equal(shouldCarryGrowthOverlay({ enabled: true, nextMetric: "netIncome" }), true);
  assert.equal(shouldCarryGrowthOverlay({ enabled: true, nextMetric: "revenue" }), true);
  assert.equal(shouldCarryGrowthOverlay({ enabled: true, nextMetric: "grossMargin" }), false);
  assert.equal(shouldCarryGrowthOverlay({ enabled: false, nextMetric: "netIncome" }), false);
});

test("aligns primary and growth-axis zero positions without clipping either range", () => {
  const aligned = alignYAxisZeroPositions({
    primaryBounds: { min: 0, max: 60_000_000_000 },
    secondaryBounds: { min: -1000, max: 2000 },
  });
  const primaryRatio = (0 - aligned.primaryBounds.min)
    / (aligned.primaryBounds.max - aligned.primaryBounds.min);
  const secondaryRatio = (0 - aligned.secondaryBounds.min)
    / (aligned.secondaryBounds.max - aligned.secondaryBounds.min);

  assert.ok(Math.abs(primaryRatio - secondaryRatio) < 1e-12);
  assert.ok(aligned.primaryBounds.min <= 0);
  assert.ok(aligned.primaryBounds.max >= 60_000_000_000);
  assert.ok(aligned.secondaryBounds.min <= -1000);
  assert.ok(aligned.secondaryBounds.max >= 2000);
});

test("uses a tighter friendly zero ratio for lopsided growth ranges", () => {
  const aligned = alignYAxisZeroPositions({
    primaryBounds: { min: 0, max: 90 },
    secondaryBounds: { min: -60, max: 300 },
  });

  assert.equal(aligned.zeroRatio, 1 / 6);
  assert.deepEqual(aligned.primaryBounds, { min: -18, max: 90 });
  assert.deepEqual(aligned.secondaryBounds, { min: -60, max: 300 });
});

test("does not reserve an unused tick band around raw growth extrema", () => {
  const aligned = alignYAxisZeroPositions({
    primaryBounds: { min: 0, max: 90 },
    secondaryBounds: { min: -53.31, max: 266.61 },
  });

  assert.deepEqual(aligned.primaryBounds, { min: -18, max: 90 });
  assert.deepEqual(aligned.secondaryBounds, { min: -55, max: 275 });
});

test("balances zero alignment when one axis is entirely positive and the other entirely negative", () => {
  const aligned = alignYAxisZeroPositions({
    primaryBounds: { min: 0, max: 100 },
    secondaryBounds: { min: -100, max: 0 },
  });
  const primaryRatio = (0 - aligned.primaryBounds.min)
    / (aligned.primaryBounds.max - aligned.primaryBounds.min);
  const secondaryRatio = (0 - aligned.secondaryBounds.min)
    / (aligned.secondaryBounds.max - aligned.secondaryBounds.min);

  assert.ok(Math.abs(primaryRatio - secondaryRatio) < 1e-12);
  assert.ok(primaryRatio > 0.35 && primaryRatio < 0.65);
});

test("uses tight endpoints while aligning mixed financial and growth ranges", () => {
  const aligned = alignYAxisZeroPositions({
    primaryBounds: { min: -49.09e9, max: 60e9 },
    secondaryBounds: { min: -2800, max: 4277.78 },
  });

  assert.deepEqual(aligned.primaryBounds, { min: -49.5e9, max: 60.5e9 });
  assert.deepEqual(aligned.secondaryBounds, { min: -3600, max: 4400 });
  assert.equal(aligned.zeroRatio, 9 / 20);
});

test("expands chart height by the aligned primary-axis span", () => {
  assert.equal(computeGrowthChartExpansionRatio({
    primaryBounds: { min: 0, max: 60 },
    alignedPrimaryBounds: { min: -60, max: 60 },
  }), 2);
  assert.equal(computeGrowthChartExpansionRatio({
    primaryBounds: { min: -40, max: 60 },
    alignedPrimaryBounds: { min: -50, max: 75 },
  }), 1.25);
  assert.equal(computeGrowthChartExpansionRatio({
    primaryBounds: { min: -40, max: 60 },
    alignedPrimaryBounds: { min: -40, max: 60 },
  }), 1);
});

test("keeps the ticker watermark sized and positioned from the base plot when growth expands the chart", () => {
  assert.equal(resolveWatermarkReferencePlotHeight({
    plotHeight: 720,
    basePlotHeight: 720,
    growthChartExtraHeight: 0,
    hasGrowthOverlay: false,
  }), 720);
  assert.equal(resolveWatermarkReferencePlotHeight({
    plotHeight: 1080,
    basePlotHeight: 720,
    growthChartExtraHeight: 360,
    hasGrowthOverlay: true,
  }), 720);
  assert.equal(resolveWatermarkReferencePlotHeight({
    plotHeight: 1080,
    basePlotHeight: null,
    growthChartExtraHeight: 360,
    hasGrowthOverlay: true,
  }), 720);
});

test("wires the compact growth toggles, theme-aware line, and shared right axis into the chart", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  const style = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");

  assert.match(html, /data-growth-overlay-for="revenue"/);
  assert.match(html, /data-growth-overlay-for="netIncome"/);
  assert.match(script, /growthOverlay:\s*true/);
  assert.match(script, /yAxisID:\s*"yPrice"/);
  assert.match(script, /borderColor:\s*overlayColor/);
  assert.match(script, /--chart-overlay-color/);
  assert.match(script, /state\.priceComparisonEnabled = false/);
  assert.match(script, /state\.growthOverlayEnabled = false/);
  assert.match(script, /formatSecondaryAxisTick\(secondaryOverlayType, value\)/);
  assert.match(script, /FinancialMetricsUtils\.alignYAxisZeroPositions\(\{[\s\S]*primaryBounds: basePrimaryBounds,[\s\S]*secondaryBounds,[\s\S]*\}\)/);
  assert.match(script, /FinancialMetricsUtils\.computeGrowthChartExpansionRatio/);
  assert.match(script, /FinancialMetricsUtils\.resolveWatermarkReferencePlotHeight/);
  assert.match(script, /const canReuseBaseLayout = hasGrowthOverlay/);
  assert.match(script, /state\.baseWatermarkLayout = \{/);
  assert.match(script, /typeof state\.pendingGrowthOverlayLayout === "boolean"/);
  assert.match(script, /state\.pendingGrowthOverlayLayout = hasGrowthOverlay;[\s\S]*syncGrowthChartHeight/);
  assert.match(script, /fontSize = canReuseBaseLayout[\s\S]*cachedLayout\.fontSize/);
  assert.match(script, /centerX = canReuseBaseLayout[\s\S]*cachedLayout\.centerX/);
  assert.match(script, /centerY = canReuseBaseLayout[\s\S]*cachedLayout\.centerY/);
  assert.match(script, /GROWTH_AXIS_PADDING_RATIO = 0\.005/);
  assert.match(script, /rawMin - span \* GROWTH_AXIS_PADDING_RATIO/);
  assert.match(script, /rawMax \+ span \* GROWTH_AXIS_PADDING_RATIO/);
  assert.match(script, /Shared-zero alignment performs the only[\s\S]*return \{ min, max \};/);
  assert.match(script, /--growth-chart-extra-height/);
  assert.match(style, /height:\s*calc\(var\(--chart-base-height\) \+ var\(--growth-chart-extra-height\)\)/);
});
