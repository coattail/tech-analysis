#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizeYahooChartPayload } = require("../price-refresh-helpers.cjs");

const PRICE_DATA_JS_PATH = new URL("../price-data.js", import.meta.url);
const YAHOO_CHART_BASE = "https://query2.finance.yahoo.com/v8/finance/chart";
const START_DATE_UNIX = Math.floor(Date.UTC(2005, 0, 1) / 1000);

const COMPANY_SOURCES = [
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
  { id: "berkshire", ticker: "BRK-B" },
  { id: "jpmorgan", ticker: "JPM" },
  { id: "lilly", ticker: "LLY" },
  { id: "exxon", ticker: "XOM" },
  { id: "visa", ticker: "V" },
  { id: "asml", ticker: "ASML" },
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
  { id: "samsung", ticker: "005930.KS" },
  { id: "sk-hynix", ticker: "000660.KS" },
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

async function fetchDailyAdjustedSeries(company) {
  const endDateUnix = Math.floor(Date.now() / 1000) + 86400;
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
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`Yahoo Finance 请求失败（${company.ticker}）：${response.status}`);

  const payload = await response.json();
  const daily = normalizeYahooChartPayload(payload);
  if (Object.keys(daily).length === 0) {
    const providerMessage = payload?.chart?.error?.description || "响应缺少日线数据";
    throw new Error(`Yahoo Finance 响应异常（${company.ticker}）：${providerMessage}`);
  }

  return daily;
}

async function main() {
  const existing = parsePriceDataJs(await readFile(PRICE_DATA_JS_PATH, "utf8"));
  const companies = { ...(existing.companies || {}) };
  const updatedCompanies = [];
  const failedCompanies = [];
  const selectedCompanies = getSelectedCompanies(process.argv.slice(2));

  for (const company of selectedCompanies) {
    try {
      companies[company.id] = {
        daily: pruneDailyPrices(await fetchDailyAdjustedSeries(company), company.minDate),
      };
      updatedCompanies.push(company.id);
      console.log(`已刷新 ${company.ticker}`);
    } catch (error) {
      failedCompanies.push(company.id);
      console.warn(`跳过 ${company.ticker}，保留已有数据：${error.message}`);
    }
    await sleep(250);
  }

  COMPANY_SOURCES.forEach((company) => {
    if (!company.minDate || !companies[company.id]) return;
    companies[company.id].daily = pruneDailyPrices(companies[company.id].daily, company.minDate);
  });

  if (updatedCompanies.length === 0) {
    throw new Error("所有公司股价刷新均失败，未写入 price-data.js");
  }

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: "Yahoo Finance chart API",
      priceType: "adjusted-close",
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
