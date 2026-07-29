const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const updater = fs.readFileSync(path.join(root, "scripts", "auto-refresh-data.mjs"), "utf8");
const historyBackfiller = fs.readFileSync(
  path.join(root, "scripts", "backfill-operating-income-history.mjs"),
  "utf8",
);

function loadFinancialSourceData() {
  const dataJs = fs.readFileSync(path.join(root, "data.js"), "utf8");
  const context = { window: {} };
  vm.runInNewContext(dataJs, context);
  return context.window.FINANCIAL_SOURCE_DATA;
}

test("offers operating income as a bilingual flow metric", () => {
  assert.match(html, /name="metric" value="operatingIncome"/);
  assert.match(html, /data-i18n="operatingIncome">营业利润/);
  assert.match(script, /operatingIncome:\s*\{\s*label: "营业利润（美元）"/);
  assert.match(script, /en: \{ label: "Operating Income \(USD\)"/);
  assert.match(script, /const annualOperatingIncome = aggregateFlowAnnual\(quarterOperatingIncome\)/);
  assert.match(script, /const rollingOperatingIncome = aggregateFlowRollingAnnual\(quarterOperatingIncome\)/);
});

test("keeps operating income in the SEC and StockAnalysis refresh pipeline", () => {
  assert.match(updater, /"OperatingIncomeLoss"/);
  assert.match(updater, /"ProfitLossFromOperatingActivities"/);
  assert.match(updater, /\["operatingIncome", "opinc"\]/);
  assert.match(updater, /companyData\.operatingIncome/);
  assert.match(updater, /companyStats\.operatingIncomeChanges/);
  assert.match(updater, /--operating-income-only/);
  assert.match(updater, /isCuratedOperatingIncomeLikelyReliable/);
  assert.match(updater, /setSeriesValueIfMissing\(companyData\.operatingIncome/);
});

test("stores an operating-income series for every company", () => {
  const sourceData = loadFinancialSourceData();
  const companies = Object.values(sourceData.companies);

  assert.ok(companies.length > 0);
  companies.forEach((company) => {
    assert.equal(typeof company.operatingIncome, "object");
    assert.ok(company.operatingIncome);
  });
});

test("ships continuous operating-income history from listing or 2005Q1", () => {
  const sourceData = loadFinancialSourceData();
  const audit = JSON.parse(
    fs.readFileSync(path.join(root, "data", "operating-income-history.json"), "utf8"),
  );
  const companyIds = Object.keys(sourceData.companies);

  assert.equal(Object.keys(audit.companies).length, companyIds.length);
  companyIds.forEach((companyId) => {
    const companyAudit = audit.companies[companyId];
    assert.ok(companyAudit, `${companyId} should have a coverage audit`);
    assert.deepEqual(companyAudit.missingPeriods, [], `${companyId} should have no audited gaps`);

    const startOrdinal = Number(companyAudit.listingPeriod.slice(0, 4)) * 4
      + Number(companyAudit.listingPeriod.at(-1)) - 1;
    const endOrdinal = Number(companyAudit.latestFinancialPeriod.slice(0, 4)) * 4
      + Number(companyAudit.latestFinancialPeriod.at(-1)) - 1;
    for (let ordinal = startOrdinal; ordinal <= endOrdinal; ordinal += 1) {
      const period = `${Math.floor(ordinal / 4)}Q${(ordinal % 4) + 1}`;
      assert.ok(
        Number.isFinite(sourceData.companies[companyId].operatingIncome[period]),
        `${companyId} should include operating income for ${period}`,
      );
    }
  });
});

test("keeps the reproducible source snapshot and TTM reconstruction formula", () => {
  const sourceSnapshot = JSON.parse(
    fs.readFileSync(path.join(root, "data", "operating-income-source.json"), "utf8"),
  );

  assert.equal(Object.keys(sourceSnapshot.companies).length, 44);
  assert.match(historyBackfiller, /const EARLIEST_PERIOD = "2005Q1"/);
  assert.match(
    historyBackfiller,
    /knownQuarterValue - \(ttm\.get\(period\) - ttm\.get\(previousQuarter\)\)/,
  );
  assert.match(historyBackfiller, /Math\.abs\(knownQuarterValue\)/);
});

test("allows a focused two-company grouped bar view with readable bars", () => {
  assert.match(html, /data-i18n="focusedCompanyView">单\/双公司视图/);
  assert.match(
    script,
    /state\.visibleCompanies\.size >= 1 && state\.visibleCompanies\.size <= 2\s*\? state\.chartMode/,
  );
  assert.match(script, /const dualCompanyBars = useBarForFocusedCompanies && visibleCompanyCount === 2/);
  assert.match(script, /grouped: useBarDataset \? dualCompanyBars : undefined/);
  assert.match(script, /computeDualCompanyBarThickness\(rangeLabels\.length\)/);
  assert.match(script, /const DUAL_COMPANY_BAR_MIN_THICKNESS = 5/);
  assert.match(script, /const DUAL_COMPANY_BAR_MAX_THICKNESS = 18/);
  assert.match(script, /const DUAL_COMPANY_BAR_WIDTH_RATIO = 0\.36/);
  assert.match(script, /const DUAL_COMPANY_BAR_MIN_GROUP_GAP = 2/);
  assert.match(
    script,
    /\(slotWidth - DUAL_COMPANY_BAR_MIN_GROUP_GAP\) \/ 2/,
  );
  assert.match(script, /return Math\.min\(desiredThickness, maxThicknessWithGroupGap\)/);
  assert.match(script, /dualCompanyBars \? 0\.78 : 0\.72/);
  assert.match(script, /dualCompanyBars \? 0\.84 : 0\.82/);
});
