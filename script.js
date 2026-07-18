const sourceData = window.FINANCIAL_SOURCE_DATA;
const FinancialMetricsUtils = window.FinancialMetricsUtils;

const UI_TRANSLATIONS = {
  zh: {
    pageTitle: "美股科技与头部市值公司财务数据可视化",
    pageInfo: "页面信息",
    coverageLabel: "覆盖范围",
    coverageValue: "44 家科技与头部市值公司",
    rangeLabel: "区间",
    modeLabel: "模式",
    modeValue: "季度 / 年度 / 滚动年化",
    sourceSummary: "查看数据口径与来源",
    sourceNote: "数据来源：SEC CompanyFacts、CompaniesMarketCap、StockAnalysis。口径：营收与净利润为季度财报数据（美元）；毛利率按毛利润/营收计算；市盈率为报告期估值指标；ROE 按净利润/净资产计算；营收与利润增速均为同比，跨越盈亏平衡点或绝对同比超过 1,000% 时视为不可比并留空。支持季度、年度与滚动年化浏览。",
    viewSettings: "视图设置",
    timeGranularity: "时间粒度",
    frequencySwitch: "时间粒度切换",
    quarterly: "季度",
    annual: "年度",
    rollingAnnual: "滚动年化",
    companyDisplay: "公司显示",
    searchCompany: "搜索企业",
    searchPlaceholder: "搜索企业名称或股票代码",
    companySwitches: "公司显示开关",
    generate: "生成",
    showAll: "全部显示",
    hideAll: "全部隐藏",
    hint: "提示：首屏默认展示完整历史，可切换季度/年度/滚动年化，并通过底部双端滑块聚焦时间区间。",
    dataSourceLink: "数据来源链接",
    chartKicker: "对比视角",
    financialTrendComparison: "财务趋势对比",
    singleCompanyView: "单公司视图",
    chartTypeSwitch: "图表类型切换",
    line: "折线",
    bar: "柱状",
    assistiveReading: "辅助阅读",
    priceComparison: "股价对比",
    growthOverlay: "增速",
    growthAxis: "同比增速（%）",
    showGrowthOverlay: "显示{metric}同比增速",
    hideGrowthOverlay: "隐藏{metric}同比增速",
    exportPng: "导出 PNG",
    currentViewSummary: "当前视图摘要",
    currentMetric: "当前指标",
    currentFrequency: "时间粒度",
    currentCompanies: "当前公司",
    dataUpdated: "数据更新",
    metricSwitch: "指标切换",
    revenue: "营收",
    netIncome: "净利润",
    grossMargin: "毛利率",
    revenueGrowth: "营收增速",
    profitGrowth: "利润增速",
    chartAria: "美股头部市值公司财务指标对比图",
    timeRangeSlider: "时间区间滑块",
    displayRange: "显示区间",
    startTime: "开始时间",
    endTime: "结束时间",
    loading: "正在加载数据...",
    noData: "无数据",
    stockPrice: "股价",
    priceAxis: "股价（USD）",
    forecastSuffix: "（预测）",
    noMatchingCompanies: "未找到匹配企业",
    unknownTime: "未知时间",
    lightTheme: "明亮模式",
    deepTheme: "深色模式",
    switchToLightTheme: "切换至明亮主题",
    switchToDeepTheme: "切换至深色主题",
    switchLanguage: "Switch to English",
    switchLanguageLabel: "EN",
    priceEnableFailed: "股价对比开启失败：{message}",
    chartNotReady: "图表尚未加载完成，暂时无法下载。",
    chartCanvasUnavailable: "图表画布不可用，暂时无法下载。",
    exportContextFailed: "导出失败：无法创建图片上下文。",
    exporting: "正在导出高清图片（{scale}x）...",
    exportRenderFailed: "导出失败：高清重绘未完成。",
    downloaded: "已下载：{filename}",
    priceDataNotLoaded: "股价数据文件尚未载入，请刷新页面后重试。",
    selectSingleCompany: "请选择单一公司后再开启股价对比。",
    noDailyPrice: "暂无 {company} 的股价日线数据。",
    noPriceInRange: "当前区间暂无可用股价数据，已保留财务柱状图。",
    priceOverlayEnabled: "股价对比已开启：{count} 个日线点。",
    loaded: "数据更新于 {stamp}，共载入 {count} 家公司，预测补点 {forecastCount} 个。",
    loadedWithWarnings: "已载入 {loadedCount}/{count} 家公司，数据更新于 {stamp}。另有 {warningCount} 家存在缺失数据。",
    localDataMissing: "未检测到本地 data.js 数据对象",
    companyDataMissing: "{company} 缺少本地数据",
    localDataEmpty: "本地数据为空，请重新生成 data.js",
    loadFailed: "加载失败：{message}",
  },
  en: {
    pageTitle: "Financial Data Visualization for Leading U.S.-Listed Companies",
    pageInfo: "Page information",
    coverageLabel: "Coverage",
    coverageValue: "44 technology and large-cap companies",
    rangeLabel: "Range",
    modeLabel: "Mode",
    modeValue: "Quarterly / Annual / Rolling Annual",
    sourceSummary: "View methodology and sources",
    sourceNote: "Sources: SEC CompanyFacts, CompaniesMarketCap, and StockAnalysis. Revenue and net income use quarterly reported data in USD; gross margin is gross profit divided by revenue; P/E is the valuation metric for the reporting period; ROE is net income divided by net assets; revenue and profit growth are year over year. Growth that crosses break-even or exceeds 1,000% in absolute terms is treated as not meaningful and left blank. Quarterly, annual, and rolling-annual views are supported.",
    viewSettings: "View Settings",
    timeGranularity: "Time Granularity",
    frequencySwitch: "Time granularity switch",
    quarterly: "Quarterly",
    annual: "Annual",
    rollingAnnual: "Rolling Annual",
    companyDisplay: "Companies",
    searchCompany: "Search companies",
    searchPlaceholder: "Search by company name or ticker",
    companySwitches: "Company visibility toggles",
    generate: "Generate",
    showAll: "Show All",
    hideAll: "Hide All",
    hint: "Tip: The initial view shows the full history. Switch among quarterly, annual, and rolling-annual views, or use the dual range slider below to focus the timeline.",
    dataSourceLink: "Data source links",
    chartKicker: "Comparative Lens",
    financialTrendComparison: "Financial Trend Comparison",
    singleCompanyView: "Single-Company View",
    chartTypeSwitch: "Chart type switch",
    line: "Line",
    bar: "Bar",
    assistiveReading: "Context",
    priceComparison: "Price Overlay",
    growthOverlay: "Growth",
    growthAxis: "YoY Growth (%)",
    showGrowthOverlay: "Show {metric} year-over-year growth",
    hideGrowthOverlay: "Hide {metric} year-over-year growth",
    exportPng: "Export PNG",
    currentViewSummary: "Current view summary",
    currentMetric: "Metric",
    currentFrequency: "Frequency",
    currentCompanies: "Companies",
    dataUpdated: "Data Updated",
    metricSwitch: "Metric switch",
    revenue: "Revenue",
    netIncome: "Net Income",
    grossMargin: "Gross Margin",
    revenueGrowth: "Revenue Growth",
    profitGrowth: "Profit Growth",
    chartAria: "Financial metric comparison chart for leading U.S.-listed companies",
    timeRangeSlider: "Time range slider",
    displayRange: "Display Range",
    startTime: "Start time",
    endTime: "End time",
    loading: "Loading data...",
    noData: "No data",
    stockPrice: "Stock Price",
    priceAxis: "Stock Price (USD)",
    forecastSuffix: " (Forecast)",
    noMatchingCompanies: "No matching companies found",
    unknownTime: "Unknown time",
    lightTheme: "Light",
    deepTheme: "Dark",
    switchToLightTheme: "Switch to light theme",
    switchToDeepTheme: "Switch to dark theme",
    switchLanguage: "切换到中文",
    switchLanguageLabel: "中文",
    priceEnableFailed: "Failed to enable the price overlay: {message}",
    chartNotReady: "The chart is not ready to download yet.",
    chartCanvasUnavailable: "The chart canvas is unavailable.",
    exportContextFailed: "Export failed: unable to create an image context.",
    exporting: "Exporting a high-resolution image ({scale}x)...",
    exportRenderFailed: "Export failed: high-resolution rendering did not complete.",
    downloaded: "Downloaded: {filename}",
    priceDataNotLoaded: "The stock-price data file is not loaded. Refresh the page and try again.",
    selectSingleCompany: "Select one company before enabling the price overlay.",
    noDailyPrice: "No daily stock-price data is available for {company}.",
    noPriceInRange: "No stock-price data is available in the current range; the financial bars remain visible.",
    priceOverlayEnabled: "Price overlay enabled: {count} daily points.",
    loaded: "Data updated {stamp}. Loaded {count} companies with {forecastCount} forecast points.",
    loadedWithWarnings: "Loaded {loadedCount}/{count} companies; data updated {stamp}. {warningCount} companies have missing data.",
    localDataMissing: "The local data.js object was not found",
    companyDataMissing: "Local data is missing for {company}",
    localDataEmpty: "Local data is empty. Regenerate data.js",
    loadFailed: "Loading failed: {message}",
  },
};

function readInitialLanguage() {
  try {
    return localStorage.getItem("tech-analysis-language") === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

let currentLanguage = readInitialLanguage();

function t(key, values = {}) {
  const template = UI_TRANSLATIONS[currentLanguage]?.[key] ?? UI_TRANSLATIONS.zh[key] ?? key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

function getLabelSeparator() {
  return currentLanguage === "en" ? ": " : "：";
}

function buildPeriods(startYear, endYear) {
  const periods = [];
  for (let year = startYear; year <= endYear; year += 1) {
    for (let q = 1; q <= 4; q += 1) periods.push(`${year}Q${q}`);
  }
  return periods;
}

const QUARTER_LABELS = Array.isArray(sourceData?.periods) && sourceData.periods.length > 0
  ? sourceData.periods
  : buildPeriods(2005, 2025);

const ANNUAL_LABELS = [...new Set(QUARTER_LABELS.map((p) => p.slice(0, 4)))];

const FREQUENCY_META = {
  quarterly: {
    axisTitle: "QTR",
    granularityLabel: "季度",
    tooltipPrefix: "QTR",
    csvPeriodicity: "Quarterly",
    csvPeriodColumn: "Period",
    fileToken: "quarterly",
  },
  annual: {
    axisTitle: "FY",
    granularityLabel: "年度",
    tooltipPrefix: "FY",
    csvPeriodicity: "Annual",
    csvPeriodColumn: "Year",
    fileToken: "annual",
  },
  rollingAnnual: {
    axisTitle: "TTM QTR",
    granularityLabel: "滚动年化",
    tooltipPrefix: "TTM",
    csvPeriodicity: "RollingAnnual (TTM)",
    csvPeriodColumn: "Period",
    fileToken: "rolling-annual",
  },
};

const COMPANIES = [
  { id: "nvidia", name: "英伟达", ticker: "NVDA", color: "#9be000", logoColor: "#76b900", logoPath: "assets/logos/nvidia.svg?v=20260629-visible-area-v4" },
  { id: "alphabet", name: "谷歌", ticker: "GOOGL", color: "#2fd4b0", logoColor: "#4285f4", preserveLightLogoColors: true, logoPath: "assets/logos/alphabet.svg?v=20260717-brand-colors-v5" },
  { id: "apple", name: "苹果", ticker: "AAPL", color: "#ff9f1c", logoColor: "#000000", logoPath: "assets/logos/apple.svg?v=20260629-visible-area-v4" },
  { id: "microsoft", name: "微软", ticker: "MSFT", color: "#57a0ff", logoColor: "#737373", preserveLightLogoColors: true, logoPath: "assets/logos/microsoft.svg?v=20260629-visible-area-v4" },
  { id: "amazon", name: "亚马逊", ticker: "AMZN", color: "#ffd166", logoColor: "#ff9900", preserveLightLogoColors: true, logoPath: "assets/logos/amazon.svg?v=20260629-visible-area-v4" },
  { id: "avgo", name: "博通", ticker: "AVGO", color: "#b8a1ff", logoColor: "#cc092f", logoPath: "assets/logos/avgo.svg?v=20260629-visible-area-v4" },
  { id: "meta", name: "Meta", ticker: "META", color: "#ff5f87", logoColor: "#0866ff", logoPath: "assets/logos/meta.svg?v=20260629-visible-area-v4" },
  { id: "tsmc", name: "台积电", ticker: "TSM", color: "#35d0ff", logoColor: "#e60012", logoPath: "assets/logos/tsmc.svg?v=20260629-visible-area-v4" },
  { id: "tsla", name: "特斯拉", ticker: "TSLA", color: "#ff5a3d", logoColor: "#e82127", logoPath: "assets/logos/tsla.svg?v=20260629-visible-area-v4" },
  { id: "walmart", name: "沃尔玛", ticker: "WMT", color: "#86d63b", logoColor: "#0071ce", preserveLightLogoColors: true, logoPath: "assets/logos/walmart.svg?v=20260717-brand-colors-v5" },
  { id: "berkshire", name: "伯克希尔", ticker: "BRK.B", color: "#caa96b", logoColor: "#003f73", logoPath: "assets/logos/berkshire.svg?v=20260629-visible-area-v4" },
  { id: "jpmorgan", name: "摩根大通", ticker: "JPM", color: "#2aa6a4", logoColor: "#005eb8", logoPath: "assets/logos/jpmorgan.svg?v=20260629-visible-area-v4" },
  { id: "lilly", name: "礼来", ticker: "LLY", color: "#ff6b6b", logoColor: "#d52b1e", logoPath: "assets/logos/lilly.svg?v=20260629-visible-area-v4" },
  { id: "exxon", name: "埃克森美孚", ticker: "XOM", color: "#ff7058", logoColor: "#ed1b2f", logoPath: "assets/logos/exxon.svg?v=20260629-visible-area-v4" },
  { id: "visa", name: "Visa", ticker: "V", color: "#4d6bff", logoColor: "#1434cb", logoPath: "assets/logos/visa.svg?v=20260629-visible-area-v4" },
  { id: "asml", name: "阿斯麦", ticker: "ASML", color: "#58c4dd", logoColor: "#0074c8", logoPath: "assets/logos/asml.svg?v=20260629-visible-area-v4" },
  { id: "micron", name: "美光", ticker: "MU", color: "#8b7dff", logoColor: "#0057b8", logoPath: "assets/logos/micron.svg?v=20260629-visible-area-v4" },
  { id: "jnj", name: "强生", ticker: "JNJ", color: "#ff4d6d", logoColor: "#d71920", logoPath: "assets/logos/jnj.svg?v=20260629-visible-area-v4" },
  { id: "oracle", name: "甲骨文", ticker: "ORCL", color: "#f45d48", logoColor: "#f80000", logoPath: "assets/logos/oracle.svg?v=20260629-visible-area-v4" },
  { id: "amd", name: "AMD", ticker: "AMD", color: "#66d17a", logoColor: "#000000", logoPath: "assets/logos/amd.svg?v=20260629-visible-area-v4" },
  { id: "mastercard", name: "万事达", ticker: "MA", color: "#ff9d57", logoColor: "#eb001b", preserveLightLogoColors: true, logoPath: "assets/logos/mastercard.svg?v=20260717-brand-colors-v5" },
  { id: "costco", name: "好市多", ticker: "COST", color: "#e0709e", logoColor: "#e31837", preserveLightLogoColors: true, logoPath: "assets/logos/costco.svg?v=20260717-brand-colors-v5" },
  { id: "netflix", name: "奈飞", ticker: "NFLX", color: "#e50914", logoColor: "#e50914", logoPath: "assets/logos/netflix.svg?v=20260629-visible-area-v4" },
  { id: "bankofamerica", name: "美国银行", ticker: "BAC", color: "#7aa6ff", logoColor: "#e31837", preserveLightLogoColors: true, logoPath: "assets/logos/bankofamerica.svg?v=20260717-brand-colors-v5" },
  { id: "caterpillar", name: "卡特彼勒", ticker: "CAT", color: "#d8b04c", logoColor: "#1a1a1a", preserveLightLogoColors: true, logoPath: "assets/logos/caterpillar.svg?v=20260717-brand-colors-v5" },
  { id: "chevron", name: "雪佛龙", ticker: "CVX", color: "#5fb3d9", logoColor: "#0054a6", preserveLightLogoColors: true, logoPath: "assets/logos/chevron.svg?v=20260717-brand-colors-v5" },
  { id: "palantir", name: "Palantir", ticker: "PLTR", color: "#b877ff", logoColor: "#101820", logoPath: "assets/logos/palantir.svg?v=20260629-visible-area-v4" },
  { id: "cisco", name: "思科", ticker: "CSCO", color: "#4fb6c2", logoColor: "#1ba0d7", logoPath: "assets/logos/cisco.svg?v=20260629-visible-area-v4" },
  { id: "abbvie", name: "艾伯维", ticker: "ABBV", color: "#7f78d2", logoColor: "#071d49", logoPath: "assets/logos/abbvie.svg?v=20260629-visible-area-v4" },
  { id: "homedepot", name: "家得宝", ticker: "HD", color: "#f97316", logoColor: "#f96302", logoPath: "assets/logos/homedepot.svg?v=20260629-visible-area-v4" },
  { id: "ibm", name: "IBM", ticker: "IBM", color: "#648fff", logoColor: "#0f62fe", logoPath: "assets/logos/ibm.svg?v=20260629-visible-area-v4" },
  { id: "sap", name: "SAP", ticker: "SAP", color: "#00b8f1", logoColor: "#008fd3", logoPath: "assets/logos/sap.svg?v=20260629-visible-area-v4" },
  { id: "crowdstrike", name: "CrowdStrike", ticker: "CRWD", color: "#ff5a67", logoColor: "#fc0000", logoPath: "assets/logos/crowdstrike.svg?v=20260629-visible-area-v4" },
  { id: "salesforce", name: "Salesforce", ticker: "CRM", color: "#1fb6ff", logoColor: "#00a1e0", logoPath: "assets/logos/salesforce.svg?v=20260629-visible-area-v4" },
  { id: "servicenow", name: "ServiceNow", ticker: "NOW", color: "#7ee787", logoColor: "#3a7d44", logoPath: "assets/logos/servicenow.svg?v=20260629-visible-area-v4" },
  { id: "datadog", name: "Datadog", ticker: "DDOG", color: "#9b87f5", logoColor: "#632ca6", logoPath: "assets/logos/datadog.svg?v=20260629-visible-area-v4" },
  { id: "snowflake", name: "Snowflake", ticker: "SNOW", color: "#29b5e8", logoColor: "#29b5e8", logoPath: "assets/logos/snowflake.svg?v=20260629-visible-area-v4" },
  { id: "cloudflare", name: "Cloudflare", ticker: "NET", color: "#f48120", logoColor: "#f48120", preserveLightLogoColors: true, logoPath: "assets/logos/cloudflare.svg?v=20260717-brand-colors-v5" },
  { id: "adobe", name: "Adobe", ticker: "ADBE", color: "#ff3366", logoColor: "#eb1000", preserveLightLogoColors: true, logoPath: "assets/logos/adobe.svg?v=20260629-visible-area-v4" },
  { id: "zoom", name: "Zoom", ticker: "ZM", color: "#6b8cff", logoColor: "#2d8cff", logoPath: "assets/logos/zoom.svg?v=20260629-visible-area-v4" },
  { id: "coreweave", name: "CoreWeave", ticker: "CRWV", color: "#01d1ff", logoColor: "#000000", logoPath: "assets/logos/coreweave.svg?v=20260629-visible-area-v4" },
  { id: "nebius", name: "Nebius", ticker: "NBIS", color: "#b9ff38", logoColor: "#000000", logoPath: "assets/logos/nebius.svg?v=20260629-visible-area-v4" },
  { id: "chronoscale", name: "ChronoScale", ticker: "CHRN", color: "#768cff", logoColor: "#4f46e5", logoPath: "assets/logos/chronoscale.svg?v=20260629-visible-area-v4" },
  { id: "sharonai", name: "SharonAI", ticker: "SHAZ", color: "#ffbd3f", logoColor: "#d97706", logoPath: "assets/logos/sharonai.svg?v=20260629-visible-area-v4" },
];
const COMPANY_ENGLISH_NAMES = {
  nvidia: "NVIDIA",
  alphabet: "Alphabet",
  apple: "Apple",
  microsoft: "Microsoft",
  amazon: "Amazon",
  avgo: "Broadcom",
  meta: "Meta",
  tsmc: "TSMC",
  tsla: "Tesla",
  walmart: "Walmart",
  berkshire: "Berkshire Hathaway",
  jpmorgan: "JPMorgan Chase",
  lilly: "Eli Lilly",
  exxon: "Exxon Mobil",
  visa: "Visa",
  asml: "ASML",
  micron: "Micron",
  jnj: "Johnson & Johnson",
  oracle: "Oracle",
  amd: "AMD",
  mastercard: "Mastercard",
  costco: "Costco",
  netflix: "Netflix",
  bankofamerica: "Bank of America",
  caterpillar: "Caterpillar",
  chevron: "Chevron",
  palantir: "Palantir",
  cisco: "Cisco",
  abbvie: "AbbVie",
  homedepot: "Home Depot",
  ibm: "IBM",
  sap: "SAP",
  crowdstrike: "CrowdStrike",
  salesforce: "Salesforce",
  servicenow: "ServiceNow",
  datadog: "Datadog",
  snowflake: "Snowflake",
  cloudflare: "Cloudflare",
  adobe: "Adobe",
  zoom: "Zoom",
  coreweave: "CoreWeave",
  nebius: "Nebius",
  chronoscale: "ChronoScale",
  sharonai: "SharonAI",
};

function getCompanyName(company) {
  if (!company) return "";
  return currentLanguage === "en"
    ? (COMPANY_ENGLISH_NAMES[company.id] ?? company.name)
    : company.name;
}

const COMPANY_META = new Map(COMPANIES.map((company) => [company.id, company]));
const COMPANY_CATEGORIES = [
  { id: "mag7", label: "MAG7", companyIds: ["nvidia", "alphabet", "apple", "microsoft", "amazon", "meta", "tsla"] },
  { id: "software", label: "软件", companyIds: ["oracle", "palantir", "ibm", "sap", "crowdstrike", "salesforce", "servicenow", "datadog", "adobe", "zoom"], labelEn: "Software" },
  { id: "cloud", label: "云服务", companyIds: ["snowflake", "cloudflare", "coreweave", "nebius", "chronoscale", "sharonai"], labelEn: "Cloud" },
  { id: "semiconductor", label: "半导体", companyIds: ["avgo", "tsmc", "asml", "micron", "amd"], labelEn: "Semiconductors" },
  { id: "other", label: "其他", companyIds: [], labelEn: "Other" },
];

function getCategoryLabel(category) {
  return currentLanguage === "en" ? (category.labelEn ?? category.label) : category.label;
}
const CATEGORIZED_COMPANY_IDS = new Set(COMPANY_CATEGORIES.flatMap((category) => category.companyIds));
COMPANY_CATEGORIES.find((category) => category.id === "other").companyIds = COMPANIES
  .map((company) => company.id)
  .filter((companyId) => !CATEGORIZED_COMPANY_IDS.has(companyId));
const {
  DEFAULT_INITIAL_COMPANIES,
  DEFAULT_INITIAL_VIEW,
  cloneCompanySet,
  setPendingCompanyVisibility,
  setAllPendingCompanyVisibility,
  applyPendingCompanies,
  shouldResetRangeAfterApplyingCompanies,
  getDisplayPeriodStart,
  findLongestContiguousDataRange,
} = window.CompanySelectionUtils;

const DEFAULT_VISIBLE_COMPANIES = DEFAULT_INITIAL_COMPANIES;
const { calculateVisibleLogoLayout } = window.LogoLayoutUtils;
const COMPANY_PRESETS = {
  focus: DEFAULT_VISIBLE_COMPANIES,
  ai: ["microsoft", "nvidia", "amazon", "meta"],
  all: COMPANIES.map((company) => company.id),
};
const BAR_CHART_LOGO_LEFT = 14;
const BAR_CHART_LOGO_TARGET_AREA = 62 * 62;
const BAR_CHART_LOGO_MAX_WIDTH = 220;
const BAR_CHART_LOGO_MAX_HEIGHT = 62;
const BAR_CHART_BADGE_VERTICAL_OFFSET = 32;
const LOGO_MEASURE_MAX_DIMENSION = 512;
const LOGO_ALPHA_THRESHOLD = 8;
const companyLogoCache = new Map();
const companyLogoLoadState = new Map();
const companyLogoBoundsCache = new WeakMap();

function getCompanyLogo(companyId) {
  return companyLogoCache.get(companyId) ?? null;
}

function loadCompanyLogo(company) {
  if (!company?.id || !company.logoPath) return;
  if (companyLogoCache.has(company.id) || companyLogoLoadState.has(company.id)) return;

  const img = new Image();
  const loadPromise = new Promise((resolve) => {
    img.onload = () => {
      companyLogoCache.set(company.id, img);
      companyLogoLoadState.delete(company.id);
      if (state.chart) state.chart.update("none");
      resolve(img);
    };
    img.onerror = () => {
      companyLogoLoadState.delete(company.id);
      resolve(null);
    };
  });

  companyLogoLoadState.set(company.id, loadPromise);
  img.decoding = "async";
  img.src = company.logoPath;
}

function preloadCompanyLogos() {
  COMPANIES.forEach((company) => {
    loadCompanyLogo(company);
  });
}

function measureOpaqueLogoBounds(image) {
  const cached = companyLogoBoundsCache.get(image);
  if (cached) return cached;

  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) return null;

  const measureScale = Math.min(1, LOGO_MEASURE_MAX_DIMENSION / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * measureScale));
  const height = Math.max(1, Math.round(naturalHeight * measureScale));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const pixels = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] <= LOGO_ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  const bounds = maxX >= minX && maxY >= minY
    ? {
      x: minX / measureScale,
      y: minY / measureScale,
      width: (maxX - minX + 1) / measureScale,
      height: (maxY - minY + 1) / measureScale,
    }
    : { x: 0, y: 0, width: naturalWidth, height: naturalHeight };
  companyLogoBoundsCache.set(image, bounds);
  return bounds;
}

