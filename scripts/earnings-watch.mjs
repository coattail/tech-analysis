#!/usr/bin/env node
// Fast path: one shared snapshot plus official releases for every tracked issuer.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { COMPANY_SOURCES, COMPANY_OFFICIAL_QUARTERLY_OVERRIDES, parseDataJs, formatDataJs, fetchJsonWithCurl } from "./auto-refresh-data.mjs";
import { enrichAmdRelease } from "./amd-earnings.mjs";

const DATA = new URL("../data.js", import.meta.url);
const OUT = new URL("../output/", import.meta.url);
export const tickerKey = ticker => ({ SKHY: "000660", TSMC: "TSM" }[ticker] ?? ticker.replace(/[^A-Z0-9]/gi, "").toUpperCase());
const finite = Number.isFinite;
const requiredAmounts = entry => [entry.revenueBn, entry.netIncomeBn];
const CASH_FLOW_METRICS = ["operatingCashFlow", "capex", "freeCashFlow"];
const RECURRING_METRICS = ["operatingIncome", "grossMargin", "netAssets", ...CASH_FLOW_METRICS];
const ENTRY_FIELDS = {
  operatingIncome: "operatingIncomeBn", grossMargin: "grossProfitBn", netAssets: "netAssetsBn",
  operatingCashFlow: "operatingCashFlowBn", capex: "capexBn",
};
const flagKey = metric => metric === "earnings" ? "netIncome" : metric;

function actual(company, metric, quarter) {
  return finite(company?.[metric]?.[quarter]) && !company.forecastFlags?.[flagKey(metric)]?.includes(quarter);
}

function actualQuarters(company) {
  return Object.keys(company?.revenue ?? {}).filter(
    quarter => actual(company, "revenue", quarter) && actual(company, "earnings", quarter),
  ).sort();
}

function missingMetrics(company, quarter, entry = {}) {
  const previous = actualQuarters(company).filter(period => period < quarter).slice(-2);
  const expected = RECURRING_METRICS.filter(metric => finite(entry[ENTRY_FIELDS[metric]])
    || (previous.length === 2 && previous.every(period => actual(company, metric, period))));
  if (expected.includes("netAssets") && company?.netAssets?.[quarter] !== 0) expected.push("roe");
  if (expected.includes("operatingCashFlow") && expected.includes("capex") && !expected.includes("freeCashFlow")) {
    expected.push("freeCashFlow");
  }
  return expected.filter(metric => !actual(company, metric, quarter));
}

function recentReport(filingDate, now) {
  const age = now.getTime() - Date.parse(filingDate);
  return age >= 0 && age < 22 * 86_400_000;
}

function releaseScale(entry) {
  if (!entry.statementCurrency || entry.statementCurrency === "USD") return 1;
  if (entry.displayCurrency === "USD" && finite(entry.displayScaleFactor) && entry.displayScaleFactor > 0) {
    return entry.displayScaleFactor;
  }
  return null;
}

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

