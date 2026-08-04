const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const palantir = context.window.FINANCIAL_SOURCE_DATA.companies.palantir;
const period = "2026Q2";

test("Palantir Q2 2026 official results are available", () => {
  assert.equal(palantir.revenue[period], 1_935_464_000);
  assert.equal(palantir.earnings[period], 1_061_890_000);
  assert.equal(palantir.operatingIncome[period], 912_004_000);
  assert.equal(palantir.netAssets[period], 9_774_194_000);
  assert.equal(palantir.periodEndDates[period], "2026-06-30");
  assert.equal(palantir.reportDates[period], "2026-08-03");
});

test("Palantir Q2 2026 derived metrics use official reported values", () => {
  assert.ok(
    Math.abs(palantir.grossMargin[period] - (1_638_594 / 1_935_464) * 100) < 1e-12,
  );
  assert.ok(
    Math.abs(
      palantir.revenueGrowth[period]
        - ((palantir.revenue[period] / palantir.revenue["2025Q2"]) - 1) * 100,
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(palantir.roe[period] - (1_061_890 / 9_774_194) * 100) < 1e-12,
  );
});
