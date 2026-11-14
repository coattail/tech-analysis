#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const {
  assessYahooChartFreshness,
  getLatestCompletedMarketDate,
  getLatestPriceDate,
  keepCompletedPrices,
  normalizeYahooChartPayload,
  parseNasdaqClosedQuote,
  parseNasdaqHistoricalClose,
  verifyLatestClose,
} = require("../price-refresh-helpers.cjs");

const { parseStockAnalysisPrices, parseStockAnalysisAdjustedChart } = require("../stockanalysis-price-helpers.cjs");

const PRICE_DATA_JS_PATH = new URL("../price-data.js", import.meta.url);
const YAHOO_CHART_BASE = "https://query2.finance.yahoo.com/v8/finance/chart";
const NASDAQ_HISTORICAL_BASE = "https://api.nasdaq.com/api/quote";
const START_DATE_UNIX = Math.floor(Date.UTC(2005, 0, 1) / 1000);
const FETCH_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [2_000, 5_000];

const COMPANY_SOURCES = [
  { id: "iren", ticker: "IREN", minDate: "2021-11-17" },
  { id: "spacex", ticker: "SPCX" },
  { id: "nvidia", ticker: "NVDA" },
  { id: "alphabet", ticker: "GOOGL" },
  { id: "apple", ticker: "AAPL" },
  { id: "microsoft", ticker: "MSFT" },
  { id: "amazon", ticker: "AMZN" },
  { id: "avgo", ticker: "AVGO" },
  { id: "meta", ticker: "META" },
  { id: "tsmc", ticker: "TSM" },
  { id: "tsla", ticker: "TSLA" },
  { id: "walmart", ticker: "WMT" },
  { id: "berkshire", ticker: "BRK-B", nasdaqTicker: "BRK.B" },
  { id: "jpmorgan", ticker: "JPM" },
  { id: "lilly", ticker: "LLY" },
  { id: "exxon", ticker: "XOM" },
  { id: "visa", ticker: "V" },
  { id: "asml", ticker: "ASML" },
  { id: "skhynix", ticker: "SKHY", minDate: "2026-07-13" },
  { id: "micron", ticker: "MU" },
  { id: "jnj", ticker: "JNJ" },
  { id: "oracle", ticker: "ORCL" },
  { id: "amd", ticker: "AMD" },
  { id: "mastercard", ticker: "MA" },
  { id: "costco", ticker: "COST" },
  { id: "netflix", ticker: "NFLX" },
  { id: "bankofamerica", ticker: "BAC" },
  { id: "caterpillar", ticker: "CAT" },
  { id: "chevron", ticker: "CVX" },
  { id: "palantir", ticker: "PLTR" },
  { id: "cisco", ticker: "CSCO" },
  { id: "abbvie", ticker: "ABBV" },
  { id: "homedepot", ticker: "HD" },
  { id: "ibm", ticker: "IBM" },
  { id: "sap", ticker: "SAP" },
  { id: "crowdstrike", ticker: "CRWD" },
  { id: "salesforce", ticker: "CRM" },
  { id: "servicenow", ticker: "NOW" },
  { id: "datadog", ticker: "DDOG" },
  { id: "snowflake", ticker: "SNOW" },
  { id: "cloudflare", ticker: "NET" },
  { id: "adobe", ticker: "ADBE" },
  { id: "zoom", ticker: "ZM" },
  { id: "coreweave", ticker: "CRWV" },
  { id: "nebius", ticker: "NBIS", minDate: "2024-04-01" },
  { id: "chronoscale", ticker: "CHRN" },
  { id: "sharonai", ticker: "SHAZ" },
];

function parsePriceDataJs(raw) {
  const json = raw
    .replace(/^\s*window\.STOCK_PRICE_SOURCE_DATA\s*=\s*/, "")
    .replace(/;\s*$/, "");
  return JSON.parse(json);
}