export function manifest(data, shared, now = new Date()) {
  const local = {};
  const published = new Map(shared.companies.map(c => [tickerKey(c.ticker), c]));
  for (const company of COMPANY_SOURCES) {
    const existing = data.companies[company.id] ?? {};
    const periods = actualQuarters(existing);
    const quarter = periods.at(-1);
    const financials = quarter ? { [quarter]: {
      periodEnd: existing.periodEndDates?.[quarter], statementFilingDate: existing.reportDates?.[quarter],
      statementCurrency: "USD", revenueBn: existing.revenue[quarter] / 1e9, netIncomeBn: existing.earnings[quarter] / 1e9,
      operatingIncomeBn: finite(existing.operatingIncome?.[quarter]) ? existing.operatingIncome[quarter] / 1e9 : null,
    }} : {};
    const upstream = published.get(tickerKey(company.ticker));
    const upstreamQuarter = upstream?.quarters?.at(-1);
    // Avoid reparsing a disclosure that the shared publisher already obtained.
    const upstreamEntry = upstream?.financials?.[upstreamQuarter];
    if (upstreamEntry && (!quarter || upstreamQuarter >= quarter)) {
      const completeLocal = upstreamQuarter === quarter && !missingMetrics(existing, quarter, upstreamEntry).length;
      // An upstream snapshot must not hide a disclosure that is still missing locally.
      financials[upstreamQuarter] = { ...upstreamEntry };
      if (!completeLocal) {
        delete financials[upstreamQuarter].automaticEarnings;
        delete financials[upstreamQuarter].statementAccession;
        delete financials[upstreamQuarter].statementSourceUrl;
        financials[upstreamQuarter].statementFilingDate = existing.reportDates?.[quarter];
      }
    }
    const filed = existing.reportDates?.[quarter];
    if (recentReport(filed, now) && missingMetrics(existing, quarter).length) {
      // The collector ignores filings on or before its cutoff. Revisit this
      // same disclosure while data for a routinely reported metric is pending.
      for (const [period, entry] of Object.entries(financials)) {
        if (period < quarter) continue;
        entry.statementFilingDate = new Date(Date.parse(filed) - 86_400_000).toISOString().slice(0, 10);
        delete entry.automaticEarnings;
        delete entry.statementAccession;
        delete entry.statementSourceUrl;
      }
    }
    local[company.id] = { id: company.id, quarters: Object.keys(financials).sort(), financials };
  }
  return { companies: COMPANY_SOURCES, local };
}

export function applyQuarter(data, companyId, quarter, entry, official = {}) {
  if (!/^\d{4}Q[1-4]$/.test(quarter) || entry.statementSpanQuarters > 1 || entry.statementValueMode === "cumulative") return false;
  const scale = releaseScale(entry);
  if (!scale || !requiredAmounts(entry).every(finite) || entry.revenueBn <= 0) return false;
  const company = data.companies[companyId];
  if (!company) return false;
  const previous = actualQuarters(company).at(-1) ?? "";
  const filed = entry.statementFilingDate ?? "";
  const previousRevenue = company.revenue?.[previous];
  if (Math.abs(entry.netIncomeBn) > entry.revenueBn * 20
    || (previousRevenue > 0 && (entry.revenueBn * scale * 1e9 / previousRevenue < .02 || entry.revenueBn * scale * 1e9 / previousRevenue > 50))) return false;
  if (quarter < previous || (quarter === previous && filed < (company.reportDates?.[quarter] ?? ""))) return false;
  if (!entry.periodEnd || !filed || entry.periodEnd > filed) return false;
  const periodEnd = official.periodEndDate ?? entry.periodEnd;
  const reportDate = official.reportDate ?? filed;
  // Providers can round a fiscal end to the nearest month boundary.
  const difference = Math.abs(Date.parse(entry.periodEnd) - Date.parse(periodEnd));
  if (!(difference <= 7 * 86_400_000) || periodEnd > reportDate) return false;
  const amounts = { revenue: entry.revenueBn, earnings: entry.netIncomeBn, operatingIncome: entry.operatingIncomeBn, netAssets: entry.netAssetsBn,
    operatingCashFlow: entry.operatingCashFlowBn, capex: entry.capexBn };
  const usd = Object.fromEntries(Object.entries(amounts).map(([metric, amount]) => [
    metric, official[metric] ?? (finite(amount) ? Math.round(amount * scale * 1e9) : null),
  ]));
  const grossMargin = official.grossMargin ?? (finite(entry.grossProfitBn) ? entry.grossProfitBn / entry.revenueBn * 100 : null);
  // The shared publisher may complete or correct extraction for the same
  // disclosure. Its unchanged publication date must not freeze stale amounts.
  if (quarter === previous && reportDate === company.reportDates?.[quarter]) {
    const revised = Object.entries(usd).some(([metric, amount]) => finite(amount)
      && (!actual(company, metric, quarter) || company[metric]?.[quarter] !== amount));
    const grossRevised = finite(grossMargin) && (!actual(company, "grossMargin", quarter)
      || Math.abs(company.grossMargin[quarter] - grossMargin) > 1e-7);
    if (!revised && !grossRevised && company.periodEndDates?.[quarter] === periodEnd) return false;
  }
  const clearForecast = metric => {
    const flag = flagKey(metric);
    if (company.forecastFlags?.[flag]) company.forecastFlags[flag] = company.forecastFlags[flag].filter(q => q !== quarter);
  };
  for (const [metric, amount] of Object.entries(usd)) {
    if (!finite(amount)) continue;
    company[metric] ??= {};
    company[metric][quarter] = amount;
    clearForecast(metric);
  }
  if (finite(grossMargin)) {
    company.grossMargin ??= {};
    company.grossMargin[quarter] = grossMargin;
    clearForecast("grossMargin");
  }
  company.periodEndDates ??= {}; company.periodEndDates[quarter] = periodEnd;
  company.reportDates ??= {}; company.reportDates[quarter] = reportDate;
  const prior = `${Number(quarter.slice(0, 4)) - 1}${quarter.slice(4)}`;
  company.revenueGrowth ??= {};
  company.revenueGrowth[quarter] = company.revenue[prior] > 0 ? (company.revenue[quarter] / company.revenue[prior] - 1) * 100 : null;
  if (finite(company.revenueGrowth[quarter])) clearForecast("revenueGrowth");
  company.roe ??= {};
  company.roe[quarter] = company.netAssets?.[quarter] ? company.earnings[quarter] / company.netAssets[quarter] * 100 : null;
  if (finite(company.roe[quarter])) clearForecast("roe");
  if (actual(company, "operatingCashFlow", quarter) && actual(company, "capex", quarter)) {
    company.freeCashFlow ??= {};
    company.freeCashFlow[quarter] = company.operatingCashFlow[quarter] - company.capex[quarter];
    clearForecast("freeCashFlow");
  }
  data.periods = [...new Set([...data.periods, quarter])].sort();
  return true;
}

