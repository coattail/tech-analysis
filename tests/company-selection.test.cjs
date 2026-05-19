const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cloneCompanySet,
  setPendingCompanyVisibility,
  setAllPendingCompanyVisibility,
  applyPendingCompanies,
  hasCompanySelectionChanged,
  shouldKeepSelectionPendingUntilGenerate,
} = require('../company-selection.js');

test('company toggles change pending selection without mutating applied selection', () => {
  const applied = cloneCompanySet(['apple', 'microsoft', 'nvidia', 'amazon']);
  const pending = setPendingCompanyVisibility(applied, 'apple', false);

  assert.deepEqual([...applied].sort(), ['amazon', 'apple', 'microsoft', 'nvidia']);
  assert.deepEqual([...pending].sort(), ['amazon', 'microsoft', 'nvidia']);
});

test('bulk pending selection does not affect the currently applied selection', () => {
  const applied = cloneCompanySet(['apple', 'microsoft']);
  const pending = setAllPendingCompanyVisibility([
    { id: 'apple' },
    { id: 'microsoft' },
    { id: 'nvidia' },
  ], true);

  assert.deepEqual([...applied].sort(), ['apple', 'microsoft']);
  assert.deepEqual([...pending].sort(), ['apple', 'microsoft', 'nvidia']);
});

test('applying pending companies returns an isolated visible-company set', () => {
  const pending = cloneCompanySet(['apple', 'meta']);
  const applied = applyPendingCompanies(pending);

  pending.add('nvidia');

  assert.deepEqual([...applied].sort(), ['apple', 'meta']);
  assert.deepEqual([...pending].sort(), ['apple', 'meta', 'nvidia']);
});

test('detects when pending selection differs from the applied company view', () => {
  const applied = cloneCompanySet(['apple']);
  const samePending = cloneCompanySet(['apple']);
  const changedPending = cloneCompanySet(['microsoft']);

  assert.equal(hasCompanySelectionChanged(applied, samePending), false);
  assert.equal(hasCompanySelectionChanged(applied, changedPending), true);
});

test('keeps a changed company selection pending until generate is clicked', () => {
  assert.equal(
    shouldKeepSelectionPendingUntilGenerate({
      priceComparisonEnabled: true,
      appliedCompanies: cloneCompanySet(['nvidia']),
      pendingCompanies: cloneCompanySet(['alphabet']),
    }),
    true,
  );

  assert.equal(
    shouldKeepSelectionPendingUntilGenerate({
      priceComparisonEnabled: true,
      appliedCompanies: cloneCompanySet(['nvidia']),
      pendingCompanies: cloneCompanySet(['nvidia']),
    }),
    false,
  );
});
