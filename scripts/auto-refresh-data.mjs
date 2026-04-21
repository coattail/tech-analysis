#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const DATA_JS_PATH = new URL("../data.js", import.meta.url);
const STOCK_ANALYSIS_BASE = "https://stockanalysis.com/stocks";
const execFileAsync = promisify(execFile);
const REQUEST_HEADERS = {
  "user-agent": "Tech-Analysis-AutoUpdater/1.0 (+https://github.com/coattail/tech-analysis)",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
};

const COMPANY_SOURCES = [
  { id: "apple", ticker: "AAPL", slug: "aapl", name: "苹果" },
  { id: "microsoft", ticker: "MSFT", slug: "msft", name: "微软" },
  { id: "alphabet", ticker: "GOOGL", slug: "googl", name: "谷歌" },
  { id: "amazon", ticker: "AMZN", slug: "amzn", name: "亚马逊" },
  { id: "meta", ticker: "META", slug: "meta", name: "Meta" },
  { id: "nvidia", ticker: "NVDA", slug: "nvda", name: "英伟达" },
  { id: "tsmc", ticker: "TSM", slug: "tsm", name: "台积电" },
  { id: "avgo", ticker: "AVGO", slug: "avgo", name: "博通" },
  { id: "tsla", ticker: "TSLA", slug: "tsla", name: "特斯拉" },
];

const FORECAST_KEYS = ["revenue", "netIncome", "grossMargin", "pe", "roe", "revenueGrowth"];
const FX_SERIES_CONFIG = {
  TWD: {
    seriesId: "DEXTAUS",
    quoteMode: "local_per_usd",
    label: "FRED DEXTAUS (TWD per USD)",
  },
};
const TSMC_OFFICIAL_QUARTERLY_OVERRIDES = {
  // Source: TSMC Quarterly Results / Management Report (official IR pages).
  // Values are reported in NT$ billions and US$ billions.
  "2024Q4": { revenueUsdBillions: 26.88, revenueTwdBillions: 868.46, netIncomeTwdBillions: 374.68, grossMarginPct: 59.0 },
  "2025Q1": { revenueUsdBillions: 25.53, revenueTwdBillions: 839.25, netIncomeTwdBillions: 361.56, grossMarginPct: 58.8 },
  "2025Q2": { revenueUsdBillions: 30.07, revenueTwdBillions: 933.79, netIncomeTwdBillions: 398.27, grossMarginPct: 58.6 },
  "2025Q3": { revenueUsdBillions: 33.1, revenueTwdBillions: 989.92, netIncomeTwdBillions: 452.3, grossMarginPct: 59.5 },
  "2025Q4": { revenueUsdBillions: 33.73, revenueTwdBillions: 1046.09, netIncomeTwdBillions: 505.74, grossMarginPct: 62.3 },
};
const fxSeriesCache = new Map();

function resolveCompanyId(token) {
  const normalized = String(token || "").trim().toLowerCase();
  if (!normalized) return null;

  for (const company of COMPANY_SOURCES) {
    if (normalized === company.id) return company.id;
    if (normalized === company.slug) return company.id;
    if (normalized === company.ticker.toLowerCase()) return company.id;
  }

  return null;
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    companyIds: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (token === "--company") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--company 需要传入公司 id，例如 --company nvidia");
      }
      index += 1;
      const ids = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (!options.companyIds) options.companyIds = new Set();
      ids.forEach((id) => {
        const resolved = resolveCompanyId(id);
        if (!resolved) {
          throw new Error(`--company 参数无效：${id}`);
        }
        options.companyIds.add(resolved);
      });
      continue;
    }

    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`未知参数：${token}`);
  }

  return options;
}

function printHelp() {
  console.log(`用法：\n  node scripts/auto-refresh-data.mjs [--dry-run] [--company nvidia,apple]\n\n参数：\n  --dry-run      仅输出更新结果，不写入 data.js\n  --company      仅更新指定公司（可逗号分隔多个，支持 id/ticker/slug）\n  --help, -h     显示帮助`);
}

function parseDataJs(rawText) {
  const prefix = "window.FINANCIAL_SOURCE_DATA =";
  const start = rawText.indexOf(prefix);
  if (start < 0) {
    throw new Error("data.js 格式异常：未找到 window.FINANCIAL_SOURCE_DATA");
  }

  const jsonText = rawText.slice(start + prefix.length).trim().replace(/;\s*$/, "");
  return JSON.parse(jsonText);
}

