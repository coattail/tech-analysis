const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const importer = import('../scripts/auto-refresh-cash-flow.mjs');
function data() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
  return context.window.FINANCIAL_SOURCE_DATA;
}

test('parses signed cash spending without treating missing or zero values as estimates', async () => {
  const { extractCashFlowRows, applyCashFlowRows } = await importer;
  const rows = extractCashFlowRows('data:{datekey:["2026-09-30","2026-06-30","2026-03-31"],ncfo:[-10,0,30],capex:[-20,0,null]},map:[]');
  const c = {};
  applyCashFlowRows(c, rows, { source: 'fixture', periods: new Set(rows.map(r => r.period)) });
  assert.equal(c.capex['2026Q3'], 20);
  assert.equal(c.freeCashFlow['2026Q3'], -30);
  assert.equal(c.freeCashFlow['2026Q2'], 0);
  assert.equal(c.freeCashFlow['2026Q1'], null);
  const bank = extractCashFlowRows('data:{datekey:["2026-09-30"],ncfo:[100]},map:[]');
  assert.equal(bank[0].capex, null);
});

test('SEC cumulative cash flows become single quarters, including a zero quarter', async () => {
  const { buildSecFieldQuarterSeries } = await import('../scripts/auto-refresh-data.mjs');
  const facts = [['2026-03-31', 10], ['2026-06-30', 10], ['2026-09-30', -5], ['2026-12-31', 30]].map(([endDate, value]) => ({
    startDate: '2026-01-01', endDate, value, filed: '2027-02-01',
    daySpan: (Date.parse(endDate) - Date.parse('2026-01-01')) / 86400000 + 1,
    fiscalPeriod: endDate === '2026-12-31' ? 'FY' : 'Q1', namespacePriority: 20, conceptPriority: 1,
  }));
  const result = buildSecFieldQuarterSeries(facts);
  assert.deepEqual([...result].map(([p, r]) => [p, r.value]), [
    ['2026Q1', 10], ['2026Q2', 0], ['2026Q3', -15], ['2026Q4', 35],
  ]);
});

test('does not combine cash flows from different reporting end dates', async () => {
  const { applyCashFlowRows } = await importer;
  const c = {};
  const provenance = {};
  const periods = new Set(['2026Q3']);
  applyCashFlowRows(c, [{ period: '2026Q3', dateKey: '2026-09-30', operatingCashFlow: 100 }], { source: 'SEC', periods, provenance });
  applyCashFlowRows(c, [{ period: '2026Q3', dateKey: '2026-09-27', capex: 20 }], { source: 'provider', periods, provenance });
  assert.equal(c.freeCashFlow['2026Q3'], null);
});

test('all 46 companies have auditable cash-flow series; FCF reconciles wherever disclosed', () => {
  const d = data();
  const h = JSON.parse(fs.readFileSync(path.join(root, 'data/cash-flow-history.json')));
  assert.equal(Object.keys(d.companies).length, 46);
  for (const [id, c] of Object.entries(d.companies)) {
    for (const metric of ['operatingCashFlow', 'capex', 'freeCashFlow']) {
      assert.equal(Object.keys(c[metric]).length, d.periods.length, `${id}:${metric}`);
      assert.ok(h.companies[id].coverage[metric]);
    }
    assert.ok(h.companies[id].coverage.operatingCashFlow.count > 0, id);
    if (!['jpmorgan', 'bankofamerica'].includes(id)) assert.ok(h.companies[id].coverage.freeCashFlow.count > 0, id);
    for (const p of d.periods) {
      const value = c.freeCashFlow[p];
      if (value == null) continue;
      assert.equal(value, c.operatingCashFlow[p] - c.capex[p], `${id}:${p}`);
      assert.ok(h.companies[id].points[p].operatingCashFlow.source);
      assert.ok(h.companies[id].points[p].capex.source);
    }
  }
});

test('SpaceX bridges Q4 from official annual totals and reconciles nine-month figures', () => {
  const c = data().companies.spacex;
  const sum = (metric, periods) => periods.reduce((total, p) => total + c[metric][p], 0);
  const y2025 = ['2025Q1', '2025Q2', '2025Q3', '2025Q4'];
  assert.equal(sum('operatingCashFlow', y2025), 6_785_000_000);
  assert.equal(sum('capex', y2025), 20_737_000_000);
  assert.equal(sum('earnings', y2025), -4_937_000_000);
  assert.equal(sum('revenue', y2025), 18_674_000_000);
  assert.equal(sum('operatingCashFlow', ['2026Q1', '2026Q2', '2026Q3']), 13_097_000_000);
  assert.equal(sum('capex', ['2026Q1', '2026Q2', '2026Q3']), 48_069_000_000);
  assert.equal(c.operatingIncome['2026Q3'], 2_791_000_000);
});

test('annual and TTM cash flows require four quarters and preserve negative FCF', () => {
  const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const annualFn = source.slice(source.indexOf('function aggregateFlowAnnual('), source.indexOf('function aggregatePointAnnual('));
  const context = { ANNUAL_LABELS: ['2025', '2026'], emptySeries: labels => new Map(labels.map(l => [l, null])), isFiniteNumber: Number.isFinite };
  vm.runInNewContext(annualFn, context);
  const c = data().companies.spacex;
  const result = context.aggregateFlowAnnual(new Map(Object.entries(c.freeCashFlow)));
  assert.equal(result.get('2025'), -13_952_000_000);
  assert.equal(result.get('2026'), null);
  const { aggregateFlowRollingAnnualEntries } = require('../price-comparison.js');
  const rolling = new Map(aggregateFlowRollingAnnualEntries(Object.entries(c.freeCashFlow)));
  assert.equal(rolling.get('2026Q3'), ['2025Q4', '2026Q1', '2026Q2', '2026Q3'].reduce((n, p) => n + c.freeCashFlow[p], 0));
});
