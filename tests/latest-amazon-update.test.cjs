const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const company = context.window.FINANCIAL_SOURCE_DATA.companies.amazon;

test("Amazon Q2 2026 official results are available", () => {
  assert.equal(company.revenue["2026Q2"], 200_606_000_000);
  assert.equal(company.earnings["2026Q2"], 62_647_000_000);
  assert.equal(company.operatingIncome["2026Q2"], 27_461_000_000);
  assert.equal(company.netAssets["2026Q2"], 551_620_000_000);
  assert.equal(company.periodEndDates["2026Q2"], "2026-06-30");
  assert.equal(company.reportDates["2026Q2"], "2026-07-30");
});

test("Amazon Q2 2026 derived metrics use the official reported values", () => {
  assert.equal(
    company.grossMargin["2026Q2"],
    ((200_606 - 95_778) / 200_606) * 100,
  );
  assert.equal(
    company.revenueGrowth["2026Q2"],
    ((200_606 / 167_702) - 1) * 100,
  );
  assert.equal(
    company.roe["2026Q2"],
    (62_647 / 551_620) * 100,
  );
});
