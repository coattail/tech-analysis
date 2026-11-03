#!/usr/bin/env node
// Fast path: one shared snapshot plus official releases for every tracked issuer.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { COMPANY_SOURCES, parseDataJs, formatDataJs, fetchJsonWithCurl } from "./auto-refresh-data.mjs";

const DATA = new URL("../data.js", import.meta.url);
const OUT = new URL("../output/", import.meta.url);
export const tickerKey = ticker => ({ SKHY: "000660", TSMC: "TSM" }[ticker] ?? ticker.replace(/[^A-Z0-9]/gi, "").toUpperCase());
const finite = Number.isFinite;
const requiredAmounts = (id, entry) => [entry.revenueBn, entry.netIncomeBn];

export async function publishedDataset(fetcher = fetchJsonWithCurl) {
  const errors = [];
  for (const url of [
    "https://raw.githubusercontent.com/coattail/Earnings-Image-Studio/main/data/earnings-dataset.json",
    "https://coattail.github.io/Earnings-Image-Studio/data/earnings-dataset.json",
  ]) {
    try {
      const data = await fetcher(url, undefined, 60 * 1024 * 1024);
      if (!Array.isArray(data.companies) || data.companies.length < 1) throw Error("Invalid published earnings snapshot");
      return data;
    } catch (error) { errors.push(error.message); }
  }
  throw Error(`All published earnings sources failed: ${errors.join("; ")}`);
}

export function manifest(data, shared) {
  const local = {};
  const published = new Map(shared.companies.map(c => [tickerKey(c.ticker), c]));
  for (const company of COMPANY_SOURCES) {
    const existing = data.companies[company.id] ?? {};
    const periods = Object.keys(existing.revenue ?? {}).filter(q => finite(existing.revenue[q]) && finite(existing.earnings?.[q])).sort();
    const quarter = periods.at(-1);
    const financials = quarter ? { [quarter]: {
      periodEnd: existing.periodEndDates?.[quarter], statementFilingDate: existing.reportDates?.[quarter],
      statementCurrency: "USD", revenueBn: existing.revenue[quarter] / 1e9, netIncomeBn: existing.earnings[quarter] / 1e9,
      operatingIncomeBn: finite(existing.operatingIncome?.[quarter]) ? existing.operatingIncome[quarter] / 1e9 : null,
    }} : {};
    const upstream = published.get(tickerKey(company.ticker));
    const upstreamQuarter = upstream?.quarters?.at(-1);
    // Avoid reparsing a disclosure that the shared publisher already obtained.
    if (upstreamQuarter && (!quarter || upstreamQuarter >= quarter)) {
      financials[upstreamQuarter] = upstream.financials[upstreamQuarter];
    }
    local[company.id] = { id: company.id, quarters: Object.keys(financials).sort(), financials };
  }
  return { companies: COMPANY_SOURCES, local };
}

export function applyQuarter(data, companyId, quarter, entry) {
  if (!/^\d{4}Q[1-4]$/.test(quarter) || entry.statementSpanQuarters > 1 || entry.statementValueMode === "cumulative") return false;
  const scale = entry.statementCurrency === "USD" || !entry.statementCurrency ? 1
    : entry.displayCurrency === "USD" && finite(entry.displayScaleFactor) ? entry.displayScaleFactor : null;
  if (!(scale > 0) || !requiredAmounts(companyId, entry).every(finite) || entry.revenueBn <= 0) return false;
  const company = data.companies[companyId];
  if (!company) return false;
  const previous = Object.keys(company.revenue ?? {}).filter(q => finite(company.revenue[q]) && finite(company.earnings?.[q])).sort().at(-1) ?? "";
  const filed = entry.statementFilingDate ?? "";
  const previousRevenue = company.revenue?.[previous];
  if (Math.abs(entry.netIncomeBn) > entry.revenueBn * 20
    || (previousRevenue > 0 && (entry.revenueBn * scale * 1e9 / previousRevenue < .02 || entry.revenueBn * scale * 1e9 / previousRevenue > 50))) return false;
  if (quarter < previous || (quarter === previous && filed < (company.reportDates?.[quarter] ?? ""))) return false;
  if (!entry.periodEnd || !filed || entry.periodEnd > filed) return false;
  const amounts = { revenue: entry.revenueBn, earnings: entry.netIncomeBn, operatingIncome: entry.operatingIncomeBn, netAssets: entry.netAssetsBn,
    operatingCashFlow: entry.operatingCashFlowBn, capex: entry.capexBn };
  // The shared publisher may complete or correct extraction for the same
  // disclosure. Its unchanged publication date must not freeze stale amounts.
  if (quarter === previous && filed === (company.reportDates?.[quarter] ?? "")) {
    const revised = Object.entries(amounts).some(([metric, amount]) => finite(amount)
      && company[metric]?.[quarter] !== Math.round(amount * scale * 1e9));
    const grossRevised = finite(entry.grossProfitBn)
      && Math.abs((company.grossMargin?.[quarter] ?? -1) - entry.grossProfitBn / entry.revenueBn * 100) > 1e-7;
    if (!revised && !grossRevised && company.periodEndDates?.[quarter] === entry.periodEnd) return false;
  }
  for (const [metric, amount] of Object.entries(amounts)) {
    if (!finite(amount)) continue;
    company[metric] ??= {};
    company[metric][quarter] = Math.round(amount * scale * 1e9);
    if (company.forecastFlags?.[metric]) company.forecastFlags[metric] = company.forecastFlags[metric].filter(q => q !== quarter);
  }
  if (finite(entry.grossProfitBn)) {
    company.grossMargin ??= {};
    company.grossMargin[quarter] = entry.grossProfitBn / entry.revenueBn * 100;
  }
  company.periodEndDates ??= {}; company.periodEndDates[quarter] = entry.periodEnd;
  company.reportDates ??= {}; company.reportDates[quarter] = filed;
  const prior = `${Number(quarter.slice(0, 4)) - 1}${quarter.slice(4)}`;
  company.revenueGrowth ??= {};
  company.revenueGrowth[quarter] = company.revenue[prior] > 0 ? (company.revenue[quarter] / company.revenue[prior] - 1) * 100 : null;
  company.roe ??= {};
  company.roe[quarter] = company.netAssets?.[quarter] ? company.earnings[quarter] / company.netAssets[quarter] * 100 : null;
  if (finite(company.operatingCashFlow?.[quarter]) && finite(company.capex?.[quarter])) {
    company.freeCashFlow ??= {};
    company.freeCashFlow[quarter] = company.operatingCashFlow[quarter] - company.capex[quarter];
  }
  data.periods = [...new Set([...data.periods, quarter])].sort();
  return true;
}