function getCompanyLogoLayout(image, targetArea) {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) return null;

  return calculateVisibleLogoLayout({
    sourceWidth: naturalWidth,
    sourceHeight: naturalHeight,
    bounds: measureOpaqueLogoBounds(image),
    targetVisibleArea: targetArea,
    maxVisibleWidth: BAR_CHART_LOGO_MAX_WIDTH,
    maxVisibleHeight: BAR_CHART_LOGO_MAX_HEIGHT,
  });
}

function drawMonochromeLogo(ctx, chart, image, x, y, targetArea, color) {
  if (!image) return false;

  const layout = getCompanyLogoLayout(image, targetArea);
  if (!layout) return false;
  const width = Math.max(1, layout.drawWidth);
  const height = Math.max(1, layout.drawHeight);
  const offsetX = x + layout.offsetX;
  const offsetY = y + layout.offsetY;
  const pixelRatio = Math.max(chart.currentDevicePixelRatio || window.devicePixelRatio || 1, 1);
  const buffer = document.createElement("canvas");
  const bufferCtx = buffer.getContext("2d");
  if (!bufferCtx) return false;

  buffer.width = Math.max(1, Math.round(width * pixelRatio));
  buffer.height = Math.max(1, Math.round(height * pixelRatio));
  bufferCtx.scale(pixelRatio, pixelRatio);
  bufferCtx.clearRect(0, 0, width, height);
  bufferCtx.drawImage(image, 0, 0, width, height);
  bufferCtx.globalCompositeOperation = "source-in";
  bufferCtx.fillStyle = color;
  bufferCtx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.98;
  ctx.drawImage(buffer, offsetX, offsetY, width, height);
  ctx.restore();
  return true;
}

function drawOriginalLogo(ctx, chart, image, x, y, targetArea) {
  if (!image) return false;

  const layout = getCompanyLogoLayout(image, targetArea);
  if (!layout) return false;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(
    image,
    x + layout.offsetX,
    y + layout.offsetY,
    Math.max(1, layout.drawWidth),
    Math.max(1, layout.drawHeight),
  );
  ctx.restore();
  return true;
}

function drawSingleCompanyLogoBadge(
  ctx,
  chart,
  chartArea,
  company,
  chartFontFamily,
  badgeVerticalPosition = "top",
) {
  if (!company) return false;

  const compact = isCompactChartLayout();
  const badgeX = chartArea.left + (compact ? 7 : BAR_CHART_LOGO_LEFT);
  const badgeY = badgeVerticalPosition === "bottom"
    ? chartArea.bottom - (compact ? 20 : BAR_CHART_BADGE_VERTICAL_OFFSET)
    : chartArea.top + (compact ? 20 : BAR_CHART_BADGE_VERTICAL_OFFSET);
  const targetArea = compact ? 36 * 36 : BAR_CHART_LOGO_TARGET_AREA;
  const logoImage = getCompanyLogo(company.id);
  const isLightTheme = getActiveTheme() === "light";
  const logoColor = isLightTheme
    ? company.logoColor || getChartThemeTokens().logoColor
    : getChartThemeTokens().logoColor;
  const useOriginalLogoColors = company.preserveLogoColors
    || (isLightTheme && company.preserveLightLogoColors);

  if (
    logoImage &&
    (useOriginalLogoColors
      ? drawOriginalLogo(
        ctx,
        chart,
        logoImage,
        badgeX,
        badgeY,
        targetArea,
      )
      : drawMonochromeLogo(
        ctx,
        chart,
        logoImage,
        badgeX,
        badgeY,
        targetArea,
        logoColor,
      ))
  ) {
    return true;
  }

  ctx.save();
  ctx.font = `700 12px ${chartFontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = logoColor;
  ctx.fillText(`${getCompanyName(company)} ${company.ticker}`, badgeX, badgeY);
  ctx.restore();
  return false;
}

const rightTickerLabelsPlugin = {
  id: "rightTickerLabels",
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const effectiveChartMode = getEffectiveChartMode();
    const singleCompanyId = getSingleVisibleCompanyId();
    const css = getComputedStyle(document.body);
    const tickerStroke = css.getPropertyValue("--ticker-stroke").trim() || "rgba(9, 14, 22, 0.88)";
    const chartFontFamily =
      css.getPropertyValue("--font-chart").trim() || css.getPropertyValue("--font-main").trim() || '"Plus Jakarta Sans", sans-serif';
    const isDeepTheme = document.body.dataset.theme === "deep";
    const labelColor = css.getPropertyValue("--chart-label-color").trim() || "#f4f7fb";

    if (singleCompanyId) {
      const company = COMPANY_META.get(singleCompanyId);
      const companyDataset = chart.data.datasets.find(
        (item) => item.companyId === singleCompanyId && !item.hidden,
      );
      if (!company || !companyDataset) return;

      const companyValues = companyDataset.data.map((item) => (
        typeof item === "object" && item !== null ? item.y : item
      ));
      const badgeVerticalPosition = PriceComparisonUtils.shouldPlaceCompanyBadgeAtBottom({
        chartMode: effectiveChartMode,
        values: companyValues,
      }) ? "bottom" : "top";

      drawSingleCompanyLogoBadge(
        ctx,
        chart,
        chartArea,
        company,
        chartFontFamily,
        badgeVerticalPosition,
      );

      if (effectiveChartMode === "bar") {
        return;
      }
    }

    const labels = [];

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      if (dataset.hidden) return;
      const company = COMPANY_META.get(dataset.companyId);
      if (!company?.ticker) return;

      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;

      let endPoint = null;
      for (let idx = dataset.data.length - 1; idx >= 0; idx -= 1) {
        const value = dataset.data[idx];
        const point = meta.data[idx];
        if (!Number.isFinite(value) || !point || point.skip) continue;
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        endPoint = point;
        break;
      }

      if (!endPoint) return;

      labels.push({
        ticker: company.ticker,
        y: endPoint.y,
      });
    });

    if (labels.length === 0) return;

    labels.sort((a, b) => a.y - b.y);
    const minGap = 13;
    const topBound = chartArea.top + 8;
    const bottomBound = chartArea.bottom - 8;

    labels.forEach((item, index) => {
      if (index === 0) {
        item.y = Math.max(item.y, topBound);
        return;
      }
      item.y = Math.max(item.y, labels[index - 1].y + minGap);
    });

    for (let index = labels.length - 1; index >= 0; index -= 1) {
      if (index === labels.length - 1) {
        labels[index].y = Math.min(labels[index].y, bottomBound);
        continue;
      }
      labels[index].y = Math.min(labels[index].y, labels[index + 1].y - minGap);
    }

    ctx.save();
    ctx.font = `600 11px ${chartFontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    const labelX = chartArea.right + 8;

    labels.forEach((item) => {
      if (isDeepTheme) {
        ctx.strokeStyle = tickerStroke;
        ctx.strokeText(item.ticker, labelX, item.y);
      }
      ctx.fillStyle = labelColor;
      ctx.fillText(item.ticker, labelX, item.y);
    });

    ctx.restore();
  },
};

