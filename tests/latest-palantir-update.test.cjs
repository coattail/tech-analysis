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

test("Palantir Q3 2026 earnings release fills the quarter before SEC companyfacts", () => {
  const p = "2026Q3";
  assert.equal(palantir.revenue[p], 2_313_411_000);
  assert.equal(palantir.earnings[p], 1_128_012_000);
  assert.equal(palantir.operatingIncome[p], 1_084_845_000);
  assert.equal(palantir.netAssets[p], 11_345_100_000);
  assert.equal(palantir.reportDates[p], "2026-11-02");
  assert.equal(palantir.periodEndDates[p], "2026-09-30");
  assert.ok(Math.abs(palantir.grossMargin[p] - 1_930_125 / 2_313_411 * 100) < 1e-12);
  assert.equal(palantir.operatingCashFlow[p], 1_204_570_000);
  assert.equal(palantir.capex[p], 8_014_000);
  assert.equal(palantir.freeCashFlow[p], 1_196_556_000);
});

test("published Palantir earnings override a complete but stale provider quarter", async () => {
  const script = fs.readFileSync(path.join(__dirname, "..", "scripts/auto-refresh-data.mjs"), "utf8");
  const start = script.indexOf("async function loadPublishedCompanyQuarters(");
  const end = script.indexOf("\nasync function ", start + 1);
  const payload = { id: "palantir", quarters: ["2026Q2", "2026Q3"], financials: {
    "2026Q2": {revenueBn: 1.9, grossProfitBn: 1.6, operatingIncomeBn: .9, netIncomeBn: 1},
    "2026Q3": {revenueBn: 2.313411, grossProfitBn: 1.930125, operatingIncomeBn: 1.084845, netIncomeBn: 1.128012},
  }};
  const fn = vm.runInNewContext(script.slice(start, end) + "\nloadPublishedCompanyQuarters;", {fetchJsonWithCurl: async () => payload, console});
  const existing = Object.fromEntries(["revenue", "earnings", "operatingIncome", "grossMargin"].map(k => [k, {"2026Q2": 1, "2026Q3": 1}]));
  const result = await fn(existing, "palantir");
  assert.deepEqual(Array.from(result.quarters), ["2026Q3"]);
});