function formatDataJs(data) {
  return `window.FINANCIAL_SOURCE_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function parsePeriod(period) {
  const match = /^(\d{4})Q([1-4])$/.exec(period);
  if (!match) return null;
  return {
    year: Number(match[1]),
    quarter: Number(match[2]),
  };
}

function isPeriodLabel(period) {
  return parsePeriod(period) !== null;
}

function comparePeriods(a, b) {
  const pa = parsePeriod(a);
  const pb = parsePeriod(b);
  if (!pa && !pb) return String(a).localeCompare(String(b));
  if (!pa) return 1;
  if (!pb) return -1;
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.quarter - pb.quarter;
}

function normalizeForecastList(list) {
  const seen = new Set();
  const valid = [];
  const invalid = [];

  list.forEach((entry) => {
    if (seen.has(entry)) return;
    seen.add(entry);
    if (isPeriodLabel(entry)) {
      valid.push(entry);
    } else {
      invalid.push(entry);
    }
  });

  valid.sort(comparePeriods);
  return [...valid, ...invalid];
}

function toQuarterLabel(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${year}Q${quarter}`;
}

function toQuarterLabelWithFiscalQuarter(dateKey, fiscalQuarterToken) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  const quarterMatch = /^Q([1-4])$/.exec(String(fiscalQuarterToken || ""));
  if (!dateMatch || !quarterMatch) return null;

  let year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const quarter = Number(quarterMatch[1]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(quarter)) return null;

  // For companies with non-calendar fiscal years (e.g. Jan year-end),
  // fiscal Q4 that ends in Jan-Mar belongs to previous calendar year.
  if (quarter === 4 && month <= 3) {
    year -= 1;
  }

  return `${year}Q${quarter}`;
}

function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getQuarterWindowFromDate(dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;

  let startYear = parsed.year;
  let startMonth = parsed.month - 2;
  while (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }

  return {
    start: `${startYear}-${pad2(startMonth)}-01`,
    end: `${parsed.year}-${pad2(parsed.month)}-${pad2(parsed.day)}`,
  };
}

function extractFinancialBlock(html) {
  const match = html.match(/financialData:\{([\s\S]*?)\},map:\[/);
  if (!match) {
    throw new Error("页面结构变化：未找到 financialData 数据块");
  }
  return match[1];
}

function extractArrayRaw(block, key) {
  const regex = new RegExp(`${key}:\\[([^\\]]*)\\]`);
  const match = block.match(regex);
  if (!match) {
    throw new Error(`缺少字段：${key}`);
  }
  return match[1].trim();
}

function parseStringArray(raw) {
  if (!raw) return [];
  return JSON.parse(`[${raw}]`);
}

function parseNumberArray(raw) {
  if (!raw) return [];

  return raw
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => {
      if (token === "null" || token === "undefined" || token === "void 0") {
        return null;
      }
      const value = Number(token);
      return Number.isFinite(value) ? value : null;
    });
}

function extractFinancialSeries(html) {
  const block = extractFinancialBlock(html);
  const dateKeys = parseStringArray(extractArrayRaw(block, "datekey"));
  const fiscalQuarter = parseStringArray(extractArrayRaw(block, "fiscalQuarter"));
  const revenue = parseNumberArray(extractArrayRaw(block, "revenue"));
  const netIncome = parseNumberArray(extractArrayRaw(block, "netinc"));
  const grossMarginRatio = parseNumberArray(extractArrayRaw(block, "grossMargin"));

  const maxLength = Math.min(dateKeys.length, fiscalQuarter.length, revenue.length, netIncome.length, grossMarginRatio.length);
  const rows = [];

  for (let index = 0; index < maxLength; index += 1) {
    const dateKey = dateKeys[index];
    const period = toQuarterLabelWithFiscalQuarter(dateKey, fiscalQuarter[index]) ?? toQuarterLabel(dateKey);
    if (!period) continue;

    rows.push({
      period,
      dateKey,
      revenue: revenue[index],
      netIncome: netIncome[index],
      grossMarginPct: Number.isFinite(grossMarginRatio[index]) ? grossMarginRatio[index] * 100 : null,
    });
  }

  return rows;
}

