#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const DATA_JS_PATH = new URL("../data.js", import.meta.url);
const CURATED_EARNINGS_DATASET_PATH = new URL("../../earnings-image-studio/data/earnings-dataset.json", import.meta.url);
const HISTORICAL_SEC_BACKFILL_PATH = new URL("../data/historical-sec-backfill.json", import.meta.url);
const STOCK_ANALYSIS_BASE = "https://stockanalysis.com/stocks";
const COMPANIES_MARKET_CAP_BASE = "https://companiesmarketcap.com";
const SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_COMPANYFACTS_BASE = "https://data.sec.gov/api/xbrl/companyfacts";
const execFileAsync = promisify(execFile);
const REQUEST_HEADERS = {
  "user-agent": "Tech-Analysis-AutoUpdater/1.0 (+https://github.com/coattail/tech-analysis)",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
};
const SEC_REQUEST_HEADERS = {
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
  { id: "ibm", ticker: "IBM", slug: "ibm", name: "IBM" },
  { id: "sap", ticker: "SAP", slug: "sap", name: "SAP" },
  { id: "crowdstrike", ticker: "CRWD", slug: "crwd", name: "CrowdStrike" },
  { id: "salesforce", ticker: "CRM", slug: "crm", name: "Salesforce" },
  { id: "servicenow", ticker: "NOW", slug: "now", name: "ServiceNow" },
  { id: "datadog", ticker: "DDOG", slug: "ddog", name: "Datadog" },
  { id: "snowflake", ticker: "SNOW", slug: "snow", name: "Snowflake" },
  { id: "cloudflare", ticker: "NET", slug: "net", name: "Cloudflare" },
  { id: "adobe", ticker: "ADBE", slug: "adbe", name: "Adobe" },
  { id: "zoom", ticker: "ZM", slug: "zm", name: "Zoom" },
  { id: "coreweave", ticker: "CRWV", slug: "crwv", name: "CoreWeave" },
  { id: "nebius", ticker: "NBIS", slug: "nbis", name: "Nebius", minPeriod: "2024Q2" },
  {
    id: "chronoscale",
    ticker: "CHRN",
    slug: "chrn",
    name: "ChronoScale",
    minPeriod: "2024Q3",
    replaceThroughPeriod: "2026Q1",
  },
  { id: "sharonai", ticker: "SHAZ", slug: "shaz", name: "SharonAI" },
];

const COMPANIES_MARKET_CAP_SLUGS = {
  alphabet: "alphabet-google",
  avgo: "broadcom",
  meta: "meta-platforms",
  tsla: "tesla",
  berkshire: "berkshire-hathaway",
  jpmorgan: "jp-morgan-chase",
  lilly: "eli-lilly",
  exxon: "exxon-mobil",
  micron: "micron-technology",
  jnj: "johnson-and-johnson",
  bankofamerica: "bank-of-america",
  homedepot: "home-depot",
};

