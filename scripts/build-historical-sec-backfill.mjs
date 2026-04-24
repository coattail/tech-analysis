#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const DATA_JS_PATH = new URL("../data.js", import.meta.url);
const OUTPUT_PATH = new URL("../data/historical-sec-backfill.json", import.meta.url);
const SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_COMPANYFACTS_BASE = "https://data.sec.gov/api/xbrl/companyfacts";
const SEC_SUBMISSIONS_BASE = "https://data.sec.gov/submissions";
const SEC_ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data";
const FALLBACK_CIK_BY_TICKER = {
  AMD: 2488,
  ASML: 937966,
  XOM: 34088,
};
const COMPANY_CIK_OVERRIDE_BY_ID = {
  avgo: [1441634, 1649338, 1730168],
  oracle: [777676, 1341439],
};
const REQUEST_HEADERS = {
  "user-agent": "Codex/tech-analysis yuwan@example.com",
  accept: "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
};
const COMPANY_SOURCES = [
  { id: "nvidia", ticker: "NVDA", slug: "nvda", name: "英伟达" },
  { id: "alphabet", ticker: "GOOGL", slug: "googl", name: "谷歌" },
  { id: "apple", ticker: "AAPL", slug: "aapl", name: "苹果" },
  { id: "microsoft", ticker: "MSFT", slug: "msft", name: "微软" },
  { id: "amazon", ticker: "AMZN", slug: "amzn", name: "亚马逊" },
  { id: "avgo", ticker: "AVGO", slug: "avgo", name: "博通" },
  { id: "meta", ticker: "META", slug: "meta", name: "Meta" },
  { id: "tsmc", ticker: "TSM", slug: "tsm", name: "台积电" },
  { id: "tsla", ticker: "TSLA", slug: "tsla", name: "特斯拉" },
  { id: "walmart", ticker: "WMT", slug: "wmt", name: "沃尔玛" },
  { id: "berkshire", ticker: "BRK.B", slug: "brk.b", name: "伯克希尔" },
  { id: "jpmorgan", ticker: "JPM", slug: "jpm", name: "摩根大通" },
  { id: "lilly", ticker: "LLY", slug: "lly", name: "礼来" },
  { id: "exxon", ticker: "XOM", slug: "xom", name: "埃克森美孚" },
  { id: "visa", ticker: "V", slug: "v", name: "Visa" },
  { id: "asml", ticker: "ASML", slug: "asml", name: "阿斯麦" },
  { id: "micron", ticker: "MU", slug: "mu", name: "美光" },
  { id: "jnj", ticker: "JNJ", slug: "jnj", name: "强生" },
  { id: "oracle", ticker: "ORCL", slug: "orcl", name: "甲骨文" },
  { id: "amd", ticker: "AMD", slug: "amd", name: "AMD" },
  { id: "mastercard", ticker: "MA", slug: "ma", name: "万事达" },
  { id: "costco", ticker: "COST", slug: "cost", name: "好市多" },
  { id: "netflix", ticker: "NFLX", slug: "nflx", name: "奈飞" },
  { id: "bankofamerica", ticker: "BAC", slug: "bac", name: "美国银行" },
  { id: "caterpillar", ticker: "CAT", slug: "cat", name: "卡特彼勒" },
  { id: "chevron", ticker: "CVX", slug: "cvx", name: "雪佛龙" },
  { id: "palantir", ticker: "PLTR", slug: "pltr", name: "Palantir" },
  { id: "cisco", ticker: "CSCO", slug: "csco", name: "思科" },
  { id: "abbvie", ticker: "ABBV", slug: "abbv", name: "艾伯维" },
  { id: "homedepot", ticker: "HD", slug: "hd", name: "家得宝" },
];
const COMPANY_START_OVERRIDES = {
  meta: "2010Q1",
  tsla: "2010Q1",
  abbvie: "2012Q1",
  palantir: "2019Q1",
  avgo: "2009Q4",
};
const COMPANY_END_OVERRIDES = {
  amd: "2009Q1",
  exxon: "2016Q4",
  asml: "2021Q1",
};
const SEC_ALLOWED_FORMS = new Set(["10-Q", "10-K", "20-F", "6-K"]);
const SEC_FIELD_CONCEPTS = {
  revenue: [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "RevenueFromContractsWithCustomers",
    "TotalRevenue",
    "Revenues",
    "Revenue",
    "NetRevenues",
    "NetSales",
    "SalesRevenueNet",
    "OperatingRevenue",
    "OperatingRevenueNet",
    "RevenuesNetOfInterestExpense",
    "RevenuesNetOfInterestExpenseFullTaxEquivalentBasis",
    "SalesRevenueGoodsNet",
    "SalesRevenueServicesNet",
    "InterestRevenueExpenseNet",
  ],
  netIncome: [
    "NetIncomeLoss",
    "ProfitLoss",
    "ProfitLossAttributableToOwnersOfParent",
  ],
  grossProfit: [
    "GrossProfit",
  ],
};
const ROW_ALIASES = {
  revenue: [
    "sales and other operating revenue",
    "sales and other operating revenues",
    "sales and revenues",
    "revenue",
    "revenues",
    "total revenue",
    "total revenues",
    "net revenue",
    "net revenues",
    "total net revenue",
    "total net revenues",
    "net sales",
    "operating revenues",
    "total operating revenue",
    "total operating revenues",
    "sales revenue",
    "operating revenue",
  ],
  costOfRevenue: [
    "cost of revenue",
    "cost of revenues",
    "cost of sales",
    "cost of goods sold",
    "cost of products sold",
    "cost of services",
  ],
  grossProfit: [
    "gross profit",
  ],
  netIncome: [
    "net income",
    "net income loss",
    "profit loss",
    "net earnings",
  ],
};

let secTickerMapCache = null;
const submissionsCache = new Map();

function parseDataJs(rawText) {
  const prefix = "window.FINANCIAL_SOURCE_DATA =";
  const start = rawText.indexOf(prefix);
  if (start < 0) {
    throw new Error("data.js 格式异常：未找到 window.FINANCIAL_SOURCE_DATA");
  }
  return JSON.parse(rawText.slice(start + prefix.length).trim().replace(/;\s*$/, ""));
}