export function synchronize(data, shared, releases) {
  const sharedMap = new Map(shared.companies.map(c => [tickerKey(c.ticker), c]));
  const updates = new Set();
  const failures = [];
  const fallbacks = new Set();
  for (const company of COMPANY_SOURCES) {
    const upstream = sharedMap.get(tickerKey(company.ticker));
    for (const quarter of upstream?.quarters ?? []) {
      if (applyQuarter(data, company.id, quarter, upstream.financials[quarter])) updates.add(company.id);
    }
    const check = releases.report.find(item => item.companyId === company.id);
    if (check?.reason === "check-failed") { failures.push(`${company.ticker}: ${check.error}`); continue; }
    const candidate = check?.release;
    if (candidate?.entry && applyQuarter(data, company.id, candidate.quarter, candidate.entry)) updates.add(company.id);
    if (check?.needsUpdate && (!candidate?.entry || !requiredAmounts(company.id, candidate.entry).every(finite))) {
      fallbacks.add(company.id);
    } else if (check?.needsUpdate && candidate?.entry && candidate.entry.statementCurrency !== "USD"
      && !(candidate.entry.displayCurrency === "USD" && finite(candidate.entry.displayScaleFactor))) {
      fallbacks.add(company.id);
    }
  }
  return { companies: [...updates], fallbacks: [...fallbacks], failures };
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const data = parseDataJs(await readFile(DATA, "utf8"));
  if (process.argv.includes("--prepare")) {
    const shared = await publishedDataset();
    await writeFile(new URL("published-earnings.json", OUT), JSON.stringify(shared));
    await writeFile(new URL("earnings-universe.json", OUT), JSON.stringify(manifest(data, shared)));
    console.log(`Prepared all ${COMPANY_SOURCES.length} tracked companies`);
    return;
  }
  const shared = JSON.parse(await readFile(new URL("published-earnings.json", OUT), "utf8"));
  const releases = JSON.parse(await readFile(new URL("earnings-release-report.json", OUT), "utf8"));
  if (process.argv.includes("--verify")) {
    const missing = [];
    for (const check of releases.report) {
      if (check.reason === "check-failed") { missing.push(`${check.ticker}: source check failed`); continue; }
      if (!check.needsUpdate) continue;
      const c = data.companies[check.companyId];
      const latest = Object.keys(c?.revenue ?? {}).filter(p => requiredAmounts(check.companyId,{revenueBn:c.revenue[p],netIncomeBn:c.earnings?.[p],operatingIncomeBn:c.operatingIncome?.[p]}).every(finite)).sort().at(-1) ?? "";
      const expected = check.remoteQuarter;
      const oldDate = latest === expected && check.remoteFilingDate && (c?.reportDates?.[latest] ?? "") < check.remoteFilingDate;
      if (expected ? latest < expected || oldDate : latest <= check.localQuarter && (c?.reportDates?.[latest] ?? "") < check.remoteFilingDate) missing.push(`${check.ticker}: release detected but financial data still lags`);
    }
    if (missing.length) throw Error(missing.join("; "));
    console.log(`Verified all ${releases.checked} companies against detected releases`);
    return;
  }
  const result = synchronize(data, shared, releases);
  if (releases.checked !== COMPANY_SOURCES.length) result.failures.push(`Only ${releases.checked}/${COMPANY_SOURCES.length} companies checked`);
  if (result.companies.length) {
    data.meta.generatedAt = new Date().toISOString();
    data.meta.earningsWatch = { updatedAt: data.meta.generatedAt, companies: result.companies };
    await writeFile(DATA, formatDataJs(data));
  }
  await writeFile(new URL("earnings-sync-report.json", OUT), JSON.stringify(result, null, 2));
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, `companies=${[...new Set([...result.companies,...result.fallbacks])].join(",")}\nfallbacks=${result.fallbacks.join(",")}\n`, { flag: "a" });
  console.log(JSON.stringify(result));
  if (result.failures.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run().catch(error => { console.error(error); process.exitCode = 1; });
