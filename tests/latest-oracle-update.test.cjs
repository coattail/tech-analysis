const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
const data = context.window.FINANCIAL_SOURCE_DATA;
const c = data.companies.oracle;
const p = '2026Q3';

test('Oracle FY2027 Q1 maps to calendar Q3 and uses GAAP consolidated net income', () => {
  assert.equal(c.revenue[p], 19_345_000_000);
  assert.equal(c.earnings[p], 4_760_000_000);
  assert.equal(c.operatingIncome[p], 6_728_000_000);
  assert.equal(c.netAssets[p], 67_196_000_000);
  assert.equal(c.periodEndDates[p], '2026-08-31');
  assert.equal(c.reportDates[p], '2026-09-10');
  assert.ok(Math.abs(c.grossMargin[p] - 11_612 / 19_345 * 100) < 1e-12);
  assert.ok(Math.abs(c.revenueGrowth[p] - (19_345 / 14_926 - 1) * 100) < 1e-12);
  assert.ok(Math.abs(c.roe[p] - 4_760 / 67_196 * 100) < 1e-12);
  for (const key of ['revenue', 'netIncome', 'operatingIncome', 'grossMargin']) {
    assert.ok(!c.forecastFlags[key].includes(p));
  }
});

test('latest Oracle quarter has all four source quarters for TTM and retained official refresh values', () => {
  const periods = ['2025Q4', '2026Q1', '2026Q2', '2026Q3'];
  for (const metric of ['revenue', 'earnings', 'operatingIncome', 'grossMargin']) {
    for (const period of periods) assert.ok(Number.isFinite(c[metric][period]));
  }
  const updater = fs.readFileSync(path.join(root, 'scripts/auto-refresh-data.mjs'), 'utf8');
  const start = updater.indexOf('const COMPANY_OFFICIAL_QUARTERLY_OVERRIDES =');
  const end = updater.indexOf('\nconst ', start + 1);
  const official = vm.runInNewContext(updater.slice(start, end) + '\nCOMPANY_OFFICIAL_QUARTERLY_OVERRIDES;');
  for (const metric of ['revenue', 'earnings', 'operatingIncome', 'grossMargin', 'netAssets']) {
    assert.equal(official.oracle[p][metric], c[metric][p]);
  }
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/operating-income-history.json'))).companies.oracle;
  assert.equal(audit.latestFinancialPeriod, p);
  assert.ok(audit.directPeriods.includes(p));
});
