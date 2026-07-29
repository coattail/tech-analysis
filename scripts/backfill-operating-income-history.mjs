#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const DATA_JS_PATH = new URL("../data.js", import.meta.url);
const PRICE_DATA_JS_PATH = new URL("../price-data.js", import.meta.url);
const AUDIT_PATH = new URL("../data/operating-income-history.json", import.meta.url);
const SOURCE_CACHE_PATH = new URL("../data/operating-income-source.json", import.meta.url);
const EARLIEST_PERIOD = "2005Q1";
const MACROTRENDS_IFRAME_BASE =
  "https://www.macrotrends.net/production/stocks/desktop/PRODUCTION/fundamental_iframe.php";
const REQUEST_HEADERS = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/136 Safari/537.36",
  accept: "text/html,application/xhtml+xml",
  "accept-language": "en-US,en;q=0.9",
};

const COMPANY_SOURCES = [
  ["nvidia", "NVDA"],
  ["alphabet", "GOOGL"],
  ["apple", "AAPL"],
  ["microsoft", "MSFT"],
  ["amazon", "AMZN"],
  ["avgo", "AVGO"],
  ["meta", "META"],
  ["tsmc", "TSM"],
  ["tsla", "TSLA"],
  ["walmart", "WMT"],
  ["berkshire", "BRK.B"],
  ["jpmorgan", "JPM"],
  ["lilly", "LLY"],
  ["exxon", "XOM"],
  ["visa", "V"],
  ["asml", "ASML"],
  ["micron", "MU"],
  ["jnj", "JNJ"],
  ["oracle", "ORCL"],
  ["amd", "AMD"],
  ["mastercard", "MA"],
  ["costco", "COST"],
  ["netflix", "NFLX"],
  ["bankofamerica", "BAC"],
  ["caterpillar", "CAT"],
  ["chevron", "CVX"],
  ["palantir", "PLTR"],
  ["cisco", "CSCO"],
  ["abbvie", "ABBV"],
  ["homedepot", "HD"],
  ["ibm", "IBM"],
  ["sap", "SAP"],
  ["crowdstrike", "CRWD"],
  ["salesforce", "CRM"],
  ["servicenow", "NOW"],
  ["datadog", "DDOG"],
  ["snowflake", "SNOW"],
  ["cloudflare", "NET"],
  ["adobe", "ADBE"],
  ["zoom", "ZM"],
  ["coreweave", "CRWV"],
  ["nebius", "NBIS", "2024Q2"],
  ["chronoscale", "CHRN", "2024Q3"],
  ["sharonai", "SHAZ"],
].map(([id, ticker, minPeriod]) => ({ id, ticker, minPeriod }));

function parseArgs(argv) {
  const options = { dryRun: false, companyIds: null, importBrowserCache: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (token === "--company") {
      const value = argv[index + 1];
      if (!value) throw new Error("--company 需要公司 id 或 ticker");
      index += 1;
      options.companyIds = new Set(
        value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
      );
      continue;
    }
    if (token === "--import-browser-cache") {
      options.importBrowserCache = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      console.log(
        "用法：node scripts/backfill-operating-income-history.mjs [--dry-run] [--company apple,msft] [--import-browser-cache]",
      );
      process.exit(0);
    }
    throw new Error(`未知参数：${token}`);
  }
  return options;
}

function parseAssignedJson(rawText, prefix) {
  const start = rawText.indexOf(prefix);
  if (start < 0) throw new Error(`未找到 ${prefix}`);
  return JSON.parse(rawText.slice(start + prefix.length).trim().replace(/;\s*$/, ""));
}