function extractFinancialCurrency(html) {
  const match = html.match(/curr:\{[^}]*financial:"([A-Z]{3})"/);
  return match ? match[1] : "UNKNOWN";
}

function parseFredDailyCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const rows = [];
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    const commaIndex = line.indexOf(",");
    if (commaIndex < 0) continue;
    const date = line.slice(0, commaIndex).trim();
    const rawValue = line.slice(commaIndex + 1).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (rawValue === "." || rawValue === "") continue;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;
    rows.push({ date, value });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

async function fetchFxSeries(currency) {
  const code = String(currency || "").toUpperCase();
  if (fxSeriesCache.has(code)) return fxSeriesCache.get(code);

  const config = FX_SERIES_CONFIG[code];
  if (!config) return null;

  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${config.seriesId}`;
  const args = [
    "-L",
    "-sS",
    "--fail",
    "--compressed",
    "-H",
    `User-Agent: ${REQUEST_HEADERS["user-agent"]}`,
    "-H",
    `Accept: ${REQUEST_HEADERS.accept}`,
    url,
  ];
  const { stdout } = await execFileAsync("curl", args, { maxBuffer: 10 * 1024 * 1024 });
  const dailyRows = parseFredDailyCsv(stdout);
  if (dailyRows.length === 0) {
    throw new Error(`${code} 汇率数据为空`);
  }

  const series = {
    ...config,
    currency: code,
    dailyRows,
  };
  fxSeriesCache.set(code, series);
  return series;
}

function getQuarterAverageRate(series, dateStart, dateEnd) {
  let sum = 0;
  let count = 0;

  series.dailyRows.forEach((row) => {
    if (row.date < dateStart || row.date > dateEnd) return;
    sum += row.value;
    count += 1;
  });

  if (count === 0) return null;
  return sum / count;
}

function findLatestRateOnOrBefore(series, targetDate) {
  for (let index = series.dailyRows.length - 1; index >= 0; index -= 1) {
    const row = series.dailyRows[index];
    if (row.date <= targetDate) return row.value;
  }
  return null;
}

function convertAmountToUsd(amount, rate, quoteMode) {
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0) return null;
  if (quoteMode === "local_per_usd") {
    return Math.round(amount / rate);
  }
  if (quoteMode === "usd_per_local") {
    return Math.round(amount * rate);
  }
  return null;
}

async function convertRowsToUsd(rows, currencyCode) {
  const series = await fetchFxSeries(currencyCode);
  if (!series) return null;

  const convertedRows = rows.map((row) => {
    const window = getQuarterWindowFromDate(row.dateKey);
    if (!window) {
      throw new Error(`无法解析季度日期：${row.dateKey}`);
    }

    const avgRate =
      getQuarterAverageRate(series, window.start, window.end) ??
      findLatestRateOnOrBefore(series, window.end);
    if (!Number.isFinite(avgRate) || avgRate <= 0) {
      throw new Error(`缺少 ${currencyCode}/USD 汇率：${row.period}`);
    }

    const revenueUsd = Number.isFinite(row.revenue)
      ? convertAmountToUsd(row.revenue, avgRate, series.quoteMode)
      : row.revenue;
    const netIncomeUsd = Number.isFinite(row.netIncome)
      ? convertAmountToUsd(row.netIncome, avgRate, series.quoteMode)
      : row.netIncome;

    return {
      ...row,
      revenue: revenueUsd,
      netIncome: netIncomeUsd,
    };
  });

  return {
    rows: convertedRows,
    fxLabel: series.label,
  };
}

function applyTsmcOfficialOverrides(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { rows: rows || [], appliedPeriods: [] };
  }

  const appliedPeriods = [];
  const nextRows = rows.map((row) => {
    const override = TSMC_OFFICIAL_QUARTERLY_OVERRIDES[row.period];
    if (!override) return row;

    const impliedRate = override.revenueTwdBillions / override.revenueUsdBillions;
    if (!Number.isFinite(impliedRate) || impliedRate <= 0) return row;

    appliedPeriods.push(row.period);
    const nextRow = {
      ...row,
      revenue: Math.round(override.revenueUsdBillions * 1e9),
      netIncome: Math.round((override.netIncomeTwdBillions / impliedRate) * 1e9),
    };

    if (Number.isFinite(override.grossMarginPct)) {
      nextRow.grossMarginPct = override.grossMarginPct;
    }

    return nextRow;
  });

  return { rows: nextRows, appliedPeriods };
}

function ensureCompanyShape(company) {
  if (!company.revenue || typeof company.revenue !== "object") company.revenue = {};
  if (!company.earnings || typeof company.earnings !== "object") company.earnings = {};
  if (!company.grossMargin || typeof company.grossMargin !== "object") company.grossMargin = {};
  if (!company.revenueGrowth || typeof company.revenueGrowth !== "object") company.revenueGrowth = {};

  if (!company.forecastFlags || typeof company.forecastFlags !== "object") {
    company.forecastFlags = {};
  }

  FORECAST_KEYS.forEach((key) => {
    if (!Array.isArray(company.forecastFlags[key])) {
      company.forecastFlags[key] = [];
    }
  });
}

function setSeriesValue(series, key, value) {
  if (!Number.isFinite(value)) return false;
  const previous = series[key];
  if (typeof previous === "number" && Number.isFinite(previous) && previous === value) {
    return false;
  }
  series[key] = value;
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchCompanyRows(slug) {
  const url = `${STOCK_ANALYSIS_BASE}/${slug}/financials/?p=quarterly`;
  const args = [
    "-L",
    "-sS",
    "--fail",
    "--compressed",
    "-H",
    `User-Agent: ${REQUEST_HEADERS["user-agent"]}`,
    "-H",
    `Accept: ${REQUEST_HEADERS.accept}`,
    "-H",
    `Accept-Language: ${REQUEST_HEADERS["accept-language"]}`,
    "-H",
    `Cache-Control: ${REQUEST_HEADERS["cache-control"]}`,
    url,
  ];
  const { stdout } = await execFileAsync("curl", args, { maxBuffer: 20 * 1024 * 1024 });
  const html = stdout;
  const rows = extractFinancialSeries(html);
  const financialCurrency = extractFinancialCurrency(html);
  return { rows, financialCurrency };
}

function clearForecastFlags(company, metricKey, actualPeriods) {
  const set = new Set(company.forecastFlags[metricKey] || []);
  actualPeriods.forEach((period) => set.delete(period));
  company.forecastFlags[metricKey] = normalizeForecastList([...set]);
}

function buildPeriodIndex(periods) {
  const map = new Map();
  periods.forEach((period, index) => {
    map.set(period, index);
  });
  return map;
}

function recomputeRevenueGrowthForPeriods(company, periods, impactedPeriods) {
  const periodIndex = buildPeriodIndex(periods);
  const revenueForecastFlags = new Set(company.forecastFlags.revenue || []);
  const growthForecastFlags = new Set(company.forecastFlags.revenueGrowth || []);

  impactedPeriods.forEach((period) => {
    const currentIndex = periodIndex.get(period);
    if (currentIndex == null || currentIndex < 4) {
      company.revenueGrowth[period] = null;
      growthForecastFlags.delete(period);
      return;
    }

    const previousPeriod = periods[currentIndex - 4];
    const currentRevenue = company.revenue[period];
    const previousRevenue = company.revenue[previousPeriod];

    if (Number.isFinite(currentRevenue) && Number.isFinite(previousRevenue) && previousRevenue !== 0) {
      company.revenueGrowth[period] = ((currentRevenue - previousRevenue) / Math.abs(previousRevenue)) * 100;
    } else {
      company.revenueGrowth[period] = null;
    }

    const shouldFlag = revenueForecastFlags.has(period) || revenueForecastFlags.has(previousPeriod);
    if (shouldFlag) {
      growthForecastFlags.add(period);
    } else {
      growthForecastFlags.delete(period);
    }
  });

  company.forecastFlags.revenueGrowth = normalizeForecastList([...growthForecastFlags]);
}

function buildImpactedGrowthPeriods(periods, basePeriods) {
  const periodIndex = buildPeriodIndex(periods);
  const impacted = new Set();

  basePeriods.forEach((period) => {
    impacted.add(period);
    const index = periodIndex.get(period);
    if (index == null) return;
    const plusFour = periods[index + 4];
    if (plusFour) impacted.add(plusFour);
  });

  return impacted;
}

function sortObjectByPeriodKeys(series) {
  const entries = Object.entries(series || {});
  entries.sort((a, b) => comparePeriods(a[0], b[0]));
  const next = {};
  entries.forEach(([key, value]) => {
    next[key] = value;
  });
  return next;
}

function updateMeta(data, summary, refreshedAtIso) {
  if (!data.meta || typeof data.meta !== "object") {
    data.meta = {};
  }

  data.meta.generatedAt = refreshedAtIso;

  if (Array.isArray(data.periods) && data.periods.length > 0) {
    data.meta.periodRange = `${data.periods[0]}-${data.periods[data.periods.length - 1]}`;
  }

  data.meta.autoRefresh = {
    source: "StockAnalysis quarterly financials (S&P Global)",
    refreshedAt: refreshedAtIso,
    updatedCompanies: summary.updatedCompanyIds,
    changedPoints: summary.changedPoints,
    changedPeriods: summary.changedPeriods,
  };
}

function summarizeCompanyStats(companyStats) {
  return {
    changedPoints: companyStats.revenueChanges + companyStats.netIncomeChanges + companyStats.grossMarginChanges,
    changedPeriods: [...companyStats.changedPeriods].sort(comparePeriods),
  };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  const selectedCompanies = options.companyIds
    ? COMPANY_SOURCES.filter((company) => options.companyIds.has(company.id))
    : COMPANY_SOURCES;

  if (selectedCompanies.length === 0) {
    throw new Error("未匹配到任何公司，请检查 --company 参数。");
  }

  const rawData = await readFile(DATA_JS_PATH, "utf8");
  const data = parseDataJs(rawData);

  if (!data.companies || typeof data.companies !== "object") {
    throw new Error("data.js 缺少 companies 对象。");
  }

  const periodSet = new Set((Array.isArray(data.periods) ? data.periods : []).filter(isPeriodLabel));
  const growthUpdateByCompany = new Map();
  const summary = {
    updatedCompanyIds: [],
    changedPoints: 0,
    changedPeriods: [],
  };

  for (let index = 0; index < selectedCompanies.length; index += 1) {
    const companySource = selectedCompanies[index];
    const companyData = data.companies[companySource.id];

    if (!companyData) {
      console.warn(`跳过 ${companySource.id}：data.js 中不存在该公司`);
      continue;
    }

    ensureCompanyShape(companyData);
    console.log(`抓取 ${companySource.ticker} (${companySource.name})...`);

    let rows;
    let financialCurrency;
    try {
      const result = await fetchCompanyRows(companySource.slug);
      rows = result.rows;
      financialCurrency = result.financialCurrency;
    } catch (error) {
      console.warn(`  抓取失败：${error.message}`);
      if (index < selectedCompanies.length - 1) await sleep(500);
      continue;
    }

    if (financialCurrency !== "USD") {
      try {
        const converted = await convertRowsToUsd(rows, financialCurrency);
        if (!converted) {
          console.warn(`  财务口径为 ${financialCurrency}，当前无换算配置，已跳过`);
          if (index < selectedCompanies.length - 1) await sleep(500);
          continue;
        }
        rows = converted.rows;
        console.log(`  已完成 ${financialCurrency} -> USD 汇率换算（${converted.fxLabel}）`);
      } catch (error) {
        console.warn(`  汇率换算失败：${error.message}`);
        if (index < selectedCompanies.length - 1) await sleep(500);
        continue;
      }
    }

    if (companySource.id === "tsmc") {
      const overridden = applyTsmcOfficialOverrides(rows);
      rows = overridden.rows;
      if (overridden.appliedPeriods.length > 0) {
        console.log(`  已应用台积电官方口径修正：${overridden.appliedPeriods.join(", ")}`);
      }
    }

    if (!rows || rows.length === 0) {
      console.warn("  未拿到季度数据，跳过");
      if (index < selectedCompanies.length - 1) await sleep(500);
      continue;
    }

    const companyStats = {
      revenueChanges: 0,
      netIncomeChanges: 0,
      grossMarginChanges: 0,
      changedPeriods: new Set(),
      revenueActualPeriods: new Set(),
    };

    const revenueActual = new Set();
    const netIncomeActual = new Set();
    const grossMarginActual = new Set();

    rows.forEach((row) => {
      periodSet.add(row.period);

      if (Number.isFinite(row.revenue)) {
        revenueActual.add(row.period);
        const changed = setSeriesValue(companyData.revenue, row.period, row.revenue);
        if (changed) {
          companyStats.revenueChanges += 1;
          companyStats.changedPeriods.add(row.period);
        }
      }

      if (Number.isFinite(row.netIncome)) {
        netIncomeActual.add(row.period);
        const changed = setSeriesValue(companyData.earnings, row.period, row.netIncome);
        if (changed) {
          companyStats.netIncomeChanges += 1;
          companyStats.changedPeriods.add(row.period);
        }
      }

      if (Number.isFinite(row.grossMarginPct)) {
        grossMarginActual.add(row.period);
        const changed = setSeriesValue(companyData.grossMargin, row.period, row.grossMarginPct);
        if (changed) {
          companyStats.grossMarginChanges += 1;
          companyStats.changedPeriods.add(row.period);
        }
      }
    });

    clearForecastFlags(companyData, "revenue", revenueActual);
    clearForecastFlags(companyData, "netIncome", netIncomeActual);
    clearForecastFlags(companyData, "grossMargin", grossMarginActual);

    revenueActual.forEach((period) => companyStats.revenueActualPeriods.add(period));
    growthUpdateByCompany.set(companySource.id, companyStats.revenueActualPeriods);

    companyData.revenue = sortObjectByPeriodKeys(companyData.revenue);
    companyData.earnings = sortObjectByPeriodKeys(companyData.earnings);
    companyData.grossMargin = sortObjectByPeriodKeys(companyData.grossMargin);

    const detail = summarizeCompanyStats(companyStats);
    if (detail.changedPoints > 0) {
      summary.updatedCompanyIds.push(companySource.id);
      summary.changedPoints += detail.changedPoints;
      summary.changedPeriods.push(...detail.changedPeriods);
      console.log(
        `  已更新：${detail.changedPoints} 个数据点，涉及 ${detail.changedPeriods.length} 个季度（${detail.changedPeriods.at(0)} -> ${detail.changedPeriods.at(-1)}）`,
      );
    } else {
      console.log("  无变更");
    }

    if (index < selectedCompanies.length - 1) {
      await sleep(500);
    }
  }

  const sortedPeriods = [...periodSet].sort(comparePeriods);
  data.periods = sortedPeriods;

  growthUpdateByCompany.forEach((revenueActualPeriods, companyId) => {
    if (!revenueActualPeriods || revenueActualPeriods.size === 0) return;
    const companyData = data.companies[companyId];
    if (!companyData) return;
    ensureCompanyShape(companyData);

    const impacted = buildImpactedGrowthPeriods(sortedPeriods, revenueActualPeriods);
    recomputeRevenueGrowthForPeriods(companyData, sortedPeriods, impacted);
    companyData.revenueGrowth = sortObjectByPeriodKeys(companyData.revenueGrowth);
  });

  summary.changedPeriods = [...new Set(summary.changedPeriods)].sort(comparePeriods);
  const nextDataContent = formatDataJs(data);
  const hasDataChanges = nextDataContent !== rawData;

  if (options.dryRun) {
    console.log("\nDry run 模式：未写入 data.js");
    console.log(
      `汇总：更新公司 ${summary.updatedCompanyIds.length} 家，变更点 ${summary.changedPoints} 个，季度 ${summary.changedPeriods.length} 个`,
    );
    return;
  }

  if (!hasDataChanges) {
    console.log("\n未检测到可写入的数据变化，已跳过写入。");
    return;
  }

  const refreshedAtIso = new Date().toISOString();
  updateMeta(data, summary, refreshedAtIso);
  await writeFile(DATA_JS_PATH, formatDataJs(data), "utf8");
  console.log(
    `\n完成写入 data.js：更新公司 ${summary.updatedCompanyIds.length} 家，变更点 ${summary.changedPoints} 个，季度 ${summary.changedPeriods.length} 个`,
  );
}

run().catch((error) => {
  console.error(`自动更新失败：${error.message}`);
  process.exit(1);
});
