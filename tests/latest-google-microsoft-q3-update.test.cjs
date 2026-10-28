const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { aggregateFlowRollingAnnualEntries } = require('../price-comparison.js');
const root = path.resolve(__dirname, '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), ctx);
const data = ctx.window.FINANCIAL_SOURCE_DATA;
const p = '2026Q3';
const expected = {
  alphabet: { revenue: 127577000000, earnings: 26468000000, operatingIncome: 40576000000, grossProfit: 76158000000, netAssets: 677549000000 },
  microsoft: { revenue: 92279000000, earnings: 36629000000, operatingIncome: 45915000000, grossProfit: 62559000000, netAssets: 470509000000 },
};
for (const [id, v] of Object.entries(expected)) {
  test(`${id} September 2026 quarter uses GAAP actuals and coherent derived metrics`, () => {
    const c = data.companies[id];
    for (const metric of ['revenue', 'earnings', 'operatingIncome', 'netAssets']) assert.equal(c[metric][p], v[metric]);
    assert.equal(c.grossMargin[p], v.grossProfit / v.revenue * 100);
    assert.equal(c.roe[p], v.earnings / v.netAssets * 100);
    assert.equal(c.revenueGrowth[p], (v.revenue / c.revenue['2025Q3'] - 1) * 100);
    assert.equal(c.periodEndDates[p], '2026-09-30');
    assert.equal(c.reportDates[p], '2026-10-28');
    for (const flags of Object.values(c.forecastFlags)) assert.ok(!flags.includes(p));
    const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/operating-income-history.json'))).companies[id];
    assert.equal(audit.latestFinancialPeriod, p);
    assert.ok(audit.directPeriods.includes(p));
    assert.equal(audit.officialQuarterlySources[p].operatingIncome, v.operatingIncome);
  });
  test(`${id} new actual quarter enters the existing TTM aggregation`, () => {
    const c = data.companies[id];
    for (const metric of ['revenue', 'earnings', 'operatingIncome']) {
      const ttm = new Map(aggregateFlowRollingAnnualEntries(Object.entries(c[metric])));
      const periods = ['2025Q4', '2026Q1', '2026Q2', p];
      assert.equal(ttm.get(p), periods.reduce((sum, q) => sum + c[metric][q], 0));
    }
  });
}
test('scheduled refresh can restore both quarters without the other repository', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/auto-refresh-data.mjs'), 'utf8');
  const start = source.indexOf('const COMPANY_OFFICIAL_QUARTERLY_OVERRIDES =');
  const end = source.indexOf('\nconst ', start + 1);
  const overrides = vm.runInNewContext(source.slice(start, end) + '\nCOMPANY_OFFICIAL_QUARTERLY_OVERRIDES;');
  for (const id of Object.keys(expected)) {
    const c = data.companies[id], official = overrides[id][p];
    for (const metric of ['revenue', 'earnings', 'operatingIncome', 'grossMargin', 'netAssets']) assert.equal(official[metric], c[metric][p]);
    assert.equal(official.periodEndDate, c.periodEndDates[p]);
    assert.equal(official.reportDate, c.reportDates[p]);
  }
});
