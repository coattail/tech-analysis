const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const coreweave = context.window.FINANCIAL_SOURCE_DATA.companies.coreweave;
const period = "2026Q2";

test("CoreWeave Q2 2026 official results are available", () => {
  assert.equal(coreweave.revenue[period], 2_575_000_000);
  assert.equal(coreweave.earnings[period], -626_000_000);
  assert.equal(coreweave.operatingIncome[period], -49_000_000);
  assert.equal(coreweave.netAssets[period], 5_024_000_000);
  assert.equal(coreweave.periodEndDates[period], "2026-06-30");
  assert.equal(coreweave.reportDates[period], "2026-08-11");
});

test("CoreWeave Q2 2026 derived metrics use official reported values", () => {
  assert.ok(
    Math.abs(coreweave.grossMargin[period] - ((2_575 - 879) / 2_575) * 100) < 1e-12,
  );
  assert.ok(
    Math.abs(
      coreweave.revenueGrowth[period]
        - ((coreweave.revenue[period] / coreweave.revenue["2025Q2"]) - 1) * 100,
    ) < 1e-12,
  );
  assert.ok(Math.abs(coreweave.roe[period] - (-626 / 5_024) * 100) < 1e-12);
});

test("CoreWeave Q3 2026 includes reported equity and cash flows", () => {
  const quarter = "2026Q3";
  assert.equal(coreweave.revenue[quarter], 3_661_000_000);
  assert.equal(coreweave.earnings[quarter], -709_000_000);
  assert.equal(coreweave.operatingIncome[quarter], 207_000_000);
  assert.equal(coreweave.netAssets[quarter], 4_025_000_000);
  assert.equal(coreweave.operatingCashFlow[quarter], 1_975_000_000);
  assert.equal(coreweave.capex[quarter], 9_441_000_000);
  assert.equal(coreweave.freeCashFlow[quarter], -7_466_000_000);
  assert.ok(Math.abs(coreweave.roe[quarter] - (-709 / 4_025) * 100) < 1e-12);
  assert.equal(coreweave.periodEndDates[quarter], "2026-09-30");
  assert.equal(coreweave.reportDates[quarter], "2026-11-10");
});
