#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { HISTORICAL_CIKS, buildCoverage } from "./cash-flow-history.mjs";
import {
  COMPANY_SOURCES, parseDataJs, formatDataJs, fetchSecQuarterlyHistory,
  convertSecHistoryRowsToUsd, extractFinancialCurrency, parseStringArray,
  parseNumberArray, extractArrayRaw, toQuarterLabel,
  loadPublishedCompanyQuarters, loadCuratedQuarterlyDataset,
} from "./auto-refresh-data.mjs";

const execFileAsync = promisify(execFile);
const DATA_PATH = new URL("../data.js", import.meta.url);
const HISTORY_PATH = new URL("../data/cash-flow-history.json", import.meta.url);
const METRICS = ["operatingCashFlow", "capex", "freeCashFlow"];

export function extractCashFlowRows(html) {
  // Read only the cash-flow statement's data block, never table formatting or TTM.
  const marker = html.indexOf("ncfo:[");
  const start = html.lastIndexOf("data:{", marker);
  const end = html.indexOf("}", marker);
  const block = html.match(/financialData:\{([\s\S]*?)\},map:\[/)?.[1]
    ?? (marker >= 0 && start >= 0 && end > marker ? html.slice(start + 6, end) : null);
  if (!block) throw new Error("Cash-flow statement data block is missing");
  const dates = parseStringArray(extractArrayRaw(block, "datekey"));
  const ocf = parseNumberArray(extractArrayRaw(block, "ncfo"));
  const capex = /\bcapex:\[/.test(block) ? parseNumberArray(extractArrayRaw(block, "capex")) : [];
  return dates.flatMap((dateKey, index) => {
    const period = toQuarterLabel(dateKey);
    if (!period) return [];
    return [{ period, dateKey,
      operatingCashFlow: ocf[index] ?? null,
      // Provider uses signed cash outflows; the dashboard displays positive spend.
      capex: Number.isFinite(capex[index]) ? -capex[index] : null,
    }];
  });
}

export function applyCashFlowRows(company, rows, { source, minPeriod, periods, provenance = {}, fillMissing = false }) {
  for (const metric of METRICS) company[metric] ??= {};
  company.forecastFlags ??= {};
  for (const row of rows) {
    if (row.exclude) {
      for (const metric of METRICS) company[metric][row.period] = null;
      delete provenance[row.period];
      continue;
    }
    if (!periods.has(row.period) || (minPeriod && row.period < minPeriod)) continue;
    // SEC fields must describe the same reporting period before deriving FCF.
    for (const metric of ["operatingCashFlow", "capex"]) {
      const value = row[metric];
      if (!Number.isFinite(value) || (fillMissing && Number.isFinite(company[metric][row.period]))) continue;
      company[metric][row.period] = value;
      provenance[row.period] ??= {};
      const detail = row.cashFlowDetails?.[metric];
      provenance[row.period][metric] = { source, periodEnd: detail?.endDate ?? row.dateKey,
        method: detail?.method ?? row.method ?? "reported-quarter",
        ...(detail ? { concept: detail.concept, startDate: detail.startDate, filed: detail.filed,
          accession: detail.accession, nativeCurrency: detail.currency, nativeValue: detail.value, basis: detail.basis } : {}),
        ...(row.precision != null ? { precision: row.precision, periodEndPrecision: 'month' } : {}),
        ...(row.bases?.[metric] ? { basis: row.bases[metric] } : row.basis ? { basis: row.basis } : {}),
        ...(row.reconciliation?.[metric] ? { reconciliation: row.reconciliation[metric] } : {}),
        ...(row.supportingSources ? { supportingSources: row.supportingSources } : {}),
      };
    }
  }
  for (const period of periods) {
    const ocf = company.operatingCashFlow[period];
    const capex = company.capex[period];
    const dates = provenance[period];
    const samePeriod = !dates?.operatingCashFlow || !dates?.capex
      || dates.operatingCashFlow.periodEnd === dates.capex.periodEnd
      || ((dates.operatingCashFlow.periodEndPrecision === 'month' || dates.capex.periodEndPrecision === 'month')
        && Math.abs(Date.parse(dates.operatingCashFlow.periodEnd) - Date.parse(dates.capex.periodEnd)) <= 7 * 86400000);
    company.freeCashFlow[period] = Number.isFinite(ocf) && Number.isFinite(capex) && samePeriod ? ocf - capex : null;
    for (const metric of METRICS) company[metric][period] ??= null;
  }
  for (const metric of METRICS) {
    company[metric] = Object.fromEntries(Object.entries(company[metric]).sort(([a], [b]) => a.localeCompare(b)));
    company.forecastFlags[metric] = [];
  }
  return provenance;
}

async function fetchCashFlow(company) {
  const url = `https://stockanalysis.com/stocks/${company.slug}/financials/cash-flow-statement/?p=quarterly`;
  const { stdout } = await execFileAsync("curl", ["-L", "-sS", "--fail", "--compressed",
    "--connect-timeout", "10", "--max-time", "30", "--retry", "1",
    "-A", "Tech-Analysis/1.0 (+https://github.com/coattail/tech-analysis)", url], { maxBuffer: 5 * 1024 * 1024 });
  const currency = extractFinancialCurrency(stdout);
  let rows = extractCashFlowRows(stdout);
  if (currency !== "USD") {
    const converted = await convertSecHistoryRowsToUsd(rows, currency);
    if (!converted) throw new Error(`Unsupported reporting currency: ${currency}`);
    rows = converted.rows;
  }
  return { rows, source: url, currency };
}

export async function refreshCashFlow(data, { companyIds = null, stockAnalysisOnly = false, secOnly = false } = {}) {
  let history;
  try { history = JSON.parse(await readFile(HISTORY_PATH, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; history = { companies: {} }; }
  let supplemental;
  try { supplemental = JSON.parse(await readFile(new URL("../data/cash-flow-supplemental.json", import.meta.url), "utf8")); }
  catch (error) { if (error.code !== 'ENOENT') throw error; supplemental = { companies: {} }; }
  const overrides = JSON.parse(await readFile(new URL("../data/cash-flow-overrides.json", import.meta.url), "utf8"));
  const periods = new Set(data.periods);
  const selected = COMPANY_SOURCES.filter(c => !companyIds || companyIds.has(c.id));
  const failures = [];
  for (const company of selected) {
    const target = data.companies[company.id] ??= {};
    const record = history.companies[company.id] ??= { points: {} };
    for (const row of supplemental.companies[company.id]?.rows ?? []) {
      applyCashFlowRows(target, [row], { source: row.source, periods, minPeriod: company.minPeriod, provenance: record.points, fillMissing: true });
    }
    const errors = [];
    let fetched = 0;
    // Provider backfills recent quarters; SEC replaces them with primary facts where available.
    if (!secOnly) try {
      const result = await fetchCashFlow(company);
      applyCashFlowRows(target, result.rows, { source: result.source, periods, minPeriod: company.minPeriod, provenance: record.points });
      record.reportingCurrency = result.currency;
      fetched += result.rows.filter(r => Number.isFinite(r.operatingCashFlow)).length;
    } catch (error) { errors.push(`StockAnalysis: ${error.message}`); }
    if (!stockAnalysisOnly) {
      try {
        for (const cik of [...(HISTORICAL_CIKS[company.id] ?? []), null]) {
        const sec = await fetchSecQuarterlyHistory({ ...company, ...(cik ? { cik } : {}), ...(company.id === "chronoscale" ? { cashFlowPeriodEndDates: target.periodEndDates } : {}) });
        if (sec?.rows?.length) {
          let rows = sec.rows;
          if (sec.reportingCurrency !== "USD") rows = (await convertSecHistoryRowsToUsd(rows, sec.reportingCurrency))?.rows ?? [];
          applyCashFlowRows(target, rows, { source: `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(sec.cik).padStart(10, "0")}.json`, periods, minPeriod: company.minPeriod, provenance: record.points });
          fetched += rows.filter(r => Number.isFinite(r.operatingCashFlow)).length;
        }
        }
      } catch (error) { errors.push(`SEC: ${error.message}`); }
    }
    for (const row of overrides.companies[company.id] ?? []) {
      applyCashFlowRows(target, [row], { source: row.source, periods, minPeriod: company.minPeriod, provenance: record.points });
    }
    if (company.id === "palantir") {
      const published = await loadPublishedCompanyQuarters({}, "palantir");
      const local = (await loadCuratedQuarterlyDataset()).get("PLTR");
      for (const official of [local, published]) {
        for (const period of official?.quarters ?? []) {
          const entry = official.financials[period];
          if (![entry?.operatingCashFlowBn, entry?.capexBn].every(Number.isFinite)) continue;
          applyCashFlowRows(target, [{ period, dateKey: entry.periodEnd,
            operatingCashFlow: Math.round(entry.operatingCashFlowBn * 1e9), capex: Math.round(entry.capexBn * 1e9),
          }], { source: entry.statementSourceUrl, periods, provenance: record.points });
          fetched += 1;
        }
      }
    }
    applyCashFlowRows(target, [], { source: "", periods, provenance: record.points });
    record.coverage = Object.fromEntries(METRICS.map(metric => {
      const keys = Object.keys(target[metric]).filter(p => Number.isFinite(target[metric][p])).sort();
      return [metric, { count: keys.length, first: keys[0] ?? null, last: keys.at(-1) ?? null }];
    }));
    if (!fetched && (!secOnly || !Object.values(record.coverage).some(c => c.count > 0))) failures.push(company.id);
    console.log(`${company.ticker}: OCF ${record.coverage.operatingCashFlow.count}, CapEx ${record.coverage.capex.count}, FCF ${record.coverage.freeCashFlow.count}${errors.length ? ` (${errors.join("; ")})` : ""}`);
  }
  history.definition = { secQuarterMethod: "Direct quarterly facts or differences of cumulative facts with the same fiscal start; zero differences retained", fxMethod: "Primary non-USD facts use quarterly average FX; published historical supplements retain source USD conversion", currency: "USD", periodicity: "quarterly", capex: "Cash capital spending on property, plant, equipment and disclosed capitalized software/intangibles; positive spending; excludes business acquisitions and noncash financing leases; provider classifications may differ", freeCashFlow: "operatingCashFlow - capex", missing: "null; annual and TTM require four complete quarters" };
  return { history, failures };
}

async function run() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) { console.log("node scripts/auto-refresh-cash-flow.mjs [--dry-run] [--company id,ticker] [--stockanalysis-only] [--sec-only]"); return; }
  const index = args.indexOf("--company");
  const tokens = index >= 0 ? new Set((args[index + 1] ?? "").toLowerCase().split(",")) : null;
  const companyIds = tokens ? new Set(COMPANY_SOURCES.filter(c => [c.id, c.ticker.toLowerCase(), c.slug].some(v => tokens.has(v))).map(c => c.id)) : null;
  if (companyIds?.size === 0) throw new Error("No companies matched --company");
  const data = parseDataJs(await readFile(DATA_PATH, "utf8"));
  const result = await refreshCashFlow(data, { companyIds, stockAnalysisOnly: args.includes("--stockanalysis-only"), secOnly: args.includes("--sec-only") });
  // A total fetch failure preserves the prior files and fails the scheduled job.
  if (result.failures.length) throw new Error(`No fresh cash-flow data: ${result.failures.join(", ")}`);
  if (args.includes("--dry-run")) return;
  const content = formatDataJs(data);
  if (content !== await readFile(DATA_PATH, "utf8")) {
    data.meta.generatedAt = new Date().toISOString();
    await writeFile(DATA_PATH, formatDataJs(data));
  }
  const coverage = buildCoverage(data, result.history);
  await writeFile(HISTORY_PATH, `${JSON.stringify(result.history, null, 2)}\n`);
  await writeFile(new URL("../data/cash-flow-coverage.json", import.meta.url), `${JSON.stringify(coverage, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
