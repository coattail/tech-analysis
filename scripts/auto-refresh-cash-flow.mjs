#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import {
  COMPANY_SOURCES, parseDataJs, formatDataJs, fetchSecQuarterlyHistory,
  convertSecHistoryRowsToUsd, extractFinancialCurrency, parseStringArray,
  parseNumberArray, extractArrayRaw, toQuarterLabel,
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

export function applyCashFlowRows(company, rows, { source, minPeriod, periods, provenance = {} }) {
  for (const metric of METRICS) company[metric] ??= {};
  company.forecastFlags ??= {};
  for (const row of rows) {
    if (!periods.has(row.period) || (minPeriod && row.period < minPeriod)) continue;
    // SEC fields must describe the same reporting period before deriving FCF.
    if (row.cashFlowEndDate && row.capexEndDate && row.cashFlowEndDate !== row.capexEndDate) continue;
    for (const metric of ["operatingCashFlow", "capex"]) {
      const value = row[metric];
      if (!Number.isFinite(value)) continue;
      company[metric][row.period] = value;
      provenance[row.period] ??= {};
      provenance[row.period][metric] = { source, periodEnd: row.dateKey, method: row.method ?? "reported-quarter" };
    }
  }
  for (const period of periods) {
    const ocf = company.operatingCashFlow[period];
    const capex = company.capex[period];
    const dates = provenance[period];
    const samePeriod = !dates?.operatingCashFlow || !dates?.capex
      || dates.operatingCashFlow.periodEnd === dates.capex.periodEnd;
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
  const overrides = JSON.parse(await readFile(new URL("../data/cash-flow-overrides.json", import.meta.url), "utf8"));
  const periods = new Set(data.periods);
  const selected = COMPANY_SOURCES.filter(c => !companyIds || companyIds.has(c.id));
  const failures = [];
  for (const company of selected) {
    const target = data.companies[company.id] ??= {};
    const record = history.companies[company.id] ??= { points: {} };
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
        const sec = await fetchSecQuarterlyHistory(company);
        if (sec?.rows?.length) {
          let rows = sec.rows;
          if (sec.reportingCurrency !== "USD") rows = (await convertSecHistoryRowsToUsd(rows, sec.reportingCurrency))?.rows ?? [];
          applyCashFlowRows(target, rows, { source: `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(sec.cik).padStart(10, "0")}.json`, periods, minPeriod: company.minPeriod, provenance: record.points });
          fetched += rows.filter(r => Number.isFinite(r.operatingCashFlow)).length;
        }
      } catch (error) { errors.push(`SEC: ${error.message}`); }
    }
    for (const row of overrides.companies[company.id] ?? []) {
      applyCashFlowRows(target, [row], { source: row.source, periods, minPeriod: company.minPeriod, provenance: record.points });
    }
    applyCashFlowRows(target, [], { source: "", periods, provenance: record.points });
    record.coverage = Object.fromEntries(METRICS.map(metric => {
      const keys = Object.keys(target[metric]).filter(p => Number.isFinite(target[metric][p])).sort();
      return [metric, { count: keys.length, first: keys[0] ?? null, last: keys.at(-1) ?? null }];
    }));
    if (!fetched && (!secOnly || !Object.values(record.coverage).some(c => c.count > 0))) failures.push(company.id);
    console.log(`${company.ticker}: OCF ${record.coverage.operatingCashFlow.count}, CapEx ${record.coverage.capex.count}, FCF ${record.coverage.freeCashFlow.count}${errors.length ? ` (${errors.join("; ")})` : ""}`);
  }
  history.definition = { secQuarterMethod: "Direct quarterly facts or differences of cumulative facts with the same fiscal start; zero differences retained", fxMethod: "Non-USD cash flows converted at the reporting quarter average FX rate", currency: "USD", periodicity: "quarterly", capex: "Cash payments for property, plant and equipment / provider capital expenditure, positive spending; excludes acquisitions and financing leases", freeCashFlow: "operatingCashFlow - capex", missing: "null; annual and TTM require four complete quarters" };
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
  await writeFile(HISTORY_PATH, `${JSON.stringify(result.history, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run().catch(error => {
  console.error(error.message); process.exitCode = 1;
});
