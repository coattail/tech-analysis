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

test("Amazon Q3 2026 official results and derived metrics are available", () => {
  const p = "2026Q3";
  assert.equal(company.revenue[p], 201_944_000_000);
  assert.equal(company.earnings[p], 20_685_000_000);
  assert.equal(company.operatingIncome[p], 28_076_000_000);
  assert.equal(company.netAssets[p], 613_601_000_000);
  assert.equal(company.grossMargin[p], (107_371 / 201_944) * 100);
  assert.equal(company.roe[p], (20_685 / 613_601) * 100);
  assert.ok(Math.abs(company.revenueGrowth[p] - ((201_944 / 180_169) - 1) * 100) < 1e-10);
  assert.equal(company.periodEndDates[p], "2026-09-30");
  assert.equal(company.reportDates[p], "2026-10-29");
  for (const flags of Object.values(company.forecastFlags)) assert.ok(!flags.includes(p));
  const audit = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/operating-income-history.json"))).companies.amazon;
  assert.equal(audit.latestFinancialPeriod, p);
  assert.ok(audit.directPeriods.includes(p));
  assert.equal(audit.officialQuarterlySources[p].operatingIncome, company.operatingIncome[p]);
});

test("Amazon Q3 2026 enters the existing TTM flow aggregation", () => {
  const { aggregateFlowRollingAnnualEntries } = require("../price-comparison.js");
  for (const [metric, expected] of [["revenue", 797_455_000_000], ["earnings", 134_779_000_000], ["operatingIncome", 104_366_000_000]]) {
    const ttm = new Map(aggregateFlowRollingAnnualEntries(Object.entries(company[metric])));
    assert.equal(ttm.get("2026Q3"), expected, metric);
  }
  assert.equal(company.operatingIncome["2025Q3"], 17_422_000_000);
  assert.equal(company.operatingIncome["2025Q4"], 24_977_000_000);
});

test("scheduled refresh restores Amazon Q3 2026 from the official override", () => {
  const script = fs.readFileSync(path.join(__dirname, "../scripts/auto-refresh-data.mjs"), "utf8");
  const start = script.indexOf("const COMPANY_OFFICIAL_QUARTERLY_OVERRIDES =");
  const end = script.indexOf("\nconst ", start + 1);
  const overrides = vm.runInNewContext(script.slice(start, end) + "\nCOMPANY_OFFICIAL_QUARTERLY_OVERRIDES;");
  const official = overrides.amazon["2026Q3"];
  for (const metric of ["revenue", "earnings", "operatingIncome", "grossMargin", "netAssets"]) {
    assert.equal(official[metric], company[metric]["2026Q3"]);
  }
  assert.equal(official.reportDate, "2026-10-29");
});
