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