function formatPriceDataJs(data) {
  return `window.STOCK_PRICE_SOURCE_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getSelectedCompanies(argv) {
  const companyIndex = argv.indexOf("--company");
  if (companyIndex < 0) return COMPANY_SOURCES;
  const requested = new Set(String(argv[companyIndex + 1] || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean));
  const selected = COMPANY_SOURCES.filter((company) => (
    requested.has(company.id) || requested.has(company.ticker.toLowerCase())
  ));
  if (selected.length === 0) throw new Error("--company 未匹配到公司");
  return selected;
}

function pruneDailyPrices(daily, minDate) {
  if (!minDate) return daily;
  return Object.fromEntries(Object.entries(daily || {}).filter(([date]) => date >= minDate));
}

async function fetchNasdaqClose(company, expectedDate) {
  const symbol = company.nasdaqTicker ?? company.ticker;
  const url = new URL(`${NASDAQ_HISTORICAL_BASE}/${encodeURIComponent(symbol)}/historical`);
  const from = new Date(`${expectedDate}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 7);
  url.searchParams.set("assetclass", "stocks");
  url.searchParams.set("fromdate", from.toISOString().slice(0, 10));
  url.searchParams.set("todate", expectedDate);
  const options = () => ({
    signal: AbortSignal.timeout(15_000),
    headers: { "user-agent": "Mozilla/5.0", accept: "application/json", "cache-control": "no-cache" },
  });
  try {
    const response = await fetch(url, options());
    if (!response.ok) throw new Error(`Nasdaq 日线请求失败（${symbol}）：HTTP ${response.status}`);
    return { close: parseNasdaqHistoricalClose(await response.json(), symbol, expectedDate), source: url.href };
  } catch (error) {
    const quoteUrl = `${NASDAQ_HISTORICAL_BASE}/${encodeURIComponent(symbol)}/info?assetclass=stocks`;
    const response = await fetch(quoteUrl, options());
    if (!response.ok) throw new Error(`${error.message}；Nasdaq 报价请求失败（${symbol}）：HTTP ${response.status}`);
    return { close: parseNasdaqClosedQuote(await response.json(), symbol, expectedDate), source: quoteUrl };
  }
}

async function fetchDailyAdjustedSeries(company, expectedDate, officialClose, previousDaily) {
  let lastError;

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      // Yahoo's period2 is exclusive. Keep the requested range out of the next session.
      const endDateUnix = Date.parse(`${expectedDate}T00:00:00Z`) / 1000 + 86_400;
      const url = new URL(`${YAHOO_CHART_BASE}/${encodeURIComponent(company.ticker)}`);
      const startDateUnix = company.minDate
        ? Math.floor(Date.parse(`${company.minDate}T00:00:00Z`) / 1000)
        : START_DATE_UNIX;
      url.searchParams.set("period1", String(startDateUnix));
      url.searchParams.set("period2", String(endDateUnix));
      url.searchParams.set("interval", "1d");
      url.searchParams.set("events", "div,splits");
      url.searchParams.set("includeAdjustedClose", "true");

      const response = await fetch(url, {
        signal: AbortSignal.timeout(20_000),
        headers: {
          "user-agent": "Mozilla/5.0",
          accept: "application/json",
          "cache-control": "no-cache",
        },
      });
      if (!response.ok) {
        throw new Error(`Yahoo Finance 请求失败（${company.ticker}）：${response.status}`);
      }

      const payload = await response.json();
      const daily = keepCompletedPrices(normalizeYahooChartPayload(payload), expectedDate);
      if (Object.keys(daily).length === 0) {
        const providerMessage = payload?.chart?.error?.description || "响应缺少日线数据";
        throw new Error(`Yahoo Finance 响应异常（${company.ticker}）：${providerMessage}`);
      }

      const freshness = assessYahooChartFreshness(daily, expectedDate);
      if (!freshness.isFresh) {
        throw new Error(
          `Yahoo Finance 日线滞后（${company.ticker}）：最新 ${freshness.latestDate || "未知"}，应到 ${freshness.expectedDate || "未知"}`,
        );
      }

      return { daily: verifyLatestClose(daily, expectedDate, officialClose), source: "Yahoo Finance chart API" };
    } catch (error) {
      lastError = error;
      if (attempt >= FETCH_ATTEMPTS) break;
      const retryDelay = RETRY_DELAYS_MS[attempt - 1] || RETRY_DELAYS_MS.at(-1);
      console.warn(`${error.message}；${retryDelay / 1000} 秒后重试（${attempt}/${FETCH_ATTEMPTS}）`);
      await sleep(retryDelay);
    }
  }

  const hasHistoryPage = ["skhynix", "spacex"].includes(company.id);
  const source = hasHistoryPage
    ? `https://stockanalysis.com/stocks/${company.ticker.toLowerCase()}/history/?range=max`
    : `https://api.stockanalysis.com/api/symbol/s/${encodeURIComponent(company.ticker)}/history?type=chart&series=a`;
  try {
    const { stdout } = await execFileAsync("curl", ["-L", "-sS", "--fail", "--compressed", "--max-time", "25", source], { maxBuffer: 5 * 1024 * 1024 });
    const fallback = hasHistoryPage
      ? keepCompletedPrices(parseStockAnalysisPrices(stdout), expectedDate)
      : parseStockAnalysisAdjustedChart(JSON.parse(stdout), expectedDate, company.id === "iren" ? company.minDate : undefined);
    const daily = pruneDailyPrices(fallback, company.minDate ?? "2005-01-01");
    if (Object.keys(pruneDailyPrices(previousDaily, company.minDate) || {}).some(date => !Object.hasOwn(daily, date))) {
      throw new Error("StockAnalysis 复权日线缺少已发布的历史交易日");
    }
    return { daily: verifyLatestClose(daily, expectedDate, officialClose), source };
  } catch (error) {
    throw new Error(`${lastError.message}；备用日线：${error.message}`);
  }
}

