const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const dataset = context.window.FINANCIAL_SOURCE_DATA;

test("Microsoft FY2026 Q4 is available as calendar 2026Q2", () => {
  const company = dataset.companies.microsoft;
  assert.equal(company.revenue["2026Q2"], 90_007_000_000);
  assert.equal(company.earnings["2026Q2"], 35_766_000_000);
  assert.equal(company.operatingIncome["2026Q2"], 40_603_000_000);
  assert.equal(company.netAssets["2026Q2"], 442_387_000_000);
  assert.equal(company.grossMargin["2026Q2"], 67.197);
  assert.equal(company.periodEndDates["2026Q2"], "2026-06-30");
  assert.equal(company.reportDates["2026Q2"], "2026-07-29");
});

test("Meta Q2 2026 is available as calendar 2026Q2", () => {
  const company = dataset.companies.meta;
  assert.equal(company.revenue["2026Q2"], 60_801_000_000);
  assert.equal(company.earnings["2026Q2"], 15_848_000_000);
  assert.equal(company.operatingIncome["2026Q2"], 18_775_000_000);
  assert.equal(company.netAssets["2026Q2"], 261_221_000_000);
  assert.equal(company.grossMargin["2026Q2"], 81.365);
  assert.equal(company.periodEndDates["2026Q2"], "2026-06-30");
  assert.equal(company.reportDates["2026Q2"], "2026-07-29");
});
