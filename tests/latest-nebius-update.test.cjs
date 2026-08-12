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