const FORECAST_KEYS = ["revenue", "netIncome", "grossMargin", "pe", "roe", "revenueGrowth"];
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
  grossProfit: [
    "GrossProfit",
  ],
  costOfRevenue: [
    "CostOfRevenue",
    "CostOfGoodsAndServicesSold",
    "CostOfGoodsSold",
    "CostOfGoodsAndServiceExcludingDepreciationDepletionAndAmortization",
    "CostOfProducts",
    "CostOfSales",
    "CostOfRevenues",
    "CostOfProductsAndServices",
  ],
  netIncome: [
    "NetIncomeLoss",
    "ProfitLoss",
    "ProfitLossAttributableToOwnersOfParent",
    "NetIncomeLossAvailableToCommonStockholdersBasic",
  ],
  netAssets: [
    "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    "StockholdersEquity",
    "PartnersCapitalIncludingPortionAttributableToNoncontrollingInterest",
    "PartnersCapital",
  ],
};
const FX_SERIES_CONFIG = {
  EUR: {
    seriesId: "DEXUSEU",
    quoteMode: "usd_per_local",
    label: "FRED DEXUSEU (USD per EUR)",
  },
  TWD: {
    seriesId: "DEXTAUS",
    quoteMode: "local_per_usd",
    label: "FRED DEXTAUS (TWD per USD)",
  },
};
const TSMC_OFFICIAL_QUARTERLY_OVERRIDES = {
  // Source: TSMC Quarterly Results / Management Report (official IR pages).
  // Values are reported in NT$ billions and US$ billions.
  // 2004Q4 USD conversion uses the FRED DEXTAUS quarter-average rate (31.378 TWD/USD).
  "2004Q4": {
    revenueUsdBillions: 63.87 / 31.378,
    revenueTwdBillions: 63.87,
    netIncomeTwdBillions: 22.18,
    grossMarginPct: 42.5,
  },
  "2024Q4": { revenueUsdBillions: 26.88, revenueTwdBillions: 868.46, netIncomeTwdBillions: 374.68, grossMarginPct: 59.0 },
  "2025Q1": { revenueUsdBillions: 25.53, revenueTwdBillions: 839.25, netIncomeTwdBillions: 361.56, grossMarginPct: 58.8 },
  "2025Q2": { revenueUsdBillions: 30.07, revenueTwdBillions: 933.79, netIncomeTwdBillions: 398.27, grossMarginPct: 58.6 },
  "2025Q3": { revenueUsdBillions: 33.1, revenueTwdBillions: 989.92, netIncomeTwdBillions: 452.3, grossMarginPct: 59.5 },
  "2025Q4": { revenueUsdBillions: 33.73, revenueTwdBillions: 1046.09, netIncomeTwdBillions: 505.74, grossMarginPct: 62.3 },
  "2026Q2": { revenueUsdBillions: 40.201, revenueTwdBillions: 1270.381, netIncomeTwdBillions: 706.562, grossMarginPct: 67.7 },
};
const COMPANY_OFFICIAL_QUARTERLY_OVERRIDES = {
  nvidia: {
    // NVIDIA FY2006-FY2009 Forms 10-K quarterly summaries. Values are GAAP
    // Revenue and Net income, replacing annual averages and an incorrect FY2009 Q1 plug.
    "2005Q1": { revenue: 583_846_000, earnings: 65_522_000, periodEndDate: "2005-04-30" },
    "2005Q2": { revenue: 574_812_000, earnings: 73_833_000, periodEndDate: "2005-07-30" },
    "2005Q3": { revenue: 583_415_000, earnings: 64_447_000, periodEndDate: "2005-10-29" },
    "2005Q4": { revenue: 633_614_000, earnings: 97_374_000, periodEndDate: "2006-01-29" },
    "2006Q1": { revenue: 681_807_000, earnings: 92_064_000, periodEndDate: "2006-04-30" },
    "2006Q2": { revenue: 687_519_000, earnings: 86_753_000, periodEndDate: "2006-07-30" },
    "2006Q3": { revenue: 820_572_000, earnings: 106_511_000, periodEndDate: "2006-10-29" },
    "2006Q4": { revenue: 878_873_000, earnings: 163_506_000, periodEndDate: "2007-01-28" },
    "2007Q1": { revenue: 844_280_000, earnings: 132_259_000, periodEndDate: "2007-04-29" },
    "2007Q2": { revenue: 935_253_000, earnings: 172_732_000, periodEndDate: "2007-07-29" },
    "2007Q3": { revenue: 1_115_597_000, earnings: 235_661_000, periodEndDate: "2007-10-28" },
    "2007Q4": { revenue: 1_202_730_000, earnings: 256_993_000, periodEndDate: "2008-01-27" },
    "2008Q1": { revenue: 1_153_388_000, earnings: 176_805_000, periodEndDate: "2008-04-27" },
  },
  alphabet: {
    // Google 2005-2014 Forms 10-Q/10-K and quarterly earnings tables.
    // These are reported quarterly values, replacing the former annual-total / 4 placeholders.
    "2005Q1": { revenue: 1_256_516_000, earnings: 369_193_000 },
    "2005Q2": { revenue: 1_384_495_000, earnings: 342_814_000 },
    "2005Q3": { revenue: 1_578_456_000, earnings: 381_182_000 },
    "2005Q4": { revenue: 1_919_093_000, earnings: 372_208_000 },
    "2006Q1": { revenue: 2_253_755_000, earnings: 592_291_000 },
    "2006Q2": { revenue: 2_455_991_000, earnings: 721_077_000 },
    "2006Q3": { revenue: 2_689_673_000, earnings: 733_361_000 },
    "2006Q4": { revenue: 3_205_498_000, earnings: 1_030_717_000 },
    "2007Q1": { revenue: 3_663_971_000, earnings: 1_002_162_000 },
    "2007Q2": { revenue: 3_871_985_000, earnings: 925_120_000 },
    "2007Q3": { revenue: 4_231_351_000, earnings: 1_069_989_000 },
    "2007Q4": { revenue: 4_826_679_000, earnings: 1_206_449_000 },
    "2008Q1": { revenue: 5_186_043_000, earnings: 1_307_086_000 },
    "2008Q2": { revenue: 5_367_212_000, earnings: 1_247_391_000 },
    "2008Q3": { revenue: 5_541_391_000, earnings: 1_289_938_000 },
    "2008Q4": { revenue: 5_700_904_000, earnings: 382_443_000 },
    "2009Q1": { revenue: 5_508_990_000, earnings: 1_422_828_000 },
    "2009Q2": { revenue: 5_522_897_000, earnings: 1_484_545_000 },
    "2009Q3": { revenue: 5_944_851_000, earnings: 1_638_975_000 },
    "2009Q4": { revenue: 6_673_825_000, earnings: 1_974_100_000 },
    "2010Q1": { revenue: 6_775_000_000, earnings: 1_955_000_000 },
    "2010Q2": { revenue: 6_820_000_000, earnings: 1_840_000_000 },
    "2010Q3": { revenue: 7_286_000_000, earnings: 2_167_000_000 },
    "2010Q4": { revenue: 8_440_000_000, earnings: 2_543_000_000 },
    "2011Q1": { revenue: 8_575_000_000, earnings: 1_798_000_000 },
    "2011Q2": { revenue: 9_026_000_000, earnings: 2_505_000_000 },
    "2011Q3": { revenue: 9_720_000_000, earnings: 2_729_000_000 },
    "2011Q4": { revenue: 10_584_000_000, earnings: 2_705_000_000 },
    "2012Q1": { revenue: 10_645_000_000, earnings: 2_890_000_000 },
    // Revenue follows the later SEC recast that excludes discontinued Motorola Home operations.
    "2012Q2": { revenue: 10_964_000_000, earnings: 2_785_000_000 },
    "2012Q3": { revenue: 11_525_000_000, earnings: 2_176_000_000 },
    "2012Q4": { revenue: 12_905_000_000, earnings: 2_886_000_000 },
    "2013Q1": { revenue: 12_951_000_000, earnings: 3_346_000_000 },
    "2013Q2": { revenue: 13_107_000_000, earnings: 3_228_000_000 },
    "2013Q3": { revenue: 13_754_000_000, earnings: 2_970_000_000 },
    "2013Q4": { revenue: 15_707_000_000, earnings: 3_376_000_000 },
    "2014Q1": { revenue: 15_420_000_000, earnings: 3_452_000_000 },
    "2014Q2": { revenue: 15_955_000_000, earnings: 3_422_000_000 },
  },
  chronoscale: {
    // Applied Digital Cloud (ChronoScale predecessor) quarterly results.
    // Sources: APLD FY2025 10-K, FY2025/FY2026 10-Q segment and discontinued-operation tables,
    // plus the ChronoScale DEF 14C carve-out financial statements. USD values below are exact.
    "2024Q3": {
      revenue: 25_855_000,
      earnings: -20_159_000,
      grossMargin: ((25_855 - 38_317) / 25_855) * 100,
      periodEndDate: "2024-08-31",
      reportDate: "2024-10-09",
    },
    "2024Q4": {
      revenue: 27_705_000,
      earnings: -10_363_000,
      grossMargin: ((27_705 - 29_700) / 27_705) * 100,
      periodEndDate: "2024-11-30",
      reportDate: "2025-01-14",
    },
    "2025Q1": {
      revenue: 17_754_000,
      earnings: -14_849_000,
      grossMargin: ((17_754 - 23_342) / 17_754) * 100,
      periodEndDate: "2025-02-28",
      reportDate: "2025-04-14",
    },
    "2025Q2": {
      revenue: 13_063_000,
      earnings: -27_358_000,
      grossMargin: ((13_063 - 23_949) / 13_063) * 100,
      netAssets: 76_152_000,
      periodEndDate: "2025-05-31",
      reportDate: "2025-07-30",
    },
    "2025Q3": {
      revenue: 16_718_000,
      earnings: 9_321_000,
      grossMargin: ((16_718 - 3_365) / 16_718) * 100,
      periodEndDate: "2025-08-31",
      reportDate: "2025-10-09",
    },
    "2025Q4": {
      revenue: 18_402_000,
      earnings: 12_113_000,
      grossMargin: ((18_402 - 3_044) / 18_402) * 100,
      netAssets: 98_481_000,
      periodEndDate: "2025-11-30",
      reportDate: "2026-01-08",
    },
    "2026Q1": {
      revenue: 18_087_000,
      earnings: -54_252_000,
      grossMargin: ((18_087 - 6_282) / 18_087) * 100,
      periodEndDate: "2026-02-28",
      reportDate: "2026-04-08",
    },
  },
  sharonai: {
    // SHAZ FY2025 Form 10-K and Q1 2026 Form 10-Q. Q2 is the annual total less
    // the three other disclosed quarters; gross profit follows the same reconciliation.
    "2025Q1": {
      revenue: 325_092,
      earnings: -1_432_580,
      grossMargin: (11_710 / 325_092) * 100,
      netAssets: 28_831_564,
      periodEndDate: "2025-03-31",
      reportDate: "2026-03-31",
    },
    "2025Q2": {
      revenue: 376_985,
      earnings: -2_576_369,
      grossMargin: (-21_281 / 376_985) * 100,
      periodEndDate: "2025-06-30",
      reportDate: "2026-03-31",
    },
    "2025Q3": {
      revenue: 506_747,
      earnings: -1_627_660,
      grossMargin: (134_969 / 506_747) * 100,
      netAssets: -73_407,
      periodEndDate: "2025-09-30",
      reportDate: "2026-03-31",
    },
    "2025Q4": {
      revenue: 357_807,
      earnings: -33_987_300,
      grossMargin: (-24_591 / 357_807) * 100,
      netAssets: -10_148_257,
      periodEndDate: "2025-12-31",
      reportDate: "2026-03-31",
    },
    "2026Q1": {
      revenue: 294_014,
      earnings: -19_915_764,
      grossMargin: (-231_802 / 294_014) * 100,
      netAssets: 88_630_821,
      periodEndDate: "2026-03-31",
      reportDate: "2026-05-15",
    },
  },
  apple: {
    // FY2004 Form 10-K, Note 13 selected quarterly financial information.
    "2004Q3": { earnings: 106_000_000, grossMargin: (634 / 2_350) * 100 },
  },
  amazon: {
    // FY2004 Form 10-K, Note 14 quarterly results.
    "2004Q4": {
      revenue: 2_540_959_000,
      earnings: 346_688_000,
      grossMargin: (544_466 / 2_540_959) * 100,
    },
  },
  tsmc: {
    // TSMC 2004Q4 Form 6-K; TWD values converted at the FRED quarter-average rate.
    "2004Q4": {
      revenue: Math.round((63.87 / 31.378) * 1e9),
      earnings: Math.round((22.18 / 31.378) * 1e9),
      grossMargin: 42.5,
    },
    // TSMC 2Q26 consolidated financial statements, released 2026-07-16.
    "2026Q2": {
      revenue: 40_201_000_000,
      earnings: 22_359_000_000,
      grossMargin: 67.7,
      netAssets: 201_533_000_000,
      periodEndDate: "2026-06-30",
      reportDate: "2026-07-16",
    },
  },
  walmart: {
    // FY2005 Form 10-K exhibit 13, quarter ended January 31, 2005.
    "2005Q1": {
      earnings: 3_164_000_000,
      grossMargin: ((82_216 - 63_723) / 82_216) * 100,
    },
  },
  jpmorgan: {
    // FY2004 Form 10-K selected quarterly financial data.
    "2004Q2": { earnings: -548_000_000 },
    "2004Q3": { earnings: 1_418_000_000 },
    "2004Q4": { earnings: 1_666_000_000 },
  },
  lilly: {
    // FY2004 annual report selected quarterly data.
    "2004Q4": { earnings: -2_400_000, grossMargin: ((3_644.3 - 865.7) / 3_644.3) * 100 },
  },
  ibm: {
    // IBM 2004-2007 annual reports, Selected Quarterly Data (USD millions).
    "2004Q2": { earnings: 1_988_000_000, grossMargin: (8_525 / 23_098) * 100 },
    "2004Q3": { earnings: 1_800_000_000, grossMargin: (8_646 / 23_349) * 100 },
    "2004Q4": { earnings: 3_040_000_000, grossMargin: (10_852 / 27_671) * 100 },
    "2005Q1": { earnings: 1_402_000_000, grossMargin: (8_254 / 22_908) * 100 },
    "2005Q2": { earnings: 1_829_000_000, grossMargin: (8_775 / 22_270) * 100 },
    "2005Q3": { earnings: 1_516_000_000, grossMargin: (8_738 / 21_529) * 100 },
    "2005Q4": { earnings: 3_187_000_000, grossMargin: (10_765 / 24_427) * 100 },
    "2006Q1": { earnings: 1_708_000_000, grossMargin: (8_088 / 20_659) * 100 },
    "2006Q2": { earnings: 2_022_000_000, grossMargin: (9_014 / 21_890) * 100 },
    "2006Q3": { earnings: 2_222_000_000, grossMargin: (9_492 / 22_617) * 100 },
    "2006Q4": { earnings: 3_541_000_000, grossMargin: (11_701 / 26_257) * 100 },
    "2007Q1": { earnings: 1_844_000_000, grossMargin: (8_866 / 22_029) * 100 },
    "2007Q2": { earnings: 2_260_000_000, grossMargin: (9_938 / 23_772) * 100 },
    "2007Q3": { earnings: 2_361_000_000, grossMargin: (9_956 / 24_119) * 100 },
    "2007Q4": { earnings: 3_952_000_000, grossMargin: (12_970 / 28_866) * 100 },
    // IBM 2010/2011 annual reports and fourth-quarter earnings releases (USD).
    // These quarter values bridge SEC CompanyFacts gaps in the fiscal Q4 facts.
    "2010Q4": { revenue: 29_018_000_000, earnings: 5_257_000_000, grossMargin: 49.0 },
    "2011Q4": { revenue: 29_486_000_000, earnings: 5_489_000_000, grossMargin: 49.9 },
    // IBM fourth-quarter 2021 earnings release, continuing-operations basis.
    "2021Q4": { revenue: 16_695_000_000, grossMargin: 56.9 },
  },
  servicenow: {
    // ServiceNow FY2012 Form 10-K quarterly results table (USD thousands).
    "2011Q1": { revenue: 25_212_000, earnings: 2_991_000, grossMargin: (15_998 / 25_212) * 100 },
    "2011Q4": { revenue: 39_178_000, earnings: -6_805_000, grossMargin: (23_187 / 39_178) * 100 },
  },
  salesforce: {
    // Salesforce FY2005-FY2008 Forms 10-K, selected quarterly data (USD thousands).
    "2004Q2": { revenue: 34_839_000, earnings: 437_000, grossMargin: (28_476 / 34_839) * 100 },
    "2004Q3": { revenue: 40_581_000, earnings: 1_170_000, grossMargin: (32_399 / 40_581) * 100 },
    "2004Q4": { revenue: 46_361_000, earnings: 2_153_000, grossMargin: (37_456 / 46_361) * 100 },
    "2005Q1": { revenue: 54_594_000, earnings: 3_586_000, grossMargin: (44_590 / 54_594) * 100 },
    "2005Q2": { revenue: 64_177_000, earnings: 4_380_000, grossMargin: (52_212 / 64_177) * 100 },
    "2005Q3": { revenue: 71_943_000, earnings: 5_040_000, grossMargin: (55_706 / 71_943) * 100 },
    "2005Q4": { revenue: 82_673_000, earnings: 13_097_000, grossMargin: (63_089 / 82_673) * 100 },
    "2006Q1": { revenue: 91_064_000, earnings: 5_957_000, grossMargin: (69_724 / 91_064) * 100 },
    "2006Q2": { revenue: 104_686_000, earnings: -229_000, grossMargin: (80_126 / 104_686) * 100 },
    "2006Q3": { revenue: 118_137_000, earnings: -145_000, grossMargin: (89_006 / 118_137) * 100 },
    "2006Q4": { revenue: 130_053_000, earnings: 339_000, grossMargin: (98_693 / 130_053) * 100 },
    "2007Q1": { revenue: 144_222_000, earnings: 516_000, grossMargin: (110_383 / 144_222) * 100 },
    "2007Q2": { revenue: 162_412_000, earnings: 730_000, grossMargin: (123_245 / 162_412) * 100 },
    "2007Q3": { revenue: 176_579_000, earnings: 3_735_000, grossMargin: (135_167 / 176_579) * 100 },
    "2007Q4": { revenue: 192_803_000, earnings: 6_512_000, grossMargin: (148_522 / 192_803) * 100 },
    "2008Q1": { revenue: 216_906_000, earnings: 7_379_000, grossMargin: (170_175 / 216_906) * 100 },
  },
  sap: {
    // SAP Q2 2009 interim report: IFRS equity attributable to shareholders
    // was EUR 7.269bn; converted at the FRED Q2 2009 average EUR/USD rate.
    "2009Q2": { netAssets: 9_747_292_860 },
  },
  adobe: {
    // Adobe official Q4 releases and annual statements (USD thousands).
    "2004Q4": { revenue: 429_502_000, earnings: 113_501_000, grossMargin: (400_130 / 429_502) * 100 },
    "2005Q4": { revenue: 510_371_000, earnings: 156_251_000, grossMargin: (479_676 / 510_371) * 100 },
    "2006Q4": { revenue: 682_175_000, earnings: 181_855_000, grossMargin: (602_550 / 682_175) * 100 },
    "2007Q4": { revenue: 911_211_000, earnings: 222_208_000, grossMargin: (812_615 / 911_211) * 100 },
  },
  avgo: {
    // Avago FY2009 Q4 official results: GAAP net income was $72 million for
    // the quarter ended Nov. 1, 2009 (reported Dec. 3, 2009).
    "2009Q4": {
      earnings: 72_000_000,
      periodEndDate: "2009-11-01",
      reportDate: "2009-12-03",
    },
    "2014Q3": { revenue: 1_269_000_000 },
    "2015Q2": { revenue: 1_614_000_000 },
    "2015Q3": { revenue: 1_735_000_000 },
  },
  exxon: {
    "2005Q1": { revenue: 79_475_000_000 },
    "2005Q2": { revenue: 86_622_000_000 },
    "2005Q3": { revenue: 96_731_000_000 },
    "2005Q4": { revenue: 96_127_000_000 },
    "2006Q1": { revenue: 86_317_000_000 },
    "2006Q2": { revenue: 96_024_000_000 },
    "2006Q3": { revenue: 96_268_000_000 },
    "2006Q4": { revenue: 86_858_000_000 },
    "2007Q1": { revenue: 84_174_000_000 },
    "2007Q2": { revenue: 95_059_000_000 },
    "2007Q3": { revenue: 99_130_000_000 },
    "2007Q4": { revenue: 111_965_000_000 },
    "2008Q1": { revenue: 113_223_000_000 },
  },
  jnj: {
    // FY2004 annual report selected quarterly financial data.
    "2004Q4": { revenue: 12_752_000_000, earnings: 1_217_000_000, grossMargin: (9_046 / 12_752) * 100 },
    "2005Q4": { revenue: 12_610_000_000, earnings: 2_183_000_000 },
  },
  // Historical net-income backfills below are sourced from company SEC annual-report
  // "Selected/Supplementary/Quarterly Financial Data" tables. Values are reported
  // in millions unless Costco reports in thousands; all values here are USD.
  micron: {
    // FY2005/FY2007-FY2009 Form 10-K quarterly financial information.
    "2004Q3": { revenue: 1_189_200_000, earnings: 93_500_000, grossMargin: (392.6 / 1_189.2) * 100 },
    "2005Q3": { earnings: 43_100_000 },
    "2007Q3": { earnings: -158_000_000 },
    "2007Q4": { earnings: -262_000_000 },
    "2008Q3": { earnings: -344_000_000 },
    "2009Q3": { earnings: -88_000_000 },
  },
  oracle: {
    // FY2026 Q4 earnings release, three months ended May 31, 2026.
    "2026Q2": {
      revenue: 19_184_000_000,
      earnings: 4_304_000_000,
      grossMargin: 65.22623019182652,
      netAssets: 43_056_000_000,
      reportDate: "2026-06-10",
    },
    // FY2009-FY2011 Form 10-K selected quarterly financial data.
    "2008Q3": { earnings: 1_077_000_000 },
    "2008Q4": { earnings: 1_296_000_000 },
    "2009Q1": { earnings: 1_329_000_000 },
    "2009Q2": { earnings: 1_891_000_000 },
    "2009Q3": { earnings: 1_124_000_000 },
    "2009Q4": { earnings: 1_458_000_000 },
    "2010Q1": { earnings: 1_189_000_000 },
    "2010Q2": { earnings: 2_364_000_000 },
    "2010Q3": { earnings: 1_352_000_000 },
    "2010Q4": { earnings: 1_870_000_000 },
    "2011Q1": { earnings: 2_116_000_000 },
    "2011Q2": { earnings: 3_209_000_000 },
  },
  amd: {
    // FY2005/FY2007 Form 10-K selected quarterly financial data.
    "2004Q4": { earnings: -30_000_000, grossMargin: 41.0 },
    "2005Q4": { earnings: 95_588_000 },
    "2007Q4": { earnings: -1_772_000_000 },
  },
  costco: {
    // FY2005/FY2007 Form 10-K quarterly financial data.
    "2004Q2": { grossMargin: ((10_897_239 - 9_540_312) / 10_897_239) * 100 },
    "2004Q3": { earnings: 296_768_000, grossMargin: ((15_139_301 - 13_229_605) / 15_139_301) * 100 },
    "2005Q3": { earnings: 354_699_000 },
    "2007Q3": { earnings: 372_422_000 },
  },
  caterpillar: {
    // FY2005 Form 10-K annual-report quarterly profit table.
    "2004Q2": { revenue: 7_564_000_000, earnings: 566_000_000, grossMargin: (1_559 / 7_564) * 100 },
    "2004Q3": { revenue: 7_649_000_000, earnings: 498_000_000, grossMargin: (1_447 / 7_649) * 100 },
    "2004Q4": { revenue: 8_571_000_000, earnings: 551_000_000, grossMargin: (1_591 / 8_571) * 100 },
    "2005Q4": { earnings: 846_000_000 },
  },
  cisco: {
    // FY2005-FY2007 Form 10-K exhibit 13 supplementary financial data.
    "2004Q3": { earnings: 1_380_000_000, grossMargin: (4_055 / 5_926) * 100 },
    "2005Q3": { earnings: 1_540_000_000 },
    "2006Q3": { earnings: 1_544_000_000 },
    "2007Q3": { earnings: 1_930_000_000 },
  },
  netflix: {
    // FY2004 Form 10-K selected quarterly financial data.
    "2004Q3": { earnings: 18_925_000 },
    "2004Q4": { revenue: 143_893_000, earnings: 5_569_000, grossMargin: (65_451 / 143_893) * 100 },
    "2005Q1": { revenue: 152_446_000 },
    "2005Q2": { revenue: 164_027_000 },
    "2005Q3": { revenue: 172_740_000 },
    "2005Q4": { revenue: 193_000_000 },
    "2007Q1": { revenue: 305_320_000 },
    "2007Q2": { revenue: 303_693_000 },
    "2007Q3": { revenue: 293_972_000 },
    "2007Q4": { revenue: 302_355_000 },
  },
};
const COMPANY_OFFICIAL_HISTORICAL_BACKFILL_PERIODS = {
  // These ASML rows are pinned to the official quarterly US GAAP summaries in
  // data/historical-sec-backfill.json. Reapply them after live SEC/HTML sources
  // so ambiguous auxiliary "net income" rows cannot overwrite the correction.
  asml: new Set([
    "2016Q4",
    "2017Q1", "2017Q2", "2017Q3", "2017Q4",
    "2018Q1", "2018Q2", "2018Q3", "2018Q4",
    "2019Q1", "2019Q2", "2019Q3", "2019Q4",
    "2020Q1", "2020Q2", "2020Q3", "2020Q4",
  ]),
  // Mastercard's 2004 Form 10-K has the only audited quarterly summary for
  // the pre-IPO 2004Q2/Q4 periods, which are needed for 2005 year-over-year growth.
  mastercard: new Set(["2004Q2", "2004Q4"]),
  // Quarterly summaries in the issuers' SEC annual filings provide the missing
  // prior-year observations required to calculate the first displayed 2005 YoY points.
  microsoft: new Set(["2004Q2"]),
  alphabet: new Set(["2004Q2", "2004Q3", "2004Q4"]),
  nvidia: new Set(["2004Q2", "2004Q3", "2004Q4"]),
  exxon: new Set(["2004Q2", "2004Q3", "2004Q4"]),
};
const fxSeriesCache = new Map();
let secTickerMapCache = null;
let curatedQuarterlyDatasetCache = null;
let historicalSecBackfillCache = null;

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

