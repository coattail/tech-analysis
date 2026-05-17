#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
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
];

function formatPriceDataJs(data) {
  return `window.STOCK_PRICE_SOURCE_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchDailyAdjustedSeries(company) {
  const endDateUnix = Math.floor(Date.now() / 1000) + 86400;
  const url = new URL(`${YAHOO_CHART_BASE}/${encodeURIComponent(company.ticker)}`);
  url.searchParams.set("period1", String(START_DATE_UNIX));
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
  const companies = {};

  for (const company of COMPANY_SOURCES) {
    companies[company.id] = {
      daily: await fetchDailyAdjustedSeries(company),
    };
    await sleep(250);
  }

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: "Yahoo Finance chart API",
      priceType: "adjusted-close",
    },
    companies,
  };

  await writeFile(PRICE_DATA_JS_PATH, formatPriceDataJs(payload), "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
