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
  assert.equal(nvidia.grossMargin["2026Q3"], 74.975);
  assert.equal(nvidia.periodEndDates["2026Q3"], "2026-07-26");
  assert.equal(nvidia.reportDates["2026Q3"], "2026-08-26");
  assert.ok(Math.abs(nvidia.revenueGrowth["2026Q3"] - 105.85114348672529) < 1e-12);

  for (const flagName of ["revenue", "netIncome", "grossMargin", "revenueGrowth", "operatingIncome"]) {
    assert.equal(nvidia.forecastFlags[flagName].includes("2026Q3"), false);
  }
});
