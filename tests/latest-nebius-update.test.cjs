const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const nebius = context.window.FINANCIAL_SOURCE_DATA.companies.nebius;
const period = "2026Q2";

test("Nebius Q2 2026 official results are available", () => {
  assert.equal(nebius.revenue[period], 582_300_000);
  assert.equal(nebius.earnings[period], -190_400_000);
  assert.equal(nebius.operatingIncome[period], -175_900_000);
  assert.equal(nebius.netAssets[period], 10_340_500_000);
  assert.equal(nebius.periodEndDates[period], "2026-06-30");
  assert.equal(nebius.reportDates[period], "2026-08-12");
});

test("Nebius Q2 2026 derived metrics use official reported values", () => {
  assert.ok(
    Math.abs(nebius.grossMargin[period] - ((582.3 - 133.6) / 582.3) * 100) < 1e-12,
  );
  assert.ok(
    Math.abs(
      nebius.revenueGrowth[period]
        - ((nebius.revenue[period] / nebius.revenue["2025Q2"]) - 1) * 100,
    ) < 1e-12,
  );
  assert.ok(Math.abs(nebius.roe[period] - (-190.4 / 10_340.5) * 100) < 1e-12);
});

test("Nebius Q3 2026 uses the official standalone quarter and consolidated equity", () => {
  const quarter = "2026Q3";
  assert.equal(nebius.revenue[quarter], 980_800_000);
  assert.equal(nebius.earnings[quarter], -37_500_000);
  assert.equal(nebius.operatingIncome[quarter], 50_400_000);
  assert.equal(nebius.netAssets[quarter], 12_299_200_000);
  assert.equal(nebius.operatingCashFlow[quarter], -273_000_000);
  assert.equal(nebius.capex[quarter], 7_300_400_000);
  assert.equal(nebius.freeCashFlow[quarter], -7_573_400_000);
  assert.equal(nebius.periodEndDates[quarter], "2026-09-30");
  assert.equal(nebius.reportDates[quarter], "2026-11-12");
  assert.ok(Math.abs(nebius.grossMargin[quarter] - (761.1 / 980.8) * 100) < 1e-12);
  assert.ok(Math.abs(nebius.roe[quarter] - (-37.5 / 12_299.2) * 100) < 1e-12);
  assert.ok(Math.abs(nebius.revenueGrowth[quarter] - (980.8 / 146.1 - 1) * 100) < 1e-12);
});
