const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
const c = context.window.FINANCIAL_SOURCE_DATA.companies.micron;
const p = '2026Q3';

test('Micron FY2026 Q4 uses GAAP quarterly amounts and September period end', () => {
  assert.equal(c.revenue[p], 54_229_000_000);
  assert.equal(c.earnings[p], 37_701_000_000);
  assert.equal(c.operatingIncome[p], 43_751_000_000);
  assert.equal(c.netAssets[p], 138_378_000_000);
  assert.equal(c.periodEndDates[p], '2026-09-03');
  assert.equal(c.reportDates[p], '2026-09-30');
  assert.ok(Math.abs(c.grossMargin[p] - 47_047 / 54_229 * 100) < 1e-12);
  assert.ok(Math.abs(c.revenueGrowth[p] - (54_229 / 11_315 - 1) * 100) < 1e-12);
  assert.ok(Math.abs(c.roe[p] - 37_701 / 138_378 * 100) < 1e-12);
  for (const key of ['revenue', 'netIncome', 'operatingIncome', 'grossMargin']) {
    assert.ok(!c.forecastFlags[key].includes(p));
  }
});

test('latest four quarters reconcile to reported FY2026 totals and persist on refresh', () => {
  const periods = ['2025Q4', '2026Q1', '2026Q2', p];
  for (const [metric, total] of Object.entries({ revenue: 133_188_000_000, earnings: 84_969_000_000, operatingIncome: 99_340_000_000 })) {
    assert.equal(periods.reduce((sum, period) => sum + c[metric][period], 0), total, metric);
  }
  const updater = fs.readFileSync(path.join(root, 'scripts/auto-refresh-data.mjs'), 'utf8');
  const start = updater.indexOf('const COMPANY_OFFICIAL_QUARTERLY_OVERRIDES =');
  const end = updater.indexOf('\nconst ', start + 1);
  const official = vm.runInNewContext(updater.slice(start, end) + '\nCOMPANY_OFFICIAL_QUARTERLY_OVERRIDES;');
  for (const metric of ['revenue', 'earnings', 'operatingIncome', 'grossMargin', 'netAssets']) {
    assert.equal(official.micron[p][metric], c[metric][p]);
  }
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/operating-income-history.json'))).companies.micron;
  assert.equal(audit.latestFinancialPeriod, p);
  assert.ok(audit.directPeriods.includes(p));
});
