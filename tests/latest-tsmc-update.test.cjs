const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
const data = context.window.FINANCIAL_SOURCE_DATA;
const c = data.companies.tsmc;
const p = '2026Q3';

test('TSMC Q3 uses official quarterly USD income and closing-rate parent equity', () => {
  assert.equal(c.revenue[p], 46_720_000_000);
  assert.equal(c.earnings[p], 23_858_000_000);
  assert.equal(c.operatingIncome[p], 27_403_000_000);
  assert.equal(c.netAssets[p], 219_507_000_000);
  assert.equal(c.periodEndDates[p], '2026-09-30');
  assert.equal(c.reportDates[p], '2026-10-15');
  assert.ok(Math.abs(c.grossMargin[p] - 66.4) < 1e-12);
  assert.ok(Math.abs(c.revenueGrowth[p] - (46_720 / 33_100 - 1) * 100) < 1e-12);
  assert.ok(Math.abs(c.roe[p] - 23_858 / 219_507 * 100) < 1e-12);
  for (const key of ['revenue', 'netIncome', 'operatingIncome', 'grossMargin']) {
    assert.ok(!c.forecastFlags[key].includes(p));
  }
});

test('latest TSMC quarter has all four source quarters for TTM and retained official refresh values', () => {
  const periods = ['2025Q4', '2026Q1', '2026Q2', '2026Q3'];
  for (const metric of ['revenue', 'earnings', 'operatingIncome', 'grossMargin']) {
    for (const period of periods) assert.ok(Number.isFinite(c[metric][period]));
  }
  const updater = fs.readFileSync(path.join(root, 'scripts/auto-refresh-data.mjs'), 'utf8');
  const start = updater.indexOf('const COMPANY_OFFICIAL_QUARTERLY_OVERRIDES =');
  const end = updater.indexOf('\nconst ', start + 1);
  const official = vm.runInNewContext(updater.slice(start, end) + '\nCOMPANY_OFFICIAL_QUARTERLY_OVERRIDES;');
  for (const metric of ['revenue', 'earnings', 'operatingIncome', 'grossMargin', 'netAssets']) {
    assert.equal(official.tsmc[p][metric], c[metric][p]);
  }
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/operating-income-history.json'))).companies.tsmc;
  assert.equal(audit.latestFinancialPeriod, p);
  assert.ok(audit.directPeriods.includes(p));
});