function formatDataJs(data) {
  return `window.FINANCIAL_SOURCE_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function parsePeriod(period) {
  const match = /^(\d{4})Q([1-4])$/.exec(String(period || ""));
  if (!match) return null;
  return { year: Number(match[1]), quarter: Number(match[2]) };
}

function comparePeriods(left, right) {
  const a = parsePeriod(left);
  const b = parsePeriod(right);
  if (!a || !b) return String(left).localeCompare(String(right));
  return a.year === b.year ? a.quarter - b.quarter : a.year - b.year;
}

function shiftPeriod(period, quarterDelta) {
  const parsed = parsePeriod(period);
  if (!parsed) return null;
  const ordinal = parsed.year * 4 + parsed.quarter - 1 + quarterDelta;
  return `${Math.floor(ordinal / 4)}Q${(ordinal % 4) + 1}`;
}

function periodsBetween(startPeriod, endPeriod) {
  const periods = [];
  for (let period = startPeriod; comparePeriods(period, endPeriod) <= 0; period = shiftPeriod(period, 1)) {
    periods.push(period);
  }
  return periods;
}

function calendarQuarterFromDate(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return null;
  let year = Number(match[1]);
  let month = Number(match[2]);
  const day = Number(match[3]);
  if ([1, 4, 7, 10].includes(month) && day >= 1 && day <= 7) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return `${year}Q${Math.floor((month - 1) / 3) + 1}`;
}

function laterPeriod(...periods) {
  return periods
    .filter((period) => parsePeriod(period))
    .sort(comparePeriods)
    .at(-1) || null;
}

function firstFinitePeriod(series, minimum = null) {
  return Object.entries(series || {})
    .filter(([period, value]) => Number.isFinite(value) && (!minimum || comparePeriods(period, minimum) >= 0))
    .map(([period]) => period)
    .sort(comparePeriods)[0] || null;
}

function lastFinitePeriod(series) {
  return Object.entries(series || {})
    .filter(([, value]) => Number.isFinite(value))
    .map(([period]) => period)
    .sort(comparePeriods)
    .at(-1) || null;
}

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, { headers: REQUEST_HEADERS, redirect: "follow" });
  if (response.ok) return response.text();
  if (attempt >= 7) throw new Error(`HTTP ${response.status}: ${url}`);
  const retryAfterSeconds = Number(response.headers.get("retry-after"));
  const delayMs = response.status === 429
    ? Math.max(Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 0, attempt * 2_000)
    : attempt * 750;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return fetchText(url, attempt + 1);
}

function parseMacrotrendsQuarterly(html) {
  const match = html.match(/var chartData = (\[[^\r\n]+\])/);
  if (!match) return new Map();
  const rows = JSON.parse(match[1]);
  const quarterly = new Map();
  rows.forEach((row) => {
    const period = calendarQuarterFromDate(row.date);
    const value = Number(row.v2);
    if (!period || !Number.isFinite(value)) return;
    quarterly.set(period, Math.round(value * 1e9));
  });
  return quarterly;
}

function parseAbbreviatedUsd(rawValue) {
  const normalized = String(rawValue || "").replace(/[$,\s]/g, "");
  const match = /^(-?\d+(?:\.\d+)?)([KMBT])?$/.exec(normalized);
  if (!match) return null;
  const multipliers = {
    K: 1e3,
    M: 1e6,
    B: 1e9,
    T: 1e12,
  };
  const multiplier = multipliers[match[2]] || 1;
  const value = Number(match[1]) * multiplier;
  return Number.isFinite(value) ? Math.round(value) : null;
}

function parseMacrotrendsTtm(html) {
  const ttm = new Map();
  const rowPattern =
    /<tr>\s*<td[^>]*>(\d{4}-\d{2}-\d{2})<\/td>\s*<td[^>]*>\$?([^<]+?)B<\/td>\s*<td[^>]*>\$?([^<]+?)B<\/td>/g;
  let match;
  while ((match = rowPattern.exec(html))) {
    const period = calendarQuarterFromDate(match[1]);
    const value = Number(match[3].replace(/,/g, "").trim());
    if (!period || !Number.isFinite(value)) continue;
    ttm.set(period, Math.round(value * 1e9));
  }
  return ttm;
}

function parseCachedQuarterly(rows) {
  const quarterly = new Map();
  (rows || []).forEach((row) => {
    const period = calendarQuarterFromDate(row?.date);
    const value = Number(row?.v2);
    if (!period || !Number.isFinite(value)) return;
    quarterly.set(period, Math.round(value * 1e9));
  });
  return quarterly;
}

function parseCachedTtm(rows) {
  const ttm = new Map();
  (rows || []).forEach((row) => {
    const period = calendarQuarterFromDate(row?.[0]);
    const value = parseAbbreviatedUsd(row?.[2]);
    if (!period || !Number.isFinite(value)) return;
    ttm.set(period, value);
  });
  return ttm;
}

function deriveEarlierQuarters(directQuarterly, ttm) {
  const quarterly = new Map(directQuarterly);
  const derivedPeriods = new Set();
  const periods = [...ttm.keys()].sort(comparePeriods).reverse();

  periods.forEach((period) => {
    const previousQuarter = shiftPeriod(period, -1);
    const priorYearQuarter = shiftPeriod(period, -4);
    if (
      quarterly.has(priorYearQuarter) ||
      !quarterly.has(period) ||
      !ttm.has(period) ||
      !ttm.has(previousQuarter)
    ) {
      return;
    }

    const knownQuarterValue = quarterly.get(period);
    const value = knownQuarterValue - (ttm.get(period) - ttm.get(previousQuarter));
    const scale = Math.max(
      Math.abs(knownQuarterValue),
      Math.abs(ttm.get(period)),
      Math.abs(ttm.get(previousQuarter)),
      100_000_000,
    );
    if (!Number.isFinite(value) || Math.abs(value) > scale * 5) return;
    quarterly.set(priorYearQuarter, Math.round(value / 1_000_000) * 1_000_000);
    derivedPeriods.add(priorYearQuarter);
  });

  return { quarterly, derivedPeriods };
}

async function fetchMacrotrendsHistory(ticker, cachedCompany = null) {
  if (cachedCompany) {
    const directQuarterly = parseCachedQuarterly(cachedCompany.quarterly);
    const ttm = parseCachedTtm(cachedCompany.ttm);
    return { directQuarterly, ttm, ...deriveEarlierQuarters(directQuarterly, ttm) };
  }

  const quarterlyUrl =
    `${MACROTRENDS_IFRAME_BASE}?t=${encodeURIComponent(ticker)}` +
    "&type=operating-income&statement=income-statement&freq=Q&sub=&yb=30";
  const ttmUrl =
    `https://www.macrotrends.net/stocks/charts/${encodeURIComponent(ticker)}` +
    "/x/operating-margin/1000";
  const [quarterlyHtml, ttmHtml] = await Promise.all([
    fetchText(quarterlyUrl),
    fetchText(ttmUrl),
  ]);
  const directQuarterly = parseMacrotrendsQuarterly(quarterlyHtml);
  const ttm = parseMacrotrendsTtm(ttmHtml);
  return { directQuarterly, ttm, ...deriveEarlierQuarters(directQuarterly, ttm) };
}

