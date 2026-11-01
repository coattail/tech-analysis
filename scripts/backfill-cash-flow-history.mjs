#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { COMPANY_SOURCES, parseDataJs, formatDataJs, convertSecHistoryRowsToUsd } from './auto-refresh-data.mjs';
import { applyCashFlowRows } from './auto-refresh-cash-flow.mjs';
import { buildCashFlowFacts, parseQuarterlyHistory, buildCoverage } from './cash-flow-history.mjs';
const DATA = new URL('../data.js', import.meta.url);
const HISTORY = new URL('../data/cash-flow-history.json', import.meta.url);
const SNAPSHOT = new URL('../data/cash-flow-supplemental.json', import.meta.url);
const COVERAGE = new URL('../data/cash-flow-coverage.json', import.meta.url);
const METRICS = ['operatingCashFlow', 'capex', 'freeCashFlow'];
const predecessorNames = { alphabet: ['alphabet-old'], avgo: ['avago', 'avgo-ltd'], exxon: ['exxon-old'] };
const readJson = async filename => JSON.parse(await readFile(filename, 'utf8'));
async function optional(filename) { try { return await readFile(filename, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; return null; } }

export function validateSupplement(rows, metric, company, { tolerance = 0.035, primaryDetails = {} } = {}) {
  let overlap = rows.filter(r => Number.isFinite(company[metric]?.[r.period]) && r[metric] !== 0);
  // Compare the same cash-capital-spending scope where capitalized intangibles are disclosed.
  const composites = overlap.filter(r => primaryDetails[r.period]?.basis === 'cash-capital-spending-including-capitalized-intangibles');
  if (metric === 'capex' && composites.length >= 3) overlap = composites;
  const matches = overlap.filter(r => Math.abs(company[metric][r.period] - r[metric])
    <= Math.max(r.precision / 2 + 1, Math.abs(company[metric][r.period]) * tolerance, 10000));
  return { overlap: overlap.length, matches: matches.length,
    accepted: overlap.length >= 3 && matches.length / overlap.length >= 0.75 };
}


async function run() {
  const args = process.argv.slice(2), index = args.indexOf('--source-dir');
  const sourceDir = index >= 0 ? path.resolve(args[index + 1]) : null;
  const data = parseDataJs(await readFile(DATA, 'utf8'));
  const baselineIndex = args.indexOf("--baseline");
  const before = baselineIndex >= 0 ? parseDataJs(await readFile(args[baselineIndex + 1], "utf8")) : structuredClone(data);
  const history = await readJson(HISTORY);
  const snapshot = JSON.parse(await optional(SNAPSHOT) ?? '{"companies":{}}');
  const periods = new Set(data.periods);
  if (sourceDir) {
    for (const source of COMPANY_SOURCES) {
      const c = data.companies[source.id], record = history.companies[source.id];
      const audit = snapshot.companies[source.id] ??= { rows: [], validation: {} };
      for (const name of [...(predecessorNames[source.id] ?? []), source.id]) {
        const raw = await optional(path.join(sourceDir, 'sec', name + '.json'));
        if (!raw) continue;
        const facts = JSON.parse(raw);
        let currency = 'USD';
        if (source.id === 'tsmc') currency = 'TWD';
        if (['asml', 'sap'].includes(source.id)) currency = 'EUR';
        const series = buildCashFlowFacts(facts, currency, { allowNetCapex: ['bankofamerica','lilly'].includes(source.id), normalizeNetCapexSign: source.id === 'lilly', periodEndDates: source.id === 'chronoscale' ? c.periodEndDates : {} });
        const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(facts.cik).padStart(10, '0')}.json`;
        for (const metric of ['operatingCashFlow', 'capex']) {
          let rows = [...series[metric]].map(([period, fact]) => ({ period, dateKey: fact.endDate, [metric]: fact.value, cashFlowDetails: { [metric]: fact } }));
          if (rows.length && currency !== 'USD') rows = (await convertSecHistoryRowsToUsd(rows, currency))?.rows ?? [];
          applyCashFlowRows(c, rows, { source: url, minPeriod: source.minPeriod, periods, provenance: record.points });
        }
      }
      const rowsToCache = [];
      for (const [metric, slug] of [['operatingCashFlow', 'cash-from-operations'], ['capex', 'capex']]) {
        const raw = await optional(path.join(sourceDir, 'wsn', source.id + '-' + slug + '.txt'));
        if (!raw) continue;
        try {
          let rows = parseQuarterlyHistory(raw, metric).filter(r => periods.has(r.period) && (!source.minPeriod || r.period >= source.minPeriod));
          const validation = validateSupplement(rows, metric, c, {
            tolerance: ['tsmc','asml','sap','skhynix'].includes(source.id) ? 0.15 : 0.035,
            primaryDetails: Object.fromEntries(Object.entries(record.points).map(([p, values]) => [p, values[metric]])),
          });
          audit.validation[metric] = validation;
          if (!validation.accepted) continue;
          const url = raw.match(/https:\/\/wallstreetnumbers\.com\/stocks\/[^)\s]+/)?.[0];
          // Zero placeholders are common when a provider has no cash CapEx disclosure.
          rows = rows.filter(r => metric !== 'capex' || r.capex !== 0);
          for (const r of rows) {
            const row = { ...r, source: url, method: 'published-quarter-rounded', ...(metric === 'capex' ? { basis: 'cash-capital-spending-including-capitalized-intangibles' } : {}) };
            rowsToCache.push(row);
            applyCashFlowRows(c, [row], { source: url, minPeriod: source.minPeriod, periods, provenance: record.points, fillMissing: true });
          }
        } catch (error) { audit.validation[metric] = { accepted: false, error: error.message }; }
      }
      audit.rows = rowsToCache.sort((a, b) => a.period.localeCompare(b.period));
      console.log(source.id, Object.fromEntries(METRICS.map(k => [k, Object.values(c[k]).filter(Number.isFinite).length])), audit.validation);
    }
  } else {
    for (const source of COMPANY_SOURCES) {
      for (const row of snapshot.companies[source.id]?.rows ?? []) applyCashFlowRows(data.companies[source.id], [row], {
        source: row.source, periods, minPeriod: source.minPeriod, provenance: history.companies[source.id].points, fillMissing: true,
      });
    }
  }
  const overrides = await readJson(new URL('../data/cash-flow-overrides.json', import.meta.url));
  for (const source of COMPANY_SOURCES) {
    const company = data.companies[source.id], provenance = history.companies[source.id].points;
    for (const row of overrides.companies[source.id] ?? []) applyCashFlowRows(company, [row], { source: row.source, periods, minPeriod: source.minPeriod, provenance });
    applyCashFlowRows(company, [], { source: '', periods, provenance });
  }
  const coverage = buildCoverage(data, history, before);
  if (args.includes('--dry-run')) { console.log(JSON.stringify(coverage, null, 2)); return; }
  snapshot.definition = 'USD published standalone quarters used only to fill missing primary facts; values retain provider display precision; overlapping quarters validated before import; annual and TTM tables and undisclosed zero placeholders rejected.';
  history.definition.capex = 'Cash property/equipment spending plus separately disclosed capitalized software/intangibles; positive spending; excludes acquisitions and noncash leases; provider classifications may differ';
  history.definition.fxMethod = 'Primary non-USD facts use quarterly average FX; published historical supplements retain source USD conversion';
  history.definition.supplemental = 'Historical supplemental quarters retain published precision, with SEC facts preferred and no annual-average interpolation.';
  data.meta.generatedAt = new Date().toISOString();
  data.meta.cashFlow = { ...data.meta.cashFlow,
    historyAudit: 'data/cash-flow-coverage.json',
    capexScope: 'Cash property/equipment spending plus separately disclosed capitalized software/intangibles; excludes acquisitions and noncash leases',
    supplementalPrecision: 'Historical published-quarter supplements retain source display precision and source USD conversion; primary non-USD facts use quarterly average FX',
  };
  await writeFile(DATA, formatDataJs(data));
  await writeFile(HISTORY, JSON.stringify(history, null, 2) + '\n');
  await writeFile(SNAPSHOT, JSON.stringify(snapshot, null, 2) + '\n');
  await writeFile(COVERAGE, JSON.stringify(coverage, null, 2) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run().catch(e => { console.error(e); process.exitCode = 1; });