function normalizeTickerForSec(ticker) {
  return String(ticker || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
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

async function fetchJsonWithCurl(url, headers = REQUEST_HEADERS, maxBuffer = 20 * 1024 * 1024) {
  const args = [
    "-L",
    "-sS",
    "--fail",
    "--compressed",
    "--retry",
    "3",
    "--retry-delay",
    "1",
    "--connect-timeout",
    "15",
    "--max-time",
    "45",
  ];

  Object.entries(headers || {}).forEach(([key, value]) => {
    args.push("-H", `${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}: ${value}`);
  });

  args.push(url);

  const { stdout } = await execFileAsync("curl", args, { maxBuffer });
  return JSON.parse(stdout);
}

async function loadCuratedQuarterlyDataset() {
  if (curatedQuarterlyDatasetCache) return curatedQuarterlyDatasetCache;

  const byTicker = new Map();

  let parsed;
  try {
    const raw = await readFile(CURATED_EARNINGS_DATASET_PATH, "utf8");
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`读取本地季度校验数据失败，已跳过：${error.message}`);
    curatedQuarterlyDatasetCache = byTicker;
    return byTicker;
  }

  (parsed?.companies || []).forEach((company) => {
    const ticker = normalizeTickerForSec(company?.ticker);
    if (!ticker || !company?.financials || !Array.isArray(company?.quarters)) return;
    byTicker.set(ticker, company);
  });

  curatedQuarterlyDatasetCache = byTicker;
  return byTicker;
}

async function loadHistoricalSecBackfill() {
  if (historicalSecBackfillCache) return historicalSecBackfillCache;

  try {
    const raw = await readFile(HISTORICAL_SEC_BACKFILL_PATH, "utf8");
    const parsed = JSON.parse(raw);
    historicalSecBackfillCache = parsed?.companies && typeof parsed.companies === "object" ? parsed.companies : {};
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(`读取历史 SEC 回填缓存失败：${error.message}`);
    }
    historicalSecBackfillCache = {};
  }

  return historicalSecBackfillCache;
}

function sanitizeHistoricalBackfillRows(companyId, rows) {
  if (companyId !== "sap") return rows;

  const earlyOfficial = {
    "2004Q3": { revenue: 1_776_000_000, netIncome: 291_000_000 },
    "2005Q1": { revenue: 1_729_000_000, netIncome: 254_000_000 },
    "2005Q2": { revenue: 2_016_000_000, netIncome: 289_000_000 },
    "2005Q3": { revenue: 2_014_000_000, netIncome: 334_000_000 },
    "2006Q4": { revenue: 2_921_000_000, netIncome: 786_000_000 },
    "2007Q1": { revenue: 2_166_000_000, netIncome: 310_000_000 },
    "2007Q2": { revenue: 2_424_000_000, netIncome: 449_000_000 },
    "2018Q1": { revenue: 5_261_000_000, netIncome: 708_000_000 },
    "2019Q1": { netIncome: -108_000_000 },
  };

  return rows.map((row) => {
    const official = earlyOfficial[row.period] || {};
    const candidateRevenue = Number.isFinite(official.revenue) ? official.revenue : row.revenue;
    const candidateNetIncome = Number.isFinite(official.netIncome) ? official.netIncome : row.netIncome;
    const revenue = Number.isFinite(candidateRevenue) && candidateRevenue >= 1_000_000_000 ? candidateRevenue : null;
    const netIncome = Number.isFinite(candidateNetIncome) && Math.abs(candidateNetIncome) <= 10_000_000_000
      ? candidateNetIncome
      : null;
    const grossMarginPct = Number.isFinite(row.grossMarginPct) && row.grossMarginPct >= 0 && row.grossMarginPct <= 100
      ? row.grossMarginPct
      : null;
    return { ...row, revenue, netIncome, grossMarginPct };
  });
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

function daySpanInclusive(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 9999;
  return Math.round((end - start) / 86400000);
}

function addDays(dateKey, days) {
  const base = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return dateKey;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function isIsoDateKey(dateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""));
}

function isMoneyUnit(unit) {
  return /^[A-Z]{3}$/.test(String(unit || "").trim());
}

function secFactRank(fact) {
  const gap = daysBetween(fact.endDate, fact.filed);
  const timely = gap >= 0 && gap <= 210 ? 1 : 0;
  return [
    timely,
    -Math.max(gap, 0),
    fact.namespacePriority,
    fact.conceptPriority,
    fact.filed,
    fact.accession,
  ];
}

function compareRankArrays(a, b) {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (left === right) continue;
    return left > right ? 1 : -1;
  }
  return 0;
}

function betterSecFact(nextFact, currentFact) {
  if (!currentFact) return true;
  return compareRankArrays(secFactRank(nextFact), secFactRank(currentFact)) > 0;
}

function adjustQuarterBoundaryDateParts(year, month, day) {
  if ([1, 4, 7, 10].includes(month) && day >= 1 && day <= 7) {
    let adjustedMonth = month - 1;
    let adjustedYear = year;
    if (adjustedMonth <= 0) {
      adjustedMonth += 12;
      adjustedYear -= 1;
    }
    return { year: adjustedYear, month: adjustedMonth, day };
  }

  return { year, month, day };
}

function calendarQuarterFromDate(dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  const adjusted = adjustQuarterBoundaryDateParts(parsed.year, parsed.month, parsed.day);
  return `${adjusted.year}Q${Math.floor((adjusted.month - 1) / 3) + 1}`;
}

function midpointDateKey(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return endDate;

  const midpointMs = start.getTime() + Math.floor((end.getTime() - start.getTime()) / 2);
  return new Date(midpointMs).toISOString().slice(0, 10);
}

