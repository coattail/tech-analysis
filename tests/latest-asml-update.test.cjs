const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync('data.js', 'utf8'), context);
const c = context.window.FINANCIAL_SOURCE_DATA.companies.asml;
const script = fs.readFileSync('scripts/auto-refresh-data.mjs','utf8');

test('ASML Q3 uses complete official US GAAP values and actual period end', () => {
 const p='2026Q3';
 assert.equal(c.revenue[p], 13417987428);
 assert.equal(c.earnings[p], 5707304479);
 assert.equal(c.operatingIncome[p], 5951686278);
 assert.equal(c.netAssets[p], 25152846000);
 assert.equal(c.periodEndDates[p], '2026-09-27');
 assert.equal(c.reportDates[p], '2026-10-14');
 assert.ok(Math.abs(c.grossMargin[p]-6699.8/11662*100)<1e-10);
 for(const key of ['revenue','earnings','operatingIncome'])for(const period of ['2025Q4','2026Q1','2026Q2',p])assert.ok(Number.isFinite(c[key][period]));
 const start=script.indexOf('const COMPANY_OFFICIAL_QUARTERLY_OVERRIDES ='),end=script.indexOf('\nconst ',start+1);
 const official=vm.runInNewContext(script.slice(start,end)+'\nCOMPANY_OFFICIAL_QUARTERLY_OVERRIDES;');
 assert.equal(official.asml[p].revenue,c.revenue[p]);
});

test('published ASML fallback rejects partial quarters and preserves existing complete history', async () => {
 const payload={id:'asml',quarters:['2026Q2','2026Q3','2026Q4'],financials:{
 '2026Q2':{revenueBn:9,grossProfitBn:5,operatingIncomeBn:3,netIncomeBn:2},
 '2026Q3':{revenueBn:11.662,grossProfitBn:6.7,operatingIncomeBn:5.173,netIncomeBn:4.96},
 '2026Q4':{revenueBn:15},}};
 const start=script.indexOf('async function loadPublishedAsmlQuarters('),end=script.indexOf('\nasync function ',start+1);
 const fn=vm.runInNewContext(script.slice(start,end)+'\nloadPublishedAsmlQuarters;', {fetchJsonWithCurl:async()=>payload,console});
 const existing={revenue:{'2026Q2':9},earnings:{'2026Q2':2},operatingIncome:{'2026Q2':3},grossMargin:{'2026Q2':55}};
 const result=await fn(existing);
 assert.deepEqual(Array.from(result.quarters),['2026Q3']);
});
