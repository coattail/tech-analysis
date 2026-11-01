const test = require('node:test');
const assert = require('node:assert/strict');
const { computeAdaptiveAxisBounds } = require('../financial-metrics.js');

test('line bounds follow a narrow visible range instead of forcing a revenue zero baseline', () => {
  const b=computeAdaptiveAxisBounds([98,99,100]);
  assert.ok(b.min<98 && b.max>100);
  assert.ok((100-98)/(b.max-b.min)>0.8);
  assert.ok(b.min>90);
});
test('bar bounds include zero and tightly contain positive, negative and mixed data', () => {
  for(const values of [[98,100],[-4,-2],[-39,52],[0,1000]]) {
    const b=computeAdaptiveAxisBounds(values,{includeZero:true});
    assert.ok(b.min<=Math.min(0,...values) && b.max>=Math.max(0,...values));
    const used=Math.max(0,...values)-Math.min(0,...values);
    assert.ok(used/(b.max-b.min)>0.88);
  }
  assert.equal(computeAdaptiveAxisBounds([98,100],{includeZero:true}).min,0);
  assert.equal(computeAdaptiveAxisBounds([-4,-2],{includeZero:true}).max,0);
});
test('empty, constant and zero data retain finite non-degenerate bounds', () => {
  assert.deepEqual(computeAdaptiveAxisBounds([null,undefined,NaN,Infinity]),{min:0,max:1});
  for(const values of [[100,100],[0,0],[-10,-10]]) {
    const b=computeAdaptiveAxisBounds(values);
    assert.ok(Number.isFinite(b.min)&&Number.isFinite(b.max)&&b.max>b.min);
    assert.ok(b.min<=Math.min(...values)&&b.max>=Math.max(...values));
  }
});
