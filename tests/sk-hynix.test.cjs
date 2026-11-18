const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { parseStockAnalysisPrices } = require('../stockanalysis-price-helpers.cjs');
const root = path.resolve(__dirname, '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(path.join(root, 'price-data.js'), 'utf8'), ctx);
const c = ctx.window.FINANCIAL_SOURCE_DATA.companies.skhynix;
const history = JSON.parse(fs.readFileSync(path.join(root, 'data/sk-hynix-history.json')));

test('SK hynix has continuous 35-quarter history in USD with auditable KRW conversions', () => {
  assert.equal(history.quarters.length, 35);
  for (const row of history.quarters) {
    assert.equal(c.revenue[row.period], Math.round(row.revenue / row.krwPerUsdQuarterAverage));
    assert.equal(c.earnings[row.period], Math.round(row.netIncome / row.krwPerUsdQuarterAverage));
    assert.equal(c.operatingIncome[row.period], Math.round(row.operatingIncome / row.krwPerUsdQuarterAverage));
    assert.ok(row.fxObservationCount > 50);
    assert.equal(c.periodEndDates[row.period], row.periodEnd);
  }
  const q = '2026Q3';
  assert.equal(c.reportDates[q], '2026-10-28');
  const last = history.quarters.find(row => row.period === q);
  assert.equal(c.grossMargin[q], 89_652_936 / 104_615_483 * 100);
  assert.equal(c.netAssets[q], Math.round(309_087_581_000_000 / last.krwPerUsdClosing));
  assert.equal(c.roe[q], c.earnings[q] / c.netAssets[q] * 100);
});

test('ADR history starts at the US listing, uses USD prices and contains no synthetic pre-IPO data', () => {
  const prices = ctx.window.STOCK_PRICE_SOURCE_DATA.companies.skhynix;
  assert.equal(prices.currency, 'USD');
  assert.equal(Object.keys(prices.daily)[0], '2026-07-13');
  const sessions = Object.keys(prices.daily);
  const { latestCompletedSession, failedCompanies } = ctx.window.STOCK_PRICE_SOURCE_DATA.meta;
  assert.ok(sessions.at(-1) <= latestCompletedSession);
  if (!failedCompanies.includes('skhynix')) assert.equal(sessions.at(-1), latestCompletedSession);
  assert.equal(sessions.filter(session => session <= '2026-10-27').length, 76);
  assert.ok(Math.abs(prices.daily['2026-10-27'] - 145.36) < 0.005);
});

test('price fallback keeps adjusted cells aligned and rejects a stale or missing adjusted close', () => {
  const html = 'td:"2026-10-27",data:[{t:"2026-10-27",c:150,a:145.36},{t:"2026-10-26",c:148,a:142.62}],';
  assert.deepEqual(parseStockAnalysisPrices(html), { '2026-10-26':142.62, '2026-10-27':145.36 });
  assert.throws(() => parseStockAnalysisPrices(html.replace('a:145.36', 'a:null')), /incomplete or stale/);
  assert.throws(() => parseStockAnalysisPrices(html.replace('td:"2026-10-27"', 'td:"2026-10-28"')), /incomplete or stale/);
});
