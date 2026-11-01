const test = require('node:test');
const assert = require('node:assert/strict');
const { canSumCompanies, sumCompanySeries } = require('../financial-metrics.js');

test('company sums allow monetary metrics with at least two companies, but never ratios', () => {
  for (const metric of ['revenue','operatingIncome','netIncome','operatingCashFlow','capex','freeCashFlow']) {
    assert.equal(canSumCompanies(metric, 1), false);
    assert.equal(canSumCompanies(metric, 2), true);
    assert.equal(canSumCompanies(metric, 46), true);
  }
  for (const metric of ['grossMargin','pe','roe','revenueGrowth','profitGrowth','unknown']) {
    assert.equal(canSumCompanies(metric, 3), false);
  }
});

test('company totals preserve losses and zero and require every selected company for each period', () => {
  const labels = ['2025Q1','2025Q2','2025Q3','2025Q4','2026Q1'];
  const first = new Map(labels.map((label, i) => [label, [100,0,-10,50,20][i]]));
  const second = new Map(labels.map((label, i) => [label, [-30,0,10,null,Infinity][i]]));
  assert.deepEqual([...sumCompanySeries(labels, [first, second]).values()], [70,0,0,null,null]);
  assert.deepEqual([...sumCompanySeries(labels, [first, new Map()]).values()], [null,null,null,null,null]);
  assert.deepEqual([...sumCompanySeries(labels, [first]).values()], [null,null,null,null,null]);
  assert.equal(first.get('2025Q4'), 50);
  assert.equal(second.get('2025Q4'), null);
});

test('totals work for quarterly, annual and rolling annual input maps without treating numeric strings as amounts', () => {
  for (const labels of [['2025Q1','2025Q2'], ['2024','2025']]) {
    const series = [new Map([[labels[0],100],[labels[1],200]]), new Map([[labels[0],40],[labels[1],'80']]), new Map([[labels[0],-10],[labels[1],30]])];
    assert.deepEqual([...sumCompanySeries(labels, series)], [[labels[0],130],[labels[1],null]]);
  }
});
