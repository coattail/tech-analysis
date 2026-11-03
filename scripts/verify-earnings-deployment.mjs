import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { COMPANY_SOURCES, parseDataJs } from "./auto-refresh-data.mjs";

function fingerprint(data) {
  return Object.fromEntries(COMPANY_SOURCES.map(({id}) => {
    const c = data.companies[id];
    const p = Object.keys(c?.revenue ?? {}).filter(p => Number.isFinite(c.revenue[p]) && Number.isFinite(c.earnings?.[p])).sort().at(-1);
    return [id, JSON.stringify([p, ...["revenue", "earnings", "operatingIncome", "reportDates", "periodEndDates", "operatingCashFlow", "capex"].map(k => c?.[k]?.[p] ?? null)])];
  }));
}
const expected = fingerprint(parseDataJs(await readFile("data.js", "utf8")));
let failure;
for (let attempt = 0; attempt < 6; attempt++) {
  try {
    const url = process.argv[2];
    const response = await fetch(`${url.replace(/\/$/, "")}/data.js?verify=${Date.now()}`, { signal: AbortSignal.timeout(20000), cache: "no-store" });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const context = { window: {} };
    vm.runInNewContext(await response.text(), context, { timeout: 3000 });
    const actual = fingerprint(context.window.FINANCIAL_SOURCE_DATA);
    const mismatch = Object.keys(expected).filter(id => actual[id] !== expected[id]);
    if (mismatch.length) throw Error(`Public quarterly data differs: ${mismatch.join(", ")}`);
    console.log(`Verified public latest quarterly data for ${COMPANY_SOURCES.length} companies`);
    failure = null;
    break;
  } catch (error) { failure = error; }
  if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 10000));
}
if (failure) throw failure;
