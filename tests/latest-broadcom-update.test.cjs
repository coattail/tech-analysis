const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "data.js"), "utf8"), context);

const company = context.window.FINANCIAL_SOURCE_DATA.companies.avgo;
const period = "2026Q3";

test("Broadcom FY2026 Q3 official results are available as calendar 2026Q3", () => {
  assert.equal(company.revenue[period], 29_591_000_000);
  assert.equal(company.earnings[period], 13_088_000_000);
  assert.equal(company.operatingIncome[period], 15_955_000_000);
  assert.equal(company.netAssets[period], 99_690_000_000);
  assert.equal(company.periodEndDates[period], "2026-08-02");
  assert.equal(company.reportDates[period], "2026-09-02");
  assert.ok(Math.abs(company.grossMargin[period] - (20_456 / 29_591) * 100) < 1e-12);
  assert.ok(Math.abs(company.revenueGrowth[period] - (29_591 / 15_952 - 1) * 100) < 1e-12);
  assert.ok(Math.abs(company.roe[period] - (13_088 / 99_690) * 100) < 1e-12);
});

test("the updater retains Broadcom Q3 as an official override", () => {
  const updater = fs.readFileSync(path.join(root, "scripts", "auto-refresh-data.mjs"), "utf8");
  assert.match(updater, /avgo:\s*\{[\s\S]*"2026Q3": \{[\s\S]*revenue: 29_591_000_000/);
  assert.match(updater, /operatingIncome: 15_955_000_000/);
});
