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
  assert.equal(c.grossMargin[q], null);
  assert.equal(c.netAssets[q], null);
  assert.equal(c.roe[q], null);
});

test('ADR history starts at the US listing, uses USD prices and contains no synthetic pre-IPO data', () => {
  const prices = ctx.window.STOCK_PRICE_SOURCE_DATA.companies.skhynix;
  assert.equal(prices.currency, 'USD');
  assert.equal(Object.keys(prices.daily)[0], '2026-07-13');
  assert.equal(Object.keys(prices.daily).at(-1), '2026-10-27');
  assert.equal(Object.keys(prices.daily).length, 76);
  assert.equal(prices.daily['2026-10-27'], 145.36);
});

test('price fallback keeps adjusted cells aligned and rejects a stale or missing adjusted close', () => {
  const html = 'td:"2026-10-27",data:[{t:"2026-10-27",c:150,a:145.36},{t:"2026-10-26",c:148,a:142.62}],';
  assert.deepEqual(parseStockAnalysisPrices(html), { '2026-10-26':142.62, '2026-10-27':145.36 });
  assert.throws(() => parseStockAnalysisPrices(html.replace('a:145.36', 'a:null')), /incomplete or stale/);
  assert.throws(() => parseStockAnalysisPrices(html.replace('td:"2026-10-27"', 'td:"2026-10-28"')), /incomplete or stale/);
});
