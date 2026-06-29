const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {
  cloneCompanySet,
  setPendingCompanyVisibility,
  setAllPendingCompanyVisibility,
  applyPendingCompanies,
  hasCompanySelectionChanged,
  shouldKeepSelectionPendingUntilGenerate,
  shouldResetRangeAfterApplyingCompanies,
  getDisplayPeriodStart,
  findLongestContiguousDataRange,
  DEFAULT_INITIAL_COMPANIES,
  DEFAULT_INITIAL_VIEW,
} = require('../company-selection.js');


test('defaults the initial dashboard view to Nvidia quarterly net income with price comparison', () => {
  assert.deepEqual(DEFAULT_INITIAL_COMPANIES, ['nvidia']);
  assert.deepEqual(DEFAULT_INITIAL_VIEW, {
    metric: 'netIncome',
    frequency: 'quarterly',
    chartMode: 'bar',
    priceComparisonEnabled: true,
  });
});


test('index html marks the same initial view controls as checked', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(html, /name="metric" value="netIncome" checked/);
  assert.doesNotMatch(html, /name="metric" value="revenue" checked/);
  assert.match(html, /name="chartMode" value="bar" checked/);
  assert.doesNotMatch(html, /name="chartMode" value="line" checked/);
  assert.match(html, /id="priceComparisonToggle" type="checkbox" checked/);
  assert.match(html, /<strong id="activeMetricLabel">净利润<\/strong>/);
  assert.match(html, /<strong id="visibleCompaniesLabel">1 \/ 44<\/strong>/);
});

test('includes the ten added enterprise software and cloud companies', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
  const fundamentalData = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');
  const priceData = fs.readFileSync(path.join(__dirname, '..', 'price-data.js'), 'utf8');
  const fundamentalRefresh = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'auto-refresh-data.mjs'), 'utf8');
  const priceRefresh = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'auto-refresh-price-data.mjs'), 'utf8');
  const expectedCompanies = [
    ['ibm', 'IBM'],
    ['sap', 'SAP'],
    ['crowdstrike', 'CRWD'],
    ['salesforce', 'CRM'],
    ['servicenow', 'NOW'],
    ['datadog', 'DDOG'],
    ['snowflake', 'SNOW'],
    ['cloudflare', 'NET'],
    ['adobe', 'ADBE'],
    ['zoom', 'ZM'],
  ];

  for (const [id, ticker] of expectedCompanies) {
    assert.match(script, new RegExp(`id: "${id}"[^\\n]+ticker: "${ticker}"`));
    assert.match(fundamentalRefresh, new RegExp(`id: "${id}"[\\s\\S]{0,300}?ticker: "${ticker}"`));
    assert.match(priceRefresh, new RegExp(`id: "${id}"[^\\n]+ticker: "${ticker}"`));
    assert.match(fundamentalData, new RegExp(`    "${id}": \\{`));
    assert.match(priceData, new RegExp(`    "${id}": \\{`));
  }
});

test('includes four neocloud companies in the dashboard and both refresh pipelines', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
  const fundamentalData = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');
  const priceData = fs.readFileSync(path.join(__dirname, '..', 'price-data.js'), 'utf8');
  const fundamentalRefresh = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'auto-refresh-data.mjs'), 'utf8');
  const priceRefresh = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'auto-refresh-price-data.mjs'), 'utf8');
  const expectedCompanies = [
    ['coreweave', 'CRWV'],
    ['nebius', 'NBIS'],
    ['chronoscale', 'CHRN'],
    ['sharonai', 'SHAZ'],
  ];

  for (const [id, ticker] of expectedCompanies) {
    assert.match(script, new RegExp(`id: "${id}"[^\\n]+ticker: "${ticker}"`));
    assert.match(fundamentalRefresh, new RegExp(`id: "${id}"[\\s\\S]{0,300}?ticker: "${ticker}"`));
    assert.match(priceRefresh, new RegExp(`id: "${id}"[^\\n]+ticker: "${ticker}"`));
    assert.match(fundamentalData, new RegExp(`    "${id}": \\{`));
    assert.match(priceData, new RegExp(`    "${id}": \\{`));
  }
});

test('renders searchable company categories with semiconductor before other', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

  assert.match(html, /id="companySearch" type="search"/);
  assert.match(script, /label: "MAG7"/);
  assert.match(script, /label: "软件"/);
  assert.match(script, /label: "云服务"/);
  assert.match(script, /id: "semiconductor", label: "半导体", companyIds: \["avgo", "tsmc", "asml", "micron", "amd"\]/);
  assert.ok(script.indexOf('label: "半导体"') < script.indexOf('label: "其他"'));
  assert.match(script, /label: "其他"/);
  assert.match(script, /companySearchEl\?\.addEventListener\("input"/);
});

test('scheduled automation refreshes and publishes both fundamental and price datasets', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'data-auto-refresh.yml'), 'utf8');
  const priceRefresh = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'auto-refresh-price-data.mjs'), 'utf8');

  assert.match(workflow, /schedule:/);
  assert.match(workflow, /node scripts\/auto-refresh-data\.mjs/);
  assert.match(workflow, /node scripts\/auto-refresh-price-data\.mjs/);
  assert.match(workflow, /git add data\.js price-data\.js/);
  assert.match(priceRefresh, /保留已有数据/);
  assert.match(priceRefresh, /failedCompanies/);
});

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


test('resets the range when applying a changed company selection', () => {
  assert.equal(
    shouldResetRangeAfterApplyingCompanies({
      appliedCompanies: cloneCompanySet(['nvidia']),
      pendingCompanies: cloneCompanySet(['alphabet']),
    }),
    true,
  );

  assert.equal(
    shouldResetRangeAfterApplyingCompanies({
      appliedCompanies: cloneCompanySet(['nvidia']),
      pendingCompanies: cloneCompanySet(['nvidia']),
    }),
    false,
  );
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

test('display range starts at 2005Q1 even when earlier quarters exist for calculations', () => {
  assert.equal(getDisplayPeriodStart('quarterly'), '2005Q1');
  assert.equal(getDisplayPeriodStart('rollingAnnual'), '2005Q1');
  assert.equal(getDisplayPeriodStart('annual'), '2005');
});

test('script clamps range slider controls to the display period start', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

  assert.match(script, /function getDisplayStartIndex/);
  assert.match(script, /rangeStartEl\.min = String\(displayStartIndex\);/);
  assert.match(script, /rangeEndEl\.min = String\(displayStartIndex\);/);
});

test('finds the longest continuous range without empty periods and prefers the latest tie', () => {
  assert.deepEqual(findLongestContiguousDataRange([
    false, true, true, false, true, true, false,
  ]), {
    hasData: true,
    start: 4,
    end: 5,
  });

  assert.deepEqual(findLongestContiguousDataRange([
    false, false, true, true, true, false,
  ], 1), {
    hasData: true,
    start: 2,
    end: 4,
  });
});