function normalizeTickerForSec(ticker) {
  return String(ticker || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function parsePeriod(period) {
  const match = /^(\d{4})Q([1-4])$/.exec(String(period || ""));
  if (!match) return null;
  return { year: Number(match[1]), quarter: Number(match[2]) };
}

function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function compareDateKeys(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return String(a).localeCompare(String(b));
}

function comparePeriods(a, b) {
  const left = parsePeriod(a);
  const right = parsePeriod(b);
  if (!left && !right) return String(a).localeCompare(String(b));
  if (!left) return 1;
  if (!right) return -1;
  if (left.year !== right.year) return left.year - right.year;
  return left.quarter - right.quarter;
}

function previousPeriod(period) {
  const parsed = parsePeriod(period);
  if (!parsed) return null;
  const quarter = parsed.quarter === 1 ? 4 : parsed.quarter - 1;
  const year = parsed.quarter === 1 ? parsed.year - 1 : parsed.year;
  return `${year}Q${quarter}`;
}

function rewindPeriod(period, steps) {
  let cursor = period;
  for (let index = 0; index < steps; index += 1) {
    cursor = previousPeriod(cursor);
    if (!cursor) break;
  }
  return cursor || period;
}

function periodYear(period) {
  const parsed = parsePeriod(period);
  return parsed?.year ?? null;
}

function calendarQuarterFromDate(dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  let { year, month, day } = parsed;
  if ([1, 4, 7, 10].includes(month) && day >= 1 && day <= 7) {
    month -= 1;
    if (month <= 0) {
      month += 12;
      year -= 1;
    }
  }
  return `${year}Q${Math.floor((month - 1) / 3) + 1}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTextWithRetry(url, expected = "text") {
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, { headers: REQUEST_HEADERS });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return expected === "json" ? await response.text() : await response.text();
    } catch (error) {
      lastError = error;
      await sleep(600 * (attempt + 1));
    }
  }
  throw new Error(`${url} 拉取失败：${lastError?.message || "unknown error"}`);
}

async function fetchJson(url) {
  return JSON.parse(await fetchTextWithRetry(url, "json"));
}

async function getSecTickerMap() {
  if (secTickerMapCache) return secTickerMapCache;
  try {
    const payload = await fetchJson(SEC_COMPANY_TICKERS_URL);
    secTickerMapCache = new Map(
      Object.values(payload || {})
        .filter((entry) => entry && typeof entry === "object" && entry.ticker && Number.isFinite(Number(entry.cik_str)))
        .map((entry) => [normalizeTickerForSec(entry.ticker), Number(entry.cik_str)]),
    );
  } catch (error) {
    secTickerMapCache = new Map();
    Object.entries(FALLBACK_CIK_BY_TICKER).forEach(([ticker, cik]) => {
      secTickerMapCache.set(normalizeTickerForSec(ticker), cik);
    });
    if (secTickerMapCache.size === 0) {
      throw error;
    }
  }
  return secTickerMapCache;
}

function isMoneyUnit(unit) {
  return /^[A-Z]{3}$/.test(String(unit || "").trim());
}

function selectReportingCurrency(companyfacts) {
  const factsPayload = companyfacts?.facts;
  if (!factsPayload || typeof factsPayload !== "object") return null;

  const scores = new Map();
  ["revenue", "netIncome", "grossProfit"].forEach((fieldKey, fieldIndex) => {
    const concepts = SEC_FIELD_CONCEPTS[fieldKey] || [];
    const fieldWeight = concepts.length + 2;

    concepts.forEach((concept, conceptIndex) => {
      const conceptWeight = fieldWeight - conceptIndex;
      Object.values(factsPayload).forEach((namespaceFacts) => {
        if (!namespaceFacts || typeof namespaceFacts !== "object") return;
        const conceptPayload = namespaceFacts[concept];
        if (!conceptPayload || typeof conceptPayload !== "object") return;

        Object.entries(conceptPayload.units || {}).forEach(([unit, values]) => {
          if (!isMoneyUnit(unit) || !Array.isArray(values)) return;
          const validCount = values.filter((item) => {
            if (!item || typeof item !== "object") return false;
            return SEC_ALLOWED_FORMS.has(String(item.form || "")) && item.start && item.end;
          }).length;
          if (!validCount) return;
          scores.set(unit, (scores.get(unit) || 0) + validCount * conceptWeight * (4 - fieldIndex));
        });
      });
    });
  });

  if (scores.size === 0) return null;
  return [...scores.entries()].sort((left, right) => {
    if (left[1] !== right[1]) return right[1] - left[1];
    if (left[0] === "USD" && right[0] !== "USD") return -1;
    if (right[0] === "USD" && left[0] !== "USD") return 1;
    return left[0].localeCompare(right[0]);
  })[0][0];
}

function compareSecFactPriority(left, right) {
  if (!right) return 1;
  if (left.namespacePriority !== right.namespacePriority) return left.namespacePriority - right.namespacePriority;
  if (left.conceptPriority !== right.conceptPriority) return left.conceptPriority - right.conceptPriority;
  if (left.filed !== right.filed) return left.filed > right.filed ? 1 : -1;
  return String(left.accession || "").localeCompare(String(right.accession || ""));
}

function collectAnnualCompanyfactsSeries(companyfacts, reportingCurrency, fieldKey) {
  const factsPayload = companyfacts?.facts;
  if (!factsPayload || typeof factsPayload !== "object") return new Map();

  const series = new Map();
  const concepts = SEC_FIELD_CONCEPTS[fieldKey] || [];
  Object.entries(factsPayload).forEach(([namespace, namespaceFacts]) => {
    if (!namespaceFacts || typeof namespaceFacts !== "object") return;
    concepts.forEach((concept, conceptIndex) => {
      const conceptPayload = namespaceFacts[concept];
      if (!conceptPayload || typeof conceptPayload !== "object") return;
      const values = conceptPayload.units?.[reportingCurrency];
      if (!Array.isArray(values)) return;

      values.forEach((raw) => {
        if (!raw || typeof raw !== "object") return;
        if (!SEC_ALLOWED_FORMS.has(String(raw.form || ""))) return;
        if (!raw.start || !raw.end) return;
        const value = Number(raw.val);
        if (!Number.isFinite(value)) return;
        const spanDays = Math.round((new Date(`${raw.end}T00:00:00Z`) - new Date(`${raw.start}T00:00:00Z`)) / 86400000) + 1;
        if (spanDays < 300 || spanDays > 390) return;

        const period = calendarQuarterFromDate(String(raw.end));
        if (!period) return;

        const candidate = {
          period,
          value,
          filed: String(raw.filed || ""),
          accession: String(raw.accn || ""),
          namespacePriority: namespace === "us-gaap" ? 20 : namespace === "ifrs-full" ? 18 : 0,
          conceptPriority: concepts.length - conceptIndex,
          dateKey: String(raw.end),
        };
        if (candidate.namespacePriority <= 0) return;

        const current = series.get(period);
        if (!current || compareSecFactPriority(candidate, current) > 0) {
          series.set(period, candidate);
        }
      });
    });
  });

  return series;
}

async function getSubmissionRecords(cik) {
  const cacheKey = String(cik);
  if (submissionsCache.has(cacheKey)) return submissionsCache.get(cacheKey);

  const submissions = await fetchJson(`${SEC_SUBMISSIONS_BASE}/CIK${String(cik).padStart(10, "0")}.json`);
  const records = [];
  const recent = submissions?.filings?.recent || {};
  const forms = recent.form || [];
  const accessions = recent.accessionNumber || [];
  const filingDates = recent.filingDate || [];
  const documents = recent.primaryDocument || [];

  for (let index = 0; index < forms.length; index += 1) {
    records.push([String(forms[index] || ""), String(accessions[index] || ""), String(filingDates[index] || ""), String(documents[index] || "")]);
  }

  for (const fileEntry of submissions?.filings?.files || []) {
    const name = String(fileEntry?.name || "");
    if (!name) continue;
    const archived = await fetchJson(`${SEC_SUBMISSIONS_BASE}/${name}`);
    for (let index = 0; index < (archived.form || []).length; index += 1) {
      records.push([
        String(archived.form[index] || ""),
        String(archived.accessionNumber[index] || ""),
        String(archived.filingDate[index] || ""),
        String(archived.primaryDocument[index] || ""),
      ]);
    }
  }

  submissionsCache.set(cacheKey, records);
  return records;
}

function normalizeTableKey(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&#160;|&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}

function parseNumber(text) {
  if (text == null) return null;
  let cleaned = String(text)
    .replace(/&#160;|&nbsp;/gi, " ")
    .replace(/[−–—]/g, "-")
    .replace(/\b[a-zA-Z]\b/g, " ")
    .replace(/%/g, "")
    .replace(/,/g, "")
    .replace(/[^0-9().\-]+/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "()") return null;
  const negative = cleaned.startsWith("(") && cleaned.endsWith(")");
  cleaned = cleaned.replace(/^\(|\)$/g, "");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

function extractHtmlTables(htmlText) {
  const tables = [];
  const tableMatches = htmlText.match(/<table\b[\s\S]*?<\/table>/gi) || [];
  tableMatches.forEach((tableHtml) => {
    const rows = [];
    const rowMatches = tableHtml.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
    rowMatches.forEach((rowHtml) => {
      const cells = [];
      for (const match of rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
        let cleaned = match[1]
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&#160;|&nbsp;/gi, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");
        cleaned = cleaned.replace(/\s+/g, " ").trim();
        if (cleaned) cells.push(cleaned);
      }
      const normalizedCells = [];
      cells.forEach((cell) => {
        if ((cell === ")" || cell === "%") && normalizedCells.length > 0) {
          normalizedCells[normalizedCells.length - 1] += cell;
          return;
        }
        normalizedCells.push(cell);
      });
      if (normalizedCells.length > 0) rows.push(normalizedCells);
    });
    if (rows.length > 0) tables.push(rows);
  });
  return tables;
}

function toSearchableText(documentText) {
  return decodeHtmlEntities(
    String(documentText || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>|<\/div>|<\/tr>|<\/li>|<\/h\d>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n"),
  );
}

function quarterPeriodEnd(year, quarter) {
  const month = quarter * 3;
  const day = month === 3 || month === 12 ? 31 : 30;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function quarterFromDateLabel(dateLabel, yearLabel) {
  const monthMatch = String(dateLabel || "").match(/([A-Za-z]{3,9})\s+(\d{1,2})/);
  const yearMatch = String(yearLabel || "").match(/(\d{4})/);
  if (!monthMatch || !yearMatch) return null;

  const monthLookup = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  const month = monthLookup[monthMatch[1].slice(0, 3).toLowerCase()];
  if (!month) return null;

  let year = Number(yearMatch[1]);
  const day = Number(monthMatch[2]);
  let adjustedMonth = month;
  if ([1, 4, 7, 10].includes(adjustedMonth) && day >= 1 && day <= 7) {
    adjustedMonth -= 1;
    if (adjustedMonth <= 0) {
      adjustedMonth += 12;
      year -= 1;
    }
  }
  const quarter = Math.floor((adjustedMonth - 1) / 3) + 1;
  return {
    year,
    quarter,
    dateKey: `${Number(yearMatch[1])}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

function dateLabelToIso(dateLabel) {
  const match = String(dateLabel || "").match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (!match) return null;
  const monthLookup = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  const month = monthLookup[match[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
}

function detectDocumentPeriodEndDate(documentText) {
  const searchableText = toSearchableText(documentText).slice(0, 12000);
  const patterns = [
    /fiscal\s+years\s+ended\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /fiscal\s+year\s+ended\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /years\s+ended\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /year\s+ended\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /quarterly\s+period\s+ended\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /quarter\s+ended\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
  ];
  for (const pattern of patterns) {
    const match = searchableText.match(pattern);
    const iso = dateLabelToIso(match?.[1] || "");
    if (iso) return iso;
  }
  return null;
}

function quarterNumberFromHeaderLabel(cell) {
  const normalized = normalizeTableKey(cell);
  if (normalized.includes("firstquarter")) return 1;
  if (normalized.includes("secondquarter")) return 2;
  if (normalized.includes("thirdquarter")) return 3;
  if (normalized.includes("fourthquarter")) return 4;
  return null;
}

function quarterNumberFromOrdinalLabel(cell) {
  const normalized = normalizeTableKey(cell);
  if (!normalized) return null;
  if (/\bq1\b/.test(String(cell || "").toLowerCase()) || normalized.includes("1st") || normalized.includes("first")) return 1;
  if (/\bq2\b/.test(String(cell || "").toLowerCase()) || normalized.includes("2nd") || normalized.includes("second")) return 2;
  if (/\bq3\b/.test(String(cell || "").toLowerCase()) || normalized.includes("3rd") || normalized.includes("third")) return 3;
  if (/\bq4\b/.test(String(cell || "").toLowerCase()) || normalized.includes("4th") || normalized.includes("fourth")) return 4;
  return null;
}

function detectSpanQuarters(cell) {
  const normalized = normalizeTableKey(cell);
  if (
    normalized.includes("threemonthsended") ||
    normalized.includes("quarterended") ||
    normalized.includes("quartersended") ||
    normalized.includes("fiscalquarterended") ||
    normalized.includes("fiscalquartersended")
  ) {
    return 1;
  }
  if (normalized.includes("sixmonthsended")) {
    return 2;
  }
  if (normalized.includes("ninemonthsended")) {
    return 3;
  }
  if (normalized.includes("yearended") || normalized.includes("twelvemonthsended")) {
    return 4;
  }

  const weekMatch = normalized.match(/(\d+)(?:fiscal)?weeksended/);
  if (!weekMatch) return 0;
  const weeks = Number(weekMatch[1]);
  if (weeks >= 10 && weeks <= 14) return 1;
  if (weeks >= 23 && weeks <= 27) return 2;
  if (weeks >= 35 && weeks <= 40) return 3;
  if (weeks >= 50 && weeks <= 54) return 4;
  return 0;
}

function extractQuarterColumns(rows) {
  const headerRows = rows.slice(0, 10);

  for (const row of headerRows) {
    const directColumns = [];
    row.forEach((cell) => {
      const match = String(cell || "").trim().match(/^Q([1-4])\s+(\d{4})$/);
      if (!match) return;
      directColumns.push({
        period: `${match[2]}Q${match[1]}`,
        dateKey: quarterPeriodEnd(Number(match[2]), Number(match[1])),
        spanQuarters: 1,
      });
    });
    if (directColumns.length > 0) return directColumns;
  }

  for (let index = 0; index < headerRows.length - 1; index += 1) {
    const quarterNumber = (headerRows[index] || [])
      .map((cell) => quarterNumberFromHeaderLabel(cell))
      .find(Boolean);
    if (!quarterNumber) continue;

    const years = (headerRows[index + 1] || [])
      .map((cell) => String(cell || "").match(/(\d{4})/))
      .filter(Boolean)
      .map((match) => Number(match[1]));
    if (years.length < 2) continue;

    return years.slice(0, 2).map((year) => ({
      period: `${year}Q${quarterNumber}`,
      dateKey: quarterPeriodEnd(year, quarterNumber),
      spanQuarters: 1,
    }));
  }

  for (let index = 0; index < headerRows.length - 1; index += 1) {
    let spanQuarters = 0;
    let headerCell = "";
    for (const cell of headerRows[index]) {
      spanQuarters = detectSpanQuarters(cell);
      if (spanQuarters) {
        headerCell = cell;
        break;
      }
    }

    if (!spanQuarters) continue;
    const years = (headerRows[index + 1] || [])
      .map((cell) => String(cell || "").match(/(\d{4})/))
      .filter(Boolean)
      .map((match) => Number(match[1]));
    if (years.length < 2) continue;

    const columns = [];
    years.slice(0, 2).forEach((year) => {
      const parsed = quarterFromDateLabel(headerCell, String(year));
      if (!parsed) return;
      columns.push({
        period: `${parsed.year}Q${parsed.quarter}`,
        dateKey: quarterPeriodEnd(parsed.year, parsed.quarter),
        spanQuarters,
      });
    });
    if (columns.length > 0) return columns;
  }

  for (let index = 0; index < headerRows.length - 1; index += 1) {
    const spanDescriptors = (headerRows[index] || [])
      .map((cell) => {
        const spanQuarters = detectSpanQuarters(cell);
        return spanQuarters ? { spanQuarters } : null;
      })
      .filter(Boolean);
    if (spanDescriptors.length === 0) continue;

    const datedCells = (headerRows[index + 1] || []).filter((cell) => /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/.test(String(cell || "")));
    if (datedCells.length < 2) continue;

    const datesPerGroup = Math.max(1, Math.floor(datedCells.length / spanDescriptors.length));
    const columns = [];
    spanDescriptors.forEach((descriptor, descriptorIndex) => {
      const group = datedCells.slice(descriptorIndex * datesPerGroup, descriptorIndex * datesPerGroup + datesPerGroup);
      group.forEach((cell) => {
        const parsed = quarterFromDateLabel(cell, cell);
        if (!parsed) return;
        columns.push({
          period: `${parsed.year}Q${parsed.quarter}`,
          dateKey: quarterPeriodEnd(parsed.year, parsed.quarter),
          spanQuarters: descriptor.spanQuarters,
        });
      });
    });
    if (columns.length > 0) return columns;
  }

  for (let index = 0; index < headerRows.length - 2; index += 1) {
    const spanDescriptors = (headerRows[index] || [])
      .map((cell) => {
        const spanQuarters = detectSpanQuarters(cell);
        return spanQuarters ? { headerCell: cell, spanQuarters } : null;
      })
      .filter(Boolean);
    if (spanDescriptors.length === 0) continue;

    const dateCells = (headerRows[index + 1] || []).filter((cell) => /[A-Za-z]{3,9}\s+\d{1,2}/.test(String(cell || "")));
    const yearCells = (headerRows[index + 2] || [])
      .map((cell) => String(cell || "").match(/(\d{4})/))
      .filter(Boolean)
      .map((match) => Number(match[1]));

    if (dateCells.length < spanDescriptors.length || yearCells.length < spanDescriptors.length * 2) continue;

    const columns = [];
    spanDescriptors.forEach((descriptor, descriptorIndex) => {
      const dateCell = dateCells[Math.min(descriptorIndex, dateCells.length - 1)];
      const years = yearCells.slice(descriptorIndex * 2, descriptorIndex * 2 + 2);
      years.forEach((year) => {
        const parsed = quarterFromDateLabel(dateCell, String(year));
        if (!parsed) return;
        columns.push({
          period: `${parsed.year}Q${parsed.quarter}`,
          dateKey: quarterPeriodEnd(parsed.year, parsed.quarter),
          spanQuarters: descriptor.spanQuarters,
        });
      });
    });
    if (columns.length > 0) return columns;
  }

  return [];
}

function extractAnnualColumnYears(rows) {
  const headerRows = rows.slice(0, 10);
  for (const row of headerRows) {
    const years = row
      .map((cell) => String(cell || "").trim())
      .filter((cell) => /^\d{4}$/.test(cell))
      .map(Number);
    const uniqueYears = [...new Set(years)];
    if (uniqueYears.length >= 2) {
      return uniqueYears;
    }
  }
  return [];
}

function extractAnnualColumns(rows) {
  const headerRows = rows.slice(0, 10);
  const uniqueColumns = (columns) => {
    const seen = new Set();
    return columns.filter((column) => {
      const key = column.dateKey || String(column.year || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  for (const row of headerRows) {
    const directDates = uniqueColumns(
      row
        .map((cell) => dateLabelToIso(cell))
        .filter(Boolean)
        .map((dateKey) => ({ year: Number(dateKey.slice(0, 4)), dateKey })),
    );
    if (directDates.length >= 2) return directDates;
  }

  for (let index = 0; index < headerRows.length - 1; index += 1) {
    const normalizedHeader = (headerRows[index] || []).join(" ").toLowerCase();
    if (!/(?:fiscal\s+)?(?:year|years|weeks)\s+ended/.test(normalizedHeader)) continue;

    const datedCells = uniqueColumns(
      (headerRows[index + 1] || [])
        .map((cell) => dateLabelToIso(cell))
        .filter(Boolean)
        .map((dateKey) => ({ year: Number(dateKey.slice(0, 4)), dateKey })),
    );
    if (datedCells.length >= 2) return datedCells;

    const yearCells = uniqueColumns(
      (headerRows[index + 1] || [])
        .map((cell) => String(cell || "").match(/(\d{4})/))
        .filter(Boolean)
        .map((match) => ({ year: Number(match[1]), dateKey: null })),
    );
    if (yearCells.length >= 2) return yearCells;
  }

  const annualYears = extractAnnualColumnYears(rows);
  if (annualYears.length >= 2) {
    return annualYears.map((year) => ({ year, dateKey: null }));
  }

  return [];
}

function tableScale(rows) {
  const headerText = rows.slice(0, 10).flat().join(" ").toLowerCase();
  if (headerText.includes("in billions") || headerText.includes("billions")) return 1_000_000_000;
  if (headerText.includes("in millions") || headerText.includes("millions")) return 1_000_000;
  if (
    headerText.includes("in thousands") ||
    headerText.includes("thousands") ||
    /\$?\s*\(?000'?s\)?/.test(headerText) ||
    /\(000\)/.test(headerText)
  ) return 1_000;
  return 1;
}

function inferScaleFromRevenue(values, baseScale) {
  if (baseScale !== 1 || values.length === 0) return baseScale;
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)));
  const hasFractions = values.some((value) => Math.abs(value - Math.round(value)) > 0.000001);
  if (hasFractions) return maxAbs >= 100000 ? 1_000 : 1_000_000;
  if (maxAbs >= 100000000) return 1;
  if (maxAbs >= 10000000) return 1_000;
  if (maxAbs >= 1000000) return 1;
  if (maxAbs >= 100000) return 1_000_000;
  if (maxAbs >= 1000) return 1_000_000;
  if (maxAbs >= 100) return 1_000_000;
  return 1;
}

function tableExtractionPriority(rows) {
  const headerText = rows.slice(0, 8).flat().join(" ").toLowerCase();
  let score = 0;

  if (/condensed consolidated statements? of (income|operations|earnings)/.test(headerText)) score += 60;
  else if (/consolidated statements? of (income|operations|earnings)/.test(headerText)) score += 52;
  else if (/statements? of (income|operations|earnings)/.test(headerText)) score += 40;

  if (/condensed consolidated/.test(headerText)) score += 10;
  else if (/consolidated/.test(headerText)) score += 6;

  if (/guarantor|consolidating/.test(headerText)) score -= 30;
  if (/segment|segments/.test(headerText)) score -= 20;
  if (/percent of|ratios?/.test(headerText)) score -= 60;
  if (/cash flows?/.test(headerText)) score -= 80;
  if (/balance sheets?/.test(headerText)) score -= 80;
  if (/shareholders'? equity/.test(headerText)) score -= 70;

  return score;
}

function scoreAliasMatch(normalizedLabel, normalizedAlias) {
  if (!normalizedLabel || !normalizedAlias) return Number.NEGATIVE_INFINITY;
  if (normalizedLabel === normalizedAlias) return 140;
  if (normalizedLabel.startsWith(normalizedAlias) || normalizedLabel.endsWith(normalizedAlias)) return 110;
  if (normalizedLabel.includes(normalizedAlias)) return 80;
  return Number.NEGATIVE_INFINITY;
}

function fieldSpecificRowPenalty(normalizedLabel, fieldKey) {
  const genericNoisePatterns = [
    "percent",
    "margin",
    "ratio",
    "pershare",
    "share",
    "shares",
    "asset",
    "liabilit",
    "equity",
    "cashflow",
    "cashflows",
  ];
  if (genericNoisePatterns.some((token) => normalizedLabel.includes(token))) return 120;

  if (fieldKey === "revenue") {
    if (["cost", "expense", "income", "profit", "tax", "benefit", "loss"].some((token) => normalizedLabel.includes(token))) return 120;
    if (["segment", "service", "product", "membership", "otherrevenue", "otherrevenues"].some((token) => normalizedLabel.includes(token))) return 45;
  }

  if (fieldKey === "netIncome") {
    if (["operatingincome", "incomebefore", "grossincome", "comprehensiveincome"].some((token) => normalizedLabel.includes(token))) return 80;
  }

  return 0;
}

function findRow(rowMap, fieldKey, expectedCount = 0) {
  const aliases = ROW_ALIASES[fieldKey] || [];
  let bestRow = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const [label, row] of rowMap.entries()) {
    const normalizedLabel = normalizeTableKey(label);
    if (!normalizedLabel) continue;
    if (expectedCount > 0 && rowNumericSeries(row, expectedCount).length !== expectedCount) continue;

    for (const alias of aliases) {
      const normalizedAlias = normalizeTableKey(alias);
      if (!normalizedAlias) continue;
      const matchScore = scoreAliasMatch(normalizedLabel, normalizedAlias);
      if (!Number.isFinite(matchScore)) continue;

      let score = matchScore;
      score -= fieldSpecificRowPenalty(normalizedLabel, fieldKey);
      score -= Math.max(0, normalizedLabel.length - normalizedAlias.length);

      if (fieldKey === "revenue" && normalizedLabel.includes("total")) score += 8;
      if (fieldKey === "revenue" && normalizedLabel.includes("operating")) score += 8;
      if (fieldKey === "netIncome" && normalizedLabel.includes("net")) score += 8;

      if (score > bestScore) {
        bestScore = score;
        bestRow = row;
      }
    }
  }

  return bestRow;
}

function findBerkshireRevenueSeries(rows, expectedCount) {
  if (!Array.isArray(rows) || expectedCount <= 0) return [];

  let inRevenueSection = false;
  let latestSubtotal = [];
  for (const row of rows) {
    const label = normalizeTableKey(row?.[0] || "");
    if (label === "revenues") {
      inRevenueSection = true;
      latestSubtotal = [];
      continue;
    }
    if (!inRevenueSection) continue;
    if (label === "costsandexpenses") break;

    const numeric = rowNumericSeries(row, expectedCount);
    if (numeric.length !== expectedCount) continue;
    latestSubtotal = numeric;
  }

  return latestSubtotal;
}

function rowNumericSeries(row, expectedCount, absolute = false) {
  if (!row || expectedCount <= 0) return [];
  let values = row
    .slice(1)
    .map((cell) => parseNumber(cell))
    .filter((value) => Number.isFinite(value))
    .map((value) => (absolute ? Math.abs(value) : value));

  if (
    values.length >= expectedCount + 1 &&
    Math.abs(values[0] - Math.round(values[0])) < 0.000001 &&
    values[0] >= 0 &&
    values[0] <= 999
  ) {
    const trailingValues = values.slice(1, expectedCount + 1);
    if (
      trailingValues.length > 0 &&
      Math.max(...trailingValues.map((value) => Math.abs(value))) > Math.max(Math.abs(values[0]) * 100, 10000)
    ) {
      values = trailingValues;
    }
  }

  return values.length < expectedCount ? [] : values.slice(0, expectedCount);
}

function findPreferredExactRow(rowMap, labels, expectedCount = 0) {
  for (const preferredLabel of labels) {
    const normalizedPreferred = normalizeTableKey(preferredLabel);
    for (const [label, row] of rowMap.entries()) {
      const normalizedLabel = normalizeTableKey(label);
      if (!normalizedLabel.startsWith(normalizedPreferred)) continue;
      if (expectedCount > 0 && rowNumericSeries(row, expectedCount).length !== expectedCount) continue;
      return row;
    }
  }
  return null;
}

function compareEntryQuality(nextEntry, currentEntry) {
  if (!currentEntry) return 1;
  if ((nextEntry.sourcePriority || 0) !== (currentEntry.sourcePriority || 0)) {
    return (nextEntry.sourcePriority || 0) - (currentEntry.sourcePriority || 0);
  }
  if ((nextEntry.spanQuarters === 1) !== (currentEntry.spanQuarters === 1)) {
    return nextEntry.spanQuarters === 1 ? 1 : -1;
  }
  if (nextEntry.fieldCount !== currentEntry.fieldCount) {
    return nextEntry.fieldCount - currentEntry.fieldCount;
  }
  if (nextEntry.filingDate !== currentEntry.filingDate) {
    return nextEntry.filingDate > currentEntry.filingDate ? 1 : -1;
  }
  return String(nextEntry.sourceUrl || "").localeCompare(String(currentEntry.sourceUrl || ""));
}

function extractEntriesFromTable(rows, filingDate, sourceUrl, companyId = null) {
  const quarterColumns = extractQuarterColumns(rows);
  if (quarterColumns.length === 0) return [];

  const sourcePriority = tableExtractionPriority(rows);
  const rowMap = new Map(rows.filter((row) => row && row.length > 1).map((row) => [row[0], row]));
  const revenueRow = findRow(rowMap, "revenue", quarterColumns.length);
  const netIncomeRow = findRow(rowMap, "netIncome", quarterColumns.length);
  const baseScale = tableScale(rows);
  const revenueSeriesRaw =
    revenueRow ? rowNumericSeries(revenueRow, quarterColumns.length) :
    companyId === "berkshire" ? findBerkshireRevenueSeries(rows, quarterColumns.length) :
    [];
  if (revenueSeriesRaw.length !== quarterColumns.length) return [];
  let scale = inferScaleFromRevenue(revenueSeriesRaw, baseScale);
  if (companyId === "netflix" && baseScale === 1) {
    const maxAbs = Math.max(...revenueSeriesRaw.map((value) => Math.abs(value)));
    if (maxAbs >= 100000 && maxAbs < 1000000) {
      scale = 1_000;
    }
  }

  const costSeries = rowNumericSeries(findRow(rowMap, "costOfRevenue", quarterColumns.length), quarterColumns.length, true);
  const grossSeries = rowNumericSeries(findRow(rowMap, "grossProfit", quarterColumns.length), quarterColumns.length);
  const netIncomeSeries = rowNumericSeries(netIncomeRow, quarterColumns.length);

  return quarterColumns
    .map((column, index) => {
      const revenue = Number.isFinite(revenueSeriesRaw[index]) ? Math.round(revenueSeriesRaw[index] * scale) : null;
      const cost = costSeries.length === quarterColumns.length ? Math.round(costSeries[index] * scale) : null;
      const explicitGross = grossSeries.length === quarterColumns.length ? Math.round(grossSeries[index] * scale) : null;
      const grossProfit =
        Number.isFinite(explicitGross) ? explicitGross :
        Number.isFinite(revenue) && Number.isFinite(cost) ? revenue - cost :
        null;
      const netIncome = netIncomeSeries.length === quarterColumns.length ? Math.round(netIncomeSeries[index] * scale) : null;
      const fieldCount = [revenue, grossProfit, netIncome].filter((value) => Number.isFinite(value)).length;

      if (!Number.isFinite(revenue) || Math.abs(revenue) < 1) return null;
      return {
        period: column.period,
        dateKey: column.dateKey,
        filingDate,
        sourceUrl,
        sourcePriority,
        spanQuarters: column.spanQuarters,
        fieldCount,
        revenue,
        grossProfit,
        netIncome,
      };
    })
    .filter(Boolean);
}

function compareAnnualEntryQuality(nextEntry, currentEntry) {
  if (!currentEntry) return 1;
  if ((nextEntry.sourcePriority || 0) !== (currentEntry.sourcePriority || 0)) {
    return (nextEntry.sourcePriority || 0) - (currentEntry.sourcePriority || 0);
  }
  if ((nextEntry.fieldCount || 0) !== (currentEntry.fieldCount || 0)) {
    return (nextEntry.fieldCount || 0) - (currentEntry.fieldCount || 0);
  }
  if (nextEntry.filed !== currentEntry.filed) {
    return nextEntry.filed > currentEntry.filed ? 1 : -1;
  }
  return String(nextEntry.sourceUrl || "").localeCompare(String(currentEntry.sourceUrl || ""));
}

function extractAnnualEntriesFromTable(rows, filingDate, sourceUrl, companyId = null, documentPeriodEndDate = null) {
  if (!documentPeriodEndDate) return [];
  if (extractQuarterColumns(rows).length > 0) return [];

  const annualColumns = extractAnnualColumns(rows);
  if (annualColumns.length < 2) return [];

  const period = calendarQuarterFromDate(documentPeriodEndDate);
  if (!period) return [];
  const currentYear = Number(documentPeriodEndDate.slice(0, 4));
  let columnIndex = annualColumns.findIndex((column) => column.dateKey === documentPeriodEndDate);
  if (columnIndex < 0) {
    columnIndex = annualColumns.findIndex((column) => column.year === currentYear);
  }
  if (columnIndex < 0) columnIndex = 0;

  const rowMap = new Map(rows.filter((row) => row && row.length > 1).map((row) => [row[0], row]));
  const revenueRow = findRow(rowMap, "revenue", annualColumns.length);
  const netIncomeRow = findRow(rowMap, "netIncome", annualColumns.length);

  const baseScale = tableScale(rows);
  const revenueSeriesRaw =
    revenueRow ? rowNumericSeries(revenueRow, annualColumns.length) :
    companyId === "berkshire" ? findBerkshireRevenueSeries(rows, annualColumns.length) :
    [];
  if (revenueSeriesRaw.length !== annualColumns.length) return [];

  let scale = inferScaleFromRevenue(revenueSeriesRaw, baseScale);
  if (companyId === "netflix" && baseScale === 1) {
    const maxAbs = Math.max(...revenueSeriesRaw.map((value) => Math.abs(value)));
    if (maxAbs >= 100000 && maxAbs < 1000000) {
      scale = 1_000;
    }
  }
  const grossSeries = rowNumericSeries(findRow(rowMap, "grossProfit", annualColumns.length), annualColumns.length);
  const costSeries = rowNumericSeries(findRow(rowMap, "costOfRevenue", annualColumns.length), annualColumns.length, true);
  const netIncomeSeries = rowNumericSeries(netIncomeRow, annualColumns.length);
  const sourcePriority = 60 + tableExtractionPriority(rows);

  const revenue = Number.isFinite(revenueSeriesRaw[columnIndex]) ? Math.round(revenueSeriesRaw[columnIndex] * scale) : null;
  const grossFromRow = grossSeries.length === annualColumns.length ? Math.round(grossSeries[columnIndex] * scale) : null;
  const costFromRow = costSeries.length === annualColumns.length ? Math.round(costSeries[columnIndex] * scale) : null;
  const grossProfit =
    Number.isFinite(grossFromRow) ? grossFromRow :
    Number.isFinite(revenue) && Number.isFinite(costFromRow) ? revenue - costFromRow :
    null;
  const netIncome = netIncomeSeries.length === annualColumns.length ? Math.round(netIncomeSeries[columnIndex] * scale) : null;
  const fieldCount = [revenue, grossProfit, netIncome].filter((value) => Number.isFinite(value)).length;
  if (!Number.isFinite(revenue)) return [];

  return [{
    period,
    dateKey: documentPeriodEndDate,
    filed: filingDate,
    sourceUrl,
    sourcePriority,
    fieldCount,
    revenue,
    grossProfit,
    netIncome,
  }];
}

function extractJnjTextEntries(documentText, filingDate, sourceUrl) {
  const searchableText = toSearchableText(documentText);
  const periodMatch =
    searchableText.match(/quarterly report[^]*?quarterly period ended\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ||
    searchableText.match(/fiscal\s+(?:first|second|third|fourth)\s+quarters?\s+ended\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
  const parsedPeriod = quarterFromDateLabel(periodMatch?.[1] || "", periodMatch?.[1] || "");
  if (!parsedPeriod) return [];

  const quarterWordByNumber = {
    1: "First",
    2: "Second",
    3: "Third",
    4: "Fourth",
  };
  const quarterWord = quarterWordByNumber[parsedPeriod.quarter];
  const statementBlocks = [];
  for (const match of searchableText.matchAll(/CONSOLIDATED STATEMENTS OF EARNINGS/gi)) {
    const start = match.index ?? -1;
    if (start < 0) continue;

    const rest = searchableText.slice(start + 1);
    const nextBoundaryOffset = rest.search(/CONSOLIDATED STATEMENTS OF EARNINGS|CONSOLIDATED STATEMENTS OF CASH FLOWS/i);
    const end = nextBoundaryOffset >= 0 ? start + 1 + nextBoundaryOffset : Math.min(searchableText.length, start + 5000);
    const block = searchableText.slice(start, Math.min(end, start + 5000));
    if (!/Sales\s+to\s+customers/i.test(block) || !/NET EARNINGS/i.test(block)) continue;

    const header = block.slice(0, 800);
    let score = 0;
    if (quarterWord && new RegExp(`Fiscal\\s+${quarterWord}\\s+Quarters?\\s+Ended`, "i").test(header)) score += 6;
    if (/Fiscal Quarters Ended/i.test(header)) score += 4;
    if (/Percent\s+to\s+Sales/i.test(header)) score += 2;
    if (/Fiscal\s+(Six|Nine|Twelve)\s+Months\s+Ended/i.test(header)) score -= 6;
    statementBlocks.push({ block, score });
  }
  statementBlocks.sort((left, right) => right.score - left.score || left.block.length - right.block.length);
  const statementBlock = statementBlocks[0]?.block || searchableText;
  const statementLines = statementBlock
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const extractMetric = (labelPattern) => {
    const labelRegex = new RegExp(labelPattern, "i");
    let pendingLabel = "";

    for (const line of statementLines) {
      const normalizedLine = line.replace(/\s+/g, " ").trim();
      if (!normalizedLine) continue;

      const hasNumeric = /(?:^|[\s$])\(?\d[\d,]*(?:\.\d+)?/.test(normalizedLine);
      if (!hasNumeric) {
        pendingLabel = pendingLabel ? `${pendingLabel} ${normalizedLine}` : normalizedLine;
        continue;
      }

      const combined = pendingLabel ? `${pendingLabel} ${normalizedLine}` : normalizedLine;
      pendingLabel = "";
      if (!labelRegex.test(combined)) continue;

      const match = combined.match(/\$?\s*\(?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.\d+)?|[0-9]{3,}(?:\.\d+)?)/);
      if (!match) return null;
      const rawValue = parseNumber(match[1]);
      return Number.isFinite(rawValue) ? Math.round(rawValue * 1_000_000) : null;
    }

    return null;
  };

  const revenue = extractMetric("Sales\\s+to\\s+customers");
  const grossProfit = extractMetric("Gross\\s+profit");
  const netIncome = extractMetric("^NET\\s+EARNINGS");
  if (![revenue, grossProfit, netIncome].some((value) => Number.isFinite(value))) {
    return [];
  }

  return [{
    period: `${parsedPeriod.year}Q${parsedPeriod.quarter}`,
    dateKey: quarterPeriodEnd(parsedPeriod.year, parsedPeriod.quarter),
    filingDate,
    sourceUrl,
    spanQuarters: 1,
    fieldCount: [revenue, grossProfit, netIncome].filter((value) => Number.isFinite(value)).length,
    revenue,
    grossProfit,
    netIncome,
  }];
}

function extractJnjAnnualTextEntries(documentText, filingDate, sourceUrl) {
  const documentPeriodEndDate = detectDocumentPeriodEndDate(documentText);
  if (!documentPeriodEndDate) return [];

  const searchableText = toSearchableText(documentText);
  const statementMatch = searchableText.match(
    /CONSOLIDATED\s+STATEMENTS?\s+OF\s+EARNINGS[\s\S]{0,2500}?(?:See\s+Notes\s+to\s+Consolidated\s+Financial\s+Statements|CONSOLIDATED\s+STATEMENTS?\s+OF\s+CASH\s+FLOWS|CONSOLIDATED\s+BALANCE\s+SHEETS)/i,
  );
  const statementBlock = statementMatch?.[0] || "";
  if (!statementBlock) return [];

  const revenueMatch = statementBlock.match(/Sales\s+to\s+customers\s+\$?\s*([0-9]{1,3}(?:,[0-9]{3})+)/i);
  const netIncomeMatch = statementBlock.match(/Net\s+earnings\s+\$?\s*([0-9]{1,3}(?:,[0-9]{3})+)/i);
  const revenue = Number.isFinite(parseNumber(revenueMatch?.[1])) ? Math.round(parseNumber(revenueMatch[1]) * 1_000_000) : null;
  const netIncome = Number.isFinite(parseNumber(netIncomeMatch?.[1])) ? Math.round(parseNumber(netIncomeMatch[1]) * 1_000_000) : null;
  if (!Number.isFinite(revenue) && !Number.isFinite(netIncome)) return [];

  return [{
    period: calendarQuarterFromDate(documentPeriodEndDate),
    dateKey: documentPeriodEndDate,
    filed: filingDate,
    sourceUrl,
    sourcePriority: 170,
    fieldCount: [revenue, netIncome].filter((value) => Number.isFinite(value)).length,
    revenue,
    grossProfit: null,
    netIncome,
  }].filter((entry) => entry.period);
}

function extractNetflixEntries(documentText, filingDate, sourceUrl) {
  const buildColumnsFromDateRow = (dateRow, yearRow, spanQuarters) => {
    const year = (yearRow || []).map((cell) => String(cell || "").match(/(\d{4})/)).filter(Boolean).map((match) => Number(match[1]))[0];
    if (!year) return [];
    return (dateRow || [])
      .filter((cell) => /[A-Za-z]{3,9}\s+\d{1,2}/.test(String(cell || "")))
      .map((cell) => {
        const parsed = quarterFromDateLabel(cell, String(year));
        if (!parsed) return null;
        return {
          period: `${parsed.year}Q${parsed.quarter}`,
          dateKey: quarterPeriodEnd(parsed.year, parsed.quarter),
          spanQuarters,
        };
      })
      .filter(Boolean);
  };

  return extractHtmlTables(documentText)
    .flatMap((rows) => {
      const headerText = rows.slice(0, 6).flat().join(" ").toLowerCase();
      const rowMap = new Map(rows.filter((row) => row && row.length > 1).map((row) => [row[0], row]));
      const revenueRow = findPreferredExactRow(rowMap, ["total revenues", "revenues"], 0);
      if (!revenueRow) return [];

      let quarterColumns = [];
      if (
        normalizeTableKey(rows[0]?.[0] || "") === "quarterended" &&
        rows.length >= 3 &&
        !/[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}/.test((rows[1] || []).join(" "))
      ) {
        quarterColumns = buildColumnsFromDateRow(rows[1], rows[2], 1);
      } else if (/statements? of (operations|income)/.test(headerText)) {
        quarterColumns = extractQuarterColumns(rows);
      }
      if (quarterColumns.length === 0) return [];

      const revenueSeriesRaw = rowNumericSeries(revenueRow, quarterColumns.length);
      if (revenueSeriesRaw.length !== quarterColumns.length) return [];

      const grossSeries = rowNumericSeries(findPreferredExactRow(rowMap, ["gross profit"], quarterColumns.length), quarterColumns.length);
      const netIncomeSeries = rowNumericSeries(findPreferredExactRow(rowMap, ["net income", "net income loss"], quarterColumns.length), quarterColumns.length);
      const scale = 1_000;
      const sourcePriority = normalizeTableKey(rows[0]?.[0] || "") === "quarterended" ? 170 : 165;

      return quarterColumns.map((column, index) => {
        const revenue = Math.round(revenueSeriesRaw[index] * scale);
        const grossProfit = grossSeries.length === quarterColumns.length ? Math.round(grossSeries[index] * scale) : null;
        const netIncome = netIncomeSeries.length === quarterColumns.length ? Math.round(netIncomeSeries[index] * scale) : null;
        return {
          period: column.period,
          dateKey: column.dateKey,
          filingDate,
          sourceUrl,
          sourcePriority,
          spanQuarters: column.spanQuarters,
          fieldCount: [revenue, grossProfit, netIncome].filter((value) => Number.isFinite(value)).length,
          revenue,
          grossProfit,
          netIncome,
        };
      });
    })
    .filter((entry) => Number.isFinite(entry?.revenue));
}

function extractJpmorganEntries(documentText, filingDate, sourceUrl) {
  const buildColumns = (yearRow, quarterRow) => {
    const years = (yearRow || [])
      .map((cell) => String(cell || "").match(/(\d{4})/))
      .filter(Boolean)
      .map((match) => Number(match[1]));
    const quarterNumbers = (quarterRow || [])
      .map((cell) => quarterNumberFromOrdinalLabel(cell))
      .filter(Boolean);
    if (years.length === 0 || quarterNumbers.length === 0) return [];
    const quartersPerYear = Math.floor(quarterNumbers.length / years.length);
    if (quartersPerYear <= 0 || quartersPerYear * years.length !== quarterNumbers.length) return [];

    const columns = [];
    years.forEach((year, yearIndex) => {
      quarterNumbers
        .slice(yearIndex * quartersPerYear, yearIndex * quartersPerYear + quartersPerYear)
        .forEach((quarterNumber) => {
          columns.push({
            period: `${year}Q${quarterNumber}`,
            dateKey: quarterPeriodEnd(year, quarterNumber),
            spanQuarters: 1,
          });
        });
    });
    return columns;
  };

  return extractHtmlTables(documentText)
    .flatMap((rows) => {
      const headerText = rows.slice(0, 6).flat().join(" ").toLowerCase();
      if (!headerText.includes("selected income statement data")) return [];

      const quarterColumns = buildColumns(rows[0], rows[1]);
      if (quarterColumns.length === 0) return [];

      const rowMap = new Map(rows.filter((row) => row && row.length > 1).map((row) => [row[0], row]));
      const revenueRow = findPreferredExactRow(rowMap, ["total net revenue"], quarterColumns.length);
      const netIncomeRow = findPreferredExactRow(rowMap, ["net income loss", "net income"], quarterColumns.length);
      const revenueSeriesRaw = rowNumericSeries(revenueRow, quarterColumns.length);
      if (revenueSeriesRaw.length !== quarterColumns.length) return [];
      const netIncomeSeries = rowNumericSeries(netIncomeRow, quarterColumns.length);
      const scale = 1_000_000;

      return quarterColumns.map((column, index) => {
        const revenue = Math.round(revenueSeriesRaw[index] * scale);
        const netIncome = netIncomeSeries.length === quarterColumns.length ? Math.round(netIncomeSeries[index] * scale) : null;
        return {
          period: column.period,
          dateKey: column.dateKey,
          filingDate,
          sourceUrl,
          sourcePriority: 175,
          spanQuarters: 1,
          fieldCount: [revenue, netIncome].filter((value) => Number.isFinite(value)).length,
          revenue,
          grossProfit: null,
          netIncome,
        };
      });
    })
    .filter((entry) => Number.isFinite(entry?.revenue));
}

function extractExxonEntries(documentText, filingDate, sourceUrl) {
  return extractHtmlTables(documentText)
    .flatMap((rows) => {
      const quarterColumns = extractQuarterColumns(rows);
      if (quarterColumns.length === 0) return [];

      const headerText = rows.slice(0, 8).flat().join(" ").toLowerCase();
      if (
        !headerText.includes("statement of income") ||
        !/(three|six|nine)\s+months\s+ended/.test(headerText) ||
        /consolidating|guarantor/.test(headerText)
      ) return [];

      const rowMap = new Map(rows.filter((row) => row && row.length > 1).map((row) => [row[0], row]));
      const revenueRow = findPreferredExactRow(rowMap, [
        "sales and other operating revenue",
        "sales and other operating revenue including sales based taxes",
      ], quarterColumns.length);
      if (!revenueRow) return [];

      const revenueSeriesRaw = rowNumericSeries(revenueRow, quarterColumns.length);
      if (revenueSeriesRaw.length !== quarterColumns.length) return [];

      const netIncomeRow = findPreferredExactRow(rowMap, [
        "net income attributable to exxonmobil",
        "net income including noncontrolling interests",
        "net income",
      ], quarterColumns.length);
      const netIncomeSeries = rowNumericSeries(netIncomeRow, quarterColumns.length);
      const scale = 1_000_000;

      return quarterColumns
        .map((column, index) => {
          const revenue = Number.isFinite(revenueSeriesRaw[index]) ? Math.round(revenueSeriesRaw[index] * scale) : null;
          const netIncome = netIncomeSeries.length === quarterColumns.length ? Math.round(netIncomeSeries[index] * scale) : null;
          if (!Number.isFinite(revenue)) return null;
          return {
            period: column.period,
            dateKey: column.dateKey,
            filingDate,
            sourceUrl,
            sourcePriority: 120,
            spanQuarters: column.spanQuarters,
            fieldCount: [revenue, netIncome].filter((value) => Number.isFinite(value)).length,
            revenue,
            grossProfit: null,
            netIncome,
          };
        })
        .filter(Boolean);
    });
}

function extractExxonAnnualEntries(documentText, filingDate, sourceUrl) {
  const documentPeriodEndDate = detectDocumentPeriodEndDate(documentText);
  if (!documentPeriodEndDate) return [];

  return extractHtmlTables(documentText)
    .flatMap((rows) => {
      if (extractQuarterColumns(rows).length > 0) return [];
      const annualColumns = extractAnnualColumns(rows);
      if (annualColumns.length < 2) return [];

      const headerText = rows.slice(0, 8).flat().join(" ").toLowerCase();
      if (!headerText.includes("statement of income") || /consolidating|guarantor/.test(headerText)) return [];

      const rowMap = new Map(rows.filter((row) => row && row.length > 1).map((row) => [row[0], row]));
      const revenueRow = findPreferredExactRow(rowMap, [
        "sales and other operating revenue",
        "sales and other operating revenue including sales based taxes",
      ], annualColumns.length);
      if (!revenueRow) return [];

      let columnIndex = annualColumns.findIndex((column) => column.dateKey === documentPeriodEndDate);
      if (columnIndex < 0) {
        columnIndex = annualColumns.findIndex((column) => column.year === Number(documentPeriodEndDate.slice(0, 4)));
      }
      if (columnIndex < 0) return [];

      const revenueSeriesRaw = rowNumericSeries(revenueRow, annualColumns.length);
      if (revenueSeriesRaw.length !== annualColumns.length) return [];

      const netIncomeRow = findPreferredExactRow(rowMap, [
        "net income attributable to exxonmobil",
        "net income",
      ], annualColumns.length);
      const netIncomeSeries = rowNumericSeries(netIncomeRow, annualColumns.length);
      const scale = 1_000_000;
      const revenue = Number.isFinite(revenueSeriesRaw[columnIndex]) ? Math.round(revenueSeriesRaw[columnIndex] * scale) : null;
      const netIncome = netIncomeSeries.length === annualColumns.length ? Math.round(netIncomeSeries[columnIndex] * scale) : null;
      if (!Number.isFinite(revenue)) return [];

      return [{
        period: calendarQuarterFromDate(documentPeriodEndDate),
        dateKey: documentPeriodEndDate,
        filed: filingDate,
        sourceUrl,
        sourcePriority: 180,
        fieldCount: [revenue, netIncome].filter((value) => Number.isFinite(value)).length,
        revenue,
        grossProfit: null,
        netIncome,
      }];
    })
    .filter((entry) => entry?.period);
}

function extractEntriesFromDocument(documentText, filingDate, sourceUrl, companyId = null) {
  if (companyId === "exxon") {
    const exxonEntries = extractExxonEntries(documentText, filingDate, sourceUrl);
    if (exxonEntries.length > 0) return exxonEntries;
  }

  if (companyId === "jpmorgan") {
    const jpmEntries = extractJpmorganEntries(documentText, filingDate, sourceUrl);
    if (jpmEntries.length > 0) return jpmEntries;
  }

  if (companyId === "jnj") {
    const jnjEntries = extractJnjTextEntries(documentText, filingDate, sourceUrl);
    if (jnjEntries.length > 0) return jnjEntries;
  }

  if (companyId === "netflix") {
    const netflixEntries = extractNetflixEntries(documentText, filingDate, sourceUrl);
    if (netflixEntries.length > 0) return netflixEntries;
  }

  const htmlEntries = extractHtmlTables(documentText)
    .flatMap((rows) => extractEntriesFromTable(rows, filingDate, sourceUrl, companyId));
  if (htmlEntries.length > 0) return htmlEntries;

  return [];
}

function collectAnnualEntriesFromDocument(documentText, filingDate, sourceUrl, companyId = null) {
  if (companyId === "exxon") {
    const exxonAnnualEntries = extractExxonAnnualEntries(documentText, filingDate, sourceUrl);
    if (exxonAnnualEntries.length > 0) return exxonAnnualEntries;
  }

  if (companyId === "jnj") {
    const jnjAnnualEntries = extractJnjAnnualTextEntries(documentText, filingDate, sourceUrl);
    if (jnjAnnualEntries.length > 0) return jnjAnnualEntries;
  }

  const documentPeriodEndDate = detectDocumentPeriodEndDate(documentText);
  if (!documentPeriodEndDate) return [];
  return extractHtmlTables(documentText)
    .flatMap((rows) => extractAnnualEntriesFromTable(rows, filingDate, sourceUrl, companyId, documentPeriodEndDate));
}

function buildMetricSeries(entries, metricKey) {
  const direct = new Map();
  const cumulative = new Map();

  entries.forEach((entry) => {
    if (!Number.isFinite(entry?.[metricKey])) return;
    const bucket = entry.spanQuarters <= 1 ? direct : cumulative;
    const current = bucket.get(entry.period);
    if (!current || compareEntryQuality(entry, current) > 0) {
      bucket.set(entry.period, entry);
    }
  });

  const derived = new Map(direct);
  let changed = true;
  while (changed) {
    changed = false;
    [...cumulative.values()]
      .sort((left, right) => comparePeriods(left.period, right.period))
      .forEach((entry) => {
        if (derived.has(entry.period)) return;
        const previousPeriods = [];
        let cursor = entry.period;
        for (let index = 0; index < entry.spanQuarters - 1; index += 1) {
          cursor = previousPeriod(cursor);
          if (!cursor) return;
          previousPeriods.unshift(cursor);
        }

        if (previousPeriods.some((period) => !derived.has(period))) return;
        const priorSum = previousPeriods.reduce((sum, period) => sum + (derived.get(period)?.[metricKey] || 0), 0);
        const derivedValue = entry[metricKey] - priorSum;
        if (!Number.isFinite(derivedValue)) return;
        if (metricKey === "revenue" && derivedValue <= 0) return;

        derived.set(entry.period, {
          ...entry,
          spanQuarters: 1,
          [metricKey]: Math.round(derivedValue),
        });
        changed = true;
      });
  }

  return derived;
}

function mergeEntriesIntoRows(entries, minPeriod, maxPeriod, annualRevenueSeries = new Map(), annualNetIncomeSeries = new Map()) {
  const revenueSeries = buildMetricSeries(entries, "revenue");
  const grossProfitSeries = buildMetricSeries(entries, "grossProfit");
  const netIncomeSeries = buildMetricSeries(entries, "netIncome");
  const allPeriods = [...new Set([
    ...revenueSeries.keys(),
    ...grossProfitSeries.keys(),
    ...netIncomeSeries.keys(),
    ...annualRevenueSeries.keys(),
    ...annualNetIncomeSeries.keys(),
  ])]
    .filter((period) => comparePeriods(period, minPeriod) >= 0 && comparePeriods(period, maxPeriod) <= 0)
    .sort(comparePeriods);

  const rowMap = new Map();
  allPeriods.forEach((period) => {
    const revenueEntry = revenueSeries.get(period);
    const grossProfitEntry = grossProfitSeries.get(period);
    const netIncomeEntry = netIncomeSeries.get(period);
    rowMap.set(period, {
      period,
      dateKey: revenueEntry?.dateKey || grossProfitEntry?.dateKey || netIncomeEntry?.dateKey || annualRevenueSeries.get(period)?.dateKey || annualNetIncomeSeries.get(period)?.dateKey || null,
      revenue: revenueEntry?.revenue ?? null,
      grossProfit: grossProfitEntry?.grossProfit ?? null,
      netIncome: netIncomeEntry?.netIncome ?? null,
      grossMarginPct: null,
    });
  });

  const deriveQuarterFromAnnual = (metricKey, annualSeries) => {
    [...annualSeries.entries()]
      .sort((left, right) => comparePeriods(left[0], right[0]))
      .forEach(([period, annualEntry]) => {
        const currentRow = rowMap.get(period);
        if (!currentRow) return;
        if (Number.isFinite(currentRow[metricKey])) return;

        const previousPeriods = [];
        let cursor = period;
        for (let index = 0; index < 3; index += 1) {
          cursor = previousPeriod(cursor);
          if (!cursor) return;
          previousPeriods.unshift(cursor);
        }

        if (previousPeriods.some((item) => !Number.isFinite(rowMap.get(item)?.[metricKey]))) return;
        const previousValues = previousPeriods.map((item) => rowMap.get(item)?.[metricKey]).filter(Number.isFinite);
        const priorSum = previousValues.reduce((sum, value) => sum + value, 0);
        const derivedValue = annualEntry.value - priorSum;
        if (!Number.isFinite(derivedValue)) return;
        if (metricKey === "revenue" && derivedValue <= 0) return;

        if (previousValues.length === 3) {
          if (metricKey === "revenue") {
            const upperNeighbor = Math.max(...previousValues.map((value) => Math.abs(value)));
            const lowerNeighbor = Math.min(...previousValues.map((value) => Math.abs(value)));
            if (upperNeighbor > 0 && (Math.abs(derivedValue) > upperNeighbor * 2.5 || Math.abs(derivedValue) < lowerNeighbor * 0.35)) {
              return;
            }
          }

          if (metricKey === "netIncome") {
            const upperNeighbor = Math.max(...previousValues.map((value) => Math.abs(value)));
            if (upperNeighbor > 0 && Math.abs(derivedValue) > upperNeighbor * 4) {
              return;
            }
          }
        }

        currentRow[metricKey] = Math.round(derivedValue);
        if (!currentRow.dateKey) currentRow.dateKey = annualEntry.dateKey || null;
        rowMap.set(period, currentRow);
      });

    [...annualSeries.entries()]
      .sort((left, right) => compareDateKeys(left[1]?.dateKey || left[0], right[1]?.dateKey || right[0]))
      .forEach(([period, annualEntry]) => {
        const currentRow = rowMap.get(period);
        if (!currentRow) return;
        if (Number.isFinite(currentRow[metricKey])) return;
        if (!annualEntry?.dateKey) return;

        const priorRows = [...rowMap.values()]
          .filter((row) => row.period !== period && row.dateKey && compareDateKeys(row.dateKey, annualEntry.dateKey) < 0 && Number.isFinite(row[metricKey]))
          .sort((left, right) => compareDateKeys(right.dateKey, left.dateKey))
          .slice(0, 3)
          .reverse();
        if (priorRows.length !== 3) return;

        const annualDate = new Date(`${annualEntry.dateKey}T00:00:00Z`);
        const firstPriorDate = new Date(`${priorRows[0].dateKey}T00:00:00Z`);
        const spanDays = Math.round((annualDate - firstPriorDate) / 86400000);
        if (!Number.isFinite(spanDays) || spanDays < 250 || spanDays > 420) return;

        const previousValues = priorRows.map((row) => row[metricKey]).filter(Number.isFinite);
        if (previousValues.length !== 3) return;
        const priorSum = previousValues.reduce((sum, value) => sum + value, 0);
        const derivedValue = annualEntry.value - priorSum;
        if (!Number.isFinite(derivedValue)) return;
        if (metricKey === "revenue" && derivedValue <= 0) return;

        if (metricKey === "revenue") {
          const upperNeighbor = Math.max(...previousValues.map((value) => Math.abs(value)));
          const lowerNeighbor = Math.min(...previousValues.map((value) => Math.abs(value)));
          if (upperNeighbor > 0 && (Math.abs(derivedValue) > upperNeighbor * 2.5 || Math.abs(derivedValue) < lowerNeighbor * 0.35)) {
            return;
          }
        }

        if (metricKey === "netIncome") {
          const upperNeighbor = Math.max(...previousValues.map((value) => Math.abs(value)));
          if (upperNeighbor > 0 && Math.abs(derivedValue) > upperNeighbor * 4) {
            return;
          }
        }

        currentRow[metricKey] = Math.round(derivedValue);
        if (!currentRow.dateKey) currentRow.dateKey = annualEntry.dateKey || null;
        rowMap.set(period, currentRow);
      });
  };

  deriveQuarterFromAnnual("revenue", annualRevenueSeries);

  return [...rowMap.values()]
    .sort((left, right) => comparePeriods(left.period, right.period))
    .map((period) => {
      const revenue = period.revenue;
      const grossProfit = period.grossProfit;
      return {
        period: period.period,
        dateKey: period.dateKey,
        revenue,
        grossProfit,
        netIncome: period.netIncome,
        grossMarginPct:
          Number.isFinite(revenue) && Number.isFinite(grossProfit) && revenue !== 0
            ? (grossProfit / revenue) * 100
            : null,
      };
    })
    .filter((row) => Number.isFinite(row.revenue) || Number.isFinite(row.netIncome) || Number.isFinite(row.grossProfit));
}

function mergeBackfillPayload(existingPayload, nextPayload) {
  if (!existingPayload?.rows?.length) return nextPayload;
  if (!nextPayload?.rows?.length) return existingPayload;

  const rowMap = new Map();
  existingPayload.rows.forEach((row) => rowMap.set(row.period, row));
  nextPayload.rows.forEach((row) => {
    const current = rowMap.get(row.period) || {};
    rowMap.set(row.period, {
      ...current,
      ...row,
      revenue: Number.isFinite(row.revenue) ? row.revenue : current.revenue ?? null,
      grossProfit: Number.isFinite(row.grossProfit) ? row.grossProfit : current.grossProfit ?? null,
      netIncome: Number.isFinite(row.netIncome) ? row.netIncome : current.netIncome ?? null,
      grossMarginPct: Number.isFinite(row.grossMarginPct) ? row.grossMarginPct : current.grossMarginPct ?? null,
    });
  });

  return {
    reportingCurrency: nextPayload.reportingCurrency || existingPayload.reportingCurrency || "USD",
    rows: [...rowMap.values()].sort((left, right) => comparePeriods(left.period, right.period)),
  };
}

function preferredDocumentNames(indexPayload, primaryDocument) {
  const names = (indexPayload?.directory?.item || [])
    .map((item) => String(item?.name || ""))
    .filter(Boolean)
    .filter((name) => /\.(htm|html|txt)$/i.test(name) && !/index/i.test(name) && !/\.(jpg|jpeg|png|gif)$/i.test(name));

  return [...new Set(names)].sort((left, right) => {
    const leftPriority =
      /(?:^|[^a-z0-9])(?:ex|dex)?13(?:[^0-9]|$)|annual|shareholder|financialreport|financial/i.test(left) ? 0 :
      left === primaryDocument ? 1 :
      /ex99|press|earn/i.test(left) ? 2 :
      3;
    const rightPriority =
      /(?:^|[^a-z0-9])(?:ex|dex)?13(?:[^0-9]|$)|annual|shareholder|financialreport|financial/i.test(right) ? 0 :
      right === primaryDocument ? 1 :
      /ex99|press|earn/i.test(right) ? 2 :
      3;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.localeCompare(right);
  }).slice(0, 10);
}

function resolveCompanyCiks(company, tickerMap) {
  const override = COMPANY_CIK_OVERRIDE_BY_ID[company.id];
  if (Array.isArray(override)) {
    return [...new Set(override.map((value) => Number(value)).filter(Number.isFinite))];
  }
  if (Number.isFinite(override)) return [override];
  const cik = tickerMap.get(normalizeTickerForSec(company.ticker));
  return Number.isFinite(cik) ? [cik] : [];
}

async function buildCompanyBackfill(company, currentEarliestPeriod, targetStartPeriod, explicitTargetEndPeriod = null) {
  const targetEndPeriod = explicitTargetEndPeriod || COMPANY_END_OVERRIDES[company.id] || previousPeriod(currentEarliestPeriod);
  if (!targetEndPeriod || comparePeriods(targetEndPeriod, targetStartPeriod) < 0) {
    return { reportingCurrency: "USD", rows: [] };
  }
  const contextStartPeriod = rewindPeriod(targetStartPeriod, 3);

  const tickerMap = await getSecTickerMap();
  const ciks = resolveCompanyCiks(company, tickerMap);
  if (ciks.length === 0) {
    return { reportingCurrency: "USD", rows: [] };
  }

  let reportingCurrency = "USD";
  const annualRevenueSeries = new Map();
  const annualNetIncomeSeries = new Map();
  const entries = [];
  const filingAnnualRevenueSeries = new Map();
  const filingAnnualNetIncomeSeries = new Map();
  const minFilingDate = `${String(periodYear(contextStartPeriod)).padStart(4, "0")}-01-01`;
  const maxFilingDate = `${String(periodYear(targetEndPeriod) + 1).padStart(4, "0")}-12-31`;

  for (const cik of ciks) {
    let companyfacts = null;
    try {
      companyfacts = await fetchJson(`${SEC_COMPANYFACTS_BASE}/CIK${String(cik).padStart(10, "0")}.json`);
    } catch {
      companyfacts = null;
    }

    if (companyfacts) {
      reportingCurrency = selectReportingCurrency(companyfacts) || reportingCurrency || "USD";
      const currentAnnualRevenueSeries = collectAnnualCompanyfactsSeries(companyfacts, reportingCurrency, "revenue");
      const currentAnnualNetIncomeSeries = collectAnnualCompanyfactsSeries(companyfacts, reportingCurrency, "netIncome");

      [...currentAnnualRevenueSeries.entries()].forEach(([period, entry]) => {
        const current = annualRevenueSeries.get(period);
        if (!current || compareAnnualEntryQuality(entry, current) > 0) {
          annualRevenueSeries.set(period, entry);
        }
      });
      [...currentAnnualNetIncomeSeries.entries()].forEach(([period, entry]) => {
        const current = annualNetIncomeSeries.get(period);
        if (!current || compareAnnualEntryQuality(entry, current) > 0) {
          annualNetIncomeSeries.set(period, entry);
        }
      });
    }

    const records = await getSubmissionRecords(cik);
    for (const [form, accession, filingDate, primaryDocument] of records) {
      if (!SEC_ALLOWED_FORMS.has(form)) continue;
      if (filingDate < minFilingDate || filingDate > maxFilingDate) continue;

      const accessionCompact = accession.replace(/-/g, "");
      let indexPayload;
      try {
        indexPayload = await fetchJson(`${SEC_ARCHIVES_BASE}/${cik}/${accessionCompact}/index.json`);
      } catch {
        continue;
      }

      let parsedAny = false;
      for (const name of preferredDocumentNames(indexPayload, primaryDocument)) {
        const sourceUrl = `${SEC_ARCHIVES_BASE}/${cik}/${accessionCompact}/${name}`;
        let htmlText;
        try {
          htmlText = await fetchTextWithRetry(sourceUrl);
        } catch {
          continue;
        }

        const tableEntries = extractEntriesFromDocument(htmlText, filingDate, sourceUrl, company.id)
          .filter((entry) => comparePeriods(entry.period, contextStartPeriod) >= 0 && comparePeriods(entry.period, targetEndPeriod) <= 0);
        const annualEntries = collectAnnualEntriesFromDocument(htmlText, filingDate, sourceUrl, company.id)
          .filter((entry) => comparePeriods(entry.period, contextStartPeriod) >= 0 && comparePeriods(entry.period, targetEndPeriod) <= 0);

        annualEntries.forEach((entry) => {
          if (Number.isFinite(entry.revenue)) {
            const current = filingAnnualRevenueSeries.get(entry.period);
            const candidate = {
              value: entry.revenue,
              dateKey: entry.dateKey,
              filed: entry.filed,
              sourceUrl: entry.sourceUrl,
              sourcePriority: entry.sourcePriority,
              fieldCount: entry.fieldCount,
            };
            if (!current || compareAnnualEntryQuality(candidate, current) > 0) {
              filingAnnualRevenueSeries.set(entry.period, candidate);
            }
          }

          if (Number.isFinite(entry.netIncome)) {
            const current = filingAnnualNetIncomeSeries.get(entry.period);
            const candidate = {
              value: entry.netIncome,
              dateKey: entry.dateKey,
              filed: entry.filed,
              sourceUrl: entry.sourceUrl,
              sourcePriority: entry.sourcePriority,
              fieldCount: entry.fieldCount,
            };
            if (!current || compareAnnualEntryQuality(candidate, current) > 0) {
              filingAnnualNetIncomeSeries.set(entry.period, candidate);
            }
          }
        });

        if (tableEntries.length === 0 && annualEntries.length === 0) continue;
        entries.push(...tableEntries);
        parsedAny = true;
      }

      if (parsedAny) {
        await sleep(120);
      }
    }
  }

  [...filingAnnualRevenueSeries.entries()].forEach(([period, entry]) => {
    const current = annualRevenueSeries.get(period);
    if (!current || compareAnnualEntryQuality(entry, current) > 0) {
      annualRevenueSeries.set(period, entry);
    }
  });
  [...filingAnnualNetIncomeSeries.entries()].forEach(([period, entry]) => {
    const current = annualNetIncomeSeries.get(period);
    if (!current || compareAnnualEntryQuality(entry, current) > 0) {
      annualNetIncomeSeries.set(period, entry);
    }
  });

  return {
    reportingCurrency,
    rows: mergeEntriesIntoRows(entries, contextStartPeriod, targetEndPeriod, annualRevenueSeries, annualNetIncomeSeries)
      .filter((row) => comparePeriods(row.period, targetStartPeriod) >= 0),
  };
}

async function run() {
  const requestedCompanyIds = new Set(
    process.argv
      .slice(2)
      .flatMap((token) => token.split(","))
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean),
  );
  const rawData = await readFile(DATA_JS_PATH, "utf8");
  const data = parseDataJs(rawData);
  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  let output = {
    generatedAt: new Date().toISOString(),
    companies: {},
  };
  try {
    const existingRaw = await readFile(OUTPUT_PATH, "utf8");
    const existing = JSON.parse(existingRaw);
    if (existing?.companies && typeof existing.companies === "object") {
      output = {
        generatedAt: new Date().toISOString(),
        companies: existing.companies,
      };
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  for (const company of COMPANY_SOURCES) {
    const isExplicitlyRequested =
      requestedCompanyIds.size > 0 &&
      (requestedCompanyIds.has(company.id) || requestedCompanyIds.has(company.ticker.toLowerCase()));
    if (requestedCompanyIds.size > 0 && !isExplicitlyRequested) {
      continue;
    }
    const revenueSeries = data?.companies?.[company.id]?.revenue || {};
    const earliestRevenuePeriod = Object.keys(revenueSeries)
      .filter((period) => Number.isFinite(revenueSeries[period]))
      .sort(comparePeriods)[0] || null;
    const latestRevenuePeriod = Object.keys(revenueSeries)
      .filter((period) => Number.isFinite(revenueSeries[period]))
      .sort(comparePeriods)
      .at(-1) || null;
    const targetStartPeriod = COMPANY_START_OVERRIDES[company.id] || "2005Q1";
    const forceRefresh = Boolean(COMPANY_END_OVERRIDES[company.id]);
    const latestMissingPeriod =
      earliestRevenuePeriod && latestRevenuePeriod
        ? (data?.periods || [])
          .filter((period) => comparePeriods(period, earliestRevenuePeriod) >= 0 && comparePeriods(period, latestRevenuePeriod) <= 0)
          .filter((period) => !Number.isFinite(revenueSeries[period]))
          .sort(comparePeriods)
          .at(-1) || null
        : null;
    const explicitTargetEndPeriod = isExplicitlyRequested
      ? [
        output.companies?.[company.id]?.rows?.at(-1)?.period || null,
        latestMissingPeriod,
        COMPANY_END_OVERRIDES[company.id] || null,
        previousPeriod(earliestRevenuePeriod),
      ]
        .filter(Boolean)
        .sort(comparePeriods)
        .at(-1) || null
      : null;
    if (!earliestRevenuePeriod || (comparePeriods(earliestRevenuePeriod, targetStartPeriod) <= 0 && !forceRefresh && !isExplicitlyRequested)) {
      continue;
    }

    console.log(`补抓 ${company.ticker}：${targetStartPeriod} -> ${explicitTargetEndPeriod || COMPANY_END_OVERRIDES[company.id] || previousPeriod(earliestRevenuePeriod)}`);
    const backfill = await buildCompanyBackfill(company, earliestRevenuePeriod, targetStartPeriod, explicitTargetEndPeriod);
    if (backfill.rows.length === 0) {
      console.log("  未解析到可用历史季度");
      continue;
    }

    output.companies[company.id] = mergeBackfillPayload(output.companies[company.id], backfill);
    console.log(`  已补齐 ${backfill.rows.length} 个季度，区间 ${backfill.rows[0].period} -> ${backfill.rows.at(-1).period}`);
    await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    await sleep(200);
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`\n已写入 ${OUTPUT_PATH.pathname}`);
}

run().catch((error) => {
  console.error(`历史回填失败：${error.message}`);
  process.exit(1);
});
