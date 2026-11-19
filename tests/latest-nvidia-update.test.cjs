const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

test("NVIDIA 2026Q3 metrics match the fiscal Q2 2027 filing", () => {
  const data = context.window.FINANCIAL_SOURCE_DATA;
  const nvidia = data.companies.nvidia;

  assert.equal(nvidia.revenue["2026Q3"], 96_221_000_000);
  assert.equal(nvidia.operatingIncome["2026Q3"], 63_734_000_000);
  assert.equal(nvidia.earnings["2026Q3"], 59_688_000_000);
  // The scheduled sources publish this ratio at three decimal places or full precision.
  assert.equal(nvidia.grossMargin["2026Q3"].toFixed(3), (72_142 / 96_221 * 100).toFixed(3));
  assert.equal(nvidia.periodEndDates["2026Q3"], "2026-07-26");
  assert.equal(nvidia.reportDates["2026Q3"], "2026-08-26");
  assert.ok(Math.abs(nvidia.revenueGrowth["2026Q3"] - 105.85114348672529) < 1e-12);

  for (const flagName of ["revenue", "netIncome", "grossMargin", "revenueGrowth", "operatingIncome"]) {
    assert.equal(nvidia.forecastFlags[flagName].includes("2026Q3"), false);
  }
});

test("NVIDIA dashboard 2026Q4 has the complete fiscal Q3 2027 financials", () => {
  const nvidia = context.window.FINANCIAL_SOURCE_DATA.companies.nvidia;
  const q = "2026Q4";
  assert.equal(nvidia.periodEndDates[q], "2026-10-25");
  assert.equal(nvidia.reportDates[q], "2026-11-17");
  assert.equal(nvidia.revenue[q], 115_844_000_000);
  assert.equal(nvidia.earnings[q], 65_287_000_000);
  assert.equal(nvidia.operatingIncome[q], 77_520_000_000);
  assert.ok(Math.abs(nvidia.grossMargin[q] - 86_676 / 115_844 * 100) < 1e-8);
  assert.equal(nvidia.netAssets[q], 266_666_000_000);
  assert.equal(nvidia.roe[q], 65_287 / 266_666 * 100);
  assert.equal(nvidia.operatingCashFlow[q], 48_253_000_000);
  assert.equal(nvidia.capex[q], 4_422_000_000);
  assert.equal(nvidia.freeCashFlow[q], 43_831_000_000);
  const coverage = require("../data/cash-flow-coverage.json").companies.nvidia.metrics;
  for (const metric of ["operatingCashFlow", "capex", "freeCashFlow"]) {
    assert.ok(!coverage[metric].missing.includes(q));
  }
});
