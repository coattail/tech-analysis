const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const load = () => import("../scripts/earnings-watch.mjs");
const fixture = () => ({periods:["2026Q2"],companies:{palantir:{revenue:{"2026Q2":1935464000},earnings:{"2026Q2":1061890000},reportDates:{"2026Q2":"2026-08-03"}}}});
const entry = () => ({revenueBn:2.313411,grossProfitBn:1.930125,operatingIncomeBn:1.084845,netIncomeBn:1.128012,statementCurrency:"USD",periodEnd:"2026-09-30",statementFilingDate:"2026-11-02"});

test("the manifest includes every tracked company and maps the Korean listing alias", async () => {
  const {manifest,tickerKey}=await load();
  const {COMPANY_SOURCES}=await import("../scripts/auto-refresh-data.mjs");
  const m=manifest({companies:{}},{companies:[]});
  assert.equal(Object.keys(m.local).length,COMPANY_SOURCES.length);
  assert.deepEqual(m.companies.map(c=>c.id).sort(),COMPANY_SOURCES.map(c=>c.id).sort());
  assert.equal(tickerKey("SKHY"),tickerKey("000660"));
});

test("new official quarters preserve historical numbers and use their actual report date", async () => {
  const {applyQuarter}=await load();const data=fixture();
  assert.equal(applyQuarter(data,"palantir","2026Q3",entry()),true);
  const c=data.companies.palantir;
  assert.equal(c.revenue['2026Q2'],1935464000);
  assert.equal(c.revenue['2026Q3'],2313411000);
  assert.equal(c.operatingIncome['2026Q3'],1084845000);
  assert.equal(c.periodEndDates['2026Q3'],'2026-09-30');
  assert.equal(c.reportDates['2026Q3'],'2026-11-02');
  assert.equal(applyQuarter(data,'palantir','2026Q3',entry()),false);
});

test("unconverted currencies, cumulative flows and incomplete statements cannot overwrite data", async () => {
  const {applyQuarter}=await load();
  for(const e of [{...entry(),statementCurrency:'KRW'},{...entry(),statementSpanQuarters:3},{...entry(),netIncomeBn:null}]) {
    const data=fixture(),before=JSON.stringify(data);
    assert.equal(applyQuarter(data,'palantir','2026Q3',e),false);
    assert.equal(JSON.stringify(data),before);
  }
});

test("same-disclosure extraction corrections synchronize once without accepting older filings", async () => {
  const {applyQuarter}=await load();const data=fixture();
  applyQuarter(data,'palantir','2026Q3',entry());
  assert.equal(applyQuarter(data,'palantir','2026Q3',{...entry(),revenueBn:2.4}),true);
  assert.equal(data.companies.palantir.revenue['2026Q3'],2400000000);
  assert.equal(applyQuarter(data,'palantir','2026Q3',{...entry(),revenueBn:2.4}),false);
  assert.equal(applyQuarter(data,'palantir','2026Q3',{...entry(),revenueBn:2.5,statementFilingDate:'2026-11-01'}),false);
});

test("bank earnings do not require inventing an undisclosed operating-income subtotal", async () => {
  const {applyQuarter}=await load();const data=fixture();data.companies.jpmorgan=data.companies.palantir;
  assert.equal(applyQuarter(data,'jpmorgan','2026Q3',{...entry(),operatingIncomeBn:null}),true);
  assert.equal(data.companies.jpmorgan.earnings['2026Q3'],1128012000);
  assert.equal(data.companies.jpmorgan.operatingIncome,undefined);
});

test("fallback sources reject a quarter-label amount without discarding siblings", async () => {
  const {validLatestAmounts}=await import('../scripts/auto-refresh-data.mjs');
  assert.equal(validLatestAmounts({revenue:{'2026Q3':3000000},earnings:{'2026Q3':3000000}}, {revenue:{'2026Q2':30000000000}}),false);
  assert.equal(validLatestAmounts({revenue:{'2026Q3':29958000000},earnings:{'2026Q3':6933000000}}, {revenue:{'2026Q2':31558000000}}),true);
});

test("fallback updates preserve historical periods while accepting the new quarter", async () => {
  const {preserveHistoricalPeriods}=await import('../scripts/auto-refresh-data.mjs');
  const original={revenue:{'2026Q1':0,'2026Q2':20},earnings:{'2026Q1':null}};
  const incoming={revenue:{'2026Q1':999,'2026Q2':22,'2026Q3':30},earnings:{'2026Q1':888}};
  preserveHistoricalPeriods(incoming,original);
  assert.equal(incoming.revenue['2026Q1'],0);assert.equal(incoming.earnings['2026Q1'],null);
  assert.equal(incoming.revenue['2026Q3'],30);
});

test("one failed company does not prevent a successful sibling update", async () => {
  const {synchronize}=await load();const data=fixture();
  const result=synchronize(data,{companies:[{ticker:'PLTR',quarters:['2026Q3'],financials:{'2026Q3':entry()}}]}, {report:[{companyId:'apple',reason:'check-failed',error:'source unavailable'}]});
  assert.deepEqual(result.companies,['palantir']);assert.equal(result.failures.length,1);
});

test("published-snapshot fallback retries a second independent endpoint", async () => {
  const {publishedDataset}=await load();let calls=0;
  const value=await publishedDataset(async()=>{if(++calls===1)throw Error('raw unavailable');return {companies:[{id:'a'}]};});
  assert.equal(calls,2);assert.equal(value.companies[0].id,'a');
});

test("all-company watch runs in every month and exposes failed operations", () => {
  const workflow=fs.readFileSync('.github/workflows/earnings-watch.yml','utf8');
  assert.match(workflow,/4 \* \* \* \*/);
  assert.match(workflow,/test "\$COLLECT" = success/);
  assert.match(workflow,/python scripts\/resolve-earnings-releases.py/);
  assert.match(workflow,/test "\$RESOLVE" = success/);
  assert.match(workflow,/verification: \$VERIFY/);
  assert.match(workflow,/if: github.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/publish_earnings_data.py --workflow earnings-watch.yml --deploy-workflow pages.yml/);
});

test('financial refresh windows follow individual report dates, and manual selections remain possible',async()=>{
 const {inEarningsWindow}=await import('../scripts/earnings-windows.mjs');
 const c={reportDates:{'2025Q3':'2025-11-19','2026Q2':'2026-08-20'}};
 assert.equal(inEarningsWindow(c,new Date('2026-11-18')),true);
 assert.equal(inEarningsWindow(c,new Date('2026-10-01')),false);
 assert.equal(inEarningsWindow({...c,nextEarningsDate:'2026-10-05'},new Date('2026-10-01')),true);
 assert.equal(inEarningsWindow({reportDates:{q:'2026-10-30'}},new Date('2026-11-03')),true);
});
