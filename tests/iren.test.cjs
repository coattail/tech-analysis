const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { parseStockAnalysisAdjustedChart } = require('../stockanalysis-price-helpers.cjs');
const root = path.join(__dirname, '..');
function load(file, key) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  return context.window[key];
}
const data = load('data.js', 'FINANCIAL_SOURCE_DATA');
const company = data.companies.iren;

test('IREN consolidated Q1 FY27 matches SEC facts, including mining revenue and GAAP impairments', () => {
  const p = '2026Q3';
  assert.equal(company.revenue[p], 228_000_000); // Not just $200m of AI Cloud.
  assert.equal(company.operatingIncome[p], -186_000_000);
  assert.equal(company.earnings[p], -263_000_000);
  assert.equal(company.netAssets[p], 5_116_000_000);
  assert.ok(Math.abs(company.grossMargin[p] - 182 / 228 * 100) < 1e-12);
  assert.ok(Math.abs(company.roe[p] - -263 / 5116 * 100) < 1e-12);
  assert.equal(company.periodEndDates[p], '2026-09-30');
  assert.equal(company.reportDates[p], '2026-11-05');
  assert.equal(company.operatingCashFlow[p], 529_000_000);
  assert.equal(company.capex[p], 2_196_000_000); // Cash PP&E plus intangible purchases.
  assert.equal(company.freeCashFlow[p], -1_667_000_000);
  for (const flags of Object.values(company.forecastFlags)) assert.ok(!flags.includes(p));
});

test('IREN history starts at listing and does not average half-year cash flows into quarters', () => {
  const periods = data.periods.filter(p => p >= '2021Q4' && p <= '2026Q3');
  assert.equal(periods.length, 20);
  for (const metric of ['revenue', 'operatingIncome', 'earnings', 'netAssets']) {
    for (const p of periods) assert.ok(Number.isFinite(company[metric][p]), `${metric}:${p}`);
  }
  for (const metric of ['revenue', 'netAssets', 'pe']) {
    assert.ok(Object.entries(company[metric]).every(([p, v]) => p >= '2021Q4' || v == null));
  }
  for (const metric of ['operatingCashFlow', 'capex', 'freeCashFlow']) {
    for (const p of ['2021Q4', '2022Q3', '2022Q4']) assert.equal(company[metric][p], null);
  }
  const history = JSON.parse(fs.readFileSync(path.join(root, 'data/cash-flow-history.json')));
  assert.equal(history.companies.iren.coverage.freeCashFlow.count, 17);
});

test('IREN ships full adjusted stock history and is selectable under Cloud', () => {
  const prices = load('price-data.js', 'STOCK_PRICE_SOURCE_DATA').companies.iren;
  const dates = Object.keys(prices.daily).sort();
  assert.equal(dates[0], '2021-11-17');
  assert.ok(dates.at(-1) >= '2026-11-05');
  assert.ok(dates.length >= 1247);
  assert.ok(Object.values(prices.daily).every(v => Number.isFinite(v) && v > 0));
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  assert.match(script, /id: "cloud",[^\n]+companyIds: \[[^\]]*"iren"/);
  assert.equal(data.meta.marketCaps.iren.currency, 'USD');
  assert.ok(data.meta.marketCaps.iren.value > 0);
});

test('adjusted-price fallback rejects stale, truncated, duplicate and invalid series', () => {
  const first = '2021-11-17', last = '2021-11-18';
  const a = [Date.parse(first), 20], b = [Date.parse(last), 21];
  const parse = data => parseStockAnalysisAdjustedChart({ status: 200, data }, last, first);
  assert.deepEqual(parse([b, a]), { [first]: 20, [last]: 21 });
  for (const points of [[a], [b], [a, a, b], [a, [b[0], -1]]]) assert.throws(() => parse(points));
});