export function synchronize(data, shared, releases, now = new Date(), overrides = {}) {
  const sharedMap = new Map(shared.companies.map(c => [tickerKey(c.ticker), c]));
  const updates = new Set();
  const failures = [];
  const fallbacks = new Set();
  const cashFlowCompanies = new Set();
  const checks = new Map(releases.report.map(check => [check.companyId, check]));
  for (const company of COMPANY_SOURCES) {
    const { id, ticker } = company;
    const check = checks.get(id);
    const c = data.companies[id];
    const before = actualQuarters(c).at(-1);
    const retryRecent = recentReport(c?.reportDates?.[before], now) && missingMetrics(c, before).length > 0;
    if (check?.reason === "outside-company-earnings-window" && !retryRecent) continue;
    const upstream = sharedMap.get(tickerKey(ticker));
    for (const quarter of upstream?.quarters ?? []) {
      const entry = upstream.financials?.[quarter];
      if (entry && applyQuarter(data, id, quarter, entry, overrides[id]?.[quarter])) updates.add(id);
    }
    if (check?.reason === "check-failed") failures.push(`${ticker}: ${check.error}`);
    const candidate = check?.release;
    if (candidate?.entry && applyQuarter(data, id, candidate.quarter, candidate.entry, overrides[id]?.[candidate.quarter])) updates.add(id);

    const latest = actualQuarters(c).at(-1);
    if (!check?.needsUpdate && !retryRecent && !updates.has(id)) continue;
    const gaps = latest ? missingMetrics(c, latest, candidate?.quarter === latest ? candidate.entry : undefined) : [];
    const unparsed = check?.needsUpdate && (!candidate?.entry || !requiredAmounts(candidate.entry).every(finite)
      || !releaseScale(candidate.entry) || (check.remoteQuarter && (!latest || latest < check.remoteQuarter)));
    if (unparsed || gaps.some(metric => !CASH_FLOW_METRICS.includes(metric))) {
      fallbacks.add(id);
    }
    cashFlowCompanies.add(id);
  }
  return { companies: [...updates], fallbacks: [...fallbacks], cashFlowCompanies: [...cashFlowCompanies], failures };
}