async function loadSourceCache() {
  try {
    return JSON.parse(await readFile(SOURCE_CACHE_PATH, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function importBrowserSourceCache() {
  const [quarterlyRaw, ttmRaw] = await Promise.all([
    readFile("/tmp/macro-quarterly-browser.json", "utf8"),
    readFile("/tmp/macro-ttm-browser.json", "utf8"),
  ]);
  const quarterly = JSON.parse(quarterlyRaw);
  const ttm = JSON.parse(ttmRaw);
  const companies = {};
  COMPANY_SOURCES.forEach((company) => {
    companies[company.id] = {
      ticker: company.ticker,
      quarterly: quarterly[company.id] || [],
      ttm: ttm[company.id] || [],
    };
  });
  const sourceCache = {
    generatedAt: new Date().toISOString(),
    source: "Macrotrends operating-income quarterly chart and operating-margin historical table",
    units: "USD; quarterly chart values are USD billions; TTM table values retain their published unit suffix",
    companies,
  };
  await writeFile(SOURCE_CACHE_PATH, `${JSON.stringify(sourceCache, null, 2)}\n`, "utf8");
  return sourceCache;
}

function getListingPeriod(priceCompany, minPeriod) {
  const firstDate = Object.keys(priceCompany?.daily || {}).sort()[0];
  const pricePeriod = calendarQuarterFromDate(firstDate);
  return laterPeriod(EARLIEST_PERIOD, pricePeriod, minPeriod);
}

function selectCompanies(options) {
  if (!options.companyIds) return COMPANY_SOURCES;
  const selected = COMPANY_SOURCES.filter((company) => (
    options.companyIds.has(company.id) ||
    options.companyIds.has(company.ticker.toLowerCase())
  ));
  if (selected.length === 0) throw new Error("没有匹配到公司");
  return selected;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const [dataRaw, priceRaw] = await Promise.all([
    readFile(DATA_JS_PATH, "utf8"),
    readFile(PRICE_DATA_JS_PATH, "utf8"),
  ]);
  const data = parseAssignedJson(dataRaw, "window.FINANCIAL_SOURCE_DATA =");
  const priceData = parseAssignedJson(priceRaw, "window.STOCK_PRICE_SOURCE_DATA =");
  const selectedCompanies = selectCompanies(options);
  const sourceCache = options.importBrowserCache
    ? await importBrowserSourceCache()
    : await loadSourceCache();
  const audit = {
    generatedAt: new Date().toISOString(),
    source: "Macrotrends quarterly Operating Income and quarterly TTM Operating Income",
    methodology:
      "Direct quarterly USD values are used when available. Earlier quarters are reconstructed from Q[t-4] = Q[t] - (TTM[t] - TTM[t-1]). TTM values are published in USD billions and rounded to two decimals. Existing SEC, supplemental, or curated quarterly values are retained when the historical snapshot does not yet include the newest reported quarter.",
    earliestRequiredPeriod: EARLIEST_PERIOD,
    companies: {},
  };

  let changedPoints = 0;
  let remainingGaps = 0;
  for (const company of selectedCompanies) {
    const companyData = data.companies?.[company.id];
    if (!companyData) {
      console.warn(`${company.id}: data.js 中不存在，跳过`);
      continue;
    }

    console.log(`补齐 ${company.ticker} (${company.id})...`);
    const history = await fetchMacrotrendsHistory(
      company.ticker,
      sourceCache?.companies?.[company.id],
    );
    const listingPeriod = getListingPeriod(priceData.companies?.[company.id], company.minPeriod);
    const latestFinancialPeriod = laterPeriod(
      lastFinitePeriod(companyData.revenue),
      lastFinitePeriod(companyData.earnings),
    );
    if (!listingPeriod || !latestFinancialPeriod) {
      console.warn("  缺少上市期或最新财报期，跳过");
      continue;
    }

    companyData.operatingIncome ||= {};
    const requiredPeriods = periodsBetween(listingPeriod, latestFinancialPeriod);
    const directPeriods = [];
    const reconstructedPeriods = [];
    const preservedPeriods = [];
    requiredPeriods.forEach((period) => {
      const value = history.quarterly.get(period);
      if (!Number.isFinite(value)) {
        if (Number.isFinite(companyData.operatingIncome[period])) {
          preservedPeriods.push(period);
        }
        return;
      }
      if (companyData.operatingIncome[period] !== value) changedPoints += 1;
      companyData.operatingIncome[period] = value;
      if (history.directQuarterly.has(period)) {
        directPeriods.push(period);
      } else if (history.derivedPeriods.has(period)) {
        reconstructedPeriods.push(period);
      }
    });

    companyData.operatingIncome = Object.fromEntries(
      Object.entries(companyData.operatingIncome)
        .filter(([period, value]) => parsePeriod(period) && Number.isFinite(value))
        .sort(([left], [right]) => comparePeriods(left, right)),
    );
    companyData.forecastFlags ||= {};
    companyData.forecastFlags.operatingIncome = [];

    const missingPeriods = requiredPeriods.filter(
      (period) => !Number.isFinite(companyData.operatingIncome[period]),
    );
    remainingGaps += missingPeriods.length;
    audit.companies[company.id] = {
      ticker: company.ticker,
      listingPeriod,
      latestFinancialPeriod,
      directPeriods,
      reconstructedPeriods,
      preservedPeriods,
      missingPeriods,
    };
    console.log(
      `  要求 ${requiredPeriods.length} 季度；直接 ${directPeriods.length}，反推 ${reconstructedPeriods.length}，剩余缺口 ${missingPeriods.length}`,
    );
    if (missingPeriods.length > 0) {
      console.log(`  缺口季度：${missingPeriods.join(", ")}`);
    }
    if (!sourceCache) {
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }

  data.meta ||= {};
  data.meta.generatedAt = audit.generatedAt;
  data.meta.source =
    "SEC Company Facts + StockAnalysis + Macrotrends historical Operating Income/TTM reconstruction";
  data.meta.operatingIncomeHistory = {
    earliestRequiredPeriod: EARLIEST_PERIOD,
    methodology: audit.methodology,
    auditFile: "data/operating-income-history.json",
  };

  if (options.dryRun) {
    console.log(`Dry run：变更 ${changedPoints} 点，剩余缺口 ${remainingGaps}`);
    return;
  }

  await Promise.all([
    writeFile(DATA_JS_PATH, formatDataJs(data), "utf8"),
    writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8"),
  ]);
  console.log(`完成：变更 ${changedPoints} 点，剩余缺口 ${remainingGaps}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