function calendarQuarterFromRange(startDate, endDate) {
  if (startDate && endDate) {
    return calendarQuarterFromDate(midpointDateKey(startDate, endDate));
  }
  return calendarQuarterFromDate(endDate);
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

function cloneSecFact(baseFact, overrides = {}) {
  return {
    ...baseFact,
    ...overrides,
  };
}

function dedupeExactSecFacts(facts) {
  const best = new Map();
  facts.forEach((fact) => {
    const key = `${fact.namespace}|${fact.concept}|${fact.startDate}|${fact.endDate}`;
    const current = best.get(key);
    if (!current || betterSecFact(fact, current)) {
      best.set(key, fact);
    }
  });
  return [...best.values()];
}

function classifySecFactQuarterType(fact) {
  const fiscalPeriod = String(fact.fiscalPeriod || "").toUpperCase();

  if (fiscalPeriod === "FY") {
    // Some first-quarter 10-Q facts are tagged FY in companyfacts. Their
    // duration still identifies them as a single quarter; treating them as an
    // annual fact makes the following year's comparative filing win instead.
    if (fact.daySpan >= 45 && fact.daySpan <= 120) return "direct";
    return fact.daySpan >= 300 && fact.daySpan <= 390 ? "cumulative" : null;
  }

  if (/^Q[1-4]$/.test(fiscalPeriod)) {
    if (fact.daySpan >= 45 && fact.daySpan <= 120) return "direct";
    if (fiscalPeriod !== "Q4" && fact.daySpan >= 121 && fact.daySpan <= 300) return "cumulative";
    return null;
  }

  if (fact.daySpan >= 45 && fact.daySpan <= 120) return "direct";
  if (fact.daySpan >= 121 && fact.daySpan <= 390) return "cumulative";
  return null;
}

function findBestSecCoverageChain(targetFact, facts) {
  const eligibleFacts = facts
    .filter((fact) => fact.endDate < targetFact.endDate && fact.startDate >= targetFact.startDate)
    .sort((left, right) => {
      if (left.startDate !== right.startDate) return left.startDate.localeCompare(right.startDate);
      if (left.endDate !== right.endDate) return right.endDate.localeCompare(left.endDate);
      return compareRankArrays(secFactRank(right), secFactRank(left));
    });

  const factsByStart = new Map();
  eligibleFacts.forEach((fact) => {
    if (!factsByStart.has(fact.startDate)) factsByStart.set(fact.startDate, []);
    factsByStart.get(fact.startDate).push(fact);
  });

  const memo = new Map();

  function pickBestChain(startDate) {
    if (memo.has(startDate)) return memo.get(startDate);

    const candidates = factsByStart.get(startDate) || [];
    let bestChain = null;

    candidates.forEach((fact) => {
      const nextStartDate = addDays(fact.endDate, 1);
      const tailChain = nextStartDate < targetFact.endDate ? pickBestChain(nextStartDate) : [];
      const nextChain = tailChain === null ? [fact] : [fact, ...tailChain];

      if (!bestChain) {
        bestChain = nextChain;
        return;
      }

      const bestLastEnd = bestChain.at(-1)?.endDate || "";
      const nextLastEnd = nextChain.at(-1)?.endDate || "";
      if (nextLastEnd > bestLastEnd) {
        bestChain = nextChain;
      }
    });

    memo.set(startDate, bestChain);
    return bestChain;
  }

  return pickBestChain(targetFact.startDate);
}

function buildSecFieldQuarterSeries(facts) {
  const deduped = dedupeExactSecFacts(facts);
  const direct = new Map();
  const cumulative = new Map();

  deduped
    .slice()
    .sort((left, right) => {
      if (left.endDate !== right.endDate) return left.endDate.localeCompare(right.endDate);
      const spanDiff = left.daySpan - right.daySpan;
      if (spanDiff !== 0) return spanDiff;
      if (left.filed !== right.filed) return left.filed.localeCompare(right.filed);
      return left.conceptPriority - right.conceptPriority;
    })
    .forEach((fact) => {
      const quarterType = classifySecFactQuarterType(fact);
      const target = quarterType === "direct" ? direct : quarterType === "cumulative" ? cumulative : null;
      if (!target) return;
      const current = target.get(fact.endDate);
      if (!current || betterSecFact(fact, current)) {
        target.set(fact.endDate, fact);
      }
    });

  const derived = new Map(direct);
  let changed = true;
  while (changed) {
    changed = false;
    [...cumulative.values()]
      .sort((left, right) => {
        if (left.endDate !== right.endDate) return left.endDate.localeCompare(right.endDate);
        return left.daySpan - right.daySpan;
      })
      .forEach((fact) => {
        const coverageChain = findBestSecCoverageChain(fact, [...derived.values(), ...cumulative.values()]);
        if (!coverageChain || coverageChain.length === 0) return;

        const coveredSorted = coverageChain.slice().sort((left, right) => left.endDate.localeCompare(right.endDate));
        const firstStartDate = coveredSorted[0]?.startDate;
        const lastEndDate = coveredSorted.at(-1)?.endDate;
        if (!firstStartDate || firstStartDate !== fact.startDate || !lastEndDate) return;

        const tailStartDate = addDays(lastEndDate, 1);
        const tailDaySpan = daySpanInclusive(tailStartDate, fact.endDate);
        if (tailDaySpan < 45 || tailDaySpan > 120) return;

        const coveredValue = coveredSorted.reduce((sum, entry) => sum + entry.value, 0);
        const derivedValue = fact.value - coveredValue;
        if (!Number.isFinite(derivedValue)) return;

        if (coveredValue === fact.value) return;
        if (!lastEndDate) return;

        const derivedFact = cloneSecFact(fact, {
          concept: `${fact.concept}:derived`,
          conceptPriority: Math.max(fact.conceptPriority - 1, 1),
          startDate: tailStartDate,
          daySpan: tailDaySpan,
          value: derivedValue,
        });
        const current = derived.get(fact.endDate);
        if (!current || betterSecFact(derivedFact, current)) {
          derived.set(fact.endDate, derivedFact);
          changed = true;
        }
      });
  }

  const quarterRows = new Map();
  [...derived.values()].forEach((fact) => {
    // Financial data from the other providers is keyed by the fiscal period's
    // end date.  Using the midpoint here moves fiscal quarters that straddle a
    // calendar boundary back one slot, which in turn attaches the next
    // quarter's filing date to the wrong bar.
    const quarter = calendarQuarterFromDate(fact.endDate);
    if (!quarter) return;
    const current = quarterRows.get(quarter);
    if (!current || betterSecFact(fact, current)) {
      quarterRows.set(quarter, fact);
    }
  });

  return quarterRows;
}

function buildSecInstantQuarterSeries(facts) {
  const quarterRows = new Map();

  dedupeExactSecFacts(facts)
    .slice()
    .sort((left, right) => {
      if (left.endDate !== right.endDate) return left.endDate.localeCompare(right.endDate);
      if (left.filed !== right.filed) return left.filed.localeCompare(right.filed);
      return left.conceptPriority - right.conceptPriority;
    })
    .forEach((fact) => {
      const quarter = toQuarterLabel(fact.endDate);
      if (!quarter) return;
      const current = quarterRows.get(quarter);
      if (!current || betterSecFact(fact, current)) {
        quarterRows.set(quarter, fact);
      }
    });

  return quarterRows;
}

function toQuarterLabel(dateKey) {
  return calendarQuarterFromDate(dateKey);
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

function extractArrayRawWithFallback(block, keys) {
  for (const key of keys) {
    const regex = new RegExp(`${key}:\\[([^\\]]*)\\]`);
    const match = block.match(regex);
    if (match) {
      return match[1].trim();
    }
  }

  throw new Error(`缺少字段：${keys.join(" / ")}`);
}

function extractOptionalArrayRaw(block, key) {
  const regex = new RegExp(`${key}:\\[([^\\]]*)\\]`);
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

function extractOptionalArrayRawWithFallback(block, keys) {
  for (const key of keys) {
    const raw = extractOptionalArrayRaw(block, key);
    if (raw != null) return raw;
  }
  return null;
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
  const netIncome = parseNumberArray(extractArrayRawWithFallback(block, ["netIncome", "netinc"]));
  const grossMarginRatio = parseNumberArray(extractOptionalArrayRaw(block, "grossMargin") || "");

  const maxLength = Math.min(dateKeys.length, fiscalQuarter.length, revenue.length, netIncome.length);
  const rows = [];

  for (let index = 0; index < maxLength; index += 1) {
    const dateKey = dateKeys[index];
    const period = toQuarterLabel(dateKey);
    if (!period) continue;

    rows.push({
      period,
      dateKey,
      fiscalQuarter: fiscalQuarter[index],
      revenue: revenue[index],
      netIncome: netIncome[index],
      grossMarginPct: Number.isFinite(grossMarginRatio[index]) ? grossMarginRatio[index] * 100 : null,
    });
  }

  return rows;
}

function extractRatioSeries(html) {
  const block = extractFinancialBlock(html);
  const dateKeys = parseStringArray(extractArrayRaw(block, "datekey"));
  const peValues = parseNumberArray(extractOptionalArrayRaw(block, "pe") || "");

  const maxLength = Math.min(dateKeys.length, peValues.length);
  const rows = [];

  for (let index = 0; index < maxLength; index += 1) {
    const period = toQuarterLabel(dateKeys[index]);
    if (!period) continue;

    rows.push({
      period,
      pe: peValues[index],
    });
  }

  return rows;
}

function extractBalanceSheetSeries(html) {
  const block = extractFinancialBlock(html);
  const dateKeys = parseStringArray(extractArrayRaw(block, "datekey"));
  const equity = parseNumberArray(
    extractOptionalArrayRawWithFallback(block, [
      "equity",
      "bookValue",
      "balance_sheet_total_common_shareholders_equity",
    ]) || "",
  );

  const maxLength = Math.min(dateKeys.length, equity.length);
  const rows = [];

  for (let index = 0; index < maxLength; index += 1) {
    const period = toQuarterLabel(dateKeys[index]);
    if (!period) continue;

    rows.push({
      period,
      dateKey: dateKeys[index],
      equity: equity[index],
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

async function getSecTickerMap() {
  if (secTickerMapCache) return secTickerMapCache;

  const payload = await fetchJsonWithCurl(SEC_COMPANY_TICKERS_URL, SEC_REQUEST_HEADERS, 10 * 1024 * 1024);
  const map = new Map();

  Object.values(payload || {}).forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const normalizedTicker = normalizeTickerForSec(entry.ticker);
    const cik = Number(entry.cik_str);
    if (!normalizedTicker || !Number.isFinite(cik)) return;
    map.set(normalizedTicker, cik);
  });

  secTickerMapCache = map;
  return map;
}

function selectSecReportingCurrency(companyfacts) {
  const factsPayload = companyfacts?.facts;
  if (!factsPayload || typeof factsPayload !== "object") return null;

  const scoreByUnit = new Map();
  ["revenue", "netIncome", "netAssets", "grossProfit"].forEach((fieldKey, fieldIndex) => {
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
            if (!SEC_ALLOWED_FORMS.has(String(item.form || ""))) return false;
            return Boolean(item.start && item.end);
          }).length;

          if (!validCount) return;
          const previousScore = scoreByUnit.get(unit) || 0;
          scoreByUnit.set(unit, previousScore + validCount * conceptWeight * (4 - fieldIndex));
        });
      });
    });
  });

  if (scoreByUnit.size === 0) return null;
  return [...scoreByUnit.entries()].sort((left, right) => {
    if (left[1] !== right[1]) return right[1] - left[1];
    if (left[0] === "USD" && right[0] !== "USD") return -1;
    if (right[0] === "USD" && left[0] !== "USD") return 1;
    return left[0].localeCompare(right[0]);
  })[0][0];
}

function collectSecFieldSeries(companyfacts, reportingCurrency) {
  const factsPayload = companyfacts?.facts;
  if (!factsPayload || typeof factsPayload !== "object") return {};

  const namespacePriority = new Map([
    ["us-gaap", 20],
    ["ifrs-full", 18],
    ["dei", 8],
  ]);

  const fieldSeries = {};

  Object.entries(SEC_FIELD_CONCEPTS).forEach(([fieldKey, concepts]) => {
    const collectedFacts = [];
    const totalConcepts = concepts.length;

    concepts.forEach((concept, conceptIndex) => {
      const conceptPriority = totalConcepts - conceptIndex;

      Object.entries(factsPayload).forEach(([namespace, namespaceFacts]) => {
        if (!namespaceFacts || typeof namespaceFacts !== "object") return;
        const conceptPayload = namespaceFacts[concept];
        if (!conceptPayload || typeof conceptPayload !== "object") return;
        const values = conceptPayload.units?.[reportingCurrency];
        if (!Array.isArray(values)) return;

        values.forEach((raw) => {
          if (!raw || typeof raw !== "object") return;
          if (!SEC_ALLOWED_FORMS.has(String(raw.form || ""))) return;
          if (!raw.end) return;
          if (fieldKey !== "netAssets" && !raw.start) return;
          const value = Number(raw.val);
          if (!Number.isFinite(value)) return;
          const nsPriority = namespacePriority.get(namespace) || 0;
          if (nsPriority <= 0) return;

          collectedFacts.push({
            namespace,
            namespacePriority: nsPriority,
            concept,
            conceptPriority,
            fiscalYear: String(raw.fy || ""),
            fiscalPeriod: String(raw.fp || "").toUpperCase(),
            accession: String(raw.accn || ""),
            filed: String(raw.filed || ""),
            startDate: String(raw.start || raw.end || ""),
            endDate: String(raw.end || ""),
            value,
            daySpan: raw.start
              ? daySpanInclusive(String(raw.start), String(raw.end))
              : 1,
          });
        });
      });
    });

    if (collectedFacts.length > 0) {
      fieldSeries[fieldKey] = fieldKey === "netAssets"
        ? buildSecInstantQuarterSeries(collectedFacts)
        : buildSecFieldQuarterSeries(collectedFacts);
    }
  });

  return fieldSeries;
}

