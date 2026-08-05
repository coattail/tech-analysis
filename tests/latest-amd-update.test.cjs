const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const amd = context.window.FINANCIAL_SOURCE_DATA.companies.amd;
const period = "2026Q2";

test("AMD Q2 2026 official results are available", () => {
  assert.equal(amd.revenue[period], 11_536_000_000);
  assert.equal(amd.earnings[period], 2_297_000_000);
  assert.equal(amd.operatingIncome[period], 1_990_000_000);
  assert.equal(amd.netAssets[period], 67_224_000_000);
  assert.equal(amd.periodEndDates[period], "2026-06-27");
  assert.equal(amd.reportDates[period], "2026-08-04");
});

test("AMD Q2 2026 derived metrics use official reported values", () => {
  assert.ok(Math.abs(amd.grossMargin[period] - (6_203 / 11_536) * 100) < 1e-12);
  assert.ok(
    Math.abs(
      amd.revenueGrowth[period]
        - ((amd.revenue[period] / amd.revenue["2025Q2"]) - 1) * 100,
    ) < 1e-12,
  );
  assert.ok(Math.abs(amd.roe[period] - (2_297 / 67_224) * 100) < 1e-12);
});
