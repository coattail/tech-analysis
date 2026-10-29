const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  audit, applyAuditedQuarterlyCorrections, applyAuditedBackfillRows,
  findRepeatedQuarterlyValues, findUnreviewedFlatFlows,
} = require("../quarterly-data-quality.cjs");

function loadData() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../data.js"), "utf8"), context);
  return context.window.FINANCIAL_SOURCE_DATA;
}

test("reconciles corrected quarters to independently reported fiscal annual totals", () => {
  const data = loadData();
  const cases = [
    ["microsoft", ["2006Q3", "2006Q4", "2007Q1", "2007Q2"], 51_122_000_000, 14_065_000_000],
    ["apple", ["2006Q4", "2007Q1", "2007Q2", "2007Q3"], 24_578_000_000, 3_495_000_000],
    ["amazon", ["2005Q1", "2005Q2", "2005Q3", "2005Q4"], 8_490_000_000, 359_000_000],
    ["nvidia", ["2005Q2", "2005Q3", "2005Q4", "2006Q1"], 2_375_687_000, 301_176_000],
    ["meta", ["2010Q1", "2010Q2", "2010Q3", "2010Q4"], 1_974_000_000, 606_000_000],
    ["exxon", ["2008Q1", "2008Q2", "2008Q3", "2008Q4"], 459_579_000_000, 45_220_000_000],
  ];
  for (const [id, periods, revenue, earnings] of cases) {
    for (const [metric, expected] of [["revenue", revenue], ["earnings", earnings]]) {
      const actual = periods.reduce((sum, period) => sum + data.companies[id][metric][period], 0);
      assert.equal(actual, expected, id + " annual " + metric);
    }
  }
});

test("keeps corrected fiscal observations in the calendar quarter of their actual end", () => {
  const data = loadData();
  for (const [id, rows] of Object.entries(audit.companies)) {
    for (const [period, row] of Object.entries(rows)) {
      assert.ok(row.sources.length > 0);
      row.sources.forEach((source) => assert.ok(audit.sources[source]?.url.startsWith("https://")));
      if (!row.periodEndDate) continue;
      const end = new Date(row.periodEndDate + "T00:00:00Z");
      if ([0, 3, 6, 9].includes(end.getUTCMonth()) && end.getUTCDate() <= 7) end.setUTCDate(0);
      const calendarPeriod = end.getUTCFullYear() + "Q" + (Math.floor(end.getUTCMonth() / 3) + 1);
      assert.equal(calendarPeriod, period, id + ":" + period);
      assert.equal(data.companies[id].periodEndDates[period], row.periodEndDate);
    }
  }
});

test("flags fabricated equal quarters but preserves independently verified coincidences", () => {
  const data = loadData();
  assert.equal(Object.keys(data.companies).length, 45);
  assert.deepEqual(findUnreviewedFlatFlows(data), []);
  assert.equal(findRepeatedQuarterlyValues(data).length, 5);
  const exxonBefore = data.companies.exxon.revenue["2025Q1"];
  applyAuditedQuarterlyCorrections("exxon", data.companies.exxon, data.periods);
  assert.equal(data.companies.exxon.revenue["2025Q1"], exxonBefore);
  data.companies.microsoft.revenue["2005Q1"] = 10_339_750_000;
  data.companies.microsoft.revenue["2005Q2"] = 10_339_750_000;
  assert.ok(findUnreviewedFlatFlows(data).some((row) => row.companyId === "microsoft"));
});

test("restores facts after an upstream overwrite and repairs dependent YoY and ROE", () => {
  const data = loadData();
  const company = data.companies.microsoft;
  company.revenue["2005Q1"] = company.revenue["2005Q2"] = 10_339_750_000;
  company.earnings["2007Q1"] = 7_647_500_000;
  company.revenueGrowth["2006Q1"] = 0;
  company.roe["2007Q1"] = 0;
  applyAuditedQuarterlyCorrections("microsoft", company, data.periods);
  assert.equal(company.revenue["2005Q1"], 9_620_000_000);
  assert.equal(company.revenue["2005Q2"], 10_161_000_000);
  assert.equal(company.earnings["2007Q1"], 4_926_000_000);
  assert.equal(company.revenueGrowth["2006Q1"], (10_900 - 9_620) / 9_620 * 100);
  assert.equal(company.roe["2007Q1"], 4_926_000_000 / company.netAssets["2007Q1"] * 100);
  assert.deepEqual(applyAuditedQuarterlyCorrections("microsoft", company, data.periods), []);
});

test("repairs historical parser rows rather than carrying Q3 into Q4", () => {
  const rows = applyAuditedBackfillRows("exxon", [{
    period: "2008Q4", revenue: 132_085_000_000, netIncome: 14_830_000_000, grossProfit: 45_901_000_000,
  }]);
  assert.equal(rows[0].revenue, 80_495_000_000);
  assert.equal(rows[0].netIncome, 7_820_000_000);
  assert.equal(rows[0].grossProfit, 29_760_000_000);
  assert.equal(rows[0].dateKey, "2008-12-31");
});

test("published data and cached historical rows are already audited and idempotent", () => {
  const data = loadData();
  for (const [id, company] of Object.entries(data.companies)) {
    assert.deepEqual(applyAuditedQuarterlyCorrections(id, company, data.periods), [], id);
  }
  const backfill = require("../data/historical-sec-backfill.json");
  for (const [id, company] of Object.entries(backfill.companies)) {
    assert.deepEqual(applyAuditedBackfillRows(id, company.rows), company.rows, id);
  }
  const operatingHistory = require("../data/operating-income-history.json");
  for (const [id, rows] of Object.entries(audit.companies)) {
    const company = operatingHistory.companies[id];
    if (!company) continue;
    for (const [period, row] of Object.entries(rows)) {
      if (!Number.isFinite(row.operatingIncome) || period < company.listingPeriod || period > company.latestFinancialPeriod) continue;
      assert.ok(company.directPeriods.includes(period), id + ":" + period);
      assert.ok(!company.reconstructedPeriods.includes(period));
      assert.equal(company.officialQuarterlySources[period].operatingIncome, data.companies[id].operatingIncome[period]);
    }
  }
});
