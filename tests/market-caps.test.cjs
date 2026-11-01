const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('all selectable companies have positive USD market caps with traceable refresh dates',()=>{
 const c={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../data.js'),'utf8'),c);
 const d=c.window.FINANCIAL_SOURCE_DATA;
 for(const id of Object.keys(d.companies)){
  const cap=d.meta.marketCaps[id];assert.ok(cap.value>0,id);assert.equal(cap.currency,'USD');assert.match(cap.source,/stockanalysis\.com/);assert.ok(Number.isFinite(Date.parse(cap.retrievedAt)));
 }
});
test('market-cap parser accepts exact USD amounts and rejects absent values',async()=>{
 const {parseMarketCap}=await import('../scripts/auto-refresh-market-caps.mjs');
 assert.equal(parseMarketCap('id:"marketcap",title:"Market Cap",value:"4.94T",hover:"4,941,442,080,000"'),4941442080000);
 assert.throws(()=>parseMarketCap('id:"marketcap",value:"-"'),/missing or invalid/);
});