async function main() {
  const existing = parsePriceDataJs(await readFile(PRICE_DATA_JS_PATH, "utf8"));
  const companies = { ...(existing.companies || {}) };
  const updatedCompanies = [];
  const failedCompanies = [];
  const argv = process.argv.slice(2);
  const selectedCompanies = getSelectedCompanies(argv);
  const allowPartial = argv.includes("--allow-partial");
  const expectedDate = getLatestCompletedMarketDate();
  console.log(`最新已收盘的美股交易日：${expectedDate}`);

  for (const company of selectedCompanies) {
    const previous = companies[company.id];
    try {
      const official = await fetchNasdaqClose(company, expectedDate);
      const { daily, source } = await fetchDailyAdjustedSeries(company, expectedDate, official.close, previous?.daily);
      companies[company.id] = {
        ...previous,
        ...(["skhynix", "spacex"].includes(company.id) ? { ticker: company.ticker, currency: "USD" } : {}),
        daily: pruneDailyPrices(daily, company.minDate),
        verifiedCloseDate: expectedDate,
        closeVerificationSource: official.source,
        source,
      };
      updatedCompanies.push(company.id);
      console.log(`已刷新 ${company.ticker}，Nasdaq 收盘价 ${official.close}`);
    } catch (error) {
      if (previous?.verifiedCloseDate === expectedDate && getLatestPriceDate(previous.daily) === expectedDate) {
        console.warn(`${company.ticker} 保留已核验的 ${expectedDate} 收盘价：${error.message}`);
        continue;
      }
      failedCompanies.push(company.id);
      console.warn(`跳过 ${company.ticker}，保留已有数据：${error.message}`);
    }
    await sleep(250);
  }

  COMPANY_SOURCES.forEach((company) => {
    if (!company.minDate || !companies[company.id]) return;
    companies[company.id].daily = pruneDailyPrices(companies[company.id].daily, company.minDate);
  });

  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `pending=${failedCompanies.join(", ")}\n`, { flag: "a" });
  }
  if (updatedCompanies.length === 0 && failedCompanies.length === selectedCompanies.length) {
    throw new Error("所有公司股价刷新均失败，未写入 price-data.js");
  }
  if (failedCompanies.length > 0 && !allowPartial) {
    throw new Error(
      `${failedCompanies.length} 家公司股价未通过刷新/新鲜度检查，拒绝写入过期数据：${failedCompanies.join(", ")}`,
    );
  }
  if (updatedCompanies.length === 0) return;

  const latestDates = COMPANY_SOURCES
    .map((company) => getLatestPriceDate(companies[company.id]?.daily))
    .filter(Boolean)
    .sort();

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: "Yahoo Finance chart API; StockAnalysis adjusted-close fallback",
      closeVerificationSource: NASDAQ_HISTORICAL_BASE,
      priceType: "adjusted-close",
      latestCompletedSession: expectedDate,
      latestDateRange: {
        earliest: latestDates[0] || null,
        latest: latestDates.at(-1) || null,
      },
      updatedCompanies,
      failedCompanies,
    },
    companies,
  };

  await writeFile(PRICE_DATA_JS_PATH, formatPriceDataJs(payload), "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