export function releaseCoverageIssues(data, releases, synchronizedCompanies = [], now = new Date(), overrides = {}) {
  const issues = [];
  const checks = new Map(releases.report.map(check => [check.companyId, check]));
  for (const { id, ticker } of COMPANY_SOURCES) {
    const check = checks.get(id);
    if (check?.reason === "check-failed") issues.push(`${ticker}: source check failed`);
    const c = data.companies[id];
    const latest = actualQuarters(c).at(-1) ?? "";
    const expected = check?.remoteQuarter;
    const entry = check?.release?.quarter === latest ? check?.release?.entry : undefined;
    const official = overrides[id]?.[latest];
    const expectedFiling = entry && official?.periodEndDate === entry.periodEnd
      ? official.reportDate ?? check?.remoteFilingDate : check?.remoteFilingDate;
    const filed = c?.reportDates?.[latest] ?? "";
    if (check?.needsUpdate && (expected
      ? latest < expected || (latest === expected && filed < (expectedFiling ?? ""))
      : (!latest || latest <= (check.localQuarter ?? "")) && filed < check.remoteFilingDate)) {
      issues.push(`${ticker}: release detected but financial data still lags`);
      continue;
    }
    if (!latest || !(check?.needsUpdate || synchronizedCompanies.includes(id) || recentReport(filed, now))) continue;
    const expectedEnd = official?.periodEndDate ?? entry?.periodEnd;
    if (expectedEnd && c.periodEndDates?.[latest] !== expectedEnd) {
      issues.push(`${ticker} ${latest}: period end does not match the release`);
      continue;
    }
    const gaps = missingMetrics(c, latest, entry);
    if (gaps.length) issues.push(`${ticker} ${latest}: missing actuals for ${gaps.join(", ")}`);
    if (CASH_FLOW_METRICS.every(metric => actual(c, metric, latest))
      && c.freeCashFlow[latest] !== c.operatingCashFlow[latest] - c.capex[latest]) {
      issues.push(`${ticker} ${latest}: free cash flow does not reconcile`);
    }
    if (actual(c, "netAssets", latest) && actual(c, "roe", latest) && c.netAssets[latest] !== 0
      && Math.abs(c.roe[latest] - c.earnings[latest] / c.netAssets[latest] * 100) > 1e-6) {
      issues.push(`${ticker} ${latest}: ROE does not reconcile`);
    }
  }
  return issues;
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const data = parseDataJs(await readFile(DATA, "utf8"));
  if (process.argv.includes("--verify-coverage")) {
    const issues = releaseCoverageIssues(data, { report: [] });
    if (issues.length) throw Error(issues.join("\n"));
    console.log("Verified coverage of recent quarterly reports");
    return;
  }
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
    const sync = JSON.parse(await readFile(new URL("earnings-sync-report.json", OUT), "utf8"));
    const missing = releaseCoverageIssues(data, releases, sync.companies, new Date(), COMPANY_OFFICIAL_QUARTERLY_OVERRIDES);
    if (missing.length) throw Error(missing.join("\n"));
    console.log(`Verified all ${releases.checked} companies against detected releases`);
    return;
  }
  // Keep the diagnostic file enriched so --verify checks the parsed quarter.
  // Failure retains the vendor fallback and the final stale-release failure.
  try {
    if (await enrichAmdRelease(releases)) {
      await writeFile(new URL("earnings-release-report.json", OUT), JSON.stringify(releases, null, 2));
    }
  } catch (error) { console.error(`AMD official HTML fallback: ${error.message}`); }
  const result = synchronize(data, shared, releases, new Date(), COMPANY_OFFICIAL_QUARTERLY_OVERRIDES);
  if (releases.checked !== COMPANY_SOURCES.length) result.failures.push(`Only ${releases.checked}/${COMPANY_SOURCES.length} companies checked`);
  if (result.companies.length) {
    data.meta.generatedAt = new Date().toISOString();
    data.meta.earningsWatch = { updatedAt: data.meta.generatedAt, companies: result.companies };
    await writeFile(DATA, formatDataJs(data));
  }
  await writeFile(new URL("earnings-sync-report.json", OUT), JSON.stringify(result, null, 2));
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, `companies=${result.cashFlowCompanies.join(",")}\nfallbacks=${result.fallbacks.join(",")}\n`, { flag: "a" });
  console.log(JSON.stringify(result));
  if (result.failures.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run().catch(error => { console.error(error); process.exitCode = 1; });