const singleCompanyTickerWatermarkPlugin = {
  id: "singleCompanyTickerWatermark",
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const singleCompanyId = getSingleVisibleCompanyId();
    if (!singleCompanyId) return;

    const company = COMPANY_META.get(singleCompanyId);
    if (!company?.ticker) return;

    const hasVisibleDataset = chart.data.datasets.some((item) => item.companyId === singleCompanyId && !item.hidden);
    if (!hasVisibleDataset) return;

    const themeTokens = getChartThemeTokens();
    const ticker = company.ticker;
    const plotWidth = chartArea.right - chartArea.left;
    const plotHeight = chartArea.bottom - chartArea.top;
    const renderedGrowthOverlay = chart.data.datasets.some((dataset) => dataset.growthOverlay && !dataset.hidden);
    const hasGrowthOverlay = typeof state.pendingGrowthOverlayLayout === "boolean"
      ? state.pendingGrowthOverlayLayout
      : renderedGrowthOverlay;
    const compact = isCompactChartLayout();
    const cachedLayout = state.baseWatermarkLayout;
    const canReuseBaseLayout = hasGrowthOverlay
      && cachedLayout?.companyId === singleCompanyId
      && cachedLayout?.ticker === ticker
      && cachedLayout?.compact === compact
      && Math.abs(cachedLayout.chartWidth - chart.width) < 1;
    const watermarkPlotHeight = canReuseBaseLayout
      ? cachedLayout.plotHeight
      : FinancialMetricsUtils.resolveWatermarkReferencePlotHeight({
          plotHeight,
          basePlotHeight: state.baseChartPlotHeight,
          growthChartExtraHeight: state.growthChartExtraHeight,
          hasGrowthOverlay,
        });
    const maxTextWidth = plotWidth * 0.74;
    const maxTextHeight = watermarkPlotHeight * 0.34;
    const baseFontSize = 100;
    const baseFont = `800 ${baseFontSize}px ${themeTokens.chartFontFamily}`;
    const measuredWidth = Math.max(measureTextWidth(ticker, baseFont), 1);
    const fittedFontSize = Math.min(
      maxTextHeight,
      (maxTextWidth / measuredWidth) * baseFontSize,
    );
    const minFontSize = compact
      ? COMPACT_SINGLE_COMPANY_WATERMARK_MIN_FONT_SIZE
      : SINGLE_COMPANY_WATERMARK_MIN_FONT_SIZE;
    const fontSize = canReuseBaseLayout
      ? cachedLayout.fontSize
      : Math.max(minFontSize, fittedFontSize);
    const centerX = canReuseBaseLayout
      ? cachedLayout.centerX
      : (chartArea.left + chartArea.right) / 2;
    const centerY = canReuseBaseLayout
      ? cachedLayout.centerY
      : chartArea.top + watermarkPlotHeight / 2;

    if (!hasGrowthOverlay) {
      state.baseWatermarkLayout = {
        companyId: singleCompanyId,
        ticker,
        compact,
        chartWidth: chart.width,
        plotHeight,
        fontSize,
        centerX,
        centerY,
      };
    }

    ctx.save();
    ctx.font = `800 ${fontSize}px ${themeTokens.chartFontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = colorToRgba(themeTokens.watermarkColor, SINGLE_COMPANY_WATERMARK_ALPHA);
    ctx.fillText(
      ticker,
      centerX,
      centerY,
    );
    ctx.restore();
  },
};

const customYAxisTitlePlugin = {
  id: "customYAxisTitle",
  afterDraw(chart) {
    const yScale = chart.scales?.y;
    if (!yScale) return;
    if (isCompactChartLayout()) return;

    const { mainText, detailText } = buildYAxisTitleParts(state.metric, state.frequency);
    if (!mainText) return;

    const themeTokens = getChartThemeTokens();
    const mainFont = `600 ${Y_AXIS_TITLE_MAIN_FONT_SIZE}px ${themeTokens.chartFontFamily}`;
    const detailFont = `500 ${Y_AXIS_TITLE_DETAIL_FONT_SIZE}px ${themeTokens.chartFontFamily}`;
    const mainWidth = measureTextWidth(mainText, mainFont);
    const detailWidth = detailText ? measureTextWidth(detailText, detailFont) : 0;
    const totalWidth = mainWidth + detailWidth;
    const titleX = yScale.left + Y_AXIS_TITLE_HORIZONTAL_OFFSET;
    const titleY = (yScale.top + yScale.bottom) / 2 + Y_AXIS_TITLE_VERTICAL_OFFSET;
    const { ctx } = chart;

    ctx.save();
    ctx.translate(titleX, titleY);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = themeTokens.axisColor;

    let cursorX = -totalWidth / 2;

    ctx.font = mainFont;
    ctx.fillText(mainText, cursorX, 0);
    cursorX += mainWidth;

    if (detailText) {
      ctx.font = detailFont;
      ctx.fillText(detailText, cursorX, 0);
    }

    ctx.restore();
  },
};

const METRICS = {
  revenue: {
    label: "营收（美元）",
    axisLabel: "营收（美元，USD）",
    sourceKey: "revenue",
    annualMode: "sum",
  },
  netIncome: {
    label: "净利润（美元）",
    axisLabel: "净利润（美元，USD）",
    sourceKey: "earnings",
    annualMode: "sum",
  },
  grossMargin: {
    label: "毛利率（%）",
    axisLabel: "毛利率（%）",
    sourceKey: "grossMargin",
    annualMode: "derived",
  },
  pe: {
    label: "市盈率（P/E）",
    axisLabel: "市盈率（倍）",
    sourceKey: "pe",
    annualMode: "q4",
  },
  roe: {
    label: "ROE（%）",
    axisLabel: "ROE（%）",
    sourceKey: "roe",
    annualMode: "q4",
  },
  revenueGrowth: {
    label: "营收增速（同比 %）",
    axisLabel: "营收同比增速（%）",
    sourceKey: "revenueGrowth",
    annualMode: "derived",
  },
  profitGrowth: {
    label: "利润增速（同比 %）",
    axisLabel: "利润同比增速（%）",
    sourceKey: "earnings",
    annualMode: "derived",
  },
};

const METRIC_TRANSLATIONS = {
  revenue: {
    zh: { label: "营收（美元）", name: "营收", unit: "（美元，USD）" },
    en: { label: "Revenue (USD)", name: "Revenue", unit: " (USD)" },
  },
  netIncome: {
    zh: { label: "净利润（美元）", name: "净利润", unit: "（美元，USD）" },
    en: { label: "Net Income (USD)", name: "Net Income", unit: " (USD)" },
  },
  grossMargin: {
    zh: { label: "毛利率（%）", name: "毛利率", unit: "（%）" },
    en: { label: "Gross Margin (%)", name: "Gross Margin", unit: " (%)" },
  },
  pe: {
    zh: { label: "市盈率（P/E）", name: "市盈率", unit: "（倍）" },
    en: { label: "P/E Ratio", name: "P/E Ratio", unit: " (x)" },
  },
  roe: {
    zh: { label: "ROE（%）", name: "ROE", unit: "（%）" },
    en: { label: "ROE (%)", name: "ROE", unit: " (%)" },
  },
  revenueGrowth: {
    zh: { label: "营收增速（同比 %）", name: "营收同比增速", unit: "（%）" },
    en: { label: "Revenue Growth (YoY %)", name: "Revenue Growth YoY", unit: " (%)" },
  },
  profitGrowth: {
    zh: { label: "利润增速（同比 %）", name: "利润同比增速", unit: "（%）" },
    en: { label: "Profit Growth (YoY %)", name: "Profit Growth YoY", unit: " (%)" },
  },
};

function getMetricTranslation(metricKey) {
  return METRIC_TRANSLATIONS[metricKey]?.[currentLanguage]
    ?? METRIC_TRANSLATIONS.revenue[currentLanguage];
}

function getMetricLabel(metricKey) {
  return getMetricTranslation(metricKey).label;
}

function getFrequencyLabel(frequencyKey) {
  return t(frequencyKey in FREQUENCY_META ? frequencyKey : "quarterly");
}

const chartEl = document.getElementById("financeChart");
const chartWrapEl = chartEl?.closest(".chart-wrap") ?? null;
const statusEl = document.getElementById("statusText");
const togglesEl = document.getElementById("companyToggles");
const companySearchEl = document.getElementById("companySearch");
const generateBtn = document.getElementById("generateBtn");
const showAllBtn = document.getElementById("showAllBtn");
const hideAllBtn = document.getElementById("hideAllBtn");
const downloadBtn = document.getElementById("downloadBtn");
const rangeStartEl = document.getElementById("rangeStart");
const rangeEndEl = document.getElementById("rangeEnd");
const rangeLabelEl = document.getElementById("rangeLabel");
const rangeSlidersEl = document.getElementById("rangeSliders");
const rangeFillEl = document.getElementById("rangeFill");
const periodRangeChipEl = document.getElementById("periodRangeChip");
const activeMetricLabelEl = document.getElementById("activeMetricLabel");
const activeFrequencyLabelEl = document.getElementById("activeFrequencyLabel");
const visibleCompaniesLabelEl = document.getElementById("visibleCompaniesLabel");
const generatedAtLabelEl = document.getElementById("generatedAtLabel");
const themeToggleEl = document.getElementById("themeToggle");
const themeToggleLabelEl = document.getElementById("themeToggleLabel");
const languageToggleEl = document.getElementById("languageToggle");
const languageToggleLabelEl = document.getElementById("languageToggleLabel");
const chartModeControlEl = document.getElementById("chartModeControl");
const priceComparisonControlEl = document.getElementById("priceComparisonControl");
const priceComparisonToggleEl = document.getElementById("priceComparisonToggle");
const growthOverlayButtons = Array.from(document.querySelectorAll("[data-growth-overlay-for]"));
const metricInputs = Array.from(document.querySelectorAll('input[name="metric"]'));
const frequencyInputs = Array.from(document.querySelectorAll('input[name="frequency"]'));
const chartModeInputs = Array.from(document.querySelectorAll('input[name="chartMode"]'));
const presetButtons = Array.from(document.querySelectorAll("[data-company-preset]"));
const decimalFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const BASE_Y_AXIS_TITLE_FONT_SIZE = 11;
const Y_AXIS_TITLE_FONT_SIZE = BASE_Y_AXIS_TITLE_FONT_SIZE * 1.28;
const CHART_PLOT_LEFT_NUDGE = 6;
const SINGLE_COMPANY_CHART_RIGHT_PADDING = 12;
const MULTI_COMPANY_CHART_RIGHT_PADDING = 52;
const Y_AXIS_TICK_PADDING = 2;
const Y_AXIS_TITLE_PADDING = 28;
const Y_AXIS_RESERVED_EXTRA_WIDTH = 44;
const Y_AXIS_MIN_RESERVED_WIDTH = 104;
const Y_AXIS_TITLE_MAIN_FONT_SIZE = 15.4;
const Y_AXIS_TITLE_DETAIL_FONT_SIZE = 12.1;
const Y_AXIS_TITLE_HORIZONTAL_OFFSET = 20;
const Y_AXIS_TITLE_VERTICAL_OFFSET = -28;
const GROWTH_AXIS_PADDING_RATIO = 0.005;
const COMPACT_CHART_MAX_WIDTH = 520;
const COMPACT_Y_AXIS_MIN_RESERVED_WIDTH = 58;
const COMPACT_Y_AXIS_RESERVED_EXTRA_WIDTH = 18;
const COMPACT_SINGLE_COMPANY_RIGHT_PADDING = 4;
const COMPACT_MULTI_COMPANY_RIGHT_PADDING = 22;
const SINGLE_COMPANY_WATERMARK_MIN_FONT_SIZE = 64;
const COMPACT_SINGLE_COMPANY_WATERMARK_MIN_FONT_SIZE = 34;
const SINGLE_COMPANY_WATERMARK_ALPHA = 0.1;
const EXPORT_DEVICE_PIXEL_RATIO = 8;
const SINGLE_COMPANY_BAR_MIN_THICKNESS = 6;
const SINGLE_COMPANY_BAR_MAX_THICKNESS = 28;
const SINGLE_COMPANY_BAR_WIDTH_RATIO = 0.56;
const SINGLE_COMPANY_BAR_WIDTH_RESERVED_SPACE = 220;
const SINGLE_COMPANY_BAR_FALLBACK_WIDTH = 1200;
const DATE_AXIS_DAY_MS = 24 * 60 * 60 * 1000;
const BAR_TOOLTIP_VERTICAL_OFFSET = 18;
const BAR_TOOLTIP_SIDE_OFFSET = 10;
const BAR_TOOLTIP_COLLISION_PADDING = 8;
const BAR_TOOLTIP_FALLBACK_WIDTH = 190;
const BAR_TOOLTIP_FALLBACK_HEIGHT = 78;
const BAR_TOOLTIP_OTHER_BAR_MAX_PENALTY = 60;

const state = {
  chart: null,
  metric: DEFAULT_INITIAL_VIEW.metric,
  frequency: DEFAULT_INITIAL_VIEW.frequency,
  chartMode: DEFAULT_INITIAL_VIEW.chartMode,
  priceComparisonEnabled: DEFAULT_INITIAL_VIEW.priceComparisonEnabled,
  growthOverlayEnabled: false,
  growthChartExtraHeight: 0,
  baseChartPlotHeight: null,
  chartWrapperVerticalInset: null,
  chartPlotVerticalInset: null,
  baseWatermarkLayout: null,
  pendingGrowthOverlayLayout: null,
  lastPriceOverlayPointCount: 0,
  visibleCompanies: new Set(DEFAULT_VISIBLE_COMPANIES),
  pendingCompanies: new Set(DEFAULT_VISIBLE_COMPANIES),
  rangeStart: 0,
  rangeEnd: 0,
  generatedAtIso: null,
  generatedAtLabel: "-",
  loadSummary: null,
  loadedStatusText: "",
  loadedStatusIsError: false,
  pendingVisibilityRefreshId: null,
  dataByFrequency: {
    quarterly: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
      profitGrowth: new Map(),
    },
    annual: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
      profitGrowth: new Map(),
    },
    rollingAnnual: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
      profitGrowth: new Map(),
    },
  },
  periodEndDatesByCompany: new Map(),
  reportDatesByCompany: new Map(),
  forecastFlagsByFrequency: {
    quarterly: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
      profitGrowth: new Map(),
    },
    annual: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
      profitGrowth: new Map(),
    },
    rollingAnnual: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
      profitGrowth: new Map(),
    },
  },
};

function computeSingleCompanyBarThickness(visibleLabelCount) {
  const count = Math.max(1, Number(visibleLabelCount) || 1);
  const containerWidth =
    chartEl?.parentElement?.clientWidth ||
    chartEl?.clientWidth ||
    SINGLE_COMPANY_BAR_FALLBACK_WIDTH;
  const usableWidth = Math.max(320, containerWidth - SINGLE_COMPANY_BAR_WIDTH_RESERVED_SPACE);
  const slotWidth = usableWidth / count;
  const nextThickness = slotWidth * SINGLE_COMPANY_BAR_WIDTH_RATIO;

  return Math.max(
    SINGLE_COMPANY_BAR_MIN_THICKNESS,
    Math.min(SINGLE_COMPANY_BAR_MAX_THICKNESS, nextThickness),
  );
}

function getChartContainerWidth() {
  return chartEl?.parentElement?.clientWidth || chartEl?.clientWidth || window.innerWidth || 0;
}

function isCompactChartLayout() {
  const width = getChartContainerWidth();
  return width > 0 && width <= COMPACT_CHART_MAX_WIDTH;
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("is-error", isError);
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage === "en" ? "en" : "zh-CN";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });

  if (languageToggleLabelEl) {
    languageToggleLabelEl.textContent = t("switchLanguageLabel");
  }
  if (languageToggleEl) {
    languageToggleEl.setAttribute("aria-label", t("switchLanguage"));
  }
  syncThemeToggle();
}

function persistLanguage() {
  try {
    localStorage.setItem("tech-analysis-language", currentLanguage);
  } catch {
    // The page still switches languages if storage is unavailable.
  }
}

function refreshLoadedStatusText() {
  state.generatedAtLabel = formatGeneratedAt(state.generatedAtIso);
  const summary = state.loadSummary;
  if (!summary) return;

  const values = {
    stamp: state.generatedAtLabel,
    count: COMPANIES.length,
    loadedCount: summary.loadedCount,
    forecastCount: summary.forecastCount,
    warningCount: summary.warningCount,
  };
  state.loadedStatusText = summary.warningCount > 0
    ? t("loadedWithWarnings", values)
    : t("loaded", values);
  state.loadedStatusIsError = summary.warningCount > 0;
}

function setLanguage(nextLanguage) {
  currentLanguage = nextLanguage === "en" ? "en" : "zh";
  persistLanguage();
  applyStaticTranslations();
  setupTogglePanel(companySearchEl?.value ?? "");
  refreshLoadedStatusText();

  if (state.chart) {
    refreshChart("none");
  } else {
    updateViewSummary();
    if (state.loadedStatusText) {
      setStatus(state.loadedStatusText, state.loadedStatusIsError);
    }
  }
}

function getSingleVisibleCompanyId() {
  if (state.visibleCompanies.size !== 1) return null;
  return state.visibleCompanies.values().next().value ?? null;
}

function getEffectiveChartMode() {
  return getSingleVisibleCompanyId() ? state.chartMode : "line";
}

function usesDateXAxis(_effectiveChartMode = getEffectiveChartMode()) {
  return false;
}

function colorToRgba(hexColor, alpha) {
  if (typeof hexColor !== "string") return `rgba(255, 255, 255, ${alpha})`;
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return `rgba(255, 255, 255, ${alpha})`;

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  if (![r, g, b].every(Number.isFinite)) return `rgba(255, 255, 255, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getChartThemeTokens() {
  const css = getComputedStyle(document.body);
  const axisFallback = css.getPropertyValue("--ink-soft").trim() || "#b1c1d5";
  const gridFallback = css.getPropertyValue("--line").trim() || "#30475d";
  const tooltipBgFallback = css.getPropertyValue("--tooltip-bg").trim() || "#0b121b";
  const tooltipBorderFallback = css.getPropertyValue("--tooltip-border").trim() || "#3a4f67";
  const tooltipTitleFallback = css.getPropertyValue("--tooltip-title").trim() || "#f6f9ff";
  const tooltipBodyFallback = css.getPropertyValue("--tooltip-body").trim() || "#edf4ff";
  const fontFallback = css.getPropertyValue("--font-main").trim() || '"Plus Jakarta Sans", sans-serif';

  return {
    axisColor: css.getPropertyValue("--chart-axis-color").trim() || axisFallback,
    xGridColor: css.getPropertyValue("--chart-grid-x").trim() || gridFallback,
    yGridColor: css.getPropertyValue("--chart-grid-y").trim() || gridFallback,
    tooltipBg: css.getPropertyValue("--chart-tooltip-bg").trim() || tooltipBgFallback,
    tooltipBorder: css.getPropertyValue("--chart-tooltip-border").trim() || tooltipBorderFallback,
    tooltipTitle: css.getPropertyValue("--chart-tooltip-title").trim() || tooltipTitleFallback,
    tooltipBody: css.getPropertyValue("--chart-tooltip-body").trim() || tooltipBodyFallback,
    logoColor: css.getPropertyValue("--chart-logo-color").trim() || "#f4f7fb",
    labelColor: css.getPropertyValue("--chart-label-color").trim() || "#f4f7fb",
    overlayColor: css.getPropertyValue("--chart-overlay-color").trim() || "#ffffff",
    watermarkColor: css.getPropertyValue("--chart-watermark-color").trim() || "#ffffff",
    exportBackground: css.getPropertyValue("--chart-export-bg").trim() || "#101823",
    chartFontFamily: css.getPropertyValue("--font-chart").trim() || fontFallback,
    terminalFontFamily: css.getPropertyValue("--font-terminal").trim() || fontFallback,
  };
}

function getActiveTheme() {
  return document.documentElement.dataset.theme === "light" || document.body.dataset.theme === "light"
    ? "light"
    : "deep";
}

function persistTheme(theme) {
  try {
    localStorage.setItem("tech-analysis-theme", theme);
  } catch {
    // The theme still changes for the current session if storage is unavailable.
  }
}

function syncThemeToggle() {
  if (!themeToggleEl) return;
  const isLight = getActiveTheme() === "light";
  const nextThemeLabel = t(isLight ? "switchToDeepTheme" : "switchToLightTheme");
  themeToggleEl.setAttribute("aria-label", nextThemeLabel);
  themeToggleEl.setAttribute("title", nextThemeLabel);
  themeToggleEl.setAttribute("aria-pressed", String(isLight));
  if (themeToggleLabelEl) {
    themeToggleLabelEl.textContent = t(isLight ? "deepTheme" : "lightTheme");
  }
}

function setTheme(nextTheme, { persist = true, refresh = true } = {}) {
  const theme = nextTheme === "light" ? "light" : "deep";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = theme;
  if (persist) persistTheme(theme);
  syncThemeToggle();

  if (!refresh) return;
  setupTogglePanel(companySearchEl?.value ?? "");
  if (state.chart) rebuildChartForCurrentView();
}

function initTheme() {
  setTheme(document.documentElement.dataset.theme, { persist: false, refresh: false });
}

const lightSeriesColorCache = new Map();

function getRelativeLuminance(red, green, blue) {
  const channels = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function tuneSeriesColorForLightTheme(hexColor) {
  if (lightSeriesColorCache.has(hexColor)) return lightSeriesColorCache.get(hexColor);
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hexColor ?? "");
  if (!match) return hexColor;

  const original = match.slice(1).map((part) => Number.parseInt(part, 16));
  let factor = 1;
  let tuned = original;
  while ((1.05 / (getRelativeLuminance(...tuned) + 0.05)) < 3 && factor > 0.35) {
    factor *= 0.88;
    tuned = original.map((channel) => Math.round(channel * factor));
  }

  const result = `#${tuned.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  lightSeriesColorCache.set(hexColor, result);
  return result;
}

function getSeriesColor(company) {
  return getActiveTheme() === "light"
    ? tuneSeriesColorForLightTheme(company.color)
    : company.color;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function clampNumber(value, min, max) {
  if (!isFiniteNumber(value)) return min;
  return Math.max(min, Math.min(value, max));
}

function collectVisibleBarRects(chart) {
  const rects = [];
  if (!chart || typeof chart.getSortedVisibleDatasetMetas !== "function") return rects;

  chart.getSortedVisibleDatasetMetas().forEach((meta) => {
    const dataset = chart.data?.datasets?.[meta.index];
    if (dataset?.priceOverlay || dataset?.type !== "bar") return;

    (meta.data || []).forEach((element) => {
      if (!element) return;

      const props = typeof element.getProps === "function"
        ? element.getProps(["x", "y", "base", "width"], true)
        : element;
      const x = Number(props.x);
      const y = Number(props.y);
      const base = Number(props.base);
      const width = Number(props.width);

      if (![x, y, base, width].every(Number.isFinite) || width <= 0) return;

      rects.push({
        left: x - width / 2 - BAR_TOOLTIP_COLLISION_PADDING,
        right: x + width / 2 + BAR_TOOLTIP_COLLISION_PADDING,
        top: Math.min(y, base) - BAR_TOOLTIP_COLLISION_PADDING,
        bottom: Math.max(y, base) + BAR_TOOLTIP_COLLISION_PADDING,
      });
    });
  });

  return rects;
}

function findVisibleBarInteractionItem(chart, eventPosition, useFinalPosition = true) {
  const eventX = Number(eventPosition?.x ?? eventPosition?.native?.offsetX);
  const eventY = Number(eventPosition?.y ?? eventPosition?.native?.offsetY);
  if (!isFiniteNumber(eventX) || !isFiniteNumber(eventY)) return null;
  if (!chart || typeof chart.getSortedVisibleDatasetMetas !== "function") return null;

  let bestItem = null;
  chart.getSortedVisibleDatasetMetas().forEach((meta) => {
    const dataset = chart.data?.datasets?.[meta.index];
    if (dataset?.priceOverlay || dataset?.type !== "bar") return;

    (meta.data || []).forEach((element, index) => {
      if (!element) return;

      const props = typeof element.getProps === "function"
        ? element.getProps(["x", "y", "base", "width"], useFinalPosition)
        : element;
      const x = Number(props.x);
      const y = Number(props.y);
      const base = Number(props.base);
      const width = Number(props.width);

      if (![x, y, base, width].every(Number.isFinite) || width <= 0) return;

      const isInside = typeof element.inRange === "function"
        ? element.inRange(eventX, eventY, useFinalPosition)
        : eventX >= x - width / 2
          && eventX <= x + width / 2
          && eventY >= Math.min(y, base)
          && eventY <= Math.max(y, base);
      if (!isInside) return;

      const score = Math.abs(eventX - x);
      if (!bestItem || score < bestItem.score) {
        bestItem = {
          element,
          datasetIndex: meta.index,
          index,
          score,
        };
      }
    });
  });

  if (!bestItem) return null;
  return {
    element: bestItem.element,
    datasetIndex: bestItem.datasetIndex,
    index: bestItem.index,
  };
}

function collectFinancialBarInteractionItemsAtIndex(chart, index) {
  if (!chart || !Number.isInteger(index) || typeof chart.getSortedVisibleDatasetMetas !== "function") {
    return [];
  }

  const items = [];
  chart.getSortedVisibleDatasetMetas().forEach((meta) => {
    const dataset = chart.data?.datasets?.[meta.index];
    if (dataset?.priceOverlay || dataset?.growthOverlay || dataset?.type !== "bar") return;

    const rawValue = dataset.data?.[index];
    const yValue = typeof rawValue === "object" && rawValue !== null ? rawValue.y : rawValue;
    const element = meta.data?.[index];
    if (!isFiniteNumber(yValue) || !element || element.skip) return;

    items.push({ element, datasetIndex: meta.index, index });
  });

  return items;
}

function distanceToLineSegment(point, start, end) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX ** 2 + segmentY ** 2;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);

  const projection = clampNumber(
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared,
    0,
    1,
  );
  const projectedX = start.x + projection * segmentX;
  const projectedY = start.y + projection * segmentY;
  return Math.hypot(point.x - projectedX, point.y - projectedY);
}

function findVisibleGrowthLineInteractionItem(chart, eventPosition, useFinalPosition = true) {
  const eventX = Number(eventPosition?.x ?? eventPosition?.native?.offsetX);
  const eventY = Number(eventPosition?.y ?? eventPosition?.native?.offsetY);
  if (!isFiniteNumber(eventX) || !isFiniteNumber(eventY)) return null;
  if (!chart || typeof chart.getSortedVisibleDatasetMetas !== "function") return null;

  let bestItem = null;
  chart.getSortedVisibleDatasetMetas().forEach((meta) => {
    const dataset = chart.data?.datasets?.[meta.index];
    if (!dataset?.growthOverlay) return;

    const hitTolerance = Math.max(5, (Number(dataset.borderWidth) || 0) + 3);
    const points = (meta.data || []).map((element, index) => {
      const rawValue = dataset.data?.[index];
      const yValue = typeof rawValue === "object" && rawValue !== null ? rawValue.y : rawValue;
      if (!element || element.skip || !isFiniteNumber(yValue)) return null;
      const props = typeof element.getProps === "function"
        ? element.getProps(["x", "y"], useFinalPosition)
        : element;
      const x = Number(props.x);
      const y = Number(props.y);
      return Number.isFinite(x) && Number.isFinite(y) ? { element, index, x, y } : null;
    });

    points.forEach((point, pointIndex) => {
      if (!point) return;
      const pointDistance = Math.hypot(eventX - point.x, eventY - point.y);
      if (pointDistance <= hitTolerance && (!bestItem || pointDistance < bestItem.score)) {
        bestItem = { ...point, datasetIndex: meta.index, score: pointDistance };
      }

      const nextPoint = points[pointIndex + 1];
      if (!nextPoint) return;
      const segmentDistance = distanceToLineSegment(
        { x: eventX, y: eventY },
        point,
        nextPoint,
      );
      if (segmentDistance > hitTolerance || (bestItem && segmentDistance >= bestItem.score)) return;

      const nearestEndpoint = Math.hypot(eventX - point.x, eventY - point.y)
        <= Math.hypot(eventX - nextPoint.x, eventY - nextPoint.y)
        ? point
        : nextPoint;
      bestItem = { ...nearestEndpoint, datasetIndex: meta.index, score: segmentDistance };
    });
  });

  if (!bestItem) return null;
  return {
    element: bestItem.element,
    datasetIndex: bestItem.datasetIndex,
    index: bestItem.index,
  };
}

function collectGrowthInteractionItemsAtIndex(chart, index) {
  if (!chart || !Number.isInteger(index) || typeof chart.getSortedVisibleDatasetMetas !== "function") {
    return [];
  }

  const items = [];
  chart.getSortedVisibleDatasetMetas().forEach((meta) => {
    const dataset = chart.data?.datasets?.[meta.index];
    if (!dataset?.growthOverlay) return;

    const rawValue = dataset.data?.[index];
    const yValue = typeof rawValue === "object" && rawValue !== null ? rawValue.y : rawValue;
    const element = meta.data?.[index];
    if (!isFiniteNumber(yValue) || !element || element.skip) return;

    items.push({
      element,
      datasetIndex: meta.index,
      index,
    });
  });

  return items;
}

function getTooltipBoxSize(tooltip) {
  return {
    width: Math.max(BAR_TOOLTIP_FALLBACK_WIDTH, Number(tooltip?.width) || 0),
    height: Math.max(BAR_TOOLTIP_FALLBACK_HEIGHT, Number(tooltip?.height) || 0),
  };
}

function buildTooltipRectFromAnchor(anchor, tooltipSize) {
  const caretSize = 8;
  let left = anchor.x - tooltipSize.width / 2;
  let right = anchor.x + tooltipSize.width / 2;
  let top = anchor.y - tooltipSize.height - caretSize;
  let bottom = anchor.y;

  if (anchor.xAlign === "left") {
    left = anchor.x;
    right = anchor.x + tooltipSize.width;
  } else if (anchor.xAlign === "right") {
    left = anchor.x - tooltipSize.width;
    right = anchor.x;
  }

  if (anchor.yAlign === "center") {
    top = anchor.y - tooltipSize.height / 2;
    bottom = anchor.y + tooltipSize.height / 2;
  } else if (anchor.yAlign === "top") {
    top = anchor.y;
    bottom = anchor.y + tooltipSize.height;
  }

  return {
    left,
    right,
    top,
    bottom,
  };
}

function tooltipRectIntersectsBar(tooltipRect, barRect) {
  return tooltipRect.left < barRect.right
    && tooltipRect.right > barRect.left
    && tooltipRect.top < barRect.bottom
    && tooltipRect.bottom > barRect.top;
}

function getRectIntersectionArea(rect, targetRect) {
  if (!rect || !targetRect) return 0;
  const width = Math.min(rect.right, targetRect.right) - Math.max(rect.left, targetRect.left);
  const height = Math.min(rect.bottom, targetRect.bottom) - Math.max(rect.top, targetRect.top);
  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

function rectsNearlyEqual(leftRect, rightRect) {
  if (!leftRect || !rightRect) return false;
  const epsilon = 0.5;
  return Math.abs(leftRect.left - rightRect.left) <= epsilon
    && Math.abs(leftRect.right - rightRect.right) <= epsilon
    && Math.abs(leftRect.top - rightRect.top) <= epsilon
    && Math.abs(leftRect.bottom - rightRect.bottom) <= epsilon;
}

function getBarRectFromElement(element, padding = BAR_TOOLTIP_COLLISION_PADDING) {
  if (!element) return null;

  const props = typeof element.getProps === "function"
    ? element.getProps(["x", "y", "base", "width"], true)
    : element;
  const x = Number(props.x);
  const y = Number(props.y);
  const base = Number(props.base);
  const width = Number(props.width);

  if (![x, y, base, width].every(Number.isFinite) || width <= 0) return null;

  return {
    left: x - width / 2 - padding,
    right: x + width / 2 + padding,
    top: Math.min(y, base) - padding,
    bottom: Math.max(y, base) + padding,
  };
}

function addTooltipCandidate(candidates, candidate) {
  if (!candidate || ![candidate.x, candidate.y].every(Number.isFinite)) return;
  const isDuplicate = candidates.some((existing) => (
    Math.abs(existing.x - candidate.x) <= 0.5
      && Math.abs(existing.y - candidate.y) <= 0.5
      && existing.xAlign === candidate.xAlign
      && existing.yAlign === candidate.yAlign
  ));
  if (!isDuplicate) candidates.push(candidate);
}

function isTooltipRectInsideChart(tooltipRect, chartArea) {
  return tooltipRect.left >= chartArea.left
    && tooltipRect.right <= chartArea.right
    && tooltipRect.top >= chartArea.top
    && tooltipRect.bottom <= chartArea.bottom;
}

function shouldAvoidBarTooltipCollisions(metricKey) {
  return metricKey === "revenue" || metricKey === "netIncome";
}

function buildNearbyTooltipPosition({ chartArea, activeElement, preferredX, preferredY, tooltipSize }) {
  const halfWidth = tooltipSize.width / 2;
  const x = clampNumber(preferredX, chartArea.left, chartArea.right);
  const y = clampNumber(
    preferredY,
    chartArea.top + tooltipSize.height + BAR_TOOLTIP_VERTICAL_OFFSET,
    chartArea.bottom,
  );
  let xAlign = "center";
  if (x + halfWidth > chartArea.right) {
    xAlign = "right";
  } else if (x - halfWidth < chartArea.left) {
    xAlign = "left";
  }

  return {
    x,
    y,
    xAlign,
    yAlign: "bottom",
    caretX: clampNumber(activeElement?.x, chartArea.left, chartArea.right),
  };
}

function findNonOverlappingTooltipPosition({ chart, activeElement, preferredX, preferredY, tooltip, avoidBarCollisions = true }) {
  const chartArea = chart?.chartArea;
  if (!chartArea) return { x: preferredX, y: preferredY };

  const tooltipSize = getTooltipBoxSize(tooltip);
  const activeWidth = Math.max(Number(activeElement?.width) || 0, SINGLE_COMPANY_BAR_MIN_THICKNESS);
  const activeLeft = preferredX - activeWidth / 2;
  const activeRight = preferredX + activeWidth / 2;
  const activeBarRect = getBarRectFromElement(activeElement);
  const safeMinY = chartArea.top + tooltipSize.height + BAR_TOOLTIP_VERTICAL_OFFSET;
  const safeMaxY = chartArea.bottom;
  const topAnchorY = safeMinY;
  const aboveAnchorY = clampNumber(preferredY, safeMinY, safeMaxY);

  if (!avoidBarCollisions) {
    return buildNearbyTooltipPosition({
      chartArea,
      activeElement,
      preferredX,
      preferredY: aboveAnchorY,
      tooltipSize,
    });
  }

  const candidateAnchors = [];
  addTooltipCandidate(candidateAnchors, buildNearbyTooltipPosition({
    chartArea,
    activeElement,
    preferredX,
    preferredY: aboveAnchorY,
    tooltipSize,
  }));

  if (activeBarRect) {
    const activeCenterX = (activeBarRect.left + activeBarRect.right) / 2;
    const activeCenterY = (activeBarRect.top + activeBarRect.bottom) / 2;
    const topSideY = clampNumber(
      activeElement?.y,
      chartArea.top + tooltipSize.height / 2,
      chartArea.bottom - tooltipSize.height / 2,
    );
    const middleSideY = clampNumber(
      activeCenterY,
      chartArea.top + tooltipSize.height / 2,
      chartArea.bottom - tooltipSize.height / 2,
    );

    addTooltipCandidate(candidateAnchors, { x: activeCenterX, y: activeBarRect.top, xAlign: "center", yAlign: "bottom" });
    addTooltipCandidate(candidateAnchors, { x: activeBarRect.left, y: activeBarRect.top, xAlign: "right", yAlign: "bottom" });
    addTooltipCandidate(candidateAnchors, { x: activeBarRect.right, y: activeBarRect.top, xAlign: "left", yAlign: "bottom" });
    addTooltipCandidate(candidateAnchors, { x: activeBarRect.left, y: topSideY, xAlign: "right", yAlign: "center" });
    addTooltipCandidate(candidateAnchors, { x: activeBarRect.right, y: topSideY, xAlign: "left", yAlign: "center" });
    addTooltipCandidate(candidateAnchors, { x: activeBarRect.left, y: middleSideY, xAlign: "right", yAlign: "center" });
    addTooltipCandidate(candidateAnchors, { x: activeBarRect.right, y: middleSideY, xAlign: "left", yAlign: "center" });
    addTooltipCandidate(candidateAnchors, { x: activeCenterX, y: activeBarRect.bottom, xAlign: "center", yAlign: "top" });
    addTooltipCandidate(candidateAnchors, { x: activeBarRect.left, y: activeBarRect.bottom, xAlign: "right", yAlign: "top" });
    addTooltipCandidate(candidateAnchors, { x: activeBarRect.right, y: activeBarRect.bottom, xAlign: "left", yAlign: "top" });
  } else {
    addTooltipCandidate(candidateAnchors, { x: activeLeft - BAR_TOOLTIP_SIDE_OFFSET, y: aboveAnchorY, xAlign: "right", yAlign: "bottom" });
    addTooltipCandidate(candidateAnchors, { x: activeRight + BAR_TOOLTIP_SIDE_OFFSET, y: aboveAnchorY, xAlign: "left", yAlign: "bottom" });
  }

  if (preferredX > (chartArea.left + chartArea.right) / 2) {
    addTooltipCandidate(candidateAnchors, { x: chartArea.right, y: topAnchorY, xAlign: "right", yAlign: "bottom" });
  } else {
    addTooltipCandidate(candidateAnchors, { x: chartArea.left, y: topAnchorY, xAlign: "left", yAlign: "bottom" });
  }

  const barRects = collectVisibleBarRects(chart);
  const otherBarRects = barRects.filter((barRect) => !rectsNearlyEqual(barRect, activeBarRect));
  const tooltipArea = Math.max(1, tooltipSize.width * tooltipSize.height);
  const scoredCandidates = candidateAnchors
    .map((candidate) => {
      const rect = buildTooltipRectFromAnchor(candidate, tooltipSize);
      if (!isTooltipRectInsideChart(rect, chartArea)) return null;

      const activeOverlapArea = getRectIntersectionArea(rect, activeBarRect);
      const otherOverlapArea = otherBarRects.reduce(
        (total, barRect) => total + getRectIntersectionArea(rect, barRect),
        0,
      );
      const otherBarPenalty = Math.min(
        BAR_TOOLTIP_OTHER_BAR_MAX_PENALTY,
        (otherOverlapArea / tooltipArea) * BAR_TOOLTIP_OTHER_BAR_MAX_PENALTY,
      );
      const distance = Math.hypot(candidate.x - preferredX, candidate.y - preferredY);
      return {
        candidate,
        activeOverlapArea,
        score: distance + otherBarPenalty,
      };
    })
    .filter(Boolean);

  const viableCandidates = scoredCandidates
    .filter(({ activeOverlapArea }) => activeOverlapArea === 0)
    .sort((left, right) => left.score - right.score);

  const nonOverlapping = viableCandidates[0]?.candidate;
  if (nonOverlapping) return nonOverlapping;

  const fallbackCandidate = scoredCandidates
    .sort((left, right) => (
      left.activeOverlapArea - right.activeOverlapArea || left.score - right.score
    ))[0]?.candidate;

  return fallbackCandidate || { x: preferredX, y: preferredY, xAlign: "center", yAlign: "bottom" };
}

function registerInteractionModes() {
  if (!window.Chart?.Interaction?.modes) return;

  Chart.Interaction.modes.barPriority = function barPriorityInteraction(chart, eventPosition, options, useFinalPosition) {
    const barItem = findVisibleBarInteractionItem(chart, eventPosition, useFinalPosition);
    if (barItem) {
      const growthItems = collectGrowthInteractionItemsAtIndex(chart, barItem.index);
      return [barItem, ...growthItems];
    }

    const growthItem = findVisibleGrowthLineInteractionItem(chart, eventPosition, useFinalPosition);
    if (growthItem) {
      const barItems = collectFinancialBarInteractionItemsAtIndex(chart, growthItem.index);
      const growthItems = collectGrowthInteractionItemsAtIndex(chart, growthItem.index);
      return [...barItems, ...growthItems];
    }

    return [];
  };
}

function registerTooltipPositioners() {
  if (!window.Chart?.Tooltip?.positioners) return;

  Chart.Tooltip.positioners.barAbove = function positionBarTooltipAbove(activeItems, eventPosition) {
    const fallback = eventPosition || { x: 0, y: 0 };
    const chart = this?.chart;
    const barActiveItem = Array.isArray(activeItems)
      ? activeItems.find((item) => {
        const dataset = chart?.data?.datasets?.[item?.datasetIndex];
        return dataset?.type === "bar" && isFiniteNumber(item?.element?.x) && isFiniteNumber(item?.element?.y);
      })
      : null;

    if (!barActiveItem) {
      return Chart.Tooltip.positioners.nearest.call(this, activeItems, eventPosition) || fallback;
    }

    const chartArea = this?.chart?.chartArea;
    const minY = isFiniteNumber(chartArea?.top)
      ? chartArea.top + BAR_TOOLTIP_VERTICAL_OFFSET
      : BAR_TOOLTIP_VERTICAL_OFFSET;

    return findNonOverlappingTooltipPosition({
      chart,
      activeElement: barActiveItem.element,
      preferredX: barActiveItem.element.x,
      preferredY: Math.max(minY, barActiveItem.element.y - BAR_TOOLTIP_VERTICAL_OFFSET),
      tooltip: this,
      avoidBarCollisions: shouldAvoidBarTooltipCollisions(state.metric),
    });
  };
}

function getLabelsForFrequency(frequency) {
  return frequency === "annual" ? ANNUAL_LABELS : QUARTER_LABELS;
}

function getDisplayStartIndex(frequency = state.frequency) {
  const labels = getLabelsForFrequency(frequency);
  if (!labels.length) return 0;

  const displayStart = getDisplayPeriodStart(frequency);
  const index = labels.indexOf(displayStart);
  return index >= 0 ? index : 0;
}

function syncPeriodRangeChip() {
  if (!periodRangeChipEl) return;
  const first = QUARTER_LABELS[0] ?? "-";
  const last = QUARTER_LABELS[QUARTER_LABELS.length - 1] ?? "-";
  periodRangeChipEl.textContent = `${first}-${last}`;
}

function getVisibleDataBounds(frequency = state.frequency, metric = state.metric) {
  const labels = getLabelsForFrequency(frequency);
  const seriesMap = state.dataByFrequency[frequency]?.[metric];
  const displayStartIndex = getDisplayStartIndex(frequency);

  if (!labels.length || !seriesMap) {
    return { hasData: false, start: displayStartIndex, end: displayStartIndex };
  }

  const visibleCompanyIds = [...state.visibleCompanies];
  if (visibleCompanyIds.length === 0) {
    return {
      hasData: false,
      start: displayStartIndex,
      end: displayStartIndex,
    };
  }

  const includePriceData = visibleCompanyIds.length === 1
    && state.priceComparisonEnabled
    && canEnablePriceComparisonForCurrentView();
  const pricePeriods = new Set();
  if (includePriceData) {
    Object.keys(getSingleCompanyDailyPrices() || {}).forEach((date) => {
      const year = date.slice(0, 4);
      const month = Number(date.slice(5, 7));
      const label = frequency === "annual"
        ? year
        : `${year}Q${Math.floor((month - 1) / 3) + 1}`;
      if (labels.includes(label)) pricePeriods.add(label);
    });
  }

  const validPeriods = labels.map((label, index) => {
    if (index < displayStartIndex) return false;
    const allFundamentalsPresent = visibleCompanyIds.every((companyId) => (
      isFiniteNumber(seriesMap.get(companyId)?.get(label))
    ));
    return allFundamentalsPresent || pricePeriods.has(label);
  });

  return findLongestContiguousDataRange(validPeriods, displayStartIndex);
}

function setRangeToVisibleDataBounds(frequency = state.frequency, metric = state.metric) {
  const labels = getLabelsForFrequency(frequency);
  const displayStartIndex = getDisplayStartIndex(frequency);
  if (!labels.length) {
    state.rangeStart = 0;
    state.rangeEnd = 0;
    return;
  }

  const bounds = getVisibleDataBounds(frequency, metric);
  state.rangeStart = Math.max(displayStartIndex, bounds.start);
  state.rangeEnd = bounds.end;
  state.rangeEnd = Math.max(state.rangeStart, state.rangeEnd);
}

function setDefaultRangeForFrequency(frequency) {
  setRangeToVisibleDataBounds(frequency, state.metric);
}

function setsMatch(currentSet, expectedItems) {
  if (currentSet.size !== expectedItems.length) return false;
  return expectedItems.every((item) => currentSet.has(item));
}

function syncPresetButtons() {
  presetButtons.forEach((button) => {
    const presetKey = button.dataset.companyPreset;
    const presetItems = COMPANY_PRESETS[presetKey] ?? [];
    button.classList.toggle("is-active", setsMatch(state.pendingCompanies, presetItems));
  });
}

function syncChartModeControl() {
  const shouldShow = Boolean(getSingleVisibleCompanyId());

  if (!shouldShow) {
    state.chartMode = "line";
  }

  if (chartModeControlEl) {
    chartModeControlEl.hidden = !shouldShow;
  }

  chartModeInputs.forEach((input) => {
    input.checked = input.value === state.chartMode;
    input.disabled = !shouldShow;
  });
}

function syncPriceComparisonControl() {
  const effectiveChartMode = getEffectiveChartMode();
  const visibleCompanyCount = state.visibleCompanies.size;
  const hasDailyPrices = Boolean(getSingleCompanyDailyPrices());
  const canShow = PriceComparisonUtils.canShowPriceComparison({
    visibleCompanyCount,
    chartMode: effectiveChartMode,
    metric: state.metric,
  }) && hasDailyPrices;

  state.priceComparisonEnabled = PriceComparisonUtils.normalizePriceComparisonEnabled({
    enabled: state.priceComparisonEnabled,
    visibleCompanyCount,
    chartMode: effectiveChartMode,
    metric: state.metric,
    hasDailyPrices,
  });

  if (priceComparisonControlEl) {
    priceComparisonControlEl.hidden = !canShow;
  }

  if (priceComparisonToggleEl) {
    priceComparisonToggleEl.checked = canShow && state.priceComparisonEnabled;
    priceComparisonToggleEl.disabled = !canShow;
  }
}

function canEnableGrowthOverlayForCurrentView(metric = state.metric) {
  return FinancialMetricsUtils.canShowGrowthOverlay({
    visibleCompanyCount: state.visibleCompanies.size,
    chartMode: getEffectiveChartMode(),
    metric,
  });
}

function syncGrowthOverlayControl() {
  state.growthOverlayEnabled = FinancialMetricsUtils.normalizeGrowthOverlayEnabled({
    enabled: state.growthOverlayEnabled,
    visibleCompanyCount: state.visibleCompanies.size,
    chartMode: getEffectiveChartMode(),
    metric: state.metric,
  });

  growthOverlayButtons.forEach((button) => {
    const metric = button.dataset.growthOverlayFor;
    const isCurrentMetric = metric === state.metric;
    const canShow = isCurrentMetric && canEnableGrowthOverlayForCurrentView(metric);
    const isActive = canShow && state.growthOverlayEnabled;
    const metricName = getMetricTranslation(metric).name;
    const labelKey = isActive ? "hideGrowthOverlay" : "showGrowthOverlay";
    const accessibleLabel = t(labelKey, { metric: metricName });

    button.hidden = !canShow;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.setAttribute("aria-label", accessibleLabel);
    button.title = accessibleLabel;
    button.closest(".metric-pill-with-overlay")?.classList.toggle("is-growth-available", canShow);
  });
}

function canEnablePriceComparisonForCurrentView() {
  return PriceComparisonUtils.canShowPriceComparison({
    visibleCompanyCount: state.visibleCompanies.size,
    chartMode: getEffectiveChartMode(),
    metric: state.metric,
  }) && Boolean(getSingleCompanyDailyPrices());
}

function shouldReservePriceComparisonLayout(hasPriceOverlay = false) {
  return Boolean(hasPriceOverlay) || canEnablePriceComparisonForCurrentView();
}

function shouldReserveSingleCompanyLegendLayout(hasPriceOverlay = false) {
  return Boolean(getSingleVisibleCompanyId())
    || shouldReservePriceComparisonLayout(hasPriceOverlay);
}

function setPriceComparisonEnabled(enabled) {
  const nextEnabled = Boolean(enabled) && canEnablePriceComparisonForCurrentView();
  if (nextEnabled) {
    state.growthOverlayEnabled = false;
    syncGrowthOverlayControl();
  }
  state.priceComparisonEnabled = nextEnabled;
  if (priceComparisonToggleEl) {
    priceComparisonToggleEl.checked = nextEnabled;
  }
  try {
    refreshChart("none");
  } catch (error) {
    state.priceComparisonEnabled = false;
    if (priceComparisonToggleEl) {
      priceComparisonToggleEl.checked = false;
    }
    console.error(error);
    setStatus(t("priceEnableFailed", { message: error.message }), true);
  }
}

function setGrowthOverlayEnabled(enabled) {
  const nextEnabled = Boolean(enabled) && canEnableGrowthOverlayForCurrentView();
  state.growthOverlayEnabled = nextEnabled;

  if (nextEnabled) {
    state.priceComparisonEnabled = false;
    if (priceComparisonToggleEl) priceComparisonToggleEl.checked = false;
  }

  syncGrowthOverlayControl();
  refreshChart("none");
}

function updateViewSummary() {
  if (activeMetricLabelEl) {
    activeMetricLabelEl.textContent = getMetricLabel(state.metric);
  }

  if (activeFrequencyLabelEl) {
    activeFrequencyLabelEl.textContent = getFrequencyLabel(state.frequency);
  }

  if (visibleCompaniesLabelEl) {
    visibleCompaniesLabelEl.textContent = `${state.visibleCompanies.size} / ${COMPANIES.length}`;
  }

  if (generatedAtLabelEl) {
    generatedAtLabelEl.textContent = state.generatedAtLabel;
  }

  syncChartModeControl();
  syncPriceComparisonControl();
  syncGrowthOverlayControl();
  syncPresetButtons();
}

function emptySeries(labels) {
  const map = new Map();
  labels.forEach((label) => map.set(label, null));
  return map;
}

function objectToSeries(labels, sourceObj) {
  const series = emptySeries(labels);
  if (!sourceObj || typeof sourceObj !== "object") return series;

  labels.forEach((label) => {
    const raw = sourceObj[label];
    if (raw == null || raw === "") {
      series.set(label, null);
      return;
    }

    const value = typeof raw === "number" ? raw : Number(raw);
    series.set(label, Number.isFinite(value) ? value : null);
  });

  return series;
}

function aggregateFlowAnnual(quarterSeries) {
  const annual = emptySeries(ANNUAL_LABELS);

  ANNUAL_LABELS.forEach((year) => {
    const keys = [`${year}Q1`, `${year}Q2`, `${year}Q3`, `${year}Q4`];
    const values = keys.map((k) => quarterSeries.get(k));
    if (values.every((v) => isFiniteNumber(v))) {
      annual.set(year, values.reduce((sum, v) => sum + v, 0));
    } else {
      annual.set(year, null);
    }
  });

  return annual;
}

function aggregatePointAnnual(quarterSeries) {
  const annual = emptySeries(ANNUAL_LABELS);

  ANNUAL_LABELS.forEach((year) => {
    const q4 = quarterSeries.get(`${year}Q4`);
    annual.set(year, isFiniteNumber(q4) ? q4 : null);
  });

  return annual;
}

function aggregateFlowRollingAnnual(quarterSeries) {
  const rolling = emptySeries(QUARTER_LABELS);
  const entries = QUARTER_LABELS.map((label) => [label, quarterSeries.get(label)]);

  PriceComparisonUtils.aggregateFlowRollingAnnualEntries(entries).forEach(([label, value]) => {
    rolling.set(label, isFiniteNumber(value) ? value : null);
  });

  return rolling;
}

function aggregatePointRollingAverage(quarterSeries) {
  const rolling = emptySeries(QUARTER_LABELS);
  const entries = QUARTER_LABELS.map((label) => [label, quarterSeries.get(label)]);

  PriceComparisonUtils.aggregatePointRollingAverageEntries(entries).forEach(([label, value]) => {
    rolling.set(label, isFiniteNumber(value) ? value : null);
  });

  return rolling;
}

function aggregateMarginAnnual(quarterMarginSeries, quarterRevenueSeries) {
  const annual = emptySeries(ANNUAL_LABELS);

  ANNUAL_LABELS.forEach((year) => {
    const keys = [`${year}Q1`, `${year}Q2`, `${year}Q3`, `${year}Q4`];
    const pairs = keys.map((key) => ({
      margin: quarterMarginSeries.get(key),
      revenue: quarterRevenueSeries.get(key),
    }));

    if (!pairs.every((pair) => isFiniteNumber(pair.margin) && isFiniteNumber(pair.revenue))) {
      annual.set(year, null);
      return;
    }

    const revenueSum = pairs.reduce((sum, pair) => sum + pair.revenue, 0);
    if (!isFiniteNumber(revenueSum) || revenueSum === 0) {
      annual.set(year, null);
      return;
    }

    const grossProfitSum = pairs.reduce((sum, pair) => sum + (pair.margin / 100) * pair.revenue, 0);
    annual.set(year, (grossProfitSum / revenueSum) * 100);
  });

  return annual;
}

function aggregateMarginRollingAnnual(quarterMarginSeries, quarterRevenueSeries) {
  const rolling = emptySeries(QUARTER_LABELS);
  const entries = QUARTER_LABELS.map((label) => [
    label,
    {
      margin: quarterMarginSeries.get(label),
      revenue: quarterRevenueSeries.get(label),
    },
  ]);

  PriceComparisonUtils.aggregateMarginRollingAnnualEntries(entries).forEach(([label, value]) => {
    rolling.set(label, isFiniteNumber(value) ? value : null);
  });

  return rolling;
}

function computeAnnualGrowth(annualFlowSeries) {
  return FinancialMetricsUtils.computeYearOverYearGrowth(ANNUAL_LABELS, annualFlowSeries, 1);
}

function computeQuarterlyGrowth(quarterFlowSeries) {
  return FinancialMetricsUtils.computeYearOverYearGrowth(QUARTER_LABELS, quarterFlowSeries, 4);
}

function computeRollingAnnualGrowth(rollingFlowSeries) {
  return FinancialMetricsUtils.computeYearOverYearGrowth(QUARTER_LABELS, rollingFlowSeries, 4);
}

function annualizeForecastFlags(quarterFlagsSet) {
  const years = new Set();
  quarterFlagsSet.forEach((period) => {
    if (typeof period === "string" && period.length >= 4) years.add(period.slice(0, 4));
  });
  return years;
}

function rollingForecastFlags(quarterFlagsSet) {
  const rollingFlags = new Set();

  QUARTER_LABELS.forEach((period, index) => {
    const start = Math.max(0, index - 3);
    const windowKeys = QUARTER_LABELS.slice(start, index + 1);
    if (windowKeys.some((key) => quarterFlagsSet.has(key))) {
      rollingFlags.add(period);
    }
  });

  return rollingFlags;
}

function formatYAxisTick(metricKey, value) {
  if (!isFiniteNumber(value)) return "";

  if (metricKey === "revenue" || metricKey === "netIncome") {
    return formatUsdValue(value);
  }

  if (
    metricKey === "revenueGrowth" ||
    metricKey === "profitGrowth" ||
    metricKey === "roe" ||
    metricKey === "grossMargin"
  ) {
    return `${decimalFormatter.format(value)}%`;
  }

  return `${decimalFormatter.format(value)}x`;
}

function formatPrimaryYAxisTick(
  metricKey,
  value,
  chartMode = getEffectiveChartMode(),
  axisBounds = {},
) {
  if (PriceComparisonUtils.shouldHidePrimaryYAxisTickLabel({
    metricKey,
    chartMode,
    value,
    axisMin: axisBounds.min,
    axisMax: axisBounds.max,
  })) {
    return "";
  }

  return formatYAxisTick(metricKey, value);
}

function formatMetricValue(metricKey, value) {
  if (!isFiniteNumber(value)) return t("noData");

  if (metricKey === "revenue" || metricKey === "netIncome") {
    return formatUsdValue(value);
  }

  if (
    metricKey === "revenueGrowth" ||
    metricKey === "profitGrowth" ||
    metricKey === "roe" ||
    metricKey === "grossMargin"
  ) {
    return `${decimalFormatter.format(value)}%`;
  }

  return `${decimalFormatter.format(value)}x`;
}

function formatUsdValue(value) {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${decimalFormatter.format(value / 1e12)}T`;
  if (abs >= 1e9) return `$${decimalFormatter.format(value / 1e9)}B`;
  if (abs >= 1e6) return `$${decimalFormatter.format(value / 1e6)}M`;
  if (abs >= 1e3) return `$${decimalFormatter.format(value / 1e3)}K`;
  return `$${decimalFormatter.format(value)}`;
}

function buildYAxisTitleParts(metricKey, frequencyKey) {
  const metric = getMetricTranslation(metricKey);
  const frequency = getFrequencyLabel(frequencyKey);
  return {
    mainText: currentLanguage === "en" ? `${frequency} ${metric.name}` : `${frequency}${metric.name}`,
    detailText: metric.unit,
  };
}

function buildYAxisTitle(metricKey, frequencyKey) {
  const { mainText, detailText } = buildYAxisTitleParts(metricKey, frequencyKey);
  return `${mainText}${detailText}`;
}

function toMetricFileToken(metricKey) {
  const map = {
    revenue: "revenue",
    netIncome: "net-income",
    grossMargin: "gross-margin",
    pe: "pe-ratio",
    roe: "roe",
    revenueGrowth: "revenue-growth",
    profitGrowth: "profit-growth",
  };
  return map[metricKey] ?? metricKey;
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function downloadCurrentChartImage() {
  if (!state.chart) {
    setStatus(t("chartNotReady"), true);
    return;
  }

  const chart = state.chart;
  const sourceCanvas = chart.canvas;
  if (!sourceCanvas) {
    setStatus(t("chartCanvasUnavailable"), true);
    return;
  }

  const metricToken = toMetricFileToken(state.metric);
  const freqToken = (FREQUENCY_META[state.frequency] ?? FREQUENCY_META.quarterly).fileToken;
  const fileStamp = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");

  const filename = `finance-chart-${freqToken}-${metricToken}-${fileStamp}.png`;
  const chartWrap = sourceCanvas.closest(".chart-wrap");
  const wrapStyle = chartWrap ? getComputedStyle(chartWrap) : null;
  const backgroundColor = wrapStyle?.getPropertyValue("--chart-export-bg").trim()
    || getChartThemeTokens().exportBackground;

  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");
  if (!exportCtx) {
    setStatus(t("exportContextFailed"), true);
    return;
  }

  const originalWidth = chart.width;
  const originalHeight = chart.height;
  const originalDevicePixelRatio = chart.options.devicePixelRatio;
  const originalAnimation = chart.options.animation;
  const originalResponsive = chart.options.responsive;
  const targetDevicePixelRatio = Math.max(
    EXPORT_DEVICE_PIXEL_RATIO,
    Math.ceil(window.devicePixelRatio || 1),
  );

  try {
    setStatus(t("exporting", { scale: targetDevicePixelRatio }), false);

    chart.options.animation = false;
    chart.options.responsive = false;
    chart.options.devicePixelRatio = targetDevicePixelRatio;
    chart.resize(originalWidth, originalHeight);
    chart.update("none");
    await waitForNextPaint();

    exportCanvas.width = chart.canvas.width;
    exportCanvas.height = chart.canvas.height;
    exportCtx.fillStyle = backgroundColor;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(chart.canvas, 0, 0);
  } catch (error) {
    console.error(error);
    setStatus(t("exportRenderFailed"), true);
    return;
  } finally {
    chart.options.devicePixelRatio = originalDevicePixelRatio;
    chart.options.animation = originalAnimation;
    chart.options.responsive = originalResponsive;
    chart.resize();
    chart.update("none");
  }

  const url = exportCanvas.toDataURL("image/png");
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setStatus(t("downloaded", { filename }), false);
}

function syncRangeControls() {
  const labels = getLabelsForFrequency(state.frequency);
  const displayStartIndex = getDisplayStartIndex(state.frequency);
  const max = labels.length - 1;

  state.rangeStart = Math.max(displayStartIndex, Math.min(state.rangeStart, max));
  state.rangeEnd = Math.max(displayStartIndex, Math.min(state.rangeEnd, max));
  if (state.rangeStart > state.rangeEnd) {
    state.rangeStart = displayStartIndex;
    state.rangeEnd = max;
  }

  rangeStartEl.min = String(displayStartIndex);
  rangeStartEl.max = String(max);
  rangeEndEl.min = String(displayStartIndex);
  rangeEndEl.max = String(max);

  rangeStartEl.value = String(state.rangeStart);
  rangeEndEl.value = String(state.rangeEnd);

  const startLabel = labels[state.rangeStart] ?? "-";
  const endLabel = labels[state.rangeEnd] ?? "-";
  rangeLabelEl.textContent = `${startLabel} - ${endLabel}`;
  updateRangeVisual();
}

function updateRangeVisual() {
  if (!rangeFillEl) return;
  const labels = getLabelsForFrequency(state.frequency);
  const displayStartIndex = getDisplayStartIndex(state.frequency);
  const max = labels.length - 1;
  const displaySpan = max - displayStartIndex;

  let startPct = 0;
  let endPct = 100;

  if (displaySpan > 0) {
    startPct = ((state.rangeStart - displayStartIndex) / displaySpan) * 100;
    endPct = ((state.rangeEnd - displayStartIndex) / displaySpan) * 100;
  }

  const left = Math.max(0, Math.min(startPct, 100));
  const right = Math.max(0, Math.min(endPct, 100));
  const width = Math.max(0, right - left);

  rangeFillEl.style.left = `${left}%`;
  rangeFillEl.style.width = `${width}%`;
}

function alignRangeWithChartAxis() {
  if (!state.chart || !rangeSlidersEl) return;
  const area = state.chart.chartArea;
  if (!area) return;

  const displayWidth = state.chart.canvas.getBoundingClientRect().width;
  const chartWidth = state.chart.width;
  if (!displayWidth || !chartWidth) return;

  const ratio = displayWidth / chartWidth;
  const leftPad = Math.max(0, area.left * ratio);
  const rightPad = Math.max(0, (chartWidth - area.right) * ratio);

  rangeSlidersEl.style.setProperty("--axis-left-pad", `${leftPad}px`);
  rangeSlidersEl.style.setProperty("--axis-right-pad", `${rightPad}px`);
}

function getSingleCompanyDailyPrices() {
  const singleCompanyId = getSingleVisibleCompanyId();
  return window.STOCK_PRICE_SOURCE_DATA?.companies?.[singleCompanyId]?.daily ?? null;
}

function getPriceComparisonUnavailableReason() {
  const singleCompanyId = getSingleVisibleCompanyId();
  if (!window.STOCK_PRICE_SOURCE_DATA?.companies) {
    return t("priceDataNotLoaded");
  }
  if (!singleCompanyId) {
    return t("selectSingleCompany");
  }
  if (!window.STOCK_PRICE_SOURCE_DATA.companies[singleCompanyId]?.daily) {
    const company = COMPANY_META.get(singleCompanyId);
    return t("noDailyPrice", { company: getCompanyName(company) || singleCompanyId });
  }
  return t("noPriceInRange");
}

function buildPriceOverlayDataset(visibleLabels) {
  if (!state.priceComparisonEnabled) return null;

  const projected = PriceComparisonUtils.buildProjectedPriceSeries({
    dailyPrices: getSingleCompanyDailyPrices(),
    visibleLabels,
    frequency: state.frequency,
  });

  state.lastPriceOverlayPointCount = projected.length;
  if (projected.length === 0) return null;
  const overlayColor = getChartThemeTokens().overlayColor;

  return {
    type: "line",
    label: t("stockPrice"),
    priceOverlay: true,
    order: PriceComparisonUtils.getPriceOverlayDatasetOrder(),
    data: projected,
    parsing: false,
    yAxisID: "yPrice",
    borderColor: overlayColor,
    backgroundColor: overlayColor,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 3,
    pointHitRadius: 8,
    spanGaps: false,
    tension: 0.12,
    hidden: false,
  };
}

function buildGrowthOverlayDataset(visibleLabels) {
  if (!state.growthOverlayEnabled) return null;

  const singleCompanyId = getSingleVisibleCompanyId();
  const growthMetric = FinancialMetricsUtils.getGrowthOverlayMetric(state.metric);
  if (!singleCompanyId || !growthMetric) return null;

  const growthSeries = state.dataByFrequency[state.frequency]?.[growthMetric]?.get(singleCompanyId);
  if (!growthSeries) return null;

  const data = visibleLabels.map((label) => growthSeries.get(label) ?? null);
  if (!data.some(isFiniteNumber)) return null;

  const forecasted = state.forecastFlagsByFrequency[state.frequency]?.[growthMetric]?.get(singleCompanyId) ?? new Set();
  const overlayColor = getChartThemeTokens().overlayColor;
  return {
    type: "line",
    label: getMetricLabel(growthMetric),
    growthOverlay: true,
    growthMetric,
    order: PriceComparisonUtils.getPriceOverlayDatasetOrder(),
    data,
    forecastedLabels: [...forecasted],
    yAxisID: "yPrice",
    borderColor: overlayColor,
    backgroundColor: overlayColor,
    borderWidth: 2,
    pointRadius: 1.6,
    pointHoverRadius: 4,
    pointHitRadius: 9,
    // Do not leave visual holes where a YoY percentage is intentionally
    // unavailable (for example, at a profit/loss crossover). The connecting
    // segment is dashed so it cannot be mistaken for an observed growth value.
    spanGaps: true,
    segment: {
      borderDash(context) {
        return context.p1DataIndex - context.p0DataIndex > 1 ? [6, 4] : undefined;
      },
    },
    tension: 0.18,
    hidden: false,
  };
}

function buildFinancialDatasetValuesForVisibleLabels(dataset, visibleLabels, useQuarterSlotPoints) {
  const values = dataset.data.slice(0, visibleLabels.length);
  if (!useQuarterSlotPoints || dataset.priceOverlay) return values;

  return PriceComparisonUtils.buildFinancialPeriodEndSeries({
    values,
    visibleLabels,
    frequency: state.frequency,
    reportDates: state.reportDatesByCompany.get(dataset.companyId),
    periodEndDates: state.periodEndDatesByCompany.get(dataset.companyId),
  });
}

function buildDatasetsForView() {
  const fullLabels = getLabelsForFrequency(state.frequency);
  const rangeLabels = fullLabels.slice(state.rangeStart, state.rangeEnd + 1);
  const metricKey = state.metric;
  const spanGapThreshold = metricKey === "pe" || metricKey === "roe" || metricKey === "grossMargin" ? 4 : false;
  const singleCompanyId = getSingleVisibleCompanyId();
  const useBarForSingleCompany = getEffectiveChartMode() === "bar" && Boolean(singleCompanyId);

  const datasets = COMPANIES.map((company) => {
    const series = state.dataByFrequency[state.frequency][metricKey].get(company.id) ?? emptySeries(fullLabels);
    const forecasted = state.forecastFlagsByFrequency[state.frequency][metricKey].get(company.id) ?? new Set();

    const fullData = fullLabels.map((label) => series.get(label) ?? null);
    const useBarDataset = useBarForSingleCompany && singleCompanyId === company.id;
    const seriesColor = getSeriesColor(company);

    return {
      type: useBarDataset ? "bar" : "line",
      label: useBarDataset && (state.priceComparisonEnabled || state.growthOverlayEnabled)
        ? `${getCompanyName(company)} · ${getMetricLabel(metricKey)}`
        : getCompanyName(company),
      companyId: company.id,
      order: useBarDataset ? PriceComparisonUtils.getFinancialBarDatasetOrder() : 0,
      fullData,
      data: fullData.slice(state.rangeStart, state.rangeEnd + 1),
      forecastedLabels: [...forecasted],
      borderColor: seriesColor,
      backgroundColor: seriesColor,
      borderWidth: useBarDataset ? 0 : 2,
      borderRadius: useBarDataset ? 6 : 0,
      borderSkipped: false,
      grouped: useBarDataset ? false : undefined,
      barPercentage: useBarDataset ? 0.72 : 0.9,
      categoryPercentage: useBarDataset ? 0.82 : 0.9,
      barThickness: useBarDataset ? computeSingleCompanyBarThickness(rangeLabels.length) : undefined,
      maxBarThickness: useBarDataset ? 28 : undefined,
      pointRadius: useBarDataset ? 0 : 1.4,
      pointHoverRadius: 4.2,
      pointHitRadius: 10,
      spanGaps: spanGapThreshold,
      tension: useBarDataset ? 0 : 0.18,
      hidden: !state.visibleCompanies.has(company.id),
    };
  });

  let lastVisibleValueIndex = -1;
  let latestVisibleFinancialIndex = -1;
  datasets.forEach((dataset) => {
    if (dataset.hidden) return;
    for (let index = dataset.fullData.length - 1; index >= 0; index -= 1) {
      if (!isFiniteNumber(dataset.fullData[index])) continue;
      latestVisibleFinancialIndex = Math.max(latestVisibleFinancialIndex, index);
      break;
    }
    for (let index = dataset.data.length - 1; index >= 0; index -= 1) {
      if (!isFiniteNumber(dataset.data[index])) continue;
      lastVisibleValueIndex = Math.max(lastVisibleValueIndex, index);
      break;
    }
  });

  const trimmedEndIndex = lastVisibleValueIndex >= 0 ? lastVisibleValueIndex : 0;
  const financialVisibleLabels = rangeLabels.slice(0, trimmedEndIndex + 1);
  const shouldReservePriceComparisonRange = canEnablePriceComparisonForCurrentView();
  const visibleLabels = shouldReservePriceComparisonRange
    ? PriceComparisonUtils.extendVisibleLabelsThroughLatestPrice({
      visibleLabels: financialVisibleLabels,
      allLabels: fullLabels,
      dailyPrices: getSingleCompanyDailyPrices(),
      frequency: state.frequency,
      allowExtension: PriceComparisonUtils.shouldExtendPriceComparisonLabels({
        rangeEnd: state.rangeEnd,
        latestVisibleFinancialIndex,
        allLabelsLength: fullLabels.length,
      }),
    })
    : financialVisibleLabels;
  const paddedDatasets = datasets.map((dataset) => ({
    ...dataset,
    data: [
      ...dataset.data.slice(0, trimmedEndIndex + 1),
      ...Array(Math.max(0, visibleLabels.length - financialVisibleLabels.length)).fill(null),
    ],
  }));
  const shouldUseFinancialQuarterSlotPoints = useBarForSingleCompany;
  const trimmedDatasets = paddedDatasets.map((dataset) => ({
    ...dataset,
    data: buildFinancialDatasetValuesForVisibleLabels(
      dataset,
      visibleLabels,
      shouldUseFinancialQuarterSlotPoints && dataset.type === "bar",
    ),
    parsing: shouldUseFinancialQuarterSlotPoints && dataset.type === "bar" ? false : dataset.parsing,
  }));

  const priceOverlayDataset = buildPriceOverlayDataset(visibleLabels);
  const growthOverlayDataset = buildGrowthOverlayDataset(visibleLabels);
  const overlayDatasets = [priceOverlayDataset, growthOverlayDataset].filter(Boolean);
  return {
    labels: visibleLabels,
    datasets: [...trimmedDatasets, ...overlayDatasets],
  };
}

function replaceArrayContents(target, nextValues) {
  target.splice(0, target.length, ...nextValues);
}

function formatDateAxisTick(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";

  const date = new Date(numericValue);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  if (state.frequency === "annual" || (month === "01" && day === "01")) return String(year);
  return `${year}/${month}/${day}`;
}

function buildXAxisDensity(labels) {
  const compact = isCompactChartLayout();
  const years = [...new Set((labels ?? [])
    .map((label) => String(label).match(/^(\d{4})/)?.[1])
    .filter(Boolean)
    .map(Number))];
  if (!compact || years.length <= 1) {
    return { compact, firstYear: years[0] ?? null, lastYear: years[years.length - 1] ?? null, step: 1 };
  }

  const maxYearTicks = getChartContainerWidth() <= 380 ? 5 : 6;
  return {
    compact,
    firstYear: years[0],
    lastYear: years[years.length - 1],
    step: Math.max(1, Math.ceil((years.length - 1) / Math.max(1, maxYearTicks - 1))),
  };
}

function shouldShowXAxisYear(label, density) {
  if (!density?.compact) return true;
  const match = String(label).match(/^(\d{4})(?:Q([1-4]))?$/);
  if (!match) return false;
  if (match[2] && match[2] !== "1") return false;
  const year = Number(match[1]);
  return year === density.firstYear
    || year === density.lastYear
    || (year - density.firstYear) % density.step === 0;
}

function formatXAxisTick(value, label, density = null) {
  if (usesDateXAxis()) return formatDateAxisTick(value);
  if (state.frequency === "annual") return shouldShowXAxisYear(label, density) ? label : "";
  if (typeof label !== "string") return "";
  return label.endsWith("Q1") && shouldShowXAxisYear(label, density) ? label.slice(0, 4) : "";
}

function collectDateXAxisValues(datasets, { barOnly = false } = {}) {
  const values = [];
  datasets.forEach((dataset) => {
    if (barOnly && dataset.type !== "bar") return;
    if (dataset.hidden && !dataset.priceOverlay && !dataset.growthOverlay) return;
    dataset.data.forEach((point) => {
      const x = typeof point === "object" && point !== null ? Number(point.x) : null;
      const y = typeof point === "object" && point !== null ? Number(point.y) : null;
      if (Number.isFinite(x) && Number.isFinite(y)) values.push(x);
    });
  });
  return values;
}

function computeDateXAxisBounds(datasets) {
  const values = collectDateXAxisValues(datasets);
  if (values.length === 0) return {};

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return {};

  const padding = PriceComparisonUtils.computeDateAxisPadding({
    values,
    barValues: collectDateXAxisValues(datasets, { barOnly: true }),
    dayMs: DATE_AXIS_DAY_MS,
  });
  return {
    min: min - padding,
    max: max + padding,
  };
}

function buildDateAxisTicks(scale) {
  const min = Number(scale.min);
  const max = Number(scale.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return;

  const firstYear = new Date(min).getUTCFullYear();
  const lastYear = new Date(max).getUTCFullYear();
  const yearCount = Math.max(1, lastYear - firstYear + 1);
  const step = Math.max(1, Math.ceil(yearCount / 10));
  const ticks = [];

  for (let year = firstYear; year <= lastYear; year += step) {
    const value = Date.UTC(year, 0, 1);
    if (value >= min && value <= max) ticks.push({ value });
  }

  if (ticks.length === 0) {
    scale.ticks = [{ value: min }, { value: max }];
    return;
  }

  scale.ticks = ticks;
}

function buildXAxisScaleOptions(effectiveChartMode, themeTokens, datasets, labels = []) {
  const dateAxis = usesDateXAxis(effectiveChartMode);
  const density = buildXAxisDensity(labels);
  const common = {
    border: { color: "rgba(0,0,0,0)" },
    title: {
      display: !density.compact,
      text: (FREQUENCY_META[state.frequency] ?? FREQUENCY_META.quarterly).axisTitle,
      color: themeTokens.axisColor,
      font: { family: themeTokens.chartFontFamily, size: 11, weight: "600" },
    },
  };

  if (dateAxis) {
    return {
      ...common,
      type: "linear",
      offset: false,
      ...computeDateXAxisBounds(datasets),
      afterBuildTicks: buildDateAxisTicks,
      ticks: {
        autoSkip: false,
        color: themeTokens.axisColor,
        maxRotation: density.compact ? 0 : 50,
        minRotation: 0,
        font: { family: themeTokens.chartFontFamily, size: density.compact ? 9 : 10, weight: "600" },
        callback(value) {
          return formatXAxisTick(value, "", density);
        },
      },
      grid: {
        color: themeTokens.xGridColor,
        offset: false,
        borderDash: [],
      },
    };
  }

  return {
    ...common,
    type: "category",
    offset: effectiveChartMode === "bar",
    ticks: {
      autoSkip: false,
      color: themeTokens.axisColor,
      maxRotation: density.compact ? 0 : 50,
      minRotation: 0,
      font: { family: themeTokens.chartFontFamily, size: density.compact ? 9 : 10, weight: "600" },
      callback(value) {
        const label = this.getLabelForValue(value);
        return formatXAxisTick(value, label, density);
      },
    },
    grid: {
      color: buildXGridColorCallback(themeTokens, density),
      offset: effectiveChartMode === "bar",
      borderDash: [],
    },
  };
}

function buildInteractionOptions(effectiveChartMode) {
  return {
    mode: usesDateXAxis(effectiveChartMode) ? "nearest" : "barPriority",
    intersect: false,
  };
}

function resolveXGridColor(themeTokens, label, tickIndex) {
  const hidden = "rgba(0,0,0,0)";

  if (state.frequency === "annual") {
    // Reduce density in annual mode: draw one vertical grid every 2 years.
    return tickIndex % 2 === 0 ? themeTokens.xGridColor : hidden;
  }

  if (typeof label !== "string") return hidden;
  // Reduce density in quarterly/rolling modes: only keep yearly separators.
  return label.endsWith("Q1") ? themeTokens.xGridColor : hidden;
}

function buildXGridColorCallback(themeTokens, density = null) {
  return (context) => {
    const labels = context?.chart?.data?.labels ?? [];
    const rawIndex = context?.index;
    const parsedIndex = Number(context?.tick?.value);
    const tickIndex = Number.isInteger(rawIndex) ? rawIndex : (Number.isFinite(parsedIndex) ? parsedIndex : -1);
    const labelFromTick = typeof context?.tick?.label === "string" ? context.tick.label : null;
    const labelFromValue = typeof context?.tick?.value === "string" ? context.tick.value : null;
    const label = labels[tickIndex] ?? labelFromTick ?? labelFromValue;
    if (density?.compact && !shouldShowXAxisYear(label, density)) return "rgba(0,0,0,0)";
    return resolveXGridColor(themeTokens, label, tickIndex >= 0 ? tickIndex : 0);
  };
}

function collectDatasetValues(datasets, includeHidden = false) {
  const values = [];
  datasets.forEach((dataset) => {
    if (dataset.priceOverlay || dataset.growthOverlay) return;
    if (!includeHidden && dataset.hidden) return;
    dataset.data.forEach((value) => {
      const yValue = typeof value === "object" && value !== null ? value.y : value;
      if (isFiniteNumber(yValue)) values.push(yValue);
    });
  });

  return values;
}

function collectPriceOverlayValues(datasets) {
  const values = [];
  datasets.forEach((dataset) => {
    if (!dataset.priceOverlay) return;
    dataset.data.forEach((point) => {
      if (isFiniteNumber(point?.y)) values.push(point.y);
    });
  });
  return values;
}

function collectGrowthOverlayValues(datasets) {
  const values = [];
  datasets.forEach((dataset) => {
    if (!dataset.growthOverlay) return;
    dataset.data.forEach((value) => {
      const yValue = typeof value === "object" && value !== null ? value.y : value;
      if (isFiniteNumber(yValue)) values.push(yValue);
    });
  });
  return values;
}

function toAxisDisplayValue(metricKey, value) {
  if (!isFiniteNumber(value)) return value;
  if (metricKey === "revenue" || metricKey === "netIncome") {
    return value / 1e9;
  }
  return value;
}

function fromAxisDisplayValue(metricKey, value) {
  if (!isFiniteNumber(value)) return value;
  if (metricKey === "revenue" || metricKey === "netIncome") {
    return value * 1e9;
  }
  return value;
}

function getNiceStep(range, targetMaxTicks = 10) {
  if (!isFiniteNumber(range) || range <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(range));
  const multipliers = [1, 2, 2.5, 5, 10];

  for (let powerOffset = -1; powerOffset <= 2; powerOffset += 1) {
    const base = magnitude * (10 ** powerOffset);
    for (const multiplier of multipliers) {
      const step = base * multiplier;
      if (range / step <= targetMaxTicks) {
        return step;
      }
    }
  }

  return magnitude * 10;
}

function getTightPositiveAxisScale(max) {
  if (!isFiniteNumber(max) || max <= 0) {
    return { step: 1, max: 1 };
  }

  const magnitude = 10 ** Math.floor(Math.log10(max));
  const multipliers = [1, 2, 5];
  let bestCandidate = null;

  for (let powerOffset = -2; powerOffset <= 2; powerOffset += 1) {
    const base = magnitude * (10 ** powerOffset);

    for (const multiplier of multipliers) {
      const step = base * multiplier;
      if (!isFiniteNumber(step) || step <= 0) continue;

      const candidateMax = Math.ceil(max / step) * step;
      const tickCount = Math.round(candidateMax / step);

      if (tickCount < 5 || tickCount > 9) continue;

      if (
        !bestCandidate
        || candidateMax < bestCandidate.max
        || (candidateMax === bestCandidate.max && step < bestCandidate.step)
      ) {
        bestCandidate = { step, max: candidateMax };
      }
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  const fallbackStep = getNiceStep(max, 8);
  return {
    step: fallbackStep,
    max: Math.ceil(max / fallbackStep) * fallbackStep,
  };
}

function roundPositiveAxisBounds(min, max, clampMinToZero = false) {
  const safeMax = Math.max(max, Number.EPSILON);
  const { step, max: niceMax } = getTightPositiveAxisScale(safeMax);
  const niceMin = clampMinToZero ? 0 : Math.floor(min / step) * step;

  if (niceMin === niceMax) {
    return {
      min: clampMinToZero ? 0 : niceMin - step,
      max: niceMax,
    };
  }

  return {
    min: niceMin,
    max: niceMax,
  };
}

function roundAxisBoundsToNiceValues(min, max, clampMinToZero = false) {
  const span = Math.max(max - min, Math.abs(min), Math.abs(max), Number.EPSILON);
  const step = getNiceStep(span, 10);

  const niceMin = clampMinToZero ? 0 : Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  if (niceMin === niceMax) {
    return {
      min: clampMinToZero ? 0 : niceMin - step,
      max: niceMax + step,
    };
  }

  return {
    min: niceMin,
    max: niceMax,
  };
}

function computeCompactBarZeroBaselineMin(min, max, chartMode) {
  return PriceComparisonUtils.computeCompactBarZeroBaselineMin({
    metricKey: state.metric,
    chartMode,
    min: toAxisDisplayValue(state.metric, min),
    max: toAxisDisplayValue(state.metric, max),
  });
}

function computeYAxisBounds(datasets, chartMode = "line", includeHidden = false) {
  const values = collectDatasetValues(datasets, includeHidden);
  const boundsMode = PriceComparisonUtils.resolveYAxisBoundsMode({
    visibleCompanyCount: state.visibleCompanies.size,
    chartMode,
  });
  const shouldClampMinToZero = state.metric === "revenue";

  if (values.length === 0) {
    return { min: 0, max: 1 };
  }

  let min = Math.min(...values);
  let max = Math.max(...values);
  const includesPositive = max > 0;
  const includesNegative = min < 0;

  if (min === max) {
    const base = Math.abs(max) || 1;

    if (shouldClampMinToZero) {
      const rounded = roundPositiveAxisBounds(
        0,
        toAxisDisplayValue(state.metric, Math.max(max, base)),
        true,
      );
      return {
        min: 0,
        max: fromAxisDisplayValue(state.metric, rounded.max),
      };
    }

    if (boundsMode === "bar") {
      if (max >= 0) {
        const compactMin = computeCompactBarZeroBaselineMin(min, max, boundsMode);
        const rounded = roundPositiveAxisBounds(
          0,
          toAxisDisplayValue(state.metric, max),
          true,
        );
        return {
          min: compactMin == null ? 0 : fromAxisDisplayValue(state.metric, compactMin),
          max: fromAxisDisplayValue(state.metric, rounded.max),
        };
      }

      const rounded = roundAxisBoundsToNiceValues(
        toAxisDisplayValue(state.metric, min - base * 0.18),
        0,
        false,
      );
      return {
        min: fromAxisDisplayValue(state.metric, rounded.min),
        max: 0,
      };
    }

    if (min >= 0) {
      const rounded = roundPositiveAxisBounds(
        toAxisDisplayValue(state.metric, Math.max(0, min - base * 0.08)),
        toAxisDisplayValue(state.metric, max),
        false,
      );
      return {
        min: fromAxisDisplayValue(state.metric, rounded.min),
        max: fromAxisDisplayValue(state.metric, rounded.max),
      };
    }

    const rounded = roundAxisBoundsToNiceValues(
      toAxisDisplayValue(state.metric, min - base * 0.08),
      toAxisDisplayValue(state.metric, max + base * 0.08),
      false,
    );
    return {
      min: fromAxisDisplayValue(state.metric, rounded.min),
      max: fromAxisDisplayValue(state.metric, rounded.max),
    };
  }

  const span = max - min;
  const minPadding = span * 0.08;
  const maxPadding = span * 0.06;

  if (shouldClampMinToZero) {
    const safeMax = max > 0 ? max : 1;
    const rounded = roundPositiveAxisBounds(
      0,
      toAxisDisplayValue(state.metric, safeMax),
      true,
    );
    return {
      min: 0,
      max: fromAxisDisplayValue(state.metric, rounded.max),
    };
  }

  if (boundsMode === "bar") {
    if (!includesNegative) {
      const compactMin = computeCompactBarZeroBaselineMin(min, max, boundsMode);
      const rounded = roundPositiveAxisBounds(
        0,
        toAxisDisplayValue(state.metric, includesPositive ? max : 0),
        true,
      );
      return {
        min: compactMin == null ? 0 : fromAxisDisplayValue(state.metric, compactMin),
        max: includesPositive ? fromAxisDisplayValue(state.metric, rounded.max) : 0,
      };
    }

    const compactMin = computeCompactBarZeroBaselineMin(min, max, boundsMode);
    if (compactMin != null) {
      const rounded = roundPositiveAxisBounds(
        0,
        toAxisDisplayValue(state.metric, max),
        true,
      );
      return {
        min: fromAxisDisplayValue(state.metric, compactMin),
        max: fromAxisDisplayValue(state.metric, rounded.max),
      };
    }

    const rounded = FinancialMetricsUtils.computeTightMixedAxisBounds({
      min: toAxisDisplayValue(state.metric, min),
      max: toAxisDisplayValue(state.metric, includesPositive ? max : 0),
    }) ?? roundAxisBoundsToNiceValues(
      toAxisDisplayValue(state.metric, min),
      toAxisDisplayValue(state.metric, includesPositive ? max : 0),
      false,
    );
    return {
      min: fromAxisDisplayValue(state.metric, rounded.min),
      max: includesPositive ? fromAxisDisplayValue(state.metric, rounded.max) : 0,
    };
  }

  if (min >= 0) {
    const rounded = roundPositiveAxisBounds(
      toAxisDisplayValue(state.metric, Math.max(0, min - minPadding)),
      toAxisDisplayValue(state.metric, max),
      false,
    );
    return {
      min: fromAxisDisplayValue(state.metric, rounded.min),
      max: fromAxisDisplayValue(state.metric, rounded.max),
    };
  }

  if (max <= 0) {
    const rounded = roundAxisBoundsToNiceValues(
      toAxisDisplayValue(state.metric, min - minPadding),
      toAxisDisplayValue(state.metric, Math.min(0, max + maxPadding)),
      false,
    );
    return {
      min: fromAxisDisplayValue(state.metric, rounded.min),
      max: fromAxisDisplayValue(state.metric, rounded.max),
    };
  }

  const rounded = roundAxisBoundsToNiceValues(
    toAxisDisplayValue(state.metric, min - minPadding),
    toAxisDisplayValue(state.metric, max + maxPadding),
    false,
  );
  return {
    min: fromAxisDisplayValue(state.metric, rounded.min),
    max: fromAxisDisplayValue(state.metric, rounded.max),
  };
}

function computePriceYAxisBounds(datasets) {
  const values = collectPriceOverlayValues(datasets);
  if (values.length === 0) return { min: 0, max: 1 };

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const base = Math.abs(max) || 1;
    return roundPositiveAxisBounds(Math.max(0, min - base * 0.08), max + base * 0.08, false);
  }

  const span = max - min;
  return roundPositiveAxisBounds(
    Math.max(0, min - span * 0.08),
    max + span * 0.06,
    false,
  );
}

function computeAlignedPriceYAxisBounds(datasets, primaryBounds) {
  return PriceComparisonUtils.alignSecondaryAxisZero({
    primaryBounds,
    secondaryBounds: computePriceYAxisBounds(datasets),
  });
}

function computeGrowthYAxisBounds(datasets) {
  const values = collectGrowthOverlayValues(datasets);
  if (values.length === 0) return { min: 0, max: 1 };

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = Math.max(rawMax - rawMin, Math.abs(rawMin), Math.abs(rawMax), 1);
  // Friendly tick rounding already contributes visual breathing room. Keep the
  // explicit margin small so growth overlays do not leave oversized empty bands
  // above and below the plotted data, especially when one quarter is an outlier.
  const min = rawMin >= 0 ? 0 : rawMin - span * GROWTH_AXIS_PADDING_RATIO;
  const max = rawMax <= 0 ? 0 : rawMax + span * GROWTH_AXIS_PADDING_RATIO;
  // Keep the raw padded extrema here. Shared-zero alignment performs the only
  // outward rounding pass; rounding twice can turn a -53% minimum into -100%
  // and create a large empty band on both axes.
  return { min, max };
}

function computeSecondaryYAxisBounds(datasets, primaryBounds) {
  if (datasets.some((dataset) => dataset.growthOverlay)) {
    return computeGrowthYAxisBounds(datasets);
  }
  return computeAlignedPriceYAxisBounds(datasets, primaryBounds);
}

function computeChartYAxisBounds(datasets, chartMode) {
  const basePrimaryBounds = computeYAxisBounds(datasets, chartMode);
  const secondaryBounds = computeSecondaryYAxisBounds(datasets, basePrimaryBounds);
  if (!datasets.some((dataset) => dataset.growthOverlay)) {
    return { primaryBounds: basePrimaryBounds, secondaryBounds, basePrimaryBounds };
  }
  return {
    ...FinancialMetricsUtils.alignYAxisZeroPositions({
      primaryBounds: basePrimaryBounds,
      secondaryBounds,
    }),
    basePrimaryBounds,
  };
}

function getChartAreaHeight(chart = state.chart) {
  const area = chart?.chartArea;
  if (!area) return 0;
  return Math.max(0, Number(area.bottom) - Number(area.top));
}

function rememberChartGeometry(chart = state.chart) {
  if (!chart || !chartWrapEl) return;
  const chartHeight = Math.max(0, Number(chart.height) || 0);
  const plotHeight = getChartAreaHeight(chart);
  if (chartHeight <= 0 || plotHeight <= 0) return;

  state.chartWrapperVerticalInset = Math.max(0, chartWrapEl.clientHeight - chartHeight);
  state.chartPlotVerticalInset = Math.max(0, chartHeight - plotHeight);
  state.baseChartPlotHeight = Math.max(1, plotHeight - state.growthChartExtraHeight);
}

function syncGrowthChartHeight(basePrimaryBounds, renderedPrimaryBounds, hasGrowthOverlay) {
  if (!chartWrapEl) return;

  const previousExtraHeight = Math.max(0, Number(state.growthChartExtraHeight) || 0);
  const currentPlotHeight = getChartAreaHeight();
  if (currentPlotHeight > 0) {
    state.baseChartPlotHeight = Math.max(1, currentPlotHeight - previousExtraHeight);
  }

  const baseWrapperHeight = Math.max(1, chartWrapEl.clientHeight - previousExtraHeight);
  const fallbackPlotHeight = Math.max(1, baseWrapperHeight
    - (state.chartWrapperVerticalInset ?? 0)
    - (state.chartPlotVerticalInset ?? (isCompactChartLayout() ? 82 : 118)));
  const basePlotHeight = state.baseChartPlotHeight ?? fallbackPlotHeight;
  const expansionRatio = hasGrowthOverlay
    ? FinancialMetricsUtils.computeGrowthChartExpansionRatio({
        primaryBounds: basePrimaryBounds,
        alignedPrimaryBounds: renderedPrimaryBounds,
      })
    : 1;
  const nextExtraHeight = Math.max(0, Math.round(basePlotHeight * (expansionRatio - 1)));

  state.growthChartExtraHeight = nextExtraHeight;
  chartWrapEl.style.setProperty("--growth-chart-extra-height", `${nextExtraHeight}px`);

  if (state.chart && Math.abs(nextExtraHeight - previousExtraHeight) >= 1) {
    state.chart.resize();
  }
}

function getSecondaryOverlayType(datasets) {
  if (datasets.some((dataset) => dataset.growthOverlay)) return "growth";
  if (datasets.some((dataset) => dataset.priceOverlay)) return "price";
  return null;
}

function getSecondaryAxisTitle(overlayType) {
  if (overlayType === "growth") return isCompactChartLayout() ? "%" : t("growthAxis");
  return isCompactChartLayout() ? "USD" : t("priceAxis");
}

function formatSecondaryAxisTick(overlayType, value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";
  if (overlayType === "growth") return `${decimalFormatter.format(numericValue)}%`;
  return numericValue < 0 ? "" : `$${decimalFormatter.format(numericValue)}`;
}

function measureTextWidth(text, font) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
}

function computeYAxisReservedWidth(datasets, chartMode, themeTokens) {
  const compact = isCompactChartLayout();
  const bounds = computeYAxisBounds(datasets, chartMode, true);
  const sampleValues = [bounds.min, bounds.max, 0];
  const font = `600 10px ${themeTokens.chartFontFamily}`;
  const widestLabel = sampleValues.reduce((maxWidth, value) => {
    const width = measureTextWidth(formatPrimaryYAxisTick(state.metric, Number(value), chartMode), font);
    return Math.max(maxWidth, width);
  }, 0);

  return Math.max(
    compact ? COMPACT_Y_AXIS_MIN_RESERVED_WIDTH : Y_AXIS_MIN_RESERVED_WIDTH,
    Math.ceil(widestLabel + (compact ? COMPACT_Y_AXIS_RESERVED_EXTRA_WIDTH : Y_AXIS_RESERVED_EXTRA_WIDTH)),
  );
}

function computeChartAxisReservations(datasets, chartMode, themeTokens) {
  const compact = isCompactChartLayout();
  return PriceComparisonUtils.getChartAxisReservations({
    visibleCompanyCount: state.visibleCompanies.size,
    measuredPrimaryWidth: computeYAxisReservedWidth(datasets, chartMode, themeTokens),
    compact,
  });
}

function syncChartDatasets(nextDatasets) {
  const existingDatasets = new Map(
    (state.chart?.data?.datasets ?? []).map((dataset) => [getDatasetKey(dataset), dataset]),
  );

  state.chart.data.datasets = nextDatasets.map((nextDataset) => {
    const currentDataset = existingDatasets.get(getDatasetKey(nextDataset));
    if (!currentDataset) return nextDataset;

    if (!Array.isArray(currentDataset.data)) currentDataset.data = [];
    replaceArrayContents(currentDataset.data, nextDataset.data);

    currentDataset.label = nextDataset.label;
    currentDataset.companyId = nextDataset.companyId;
    currentDataset.priceOverlay = nextDataset.priceOverlay;
    currentDataset.growthOverlay = nextDataset.growthOverlay;
    currentDataset.growthMetric = nextDataset.growthMetric;
    currentDataset.order = nextDataset.order;
    currentDataset.type = nextDataset.type;
    currentDataset.forecastedLabels = [...(nextDataset.forecastedLabels ?? [])];
    currentDataset.parsing = nextDataset.parsing;
    currentDataset.yAxisID = nextDataset.yAxisID;
    currentDataset.borderColor = nextDataset.borderColor;
    currentDataset.backgroundColor = nextDataset.backgroundColor;
    currentDataset.borderWidth = nextDataset.borderWidth;
    currentDataset.borderRadius = nextDataset.borderRadius;
    currentDataset.borderSkipped = nextDataset.borderSkipped;
    currentDataset.grouped = nextDataset.grouped;
    currentDataset.barPercentage = nextDataset.barPercentage;
    currentDataset.categoryPercentage = nextDataset.categoryPercentage;
    currentDataset.barThickness = nextDataset.barThickness;
    currentDataset.maxBarThickness = nextDataset.maxBarThickness;
    currentDataset.pointRadius = nextDataset.pointRadius;
    currentDataset.pointHoverRadius = nextDataset.pointHoverRadius;
    currentDataset.pointHitRadius = nextDataset.pointHitRadius;
    currentDataset.spanGaps = nextDataset.spanGaps;
    currentDataset.tension = nextDataset.tension;
    currentDataset.hidden = nextDataset.hidden;

    return currentDataset;
  });
}

function getDatasetKey(dataset) {
  if (dataset.priceOverlay) return "__price_overlay__";
  if (dataset.growthOverlay) return "__growth_overlay__";
  return dataset.companyId;
}

function syncChartLabels(nextLabels) {
  if (!Array.isArray(state.chart?.data?.labels)) {
    state.chart.data.labels = [...nextLabels];
    return;
  }

  replaceArrayContents(state.chart.data.labels, nextLabels);
}

function applyVisibilityStateToChart() {
  if (!state.chart) return;

  if (state.visibleCompanies.size === 0) {
    setRangeToVisibleDataBounds();
    syncRangeControls();
  }

  if (state.pendingVisibilityRefreshId != null) {
    cancelAnimationFrame(state.pendingVisibilityRefreshId);
  }

  state.pendingVisibilityRefreshId = requestAnimationFrame(() => {
    state.pendingVisibilityRefreshId = null;
    refreshChart("none");
  });
}

function buildChartLayoutPadding(effectiveChartMode) {
  const compact = isCompactChartLayout();
  if (getSingleVisibleCompanyId()) {
    return {
      left: 0,
      right: compact ? COMPACT_SINGLE_COMPANY_RIGHT_PADDING : SINGLE_COMPANY_CHART_RIGHT_PADDING,
    };
  }

  return {
    left: 0,
    right: compact ? COMPACT_MULTI_COMPANY_RIGHT_PADDING : MULTI_COMPANY_CHART_RIGHT_PADDING,
  };
}

function refreshChart(updateMode = undefined) {
  if (!state.chart) return;

  syncPriceComparisonControl();
  syncGrowthOverlayControl();

  const { labels, datasets } = buildDatasetsForView();
  const effectiveChartMode = getEffectiveChartMode();
  const {
    primaryBounds: yBounds,
    secondaryBounds,
    basePrimaryBounds,
  } = computeChartYAxisBounds(datasets, effectiveChartMode);
  const hasPriceOverlay = datasets.some((dataset) => dataset.priceOverlay);
  const hasGrowthOverlay = datasets.some((dataset) => dataset.growthOverlay);
  state.pendingGrowthOverlayLayout = hasGrowthOverlay;
  syncGrowthChartHeight(basePrimaryBounds, yBounds, hasGrowthOverlay);
  const secondaryOverlayType = getSecondaryOverlayType(datasets);
  const hasSecondaryOverlay = Boolean(secondaryOverlayType);
  const reserveLegendLayout = shouldReserveSingleCompanyLegendLayout(hasPriceOverlay || hasGrowthOverlay);
  const themeTokens = getChartThemeTokens();
  const axisReservations = computeChartAxisReservations(datasets, effectiveChartMode, themeTokens);
  syncChartLabels(labels);
  syncChartDatasets(datasets);
  state.chart.data.datasets.forEach((dataset, index) => {
    state.chart.setDatasetVisibility(
      index,
      dataset.priceOverlay || dataset.growthOverlay || state.visibleCompanies.has(dataset.companyId),
    );
  });
  state.chart.options.scales.y.title.text = buildYAxisTitle(state.metric, state.frequency);
  state.chart.options.scales.y.min = yBounds.min;
  state.chart.options.scales.y.max = yBounds.max;
  state.chart.options.scales.y.reservedWidth = axisReservations.primaryWidth;
  state.chart.options.scales.yPrice.display = axisReservations.priceWidth > 0;
  state.chart.options.scales.yPrice.reservedWidth = axisReservations.priceWidth;
  state.chart.options.scales.yPrice.title.display = hasSecondaryOverlay;
  state.chart.options.scales.yPrice.title.text = getSecondaryAxisTitle(secondaryOverlayType);
  state.chart.options.scales.yPrice.ticks.display = hasSecondaryOverlay;
  state.chart.options.scales.yPrice.ticks.callback = (value) => formatSecondaryAxisTick(secondaryOverlayType, value);
  state.chart.options.scales.yPrice.min = secondaryBounds.min;
  state.chart.options.scales.yPrice.max = secondaryBounds.max;
  state.chart.options.scales.x = buildXAxisScaleOptions(effectiveChartMode, themeTokens, datasets, labels);
  state.chart.options.interaction = buildInteractionOptions(effectiveChartMode);
  state.chart.options.layout.padding = buildChartLayoutPadding(effectiveChartMode);
  state.chart.options.plugins.legend.display = reserveLegendLayout;
  state.chart.update(updateMode);
  state.pendingGrowthOverlayLayout = null;
  alignRangeWithChartAxis();
  updateRangeVisual();
  updateViewSummary();
  updateChartStatus(hasPriceOverlay, hasGrowthOverlay);
}

function updateChartStatus(hasPriceOverlay = false, _hasGrowthOverlay = false) {
  if (state.priceComparisonEnabled && hasPriceOverlay && state.loadedStatusText) {
    setStatus(`${state.loadedStatusText} ${t("priceOverlayEnabled", { count: state.lastPriceOverlayPointCount })}`, state.loadedStatusIsError);
  } else if (state.priceComparisonEnabled && !hasPriceOverlay) {
    setStatus(getPriceComparisonUnavailableReason(), true);
  } else if (state.loadedStatusText) {
    setStatus(state.loadedStatusText, state.loadedStatusIsError);
  }
}

function rebuildChartForCurrentView() {
  if (state.pendingVisibilityRefreshId != null) {
    cancelAnimationFrame(state.pendingVisibilityRefreshId);
    state.pendingVisibilityRefreshId = null;
  }

  syncPriceComparisonControl();
  syncGrowthOverlayControl();

  rememberChartGeometry();
  if (state.chart && typeof state.chart.destroy === "function") {
    state.chart.destroy();
  }
  state.chart = null;

  buildChart();
  alignRangeWithChartAxis();
  updateRangeVisual();
  updateViewSummary();
  updateChartStatus(
    Boolean(state.chart?.data?.datasets?.some((dataset) => dataset.priceOverlay)),
    Boolean(state.chart?.data?.datasets?.some((dataset) => dataset.growthOverlay)),
  );
}

function createToggle(company) {
  const label = document.createElement("label");
  label.className = "toggle-item";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = state.pendingCompanies.has(company.id);
  checkbox.dataset.companyId = company.id;

  const dot = document.createElement("span");
  dot.className = "color-dot";
  dot.style.backgroundColor = getSeriesColor(company);

  const text = document.createElement("span");
  text.textContent = getCompanyName(company);

  const ticker = document.createElement("small");
  ticker.textContent = company.ticker;

  checkbox.addEventListener("change", () => {
    const nextPendingCompanies = setPendingCompanyVisibility(
      state.pendingCompanies,
      company.id,
      checkbox.checked,
    );
    state.pendingCompanies = nextPendingCompanies;
    syncPresetButtons();
  });

  label.append(checkbox, dot, text, ticker);
  return label;
}

function setupTogglePanel(query = "") {
  togglesEl.innerHTML = "";
  const normalizedQuery = query.trim().toLocaleLowerCase(currentLanguage === "en" ? "en-US" : "zh-CN");

  COMPANY_CATEGORIES.forEach((category) => {
    const companies = category.companyIds
      .map((companyId) => COMPANY_META.get(companyId))
      .filter(Boolean)
      .filter((company) => !normalizedQuery || [
        company.id,
        company.name,
        COMPANY_ENGLISH_NAMES[company.id],
        company.ticker,
      ].filter(Boolean).some((value) => value.toLocaleLowerCase().includes(normalizedQuery)));
    if (companies.length === 0) return;

    const card = document.createElement("section");
    card.className = "company-category-card";
    card.dataset.category = category.id;

    const heading = document.createElement("h4");
    heading.textContent = getCategoryLabel(category);

    const list = document.createElement("div");
    list.className = "company-category-list";
    companies.forEach((company) => list.appendChild(createToggle(company)));
    card.append(heading, list);
    togglesEl.appendChild(card);
  });

  if (!togglesEl.children.length) {
    const empty = document.createElement("p");
    empty.className = "company-search-empty";
    empty.textContent = t("noMatchingCompanies");
    togglesEl.appendChild(empty);
  }
  syncPresetButtons();
}

function syncTogglePanelSelection() {
  const checkboxes = togglesEl.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    checkbox.checked = state.pendingCompanies.has(checkbox.dataset.companyId);
  });
}

function setAllVisibility(visible) {
  const nextPendingCompanies = setAllPendingCompanyVisibility(COMPANIES, visible);
  state.pendingCompanies = nextPendingCompanies;
  syncTogglePanelSelection();
  syncPresetButtons();
}

function applyCompanyPreset(presetKey) {
  const companyIds = COMPANY_PRESETS[presetKey];
  if (!companyIds) return;
  const nextPendingCompanies = cloneCompanySet(companyIds);
  state.pendingCompanies = nextPendingCompanies;
  syncTogglePanelSelection();
  syncPresetButtons();
}

function generateSelectedCompanies() {
  const shouldResetRange = shouldResetRangeAfterApplyingCompanies({
    appliedCompanies: state.visibleCompanies,
    pendingCompanies: state.pendingCompanies,
  });

  state.visibleCompanies = applyPendingCompanies(state.pendingCompanies);

  if (shouldResetRange) {
    setRangeToVisibleDataBounds(state.frequency, state.metric);
    syncRangeControls();
  }

  rebuildChartForCurrentView();
}

function buildChart() {
  const themeTokens = getChartThemeTokens();

  const { labels, datasets } = buildDatasetsForView();
  const effectiveChartMode = getEffectiveChartMode();
  const {
    primaryBounds: yBounds,
    secondaryBounds,
    basePrimaryBounds,
  } = computeChartYAxisBounds(datasets, effectiveChartMode);
  const hasPriceOverlay = datasets.some((dataset) => dataset.priceOverlay);
  const hasGrowthOverlay = datasets.some((dataset) => dataset.growthOverlay);
  state.pendingGrowthOverlayLayout = hasGrowthOverlay;
  syncGrowthChartHeight(basePrimaryBounds, yBounds, hasGrowthOverlay);
  const secondaryOverlayType = getSecondaryOverlayType(datasets);
  const hasSecondaryOverlay = Boolean(secondaryOverlayType);
  const reserveLegendLayout = shouldReserveSingleCompanyLegendLayout(hasPriceOverlay || hasGrowthOverlay);
  const axisReservations = computeChartAxisReservations(datasets, effectiveChartMode, themeTokens);

  state.chart = new Chart(chartEl, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: buildChartLayoutPadding(effectiveChartMode),
      },
      onResize(chart) {
        rememberChartGeometry(chart);
        alignRangeWithChartAxis();
        updateRangeVisual();
      },
      interaction: buildInteractionOptions(effectiveChartMode),
      elements: {
        bar: {
          borderRadius: 6,
          borderSkipped: false,
        },
      },
      scales: {
        x: buildXAxisScaleOptions(effectiveChartMode, themeTokens, datasets, labels),
        y: {
          afterFit(scale) {
            const reservedWidth = scale.options.reservedWidth ?? scale.width;
            scale.width = Math.max(0, reservedWidth - CHART_PLOT_LEFT_NUDGE);
          },
          border: { color: "rgba(0,0,0,0)" },
          min: yBounds.min,
          max: yBounds.max,
          reservedWidth: axisReservations.primaryWidth,
          title: {
            display: false,
            text: buildYAxisTitle(state.metric, state.frequency),
            color: themeTokens.axisColor,
            font: { family: themeTokens.chartFontFamily, size: Y_AXIS_TITLE_FONT_SIZE, weight: "600" },
            padding: {
              top: Y_AXIS_TITLE_PADDING,
              bottom: Y_AXIS_TITLE_PADDING,
            },
          },
          ticks: {
            color: themeTokens.axisColor,
            font: { family: themeTokens.chartFontFamily, size: isCompactChartLayout() ? 9 : 10, weight: "600" },
            padding: isCompactChartLayout() ? 0 : Y_AXIS_TICK_PADDING,
            callback(value) {
              return formatPrimaryYAxisTick(
                state.metric,
                Number(value),
                effectiveChartMode,
                { min: this.min, max: this.max },
              );
            },
          },
          grid: {
            color: themeTokens.yGridColor,
            borderDash: [4, 6],
          },
        },
        yPrice: {
          display: axisReservations.priceWidth > 0,
          position: "right",
          afterFit(scale) {
            scale.width = scale.options.reservedWidth ?? scale.width;
          },
          border: { color: "rgba(0,0,0,0)" },
          min: secondaryBounds.min,
          max: secondaryBounds.max,
          reservedWidth: axisReservations.priceWidth,
          title: {
            display: hasSecondaryOverlay,
            text: getSecondaryAxisTitle(secondaryOverlayType),
            color: themeTokens.axisColor,
            font: { family: themeTokens.chartFontFamily, size: isCompactChartLayout() ? 9 : 11, weight: "600" },
          },
          ticks: {
            display: hasSecondaryOverlay,
            color: themeTokens.axisColor,
            font: { family: themeTokens.chartFontFamily, size: isCompactChartLayout() ? 9 : 10, weight: "600" },
            callback(value) {
              return formatSecondaryAxisTick(secondaryOverlayType, value);
            },
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      plugins: {
        legend: {
          display: reserveLegendLayout,
          labels: {
            color: themeTokens.axisColor,
            font: { family: themeTokens.chartFontFamily, size: isCompactChartLayout() ? 9 : 11, weight: "600" },
            boxWidth: isCompactChartLayout() ? 9 : 12,
            boxHeight: isCompactChartLayout() ? 9 : 12,
            generateLabels(chart) {
              const defaults = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              return defaults
                .filter((item) => {
                  const dataset = chart.data.datasets[item.datasetIndex];
                  return dataset?.priceOverlay || dataset?.growthOverlay || state.visibleCompanies.has(dataset?.companyId);
                })
                .sort((left, right) => {
                  const leftDataset = chart.data.datasets[left.datasetIndex];
                  const rightDataset = chart.data.datasets[right.datasetIndex];
                  const leftOverlay = Boolean(leftDataset?.priceOverlay || leftDataset?.growthOverlay);
                  const rightOverlay = Boolean(rightDataset?.priceOverlay || rightDataset?.growthOverlay);
                  return Number(leftOverlay) - Number(rightOverlay);
                });
            },
          },
        },
        tooltip: {
          position: "barAbove",
          backgroundColor: themeTokens.tooltipBg,
          titleColor: themeTokens.tooltipTitle,
          bodyColor: themeTokens.tooltipBody,
          borderColor: themeTokens.tooltipBorder,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          titleFont: { family: themeTokens.terminalFontFamily, size: 11, weight: "600" },
          bodyFont: { family: themeTokens.chartFontFamily, size: 11, weight: "500" },
          callbacks: {
            title(context) {
              const separator = getLabelSeparator();
              const reportDateContext = context.find((item) => item.raw?.reportDate);
              if (reportDateContext?.raw?.reportDate) {
                return `DATE${separator}${reportDateContext.raw.reportDate}`;
              }
              const periodEndContext = context.find((item) => item.raw?.periodEndDate);
              if (periodEndContext?.raw?.periodEndDate) {
                return `PERIOD END${separator}${periodEndContext.raw.periodEndDate}`;
              }
              const priceContext = context.find((item) => item.dataset.priceOverlay);
              if (priceContext?.raw?.date) {
                return `DATE${separator}${priceContext.raw.date}`;
              }
              const prefix = (FREQUENCY_META[state.frequency] ?? FREQUENCY_META.quarterly).tooltipPrefix;
              return `${prefix}${separator}${context[0].label}`;
            },
            label(context) {
              const separator = getLabelSeparator();
              if (context.dataset.priceOverlay) {
                return `${t("stockPrice")}${separator}$${decimalFormatter.format(context.parsed.y)}`;
              }
              if (context.dataset.growthOverlay) {
                return `${context.dataset.label}${separator}${decimalFormatter.format(context.parsed.y)}%`;
              }
              const label = String(context.raw?.periodLabel ?? context.label);
              const isForecast =
                Array.isArray(context.dataset.forecastedLabels) &&
                context.dataset.forecastedLabels.includes(label);
              const suffix = isForecast ? t("forecastSuffix") : "";
              return `${context.dataset.label}${separator}${formatMetricValue(state.metric, context.parsed.y)}${suffix}`;
            },
          },
        },
      },
    },
    plugins: [singleCompanyTickerWatermarkPlugin, rightTickerLabelsPlugin, customYAxisTitlePlugin],
  });
  state.pendingGrowthOverlayLayout = null;
  rememberChartGeometry();
}

function bindEvents() {
  generateBtn.addEventListener("click", generateSelectedCompanies);
  showAllBtn.addEventListener("click", () => setAllVisibility(true));
  hideAllBtn.addEventListener("click", () => setAllVisibility(false));
  companySearchEl?.addEventListener("input", () => setupTogglePanel(companySearchEl.value));
  themeToggleEl?.addEventListener("click", () => {
    setTheme(getActiveTheme() === "light" ? "deep" : "light");
  });
  languageToggleEl?.addEventListener("click", () => {
    setLanguage(currentLanguage === "zh" ? "en" : "zh");
  });

  metricInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.growthOverlayEnabled = FinancialMetricsUtils.shouldCarryGrowthOverlay({
        enabled: state.growthOverlayEnabled,
        nextMetric: input.value,
      });
      state.metric = input.value;
      setRangeToVisibleDataBounds();
      syncRangeControls();
      rebuildChartForCurrentView();
    });
  });

  frequencyInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.frequency = input.value;
      setDefaultRangeForFrequency(state.frequency);
      syncRangeControls();
      refreshChart();
    });
  });

  chartModeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked || !getSingleVisibleCompanyId()) return;
      state.chartMode = input.value;
      refreshChart("none");
    });
  });

  if (priceComparisonToggleEl) {
    priceComparisonToggleEl.addEventListener("change", () => {
      setPriceComparisonEnabled(priceComparisonToggleEl.checked, "none");
    });
  }

  growthOverlayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.growthOverlayFor !== state.metric) return;
      setGrowthOverlayEnabled(!state.growthOverlayEnabled);
    });
  });

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyCompanyPreset(button.dataset.companyPreset);
    });
  });

  rangeStartEl.addEventListener("input", () => {
    const next = Number(rangeStartEl.value);
    const displayStartIndex = getDisplayStartIndex(state.frequency);
    state.rangeStart = Number.isFinite(next) ? Math.max(displayStartIndex, next) : state.rangeStart;
    if (state.rangeStart > state.rangeEnd) state.rangeEnd = state.rangeStart;
    syncRangeControls();
    refreshChart("none");
  });

  rangeEndEl.addEventListener("input", () => {
    const next = Number(rangeEndEl.value);
    const displayStartIndex = getDisplayStartIndex(state.frequency);
    state.rangeEnd = Number.isFinite(next) ? Math.max(displayStartIndex, next) : state.rangeEnd;
    if (state.rangeEnd < state.rangeStart) state.rangeStart = Math.max(displayStartIndex, state.rangeEnd);
    syncRangeControls();
    refreshChart("none");
  });

  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      void downloadCurrentChartImage();
    });
  }
}

