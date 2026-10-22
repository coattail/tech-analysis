const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
const data = context.window.FINANCIAL_SOURCE_DATA;
const p = '2026Q3';
const expected = {
  meta: { revenue: 64_601_000_000, earnings: 9_860_000_000, operatingIncome: 12_988_000_000, grossProfit: 51_232_000_000, netAssets: 272_386_000_000 },
  tsla: { revenue: 28_046_000_000, earnings: 787_000_000, operatingIncome: 718_000_000, grossProfit: 5_494_000_000, netAssets: 89_835_000_000 },
};
for (const [id, values] of Object.entries(expected)) {
  test(`${id} Q3 2026 uses reported GAAP values and derived metrics`, () => {
    const c = data.companies[id];
    for (const metric of ['revenue', 'earnings', 'operatingIncome', 'netAssets']) assert.equal(c[metric][p], values[metric]);
    assert.equal(c.periodEndDates[p], '2026-09-30');
    assert.equal(c.reportDates[p], '2026-10-21');
    assert.equal(c.grossMargin[p], values.grossProfit / values.revenue * 100);
    assert.equal(c.roe[p], values.earnings / values.netAssets * 100);
    assert.equal(c.revenueGrowth[p], (values.revenue / c.revenue['2025Q3'] - 1) * 100);
    for (const flags of Object.values(c.forecastFlags)) assert.ok(!flags.includes(p));
    // The newest TTM window must include four actual quarters for every income metric.
    for (const metric of ['revenue', 'earnings', 'operatingIncome', 'grossMargin']) {
      for (const period of ['2025Q4', '2026Q1', '2026Q2', p]) assert.ok(Number.isFinite(c[metric][period]));
    }
    const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/operating-income-history.json'))).companies[id];
    assert.equal(audit.latestFinancialPeriod, p);
    assert.ok(audit.directPeriods.includes(p));
  });
}

test('scheduled refresh retains the new quarter without the adjacent earnings repository', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/auto-refresh-data.mjs'), 'utf8');
  const start = source.indexOf('const COMPANY_OFFICIAL_QUARTERLY_OVERRIDES =');
  const end = source.indexOf('\nconst ', start + 1);
  const overrides = vm.runInNewContext(source.slice(start, end) + '\nCOMPANY_OFFICIAL_QUARTERLY_OVERRIDES;');
  for (const id of Object.keys(expected)) {
    const c = data.companies[id], official = overrides[id][p];
    for (const metric of ['revenue', 'earnings', 'operatingIncome', 'netAssets', 'grossMargin']) assert.equal(official[metric], c[metric][p]);
    assert.equal(official.reportDate, c.reportDates[p]);
    assert.equal(official.periodEndDate, c.periodEndDates[p]);
  }
});