async function fetchSecQuarterlyHistory(companySource) {
  const secTickerMap = await getSecTickerMap();
  const cik = secTickerMap.get(normalizeTickerForSec(companySource.ticker));
  if (!Number.isFinite(cik)) {
    return null;
  }

  const companyfacts = await fetchJsonWithCurl(
    `${SEC_COMPANYFACTS_BASE}/CIK${String(cik).padStart(10, "0")}.json`,
    SEC_REQUEST_HEADERS,
    40 * 1024 * 1024,
  );
  const reportingCurrency = selectSecReportingCurrency(companyfacts);
  if (!reportingCurrency) {
    return null;
  }

  const fieldSeries = collectSecFieldSeries(companyfacts, reportingCurrency);
  const quarterSet = new Set();
  Object.values(fieldSeries).forEach((series) => {
    if (!(series instanceof Map)) return;
    [...series.keys()].forEach((quarter) => quarterSet.add(quarter));
  });

  const rows = [...quarterSet]
    .sort(comparePeriods)
    .map((period) => {
      const revenueFact = fieldSeries.revenue?.get(period) || null;
      const grossProfitFact = fieldSeries.grossProfit?.get(period) || null;
      const costOfRevenueFact = fieldSeries.costOfRevenue?.get(period) || null;
      const netIncomeFact = fieldSeries.netIncome?.get(period) || null;
      const netAssetsFact = fieldSeries.netAssets?.get(period) || null;
      const endDate =
        revenueFact?.endDate ||
        netIncomeFact?.endDate ||
        grossProfitFact?.endDate ||
        netAssetsFact?.endDate ||
        null;
      const reportDate =
        revenueFact?.filed ||
        netIncomeFact?.filed ||
        grossProfitFact?.filed ||
        netAssetsFact?.filed ||
        null;
      const grossProfitValue = grossProfitFact?.value ?? (
        Number.isFinite(revenueFact?.value) && Number.isFinite(costOfRevenueFact?.value)
          ? revenueFact.value - costOfRevenueFact.value
          : null
      );

      return {
        period,
        dateKey: endDate,
        reportDate,
        revenue: revenueFact?.value ?? null,
        netIncome: netIncomeFact?.value ?? null,
        grossProfit: grossProfitValue,
        netAssets: netAssetsFact?.value ?? null,
        grossMarginPct:
          Number.isFinite(revenueFact?.value) && Number.isFinite(grossProfitValue) && revenueFact.value !== 0
            ? (grossProfitValue / revenueFact.value) * 100
            : null,
      };
    });

  return {
    cik,
    reportingCurrency,
    rows,
  };
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
    "--retry",
    "3",
    "--retry-delay",
    "1",
    "--connect-timeout",
    "15",
    "--max-time",
    "45",
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

async function convertBalanceSheetRowsToUsd(rows, currencyCode) {
  const series = await fetchFxSeries(currencyCode);
  if (!series) return null;

  const convertedRows = rows.map((row) => {
    const rate = findLatestRateOnOrBefore(series, row.dateKey);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`缺少 ${currencyCode}/USD 汇率：${row.period}`);
    }

    return {
      ...row,
      equity: Number.isFinite(row.equity)
        ? convertAmountToUsd(row.equity, rate, series.quoteMode)
        : row.equity,
    };
  });

  return {
    rows: convertedRows,
    fxLabel: series.label,
  };
}