function formatGeneratedAt(isoString) {
  if (!isoString) return t("unknownTime");
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return t("unknownTime");

  return new Intl.DateTimeFormat(currentLanguage === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}

function loadFromLocalData() {
  if (!sourceData || !sourceData.companies) {
    throw new Error(t("localDataMissing"));
  }

  const warnings = [];
  let loadedCount = 0;
  let forecastCount = 0;

  COMPANIES.forEach((company) => {
    const rawCompany = sourceData.companies[company.id];
    if (!rawCompany) {
      warnings.push(t("companyDataMissing", { company: getCompanyName(company) }));
      Object.keys(METRICS).forEach((metricKey) => {
        state.dataByFrequency.quarterly[metricKey].set(company.id, emptySeries(QUARTER_LABELS));
        state.dataByFrequency.annual[metricKey].set(company.id, emptySeries(ANNUAL_LABELS));
        state.dataByFrequency.rollingAnnual[metricKey].set(company.id, emptySeries(QUARTER_LABELS));
        state.forecastFlagsByFrequency.quarterly[metricKey].set(company.id, new Set());
        state.forecastFlagsByFrequency.annual[metricKey].set(company.id, new Set());
        state.forecastFlagsByFrequency.rollingAnnual[metricKey].set(company.id, new Set());
      });
      return;
    }

    loadedCount += 1;
    state.periodEndDatesByCompany.set(company.id, rawCompany.periodEndDates ?? {});
    state.reportDatesByCompany.set(company.id, rawCompany.reportDates ?? {});

    const quarterRevenue = objectToSeries(QUARTER_LABELS, rawCompany.revenue);
    const quarterNetIncome = objectToSeries(QUARTER_LABELS, rawCompany.earnings);
    const quarterGrossMargin = objectToSeries(QUARTER_LABELS, rawCompany.grossMargin);
    const quarterPe = objectToSeries(QUARTER_LABELS, rawCompany.pe);
    const quarterRoe = objectToSeries(QUARTER_LABELS, rawCompany.roe);
    const quarterGrowth = computeQuarterlyGrowth(quarterRevenue);
    const quarterProfitGrowth = computeQuarterlyGrowth(quarterNetIncome);

    state.dataByFrequency.quarterly.revenue.set(company.id, quarterRevenue);
    state.dataByFrequency.quarterly.netIncome.set(company.id, quarterNetIncome);
    state.dataByFrequency.quarterly.grossMargin.set(company.id, quarterGrossMargin);
    state.dataByFrequency.quarterly.pe.set(company.id, quarterPe);
    state.dataByFrequency.quarterly.roe.set(company.id, quarterRoe);
    state.dataByFrequency.quarterly.revenueGrowth.set(company.id, quarterGrowth);
    state.dataByFrequency.quarterly.profitGrowth.set(company.id, quarterProfitGrowth);

    const annualRevenue = aggregateFlowAnnual(quarterRevenue);
    const annualNetIncome = aggregateFlowAnnual(quarterNetIncome);
    const annualGrossMargin = aggregateMarginAnnual(quarterGrossMargin, quarterRevenue);
    const annualPe = aggregatePointAnnual(quarterPe);
    const annualRoe = aggregatePointAnnual(quarterRoe);
    const annualGrowth = computeAnnualGrowth(annualRevenue);
    const annualProfitGrowth = computeAnnualGrowth(annualNetIncome);

    const rollingRevenue = aggregateFlowRollingAnnual(quarterRevenue);
    const rollingNetIncome = aggregateFlowRollingAnnual(quarterNetIncome);
    const rollingGrossMargin = aggregateMarginRollingAnnual(quarterGrossMargin, quarterRevenue);
    const rollingPe = aggregatePointRollingAverage(quarterPe);
    const rollingRoe = aggregatePointRollingAverage(quarterRoe);
    const rollingGrowth = computeRollingAnnualGrowth(rollingRevenue);
    const rollingProfitGrowth = computeRollingAnnualGrowth(rollingNetIncome);

    state.dataByFrequency.annual.revenue.set(company.id, annualRevenue);
    state.dataByFrequency.annual.netIncome.set(company.id, annualNetIncome);
    state.dataByFrequency.annual.grossMargin.set(company.id, annualGrossMargin);
    state.dataByFrequency.annual.pe.set(company.id, annualPe);
    state.dataByFrequency.annual.roe.set(company.id, annualRoe);
    state.dataByFrequency.annual.revenueGrowth.set(company.id, annualGrowth);
    state.dataByFrequency.annual.profitGrowth.set(company.id, annualProfitGrowth);

    state.dataByFrequency.rollingAnnual.revenue.set(company.id, rollingRevenue);
    state.dataByFrequency.rollingAnnual.netIncome.set(company.id, rollingNetIncome);
    state.dataByFrequency.rollingAnnual.grossMargin.set(company.id, rollingGrossMargin);
    state.dataByFrequency.rollingAnnual.pe.set(company.id, rollingPe);
    state.dataByFrequency.rollingAnnual.roe.set(company.id, rollingRoe);
    state.dataByFrequency.rollingAnnual.revenueGrowth.set(company.id, rollingGrowth);
    state.dataByFrequency.rollingAnnual.profitGrowth.set(company.id, rollingProfitGrowth);

    Object.keys(METRICS).forEach((metricKey) => {
      const qFlags = metricKey === "profitGrowth"
        ? new Set(rawCompany?.forecastFlags?.netIncome || [])
        : new Set(rawCompany?.forecastFlags?.[metricKey] || []);
      const aFlags = annualizeForecastFlags(qFlags);
      const rFlags = rollingForecastFlags(qFlags);

      state.forecastFlagsByFrequency.quarterly[metricKey].set(company.id, qFlags);
      state.forecastFlagsByFrequency.annual[metricKey].set(company.id, aFlags);
      state.forecastFlagsByFrequency.rollingAnnual[metricKey].set(company.id, rFlags);

      forecastCount += qFlags.size;
    });
  });

  return {
    warnings,
    loadedCount,
    forecastCount,
    generatedAt: sourceData.meta?.generatedAt,
  };
}

function init() {
  applyStaticTranslations();
  registerInteractionModes();
  registerTooltipPositioners();
  syncPeriodRangeChip();
  setupTogglePanel();
  initTheme();
  bindEvents();
  preloadCompanyLogos();

  try {
    const { warnings, loadedCount, forecastCount, generatedAt } = loadFromLocalData();

    if (loadedCount === 0) {
      throw new Error(t("localDataEmpty"));
    }

    state.generatedAtIso = generatedAt;
    state.loadSummary = {
      loadedCount,
      forecastCount,
      warningCount: warnings.length,
    };
    refreshLoadedStatusText();
    setRangeToVisibleDataBounds(state.frequency, state.metric);
    syncRangeControls();
    buildChart();
    alignRangeWithChartAxis();
    updateRangeVisual();
    updateViewSummary();

    setStatus(state.loadedStatusText, state.loadedStatusIsError);
  } catch (error) {
    console.error(error);
    setStatus(t("loadFailed", { message: error.message }), true);
  }
}

init();
