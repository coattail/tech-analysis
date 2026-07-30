const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const apple = context.window.FINANCIAL_SOURCE_DATA.companies.apple;
const period = "2026Q2";

test("Apple FY2026 Q3 official results are available", () => {
  assert.equal(apple.revenue[period], 109_417_000_000);
  assert.equal(apple.earnings[period], 29_789_000_000);
  assert.equal(apple.operatingIncome[period], 35_695_000_000);
  assert.equal(apple.netAssets[period], 107_520_000_000);
  assert.equal(apple.periodEndDates[period], "2026-06-27");
  assert.equal(apple.reportDates[period], "2026-07-30");
});

test("Apple FY2026 Q3 derived metrics use official reported values", () => {
  assert.ok(
    Math.abs(apple.grossMargin[period] - (54_770 / 109_417) * 100) < 1e-12,
  );
  assert.ok(
    Math.abs(
      apple.revenueGrowth[period] - ((109_417 / 94_036) - 1) * 100,
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(apple.roe[period] - (29_789 / 107_520) * 100) < 1e-12,
  );
});