async function convertSecHistoryRowsToUsd(rows, currencyCode) {
  const series = await fetchFxSeries(currencyCode);
  if (!series) return null;

  const convertedRows = rows.map((row) => {
    if (!row?.dateKey) {
      throw new Error(`缺少 SEC 历史日期：${row?.period || "unknown"}`);
    }

    const window = getQuarterWindowFromDate(row.dateKey);
    if (!window) {
      throw new Error(`无法解析 SEC 历史季度日期：${row.dateKey}`);
    }

    const avgRate =
      getQuarterAverageRate(series, window.start, window.end) ??
      findLatestRateOnOrBefore(series, window.end);
    const spotRate = findLatestRateOnOrBefore(series, row.dateKey);

    if (!Number.isFinite(avgRate) || avgRate <= 0) {
      throw new Error(`缺少 ${currencyCode}/USD 流量汇率：${row.period}`);
    }
    if (!Number.isFinite(spotRate) || spotRate <= 0) {
      throw new Error(`缺少 ${currencyCode}/USD 资产汇率：${row.period}`);
    }

    return {
      ...row,
      revenue: Number.isFinite(row.revenue) ? convertAmountToUsd(row.revenue, avgRate, series.quoteMode) : row.revenue,
      netIncome: Number.isFinite(row.netIncome) ? convertAmountToUsd(row.netIncome, avgRate, series.quoteMode) : row.netIncome,
      grossProfit: Number.isFinite(row.grossProfit) ? convertAmountToUsd(row.grossProfit, avgRate, series.quoteMode) : row.grossProfit,
      netAssets: Number.isFinite(row.netAssets) ? convertAmountToUsd(row.netAssets, spotRate, series.quoteMode) : row.netAssets,
      grossMarginPct:
        Number.isFinite(row.revenue) && Number.isFinite(row.grossProfit) && row.revenue !== 0
          ? (row.grossProfit / row.revenue) * 100
          : row.grossMarginPct,
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
  if (!company.pe || typeof company.pe !== "object") company.pe = {};
  if (!company.netAssets || typeof company.netAssets !== "object") company.netAssets = {};
  if (!company.roe || typeof company.roe !== "object") company.roe = {};
  if (!company.grossMargin || typeof company.grossMargin !== "object") company.grossMargin = {};
  if (!company.revenueGrowth || typeof company.revenueGrowth !== "object") company.revenueGrowth = {};
  if (!company.periodEndDates || typeof company.periodEndDates !== "object") company.periodEndDates = {};
  if (!company.reportDates || typeof company.reportDates !== "object") company.reportDates = {};

  if (!company.forecastFlags || typeof company.forecastFlags !== "object") {
    company.forecastFlags = {};
  }

  FORECAST_KEYS.forEach((key) => {
    if (!Array.isArray(company.forecastFlags[key])) {
      company.forecastFlags[key] = [];
    }
  });
}

function pruneCompanyDataBeforePeriod(company, minPeriod) {
  if (!minPeriod) return;
  const seriesKeys = [
    "revenue",
    "earnings",
    "pe",
    "netAssets",
    "roe",
    "grossMargin",
    "revenueGrowth",
    "periodEndDates",
    "reportDates",
  ];

  seriesKeys.forEach((key) => {
    Object.keys(company[key] || {}).forEach((period) => {
      if (comparePeriods(period, minPeriod) < 0) delete company[key][period];
    });
  });

  FORECAST_KEYS.forEach((key) => {
    company.forecastFlags[key] = (company.forecastFlags[key] || [])
      .filter((period) => comparePeriods(period, minPeriod) >= 0);
  });
}

function clearCompanyDataThroughPeriod(company, maxPeriod) {
  if (!maxPeriod) return;

  [
    "revenue",
    "earnings",
    "pe",
    "netAssets",
    "roe",
    "grossMargin",
    "revenueGrowth",
    "periodEndDates",
    "reportDates",
  ].forEach((key) => {
    if (!company[key] || typeof company[key] !== "object") return;
    Object.keys(company[key]).forEach((period) => {
      if (isPeriodLabel(period) && comparePeriods(period, maxPeriod) <= 0) delete company[key][period];
    });
  });

  FORECAST_KEYS.forEach((key) => {
    company.forecastFlags[key] = (company.forecastFlags[key] || [])
      .filter((period) => comparePeriods(period, maxPeriod) > 0);
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

function setSeriesValueIfMissing(series, key, value) {
  if (!Number.isFinite(value)) return false;
  const previous = series[key];
  if (typeof previous === "number" && Number.isFinite(previous)) {
    return false;
  }
  series[key] = value;
  return true;
}

function setPeriodEndDate(companyData, period, dateKey) {
  if (!isPeriodLabel(period)) return false;
  if (!isIsoDateKey(dateKey)) return false;
  if (companyData.periodEndDates[period] === dateKey) return false;
  companyData.periodEndDates[period] = dateKey;
  return true;
}

function setReportDate(companyData, period, dateKey) {
  if (!isPeriodLabel(period)) return false;
  if (!isIsoDateKey(dateKey)) return false;
  if (companyData.reportDates[period] === dateKey) return false;
  companyData.reportDates[period] = dateKey;
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
    "--retry",
    "3",
    "--retry-delay",
    "1",
    "--connect-timeout",
    "15",
    "--max-time",
    "45",
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

async function fetchCompanyRatios(slug) {
  const url = `${STOCK_ANALYSIS_BASE}/${slug}/financials/ratios/?p=quarterly`;
  const args = [
    "-L",
    "-sS",
    "--fail",
    "--compressed",
    "--retry",
    "3",
    "--retry-delay",
    "1",
    "--connect-timeout",
    "15",
    "--max-time",
    "45",
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
  return extractRatioSeries(stdout);
}

function extractCompaniesMarketCapPeSeries(html) {
  const match = html.match(/\bdata\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];

  let rawRows;
  try {
    rawRows = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const byPeriod = new Map();
  rawRows.forEach((row) => {
    const timestamp = Number(row?.d);
    const pe = Number(row?.v);
    if (!Number.isFinite(timestamp) || !Number.isFinite(pe)) return;
    const dateKey = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const period = toQuarterLabel(dateKey);
    if (!period) return;
    byPeriod.set(period, { period, pe, dateKey });
  });

  const annualRowPattern = /<tr><td>(\d{4})<\/td><td>([^<]*)<\/td>/g;
  let annualMatch;
  while ((annualMatch = annualRowPattern.exec(html)) !== null) {
    const year = Number(annualMatch[1]);
    const pe = Number(
      annualMatch[2]
        .replace(/&gt;|>/g, "")
        .replace(/,/g, "")
        .trim(),
    );
    if (!Number.isFinite(year) || !Number.isFinite(pe)) continue;
    const period = `${year}Q4`;
    if (!byPeriod.has(period)) {
      byPeriod.set(period, { period, pe, dateKey: `${year}-12-31` });
    }
  }

  return [...byPeriod.values()].sort((left, right) => comparePeriods(left.period, right.period));
}

async function fetchCompaniesMarketCapPeSeries(companySource) {
  const slug = COMPANIES_MARKET_CAP_SLUGS[companySource.id] || companySource.id;
  const url = `${COMPANIES_MARKET_CAP_BASE}/${slug}/pe-ratio/`;
  const args = [
    "-L",
    "-sS",
    "--fail",
    "--compressed",
    "--retry",
    "3",
    "--retry-delay",
    "1",
    "--connect-timeout",
    "15",
    "--max-time",
    "45",
    "-H",
    `User-Agent: ${REQUEST_HEADERS["user-agent"]}`,
    "-H",
    `Accept: ${REQUEST_HEADERS.accept}`,
    "-H",
    `Accept-Language: ${REQUEST_HEADERS["accept-language"]}`,
    url,
  ];
  const { stdout } = await execFileAsync("curl", args, { maxBuffer: 20 * 1024 * 1024 });
  return extractCompaniesMarketCapPeSeries(stdout);
}

function extractCompaniesMarketCapMarketCapSeries(html) {
  const match = html.match(/\bdata\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];

  let rawRows;
  try {
    rawRows = JSON.parse(match[1]);
  } catch {
    return [];
  }

  return rawRows
    .map((row) => {
      const timestamp = Number(row?.d);
      const marketCapUnits = Number(row?.m);
      if (!Number.isFinite(timestamp) || !Number.isFinite(marketCapUnits)) return null;
      return {
        dateKey: new Date(timestamp * 1000).toISOString().slice(0, 10),
        marketCapUsd: marketCapUnits * 100_000,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
}

async function fetchCompaniesMarketCapMarketCapSeries(companySource) {
  const slug = COMPANIES_MARKET_CAP_SLUGS[companySource.id] || companySource.id;
  const url = `${COMPANIES_MARKET_CAP_BASE}/${slug}/marketcap/`;
  const args = [
    "-L",
    "-sS",
    "--fail",
    "--compressed",
    "--retry",
    "3",
    "--retry-delay",
    "1",
    "--connect-timeout",
    "15",
    "--max-time",
    "45",
    "-H",
    `User-Agent: ${REQUEST_HEADERS["user-agent"]}`,
    "-H",
    `Accept: ${REQUEST_HEADERS.accept}`,
    "-H",
    `Accept-Language: ${REQUEST_HEADERS["accept-language"]}`,
    url,
  ];
  const { stdout } = await execFileAsync("curl", args, { maxBuffer: 30 * 1024 * 1024 });
  return extractCompaniesMarketCapMarketCapSeries(stdout);
}

function extractCompaniesMarketCapNetAssetsSeries(html) {
  const match = html.match(/\bdata\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];

  let rawRows;
  try {
    rawRows = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const byPeriod = new Map();
  rawRows.forEach((row) => {
    const timestamp = Number(row?.d);
    const equity = Number(row?.v);
    if (!Number.isFinite(timestamp) || !Number.isFinite(equity)) return;
    const dateKey = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const period = toQuarterLabel(dateKey);
    if (!period) return;
    byPeriod.set(period, { period, equity, dateKey });
  });

  return [...byPeriod.values()].sort((left, right) => comparePeriods(left.period, right.period));
}

async function fetchCompaniesMarketCapNetAssetsSeries(companySource) {
  const slug = COMPANIES_MARKET_CAP_SLUGS[companySource.id] || companySource.id;
  const url = `${COMPANIES_MARKET_CAP_BASE}/${slug}/net-assets/`;
  const args = [
    "-L",
    "-sS",
    "--fail",
    "--compressed",
    "--retry",
    "3",
    "--retry-delay",
    "1",
    "--connect-timeout",
    "15",
    "--max-time",
    "45",
    "-H",
    `User-Agent: ${REQUEST_HEADERS["user-agent"]}`,
    "-H",
    `Accept: ${REQUEST_HEADERS.accept}`,
    "-H",
    `Accept-Language: ${REQUEST_HEADERS["accept-language"]}`,
    url,
  ];
  const { stdout } = await execFileAsync("curl", args, { maxBuffer: 20 * 1024 * 1024 });
  return extractCompaniesMarketCapNetAssetsSeries(stdout);
}

function calendarQuarterEndDate(period) {
  const parsed = parsePeriod(period);
  if (!parsed) return null;
  const month = parsed.quarter * 3;
  const day = new Date(Date.UTC(parsed.year, month, 0)).getUTCDate();
  return `${parsed.year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function findLatestMarketCapOnOrBefore(rows, targetDate, maxAgeDays = 45) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (row.dateKey > targetDate) continue;
    const ageDays = Math.round((Date.parse(targetDate) - Date.parse(row.dateKey)) / 86400000);
    if (ageDays < 0 || ageDays > maxAgeDays) return null;
    return row.marketCapUsd;
  }
  return null;
}

function deriveMissingPeFromMarketCap(companyData, periods, marketCapRows) {
  const changedPeriods = new Set();
  let changedPoints = 0;

  periods.forEach((period, index) => {
    if (Number.isFinite(companyData.pe?.[period]) || index < 3) return;
    const windowPeriods = periods.slice(index - 3, index + 1);
    const earnings = windowPeriods.map((windowPeriod) => companyData.earnings?.[windowPeriod]);
    if (!earnings.every(Number.isFinite)) return;
    const ttmEarnings = earnings.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(ttmEarnings) || ttmEarnings <= 0) return;

    const targetDate = companyData.periodEndDates?.[period] || calendarQuarterEndDate(period);
    if (!targetDate) return;
    const marketCapUsd = findLatestMarketCapOnOrBefore(marketCapRows, targetDate);
    if (!Number.isFinite(marketCapUsd) || marketCapUsd <= 0) return;

    const pe = marketCapUsd / ttmEarnings;
    if (!Number.isFinite(pe) || pe <= 0) return;
    if (setSeriesValueIfMissing(companyData.pe, period, pe)) {
      changedPoints += 1;
      changedPeriods.add(period);
    }
  });

  return { changedPoints, changedPeriods };
}

async function fetchCompanyBalanceSheetRows(slug) {
  const url = `${STOCK_ANALYSIS_BASE}/${slug}/financials/balance-sheet/?p=quarterly`;
  const args = [
    "-L",
    "-sS",
    "--fail",
    "--compressed",
    "--retry",
    "3",
    "--retry-delay",
    "1",
    "--connect-timeout",
    "15",
    "--max-time",
    "45",
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
  const rows = extractBalanceSheetSeries(html);
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

function sortObjectByPeriodKeys(series, validPeriods = null) {
  const entries = Object.entries(series || {})
    .filter(([period]) => !validPeriods || validPeriods.has(period));
  entries.sort((a, b) => comparePeriods(a[0], b[0]));
  const next = {};
  entries.forEach(([key, value]) => {
    next[key] = value;
  });
  return next;
}

function findQuarterlyRevenueAnomalies(series) {
  const anomalies = new Set();
  const entries = Object.entries(series || {})
    .filter(([, value]) => Number.isFinite(value))
    .sort((left, right) => comparePeriods(left[0], right[0]));

  entries.forEach(([period, value], index) => {
    if (value <= 0) {
      anomalies.add(period);
      return;
    }

    const previous = entries[index - 1]?.[1];
    const next = entries[index + 1]?.[1];
    if (!Number.isFinite(previous) || !Number.isFinite(next) || previous <= 0 || next <= 0) return;

    const upperNeighbor = Math.max(previous, next);
    const lowerNeighbor = Math.min(previous, next);
    if (value > upperNeighbor * 2.5 || value < lowerNeighbor * 0.4) {
      anomalies.add(period);
    }
  });

  return anomalies;
}

function isConflictingActualValue(existingValue, nextValue, upperRatio = 2.5, lowerRatio = 0.4) {
  if (!Number.isFinite(existingValue) || !Number.isFinite(nextValue)) return false;
  if (existingValue <= 0 || nextValue <= 0) return false;
  return nextValue > existingValue * upperRatio || nextValue < existingValue * lowerRatio;
}

function findNearestFiniteSeriesValue(series, periods, targetPeriod) {
  const sortedPeriods = [...new Set([...periods, targetPeriod])]
    .filter(isPeriodLabel)
    .sort(comparePeriods);
  const targetIndex = sortedPeriods.indexOf(targetPeriod);
  if (targetIndex < 0) return null;

  for (let offset = 1; offset < sortedPeriods.length; offset += 1) {
    const after = sortedPeriods[targetIndex + offset];
    if (after && Number.isFinite(series?.[after])) return series[after];

    const before = sortedPeriods[targetIndex - offset];
    if (before && Number.isFinite(series?.[before])) return series[before];
  }

  return null;
}

function isCompatibleHistoricalBackfillValue(series, periods, period, value, upperRatio = 4, lowerRatio = 0.25) {
  if (!Number.isFinite(value)) return false;
  const referenceValue = findNearestFiniteSeriesValue(series, periods, period);
  if (!Number.isFinite(referenceValue)) return true;
  if (value === 0 || referenceValue === 0) return true;

  const absValue = Math.abs(value);
  const absReference = Math.abs(referenceValue);
  if (absValue < 1 || absReference < 1) return true;

  return absValue <= absReference * upperRatio && absValue >= absReference * lowerRatio;
}

function sanitizeSeriesQuality(companyData) {
  const changedPeriods = new Set();
  const revenuePeriods = new Set();
  let changedPoints = 0;

  Object.entries(companyData.grossMargin || {}).forEach(([period, value]) => {
    if (!Number.isFinite(value)) return;
    if (Math.abs(value) < 0.000001 || value > 100 || value < -100) {
      if (companyData.grossMargin[period] === null) return;
      companyData.grossMargin[period] = null;
      changedPoints += 1;
      changedPeriods.add(period);
    }
  });

  findQuarterlyRevenueAnomalies(companyData.revenue).forEach((period) => {
    if (companyData.revenue[period] !== null) {
      companyData.revenue[period] = null;
      changedPoints += 1;
      changedPeriods.add(period);
      revenuePeriods.add(period);
    }
    if (companyData.revenueGrowth[period] !== null) {
      companyData.revenueGrowth[period] = null;
      changedPoints += 1;
      changedPeriods.add(period);
    }
  });

  Object.entries(companyData.netAssets || {}).forEach(([period, value]) => {
    if (!Number.isFinite(value)) return;
    if (Math.abs(value) < 1) {
      if (companyData.netAssets[period] !== null) {
        companyData.netAssets[period] = null;
        changedPoints += 1;
        changedPeriods.add(period);
      }
      if (companyData.roe[period] !== null) {
        companyData.roe[period] = null;
        changedPoints += 1;
        changedPeriods.add(period);
      }
    }
  });

  return { changedPoints, changedPeriods, revenuePeriods };
}

function trimLeadingDisconnectedPeriods(series, periods, minimumContinuousLength = 4) {
  const trimmedPeriods = new Set();
  let currentRun = [];
  let firstContinuousStart = null;
  let firstFinitePeriod = null;
  let leadingFinitePeriods = [];

  periods.forEach((period) => {
    const value = series?.[period];
    if (Number.isFinite(value)) {
      if (!firstFinitePeriod) firstFinitePeriod = period;
      if (!firstContinuousStart) {
        leadingFinitePeriods.push(period);
      }
      currentRun.push(period);
      return;
    }

    if (currentRun.length >= minimumContinuousLength && !firstContinuousStart) {
      firstContinuousStart = currentRun[0];
    }
    currentRun = [];
  });

  if (!firstContinuousStart && currentRun.length >= minimumContinuousLength) {
    firstContinuousStart = currentRun[0];
  }

  if (!firstContinuousStart) {
    return trimmedPeriods;
  }

  if (!firstFinitePeriod || comparePeriods(firstFinitePeriod, firstContinuousStart) >= 0) {
    return trimmedPeriods;
  }

  const hasGapBeforeContinuousStart = periods.some(
    (period) =>
      comparePeriods(period, firstFinitePeriod) > 0 &&
      comparePeriods(period, firstContinuousStart) < 0 &&
      !Number.isFinite(series?.[period]),
  );

  if (!hasGapBeforeContinuousStart) {
    return trimmedPeriods;
  }

  // Keep substantial early history even if it contains a few gaps. The trim is meant
  // for isolated front fragments, not multi-year historical backfills.
  if (leadingFinitePeriods.length >= 6) {
    return trimmedPeriods;
  }

  for (const period of periods) {
    if (comparePeriods(period, firstContinuousStart) >= 0) break;
    if (Number.isFinite(series?.[period])) {
      series[period] = null;
      trimmedPeriods.add(period);
    }
  }

  return trimmedPeriods;
}

function trimLeadingDisconnectedSeries(companyData, periods) {
  const changedPeriods = new Set();
  let changedPoints = 0;

  const revenueTrimmed = trimLeadingDisconnectedPeriods(companyData.revenue, periods);
  revenueTrimmed.forEach((period) => {
    changedPeriods.add(period);
    changedPoints += 1;
    if (companyData.revenueGrowth[period] !== null) {
      companyData.revenueGrowth[period] = null;
      changedPoints += 1;
    }
  });

  const earningsTrimmed = trimLeadingDisconnectedPeriods(companyData.earnings, periods);
  earningsTrimmed.forEach((period) => {
    changedPeriods.add(period);
    changedPoints += 1;
    if (companyData.roe[period] !== null) {
      companyData.roe[period] = null;
      changedPoints += 1;
    }
  });

  const netAssetsTrimmed = trimLeadingDisconnectedPeriods(companyData.netAssets, periods);
  netAssetsTrimmed.forEach((period) => {
    changedPeriods.add(period);
    changedPoints += 1;
    if (companyData.roe[period] !== null) {
      companyData.roe[period] = null;
      changedPoints += 1;
    }
  });

  [
    companyData.grossMargin,
    companyData.pe,
    companyData.roe,
    companyData.revenueGrowth,
  ].forEach((series) => {
    trimLeadingDisconnectedPeriods(series, periods).forEach((period) => {
      changedPeriods.add(period);
      changedPoints += 1;
    });
  });

  return { changedPoints, changedPeriods, revenuePeriods: revenueTrimmed };
}

function isCuratedRevenueLikelyReliable(financial) {
  const revenueBn = Number(financial?.revenueBn);
  if (!Number.isFinite(revenueBn) || revenueBn <= 0) return false;

  const grossMarginPct = Number(financial?.grossMarginPct);
  if (Number.isFinite(grossMarginPct) && (grossMarginPct < -100 || grossMarginPct > 100)) {
    return false;
  }

  const grossProfitBn = Number(financial?.grossProfitBn);
  if (Number.isFinite(grossProfitBn) && grossProfitBn > revenueBn * 1.05) {
    return false;
  }

  const costOfRevenueBn = Number(financial?.costOfRevenueBn);
  if (Number.isFinite(costOfRevenueBn) && costOfRevenueBn > revenueBn * 1.1) {
    return false;
  }

  if (Number.isFinite(grossProfitBn) && Number.isFinite(costOfRevenueBn)) {
    const reconstructedRevenueBn = grossProfitBn + costOfRevenueBn;
    const toleranceBn = Math.max(0.25, Math.abs(reconstructedRevenueBn) * 0.1);
    if (Math.abs(reconstructedRevenueBn - revenueBn) > toleranceBn) {
      return false;
    }
  }

  return true;
}

function getCuratedUsdScaleFactor(financial) {
  const statementCurrency = String(financial?.statementCurrency || "").toUpperCase();
  const displayCurrency = String(financial?.displayCurrency || statementCurrency || "").toUpperCase();
  const scaleFactor = Number(financial?.displayScaleFactor);

  if (
    statementCurrency &&
    displayCurrency === "USD" &&
    statementCurrency !== "USD" &&
    Number.isFinite(scaleFactor) &&
    scaleFactor > 0
  ) {
    return scaleFactor;
  }

  return 1;
}

function collectCuratedReportDateCandidates(value, candidates = []) {
  if (!value || typeof value !== "object") return candidates;

  Object.entries(value).forEach(([key, item]) => {
    if (
      /^(?:statementFilingDate|filingDate|reportDate|releaseDate|publishedDate)$/.test(key) &&
      typeof item === "string" &&
      isIsoDateKey(item)
    ) {
      candidates.push(item);
      return;
    }

    if (item && typeof item === "object") {
      collectCuratedReportDateCandidates(item, candidates);
    }
  });

  return candidates;
}

function getCuratedReportDate(financial) {
  const periodEnd = String(financial?.periodEnd || "");
  const periodEndMs = Date.parse(`${periodEnd}T00:00:00Z`);
  const candidates = [...new Set(collectCuratedReportDateCandidates(financial))]
    .map((dateKey) => ({ dateKey, ms: Date.parse(`${dateKey}T00:00:00Z`) }))
    .filter((candidate) => Number.isFinite(candidate.ms));

  if (Number.isFinite(periodEndMs)) {
    const afterPeriodEnd = candidates
      .filter((candidate) => {
        const daysAfterEnd = Math.round((candidate.ms - periodEndMs) / 86400000);
        return daysAfterEnd > 0 && daysAfterEnd <= 220;
      })
      .sort((left, right) => left.ms - right.ms);

    if (afterPeriodEnd[0]) return afterPeriodEnd[0].dateKey;
    return null;
  }

  return candidates.sort((left, right) => left.ms - right.ms)[0]?.dateKey ?? null;
}

function applyCuratedQuarterlyOverrides(companyData, curatedCompany) {
  if (!curatedCompany?.financials || !Array.isArray(curatedCompany?.quarters)) {
    return {
      changedPoints: 0,
      changedPeriods: new Set(),
      revenuePeriods: new Set(),
      netIncomePeriods: new Set(),
      grossMarginPeriods: new Set(),
      reportDatePeriods: new Set(),
    };
  }

  const changedPeriods = new Set();
  const revenuePeriods = new Set();
  const netIncomePeriods = new Set();
  const grossMarginPeriods = new Set();
  const reportDatePeriods = new Set();
  let changedPoints = 0;

  curatedCompany.quarters.forEach((period) => {
    const financial = curatedCompany.financials[period];
    if (!financial || typeof financial !== "object") return;

    const reportDate = getCuratedReportDate(financial);
    // SEC companyfacts supplies the primary, period-specific filing date. The
    // curated dataset remains a fallback for issuers without an SEC quarter.
    if (!companyData.reportDates[period] && setReportDate(companyData, period, reportDate)) {
      reportDatePeriods.add(period);
      changedPeriods.add(period);
      changedPoints += 1;
    }

    const revenueLooksReliable = isCuratedRevenueLikelyReliable(financial);
    const usdScaleFactor = getCuratedUsdScaleFactor(financial);
    const revenue = Number(financial.revenueBn) * usdScaleFactor * 1e9;
    if (revenueLooksReliable && Number.isFinite(revenue)) {
      revenuePeriods.add(period);
      if (setSeriesValue(companyData.revenue, period, Math.round(revenue))) {
        changedPoints += 1;
        changedPeriods.add(period);
      }
    }

    const netIncome = Number(financial.netIncomeBn) * usdScaleFactor * 1e9;
    if (Number.isFinite(netIncome)) {
      netIncomePeriods.add(period);
      if (setSeriesValue(companyData.earnings, period, Math.round(netIncome))) {
        changedPoints += 1;
        changedPeriods.add(period);
      }
    }

    const grossMargin = Number(financial.grossMarginPct);
    if (revenueLooksReliable && Number.isFinite(grossMargin)) {
      grossMarginPeriods.add(period);
      if (setSeriesValue(companyData.grossMargin, period, grossMargin)) {
        changedPoints += 1;
        changedPeriods.add(period);
      }
    }
  });

  return { changedPoints, changedPeriods, revenuePeriods, netIncomePeriods, grossMarginPeriods, reportDatePeriods };
}

function applyOfficialHistoricalBackfillOverrides(companyId, companyData, rows) {
  const officialPeriods = COMPANY_OFFICIAL_HISTORICAL_BACKFILL_PERIODS[companyId];
  const changedPeriods = new Set();
  const revenuePeriods = new Set();
  const netIncomePeriods = new Set();
  const grossMarginPeriods = new Set();
  let changedPoints = 0;

  if (!officialPeriods || !Array.isArray(rows)) {
    return { changedPoints, changedPeriods, revenuePeriods, netIncomePeriods, grossMarginPeriods };
  }

  rows.forEach((row) => {
    if (!officialPeriods.has(row.period)) return;
    let rowChanged = false;

    if (Number.isFinite(row.revenue)) {
      revenuePeriods.add(row.period);
      if (setSeriesValue(companyData.revenue, row.period, row.revenue)) {
        changedPoints += 1;
        rowChanged = true;
      }
    }
    if (Number.isFinite(row.netIncome)) {
      netIncomePeriods.add(row.period);
      if (setSeriesValue(companyData.earnings, row.period, row.netIncome)) {
        changedPoints += 1;
        rowChanged = true;
      }
    }
    if (Number.isFinite(row.grossMarginPct)) {
      grossMarginPeriods.add(row.period);
      if (setSeriesValue(companyData.grossMargin, row.period, row.grossMarginPct)) {
        changedPoints += 1;
        rowChanged = true;
      }
    }
    if (rowChanged) changedPeriods.add(row.period);
  });

  return { changedPoints, changedPeriods, revenuePeriods, netIncomePeriods, grossMarginPeriods };
}

function applyOfficialQuarterlyOverrides(companyId, companyData) {
  const overrides = COMPANY_OFFICIAL_QUARTERLY_OVERRIDES[companyId];
  if (!overrides) {
    return {
      changedPoints: 0,
      changedPeriods: new Set(),
      revenuePeriods: new Set(),
      netIncomePeriods: new Set(),
      grossMarginPeriods: new Set(),
      netAssetPeriods: new Set(),
      reportDatePeriods: new Set(),
    };
  }

  const changedPeriods = new Set();
  const revenuePeriods = new Set();
  const netIncomePeriods = new Set();
  const grossMarginPeriods = new Set();
  const netAssetPeriods = new Set();
  const reportDatePeriods = new Set();
  let changedPoints = 0;

  Object.entries(overrides).forEach(([period, values]) => {
    if (Number.isFinite(values.revenue)) {
      revenuePeriods.add(period);
      if (setSeriesValue(companyData.revenue, period, values.revenue)) {
        changedPoints += 1;
        changedPeriods.add(period);
      }
    }

    if (Number.isFinite(values.earnings)) {
      netIncomePeriods.add(period);
      if (setSeriesValue(companyData.earnings, period, values.earnings)) {
        changedPoints += 1;
        changedPeriods.add(period);
      }
    }

    if (Number.isFinite(values.grossMargin)) {
      grossMarginPeriods.add(period);
      if (setSeriesValue(companyData.grossMargin, period, values.grossMargin)) {
        changedPoints += 1;
        changedPeriods.add(period);
      }
    }

    if (Number.isFinite(values.netAssets)) {
      netAssetPeriods.add(period);
      if (setSeriesValue(companyData.netAssets, period, values.netAssets)) {
        changedPoints += 1;
        changedPeriods.add(period);
      }
    }

    if (setReportDate(companyData, period, values.reportDate)) {
      reportDatePeriods.add(period);
      changedPoints += 1;
      changedPeriods.add(period);
    }

    if (setPeriodEndDate(companyData, period, values.periodEndDate)) {
      changedPoints += 1;
      changedPeriods.add(period);
    }
  });

  return {
    changedPoints,
    changedPeriods,
    revenuePeriods,
    netIncomePeriods,
    grossMarginPeriods,
    netAssetPeriods,
    reportDatePeriods,
  };
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
    source: "StockAnalysis quarterly financials / ratios / balance sheet + CompaniesMarketCap quarterly P/E",
    refreshedAt: refreshedAtIso,
    updatedCompanies: summary.updatedCompanyIds,
    changedPoints: summary.changedPoints,
    changedPeriods: summary.changedPeriods,
  };
}

function summarizeCompanyStats(companyStats) {
  return {
    changedPoints:
      companyStats.revenueChanges +
      companyStats.netIncomeChanges +
      companyStats.peChanges +
      companyStats.netAssetChanges +
      companyStats.roeChanges +
      companyStats.grossMarginChanges +
      companyStats.periodEndDateChanges +
      companyStats.qualityFixChanges,
    changedPeriods: [...companyStats.changedPeriods].sort(comparePeriods),
  };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const curatedQuarterlyDataset = await loadCuratedQuarterlyDataset();
  const historicalSecBackfill = await loadHistoricalSecBackfill();

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
  const growthCompanyIds = new Set();
  const summary = {
    updatedCompanyIds: [],
    changedPoints: 0,
    changedPeriods: [],
  };

  for (let index = 0; index < selectedCompanies.length; index += 1) {
    const companySource = selectedCompanies[index];
    const companyData = data.companies[companySource.id] || (data.companies[companySource.id] = {});

    ensureCompanyShape(companyData);
    console.log(`抓取 ${companySource.ticker} (${companySource.name})...`);

    const shouldRefreshHistoricalSeries = true;

    let rows;
    let financialCurrency;
    let ratioRows = [];
    let marketCapRows = [];
    let historicalNetAssetRows = [];
    let balanceRows = [];
    let secHistoryRows = [];
    let historicalBackfillRows = [];

    if (shouldRefreshHistoricalSeries) {
      try {
        const secHistory = await fetchSecQuarterlyHistory(companySource);
        if (secHistory?.rows?.length) {
          secHistoryRows = secHistory.rows;
          if (secHistory.reportingCurrency !== "USD") {
            const converted = await convertSecHistoryRowsToUsd(secHistoryRows, secHistory.reportingCurrency);
            if (!converted) {
              console.warn(`  SEC 历史口径为 ${secHistory.reportingCurrency}，当前无换算配置，已跳过历史补齐`);
              secHistoryRows = [];
            } else {
              secHistoryRows = converted.rows;
              console.log(`  已完成 SEC 历史 ${secHistory.reportingCurrency} -> USD 换算（${converted.fxLabel}）`);
            }
          }

          if (secHistoryRows.length > 0) {
            console.log(`  已载入 SEC 完整历史：${secHistoryRows[0].period} -> ${secHistoryRows.at(-1).period}`);
          }
        }
      } catch (error) {
        console.warn(`  SEC 历史补齐失败：${error.message}`);
      }
    }

    const historicalBackfill = historicalSecBackfill[companySource.id];
    if (historicalBackfill?.rows?.length) {
      try {
        historicalBackfillRows = sanitizeHistoricalBackfillRows(companySource.id, historicalBackfill.rows);
        if (historicalBackfill.reportingCurrency && historicalBackfill.reportingCurrency !== "USD") {
          const converted = await convertSecHistoryRowsToUsd(historicalBackfillRows, historicalBackfill.reportingCurrency);
          if (!converted) {
            console.warn(`  历史 SEC 回填口径为 ${historicalBackfill.reportingCurrency}，当前无换算配置，已跳过`);
            historicalBackfillRows = [];
          } else {
            historicalBackfillRows = converted.rows;
          }
        }

        if (historicalBackfillRows.length > 0) {
          console.log(`  已载入历史 SEC 回填：${historicalBackfillRows[0].period} -> ${historicalBackfillRows.at(-1).period}`);
        }
      } catch (error) {
        console.warn(`  历史 SEC 回填载入失败：${error.message}`);
        historicalBackfillRows = [];
      }
    }

    try {
      const result = await fetchCompanyRows(companySource.slug);
      rows = result.rows;
      financialCurrency = result.financialCurrency;
    } catch (error) {
      console.warn(`  抓取失败：${error.message}`);
      if (index < selectedCompanies.length - 1) await sleep(500);
      continue;
    }

    try {
      ratioRows = await fetchCompanyRatios(companySource.slug);
    } catch (error) {
      console.warn(`  P/E 抓取失败：${error.message}`);
    }

    try {
      const historicalPeRows = await fetchCompaniesMarketCapPeSeries(companySource);
      if (historicalPeRows.length > 0) {
        ratioRows = [...ratioRows, ...historicalPeRows];
      }
    } catch (error) {
      console.warn(`  CompaniesMarketCap P/E 抓取失败：${error.message}`);
    }

    try {
      marketCapRows = await fetchCompaniesMarketCapMarketCapSeries(companySource);
    } catch (error) {
      console.warn(`  CompaniesMarketCap 市值抓取失败：${error.message}`);
    }

    try {
      historicalNetAssetRows = await fetchCompaniesMarketCapNetAssetsSeries(companySource);
    } catch (error) {
      console.warn(`  CompaniesMarketCap 净资产抓取失败：${error.message}`);
    }

    try {
      const result = await fetchCompanyBalanceSheetRows(companySource.slug);
      balanceRows = result.rows;

      if (result.financialCurrency !== "USD") {
        const converted = await convertBalanceSheetRowsToUsd(balanceRows, result.financialCurrency);
        if (!converted) {
          console.warn(`  净资产口径为 ${result.financialCurrency}，当前无换算配置，已跳过`);
          balanceRows = [];
        } else {
          balanceRows = converted.rows;
        }
      }
    } catch (error) {
      console.warn(`  净资产抓取失败：${error.message}`);
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
      peChanges: 0,
      netAssetChanges: 0,
      roeChanges: 0,
      grossMarginChanges: 0,
      qualityFixChanges: 0,
      periodEndDateChanges: 0,
      changedPeriods: new Set(),
    };

    const revenueActual = new Set();
    const netIncomeActual = new Set();
    const grossMarginActual = new Set();
    const qualityReferencePeriods = [...periodSet].sort(comparePeriods);

    historicalBackfillRows.forEach((row) => {
      periodSet.add(row.period);

      if (!companyData.periodEndDates[row.period] && setPeriodEndDate(companyData, row.period, row.dateKey)) {
        companyStats.periodEndDateChanges += 1;
        companyStats.changedPeriods.add(row.period);
      }
      if (setReportDate(companyData, row.period, row.reportDate)) {
        companyStats.periodEndDateChanges += 1;
        companyStats.changedPeriods.add(row.period);
      }

      const useRevenue = isCompatibleHistoricalBackfillValue(
        companyData.revenue,
        qualityReferencePeriods,
        row.period,
        row.revenue,
      );
      const useNetIncome = isCompatibleHistoricalBackfillValue(
        companyData.earnings,
        qualityReferencePeriods,
        row.period,
        row.netIncome,
        6,
        0.15,
      );

      if (useRevenue && Number.isFinite(row.revenue)) {
        revenueActual.add(row.period);
        const changed = setSeriesValue(companyData.revenue, row.period, row.revenue);
        if (changed) {
          companyStats.revenueChanges += 1;
          companyStats.changedPeriods.add(row.period);
        }
      }

      if (useNetIncome && Number.isFinite(row.netIncome)) {
        netIncomeActual.add(row.period);
        const changed = setSeriesValue(companyData.earnings, row.period, row.netIncome);
        if (changed) {
          companyStats.netIncomeChanges += 1;
          companyStats.changedPeriods.add(row.period);
        }
      }

      if (useRevenue && Number.isFinite(row.grossMarginPct)) {
        grossMarginActual.add(row.period);
        const changed = setSeriesValue(companyData.grossMargin, row.period, row.grossMarginPct);
        if (changed) {
          companyStats.grossMarginChanges += 1;
          companyStats.changedPeriods.add(row.period);
        }
      }
    });

    secHistoryRows.forEach((row) => {
      periodSet.add(row.period);

      if (setPeriodEndDate(companyData, row.period, row.dateKey)) {
        companyStats.periodEndDateChanges += 1;
        companyStats.changedPeriods.add(row.period);
      }

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

      if (Number.isFinite(row.netAssets)) {
        const changed = setSeriesValue(companyData.netAssets, row.period, row.netAssets);
        if (changed) {
          companyStats.netAssetChanges += 1;
          companyStats.changedPeriods.add(row.period);
        }
      }

      if (setReportDate(companyData, row.period, row.reportDate)) {
        companyStats.periodEndDateChanges += 1;
        companyStats.changedPeriods.add(row.period);
      }
    });

    rows.forEach((row) => {
      periodSet.add(row.period);
      if (setPeriodEndDate(companyData, row.period, row.dateKey)) {
        companyStats.periodEndDateChanges += 1;
        companyStats.changedPeriods.add(row.period);
      }
      if (setReportDate(companyData, row.period, row.reportDate)) {
        companyStats.periodEndDateChanges += 1;
        companyStats.changedPeriods.add(row.period);
      }

      if (Number.isFinite(row.revenue)) {
        const currentRevenue = companyData.revenue[row.period];
        const keepPreferredActual =
          revenueActual.has(row.period) &&
          isConflictingActualValue(currentRevenue, row.revenue);
        if (!keepPreferredActual) {
          revenueActual.add(row.period);
          const changed = setSeriesValue(companyData.revenue, row.period, row.revenue);
          if (changed) {
            companyStats.revenueChanges += 1;
            companyStats.changedPeriods.add(row.period);
          }
        }
      }

      if (Number.isFinite(row.netIncome)) {
        const currentEarnings = companyData.earnings[row.period];
        const keepPreferredActual =
          netIncomeActual.has(row.period) &&
          isConflictingActualValue(Math.abs(currentEarnings), Math.abs(row.netIncome), 4, 0.25);
        if (!keepPreferredActual) {
          netIncomeActual.add(row.period);
          const changed = setSeriesValue(companyData.earnings, row.period, row.netIncome);
          if (changed) {
            companyStats.netIncomeChanges += 1;
            companyStats.changedPeriods.add(row.period);
          }
        }
      }

      if (Number.isFinite(row.grossMarginPct)) {
        const currentGrossMargin = companyData.grossMargin[row.period];
        const revenueConflict =
          revenueActual.has(row.period) &&
          isConflictingActualValue(companyData.revenue[row.period], row.revenue);
        const keepPreferredActual =
          grossMarginActual.has(row.period) &&
          Number.isFinite(currentGrossMargin) &&
          Math.abs(row.grossMarginPct - currentGrossMargin) > 25;
        if (!revenueConflict && !keepPreferredActual) {
          grossMarginActual.add(row.period);
          const changed = setSeriesValue(companyData.grossMargin, row.period, row.grossMarginPct);
          if (changed) {
            companyStats.grossMarginChanges += 1;
            companyStats.changedPeriods.add(row.period);
          }
        }
      }
    });

    ratioRows.forEach((row) => {
      if (!periodSet.has(row.period)) return;
      const changed = setSeriesValueIfMissing(companyData.pe, row.period, row.pe);
      if (changed) {
        companyStats.peChanges += 1;
        companyStats.changedPeriods.add(row.period);
      }
    });

    balanceRows.forEach((row) => {
      const changed = setSeriesValueIfMissing(companyData.netAssets, row.period, row.equity);
      if (changed) {
        companyStats.netAssetChanges += 1;
        companyStats.changedPeriods.add(row.period);
      }
    });

    historicalNetAssetRows.forEach((row) => {
      if (!periodSet.has(row.period)) return;
      const changed = setSeriesValueIfMissing(companyData.netAssets, row.period, row.equity);
      if (changed) {
        companyStats.netAssetChanges += 1;
        companyStats.changedPeriods.add(row.period);
      }
      if (!companyData.periodEndDates[row.period] && setPeriodEndDate(companyData, row.period, row.dateKey)) {
        companyStats.periodEndDateChanges += 1;
        companyStats.changedPeriods.add(row.period);
      }
    });

    const curatedCompany = curatedQuarterlyDataset.get(normalizeTickerForSec(companySource.ticker));
    if (curatedCompany) {
      const curatedResult = applyCuratedQuarterlyOverrides(companyData, curatedCompany);

      curatedResult.changedPeriods.forEach((period) => {
        periodSet.add(period);
        companyStats.changedPeriods.add(period);
      });

      curatedResult.revenuePeriods.forEach((period) => revenueActual.add(period));
      curatedResult.netIncomePeriods.forEach((period) => netIncomeActual.add(period));
      curatedResult.grossMarginPeriods.forEach((period) => grossMarginActual.add(period));

      companyStats.qualityFixChanges += curatedResult.changedPoints;

      if (curatedResult.changedPoints > 0) {
        console.log(
          `  已应用本地季度校验数据：${curatedResult.changedPoints} 个修正点，涉及 ${curatedResult.changedPeriods.size} 个季度`,
        );
      }
    }

    const officialHistoricalResult = applyOfficialHistoricalBackfillOverrides(
      companySource.id,
      companyData,
      historicalBackfillRows,
    );
    officialHistoricalResult.changedPeriods.forEach((period) => {
      periodSet.add(period);
      companyStats.changedPeriods.add(period);
    });
    officialHistoricalResult.revenuePeriods.forEach((period) => revenueActual.add(period));
    officialHistoricalResult.netIncomePeriods.forEach((period) => netIncomeActual.add(period));
    officialHistoricalResult.grossMarginPeriods.forEach((period) => grossMarginActual.add(period));
    companyStats.qualityFixChanges += officialHistoricalResult.changedPoints;

    if (officialHistoricalResult.changedPoints > 0) {
      console.log(
        `  已应用官方历史季度修正：${officialHistoricalResult.changedPoints} 个修正点，涉及 ${officialHistoricalResult.changedPeriods.size} 个季度`,
      );
    }

    clearCompanyDataThroughPeriod(companyData, companySource.replaceThroughPeriod);

    const officialOverrideResult = applyOfficialQuarterlyOverrides(companySource.id, companyData);
    officialOverrideResult.changedPeriods.forEach((period) => {
      periodSet.add(period);
      companyStats.changedPeriods.add(period);
    });
    officialOverrideResult.revenuePeriods.forEach((period) => revenueActual.add(period));
    officialOverrideResult.netIncomePeriods.forEach((period) => netIncomeActual.add(period));
    officialOverrideResult.grossMarginPeriods.forEach((period) => grossMarginActual.add(period));
    companyStats.qualityFixChanges += officialOverrideResult.changedPoints;

    if (officialOverrideResult.changedPoints > 0) {
      console.log(
        `  已应用官方季度修正：${officialOverrideResult.changedPoints} 个修正点，涉及 ${officialOverrideResult.changedPeriods.size} 个季度`,
      );
    }

    const derivedPeResult = deriveMissingPeFromMarketCap(
      companyData,
      [...periodSet].sort(comparePeriods),
      marketCapRows,
    );
    derivedPeResult.changedPeriods.forEach((period) => companyStats.changedPeriods.add(period));
    companyStats.peChanges += derivedPeResult.changedPoints;

    if (derivedPeResult.changedPoints > 0) {
      console.log(`  已按历史市值 / TTM 净利润补齐 P/E：${derivedPeResult.changedPoints} 个季度`);
    }

    const roePeriods = new Set([...Object.keys(companyData.earnings), ...Object.keys(companyData.netAssets)]);
    roePeriods.forEach((period) => {
      const earnings = companyData.earnings[period];
      const netAssets = companyData.netAssets[period];
      const roe = Number.isFinite(earnings) && Number.isFinite(netAssets) && netAssets !== 0
        ? (earnings / netAssets) * 100
        : null;
      const changed = shouldRefreshHistoricalSeries
        ? setSeriesValue(companyData.roe, period, roe)
        : setSeriesValueIfMissing(companyData.roe, period, roe);
      if (changed) {
        companyStats.roeChanges += 1;
        companyStats.changedPeriods.add(period);
      }
    });

    clearForecastFlags(companyData, "revenue", revenueActual);
    clearForecastFlags(companyData, "netIncome", netIncomeActual);
    clearForecastFlags(companyData, "grossMargin", grossMarginActual);

    const sanitized = sanitizeSeriesQuality(companyData);
    sanitized.changedPeriods.forEach((period) => companyStats.changedPeriods.add(period));
    companyStats.qualityFixChanges += sanitized.changedPoints;

    if (sanitized.changedPoints > 0) {
      console.log(
        `  已清洗异常值：${sanitized.changedPoints} 个修正点，涉及 ${sanitized.changedPeriods.size} 个季度`,
      );
    }

    const trimmed = trimLeadingDisconnectedSeries(companyData, [...periodSet].sort(comparePeriods));
    trimmed.changedPeriods.forEach((period) => companyStats.changedPeriods.add(period));
    companyStats.qualityFixChanges += trimmed.changedPoints;

    if (trimmed.changedPoints > 0) {
      console.log(
        `  已移除前段孤立点：${trimmed.changedPoints} 个修正点，涉及 ${trimmed.changedPeriods.size} 个季度`,
      );
    }

    growthCompanyIds.add(companySource.id);

    companyData.revenue = sortObjectByPeriodKeys(companyData.revenue, periodSet);
    companyData.earnings = sortObjectByPeriodKeys(companyData.earnings, periodSet);
    companyData.pe = sortObjectByPeriodKeys(companyData.pe, periodSet);
    companyData.netAssets = sortObjectByPeriodKeys(companyData.netAssets, periodSet);
    companyData.roe = sortObjectByPeriodKeys(companyData.roe, periodSet);
    companyData.grossMargin = sortObjectByPeriodKeys(companyData.grossMargin, periodSet);
    companyData.periodEndDates = sortObjectByPeriodKeys(companyData.periodEndDates, periodSet);
    companyData.reportDates = sortObjectByPeriodKeys(companyData.reportDates, periodSet);

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

  growthCompanyIds.forEach((companyId) => {
    const companyData = data.companies[companyId];
    if (!companyData) return;
    ensureCompanyShape(companyData);

    recomputeRevenueGrowthForPeriods(companyData, sortedPeriods, new Set(sortedPeriods));
    companyData.revenueGrowth = sortObjectByPeriodKeys(companyData.revenueGrowth);
  });

  selectedCompanies.forEach((companySource) => {
    if (!companySource.minPeriod) return;
    const companyData = data.companies[companySource.id];
    if (!companyData) return;
    ensureCompanyShape(companyData);
    pruneCompanyDataBeforePeriod(companyData, companySource.minPeriod);
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
