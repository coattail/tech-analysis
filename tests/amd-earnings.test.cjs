const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync(`${__dirname}/fixtures/amd-q3-2026.html`, 'utf8');
const options = { quarter: '2026Q3', filingDate: '2026-11-03', sourceUrl: 'https://newsroom.amd.com/news/amd-reports-third-quarter-2026-earnings/' };

test('AMD HTML fallback extracts GAAP standalone quarters, not non-GAAP or nine-month totals', async () => {
  const { parseAmdEarnings } = await import('../scripts/amd-earnings.mjs');
  const entry = parseAmdEarnings(html, options);
  assert.equal(entry.revenueBn, 13.377);
  assert.equal(entry.grossProfitBn, 7.210);
  assert.equal(entry.operatingIncomeBn, 2.832);
  assert.equal(entry.netIncomeBn, 2.428);
  assert.equal(entry.netAssetsBn, 68.389);
  assert.equal(entry.operatingCashFlowBn, 1.202);
  assert.equal(entry.capexBn, .648);
  assert.equal(entry.periodEnd, '2026-09-26');
  assert.equal(entry.statementFilingDate, '2026-11-03');
});

test('AMD rejects stale dates, wrong units, cumulative statements and incomplete amounts', async () => {
  const { parseAmdEarnings } = await import('../scripts/amd-earnings.mjs');
  for (const [fixture, config] of [
    [html, {...options, filingDate: '2026-11-04'}],
    [html, {...options, quarter: '2026Q2'}],
    [html.replaceAll('Millions', 'Thousands'), options],
    [html.replaceAll('Three Months Ended', 'Nine Months Ended'), options],
    [html.replace('Net revenue', 'Missing revenue'), options],
    [html.replace('Total stockholders\' equity', 'Missing equity'), options],
    [html.replace('Sept. 26, 2026', 'Sept. 25, 2026'), options],
  ]) assert.throws(() => parseAmdEarnings(fixture, config));
});

test('the detected but unparsed 8-K is recovered and synchronized without a vendor update', async () => {
  const { enrichAmdRelease } = await import('../scripts/amd-earnings.mjs');
  const { synchronize } = await import('../scripts/earnings-watch.mjs');
  const releases = {report: [{ companyId: 'amd', needsUpdate: true, localQuarter: '2026Q2', remoteQuarter: '', remoteFilingDate: '2026-11-03',
    release: {form: '8-K', parseError: 'Earnings 8-K found; no validated quarterly statement parsed'} }]};
  const data = {periods: ['2026Q2'], companies: {amd: {revenue: {'2026Q2': 11536000000}, earnings: {'2026Q2': 2297000000}}}};
  assert.equal(await enrichAmdRelease(releases, async url => { assert.equal(url, options.sourceUrl); return html; }), true);
  assert.equal(releases.report[0].remoteQuarter, '2026Q3');
  const result = synchronize(data, {companies: []}, releases);
  assert.deepEqual(result.companies, ['amd']);
  assert.deepEqual(result.fallbacks, []);
  assert.equal(data.companies.amd.revenue['2026Q3'], 13377000000);
  assert.equal(data.companies.amd.revenue['2026Q2'], 11536000000);
  assert.equal(data.companies.amd.freeCashFlow['2026Q3'], 554000000);
});
