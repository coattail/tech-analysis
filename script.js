const sourceData = window.FINANCIAL_SOURCE_DATA;

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
    granularityLabel: "滚动年度（TTM）",
    tooltipPrefix: "TTM",
    csvPeriodicity: "RollingAnnual (TTM)",
    csvPeriodColumn: "Period",
    fileToken: "rolling-annual",
  },
};

const COMPANIES = [
  { id: "apple", name: "苹果", ticker: "AAPL", color: "#ff9f1c", logoPath: "assets/logos/apple.svg" },
  { id: "microsoft", name: "微软", ticker: "MSFT", color: "#57a0ff", logoPath: "assets/logos/microsoft.svg" },
  { id: "alphabet", name: "谷歌", ticker: "GOOGL", color: "#2fd4b0", logoPath: "assets/logos/alphabet.svg" },
  { id: "amazon", name: "亚马逊", ticker: "AMZN", color: "#ffd166", logoPath: "assets/logos/amazon.svg" },
  { id: "meta", name: "Meta", ticker: "META", color: "#ff5f87", logoPath: "assets/logos/meta.svg" },
  { id: "nvidia", name: "英伟达", ticker: "NVDA", color: "#9be000", logoPath: "assets/logos/nvidia.svg" },
  { id: "tsmc", name: "台积电", ticker: "TSM", color: "#35d0ff", logoPath: "assets/logos/tsmc.svg?v=20260423d" },
  { id: "avgo", name: "博通", ticker: "AVGO", color: "#b8a1ff", logoPath: "assets/logos/avgo.svg" },
  { id: "tsla", name: "特斯拉", ticker: "TSLA", color: "#ff5a3d", logoPath: "assets/logos/tsla.svg" },
];
const COMPANY_META = new Map(COMPANIES.map((company) => [company.id, company]));
const DEFAULT_VISIBLE_COMPANIES = ["apple", "microsoft", "nvidia", "amazon"];
const COMPANY_PRESETS = {
  focus: DEFAULT_VISIBLE_COMPANIES,
  ai: ["microsoft", "nvidia", "amazon", "meta"],
  all: COMPANIES.map((company) => company.id),
};
const BAR_CHART_LOGO_LEFT = 14;
const BAR_CHART_LOGO_TARGET_AREA = 44 * 44 * 2;
const BAR_CHART_LOGO_MAX_WIDTH = 170;
const BAR_CHART_LOGO_MAX_HEIGHT = 62;
const companyLogoCache = new Map();
const companyLogoLoadState = new Map();

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

function drawMonochromeLogo(ctx, chart, image, x, y, targetArea, color) {
  if (!image) return false;

  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) return false;

  let scale = Math.sqrt(targetArea / (naturalWidth * naturalHeight));
  let width = Math.max(1, naturalWidth * scale);
  let height = Math.max(1, naturalHeight * scale);

  if (width > BAR_CHART_LOGO_MAX_WIDTH || height > BAR_CHART_LOGO_MAX_HEIGHT) {
    scale *= Math.min(
      BAR_CHART_LOGO_MAX_WIDTH / width,
      BAR_CHART_LOGO_MAX_HEIGHT / height,
    );
    width = Math.max(1, naturalWidth * scale);
    height = Math.max(1, naturalHeight * scale);
  }

  const offsetX = x;
  const offsetY = y - height / 2;
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

  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) return false;

  let scale = Math.sqrt(targetArea / (naturalWidth * naturalHeight));
  let width = Math.max(1, naturalWidth * scale);
  let height = Math.max(1, naturalHeight * scale);

  if (width > BAR_CHART_LOGO_MAX_WIDTH || height > BAR_CHART_LOGO_MAX_HEIGHT) {
    scale *= Math.min(
      BAR_CHART_LOGO_MAX_WIDTH / width,
      BAR_CHART_LOGO_MAX_HEIGHT / height,
    );
    width = Math.max(1, naturalWidth * scale);
    height = Math.max(1, naturalHeight * scale);
  }

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(image, x, y - height / 2, width, height);
  ctx.restore();
  return true;
}

function drawSingleCompanyLogoBadge(ctx, chart, chartArea, company, chartFontFamily, isDeepTheme) {
  if (!company) return false;

  const badgeX = chartArea.left + BAR_CHART_LOGO_LEFT;
  const badgeY = chartArea.top + 32;
  const logoImage = getCompanyLogo(company.id);
  const logoColor = isDeepTheme ? "#f4f7fb" : "#f3f6fa";

  if (
    logoImage &&
    (company.preserveLogoColors
      ? drawOriginalLogo(
        ctx,
        chart,
        logoImage,
        badgeX,
        badgeY,
        BAR_CHART_LOGO_TARGET_AREA,
      )
      : drawMonochromeLogo(
        ctx,
        chart,
        logoImage,
        badgeX,
        badgeY,
        BAR_CHART_LOGO_TARGET_AREA,
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
  ctx.fillText(`${company.name} ${company.ticker}`, badgeX, badgeY);
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

    if (singleCompanyId) {
      const company = COMPANY_META.get(singleCompanyId);
      const hasVisibleDataset = chart.data.datasets.some((item) => item.companyId === singleCompanyId && !item.hidden);
      if (!company || !hasVisibleDataset) return;

      drawSingleCompanyLogoBadge(ctx, chart, chartArea, company, chartFontFamily, isDeepTheme);

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
      ctx.fillStyle = isDeepTheme ? "#f4f7fb" : "#f3f6fa";
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
    const maxTextWidth = plotWidth * 0.74;
    const maxTextHeight = plotHeight * 0.34;
    const baseFontSize = 100;
    const baseFont = `800 ${baseFontSize}px ${themeTokens.chartFontFamily}`;
    const measuredWidth = Math.max(measureTextWidth(ticker, baseFont), 1);
    const fittedFontSize = Math.min(
      maxTextHeight,
      (maxTextWidth / measuredWidth) * baseFontSize,
    );
    const fontSize = Math.max(SINGLE_COMPANY_WATERMARK_MIN_FONT_SIZE, fittedFontSize);

    ctx.save();
    ctx.font = `800 ${fontSize}px ${themeTokens.chartFontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = colorToRgba("#ffffff", SINGLE_COMPANY_WATERMARK_ALPHA);
    ctx.fillText(
      ticker,
      (chartArea.left + chartArea.right) / 2,
      (chartArea.top + chartArea.bottom) / 2,
    );
    ctx.restore();
  },
};

const customYAxisTitlePlugin = {
  id: "customYAxisTitle",
  afterDraw(chart) {
    const yScale = chart.scales?.y;
    if (!yScale) return;

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
    label: "营收（十亿美元）",
    axisLabel: "营收（十亿美元，USD）",
    sourceKey: "revenue",
    annualMode: "sum",
  },
  netIncome: {
    label: "净利润（十亿美元）",
    axisLabel: "净利润（十亿美元，USD）",
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
};

const chartEl = document.getElementById("financeChart");
const statusEl = document.getElementById("statusText");
const togglesEl = document.getElementById("companyToggles");
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
const chartModeControlEl = document.getElementById("chartModeControl");
const metricInputs = Array.from(document.querySelectorAll('input[name="metric"]'));
const frequencyInputs = Array.from(document.querySelectorAll('input[name="frequency"]'));
const chartModeInputs = Array.from(document.querySelectorAll('input[name="chartMode"]'));
const presetButtons = Array.from(document.querySelectorAll("[data-company-preset]"));

const decimalFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const BASE_Y_AXIS_TITLE_FONT_SIZE = 11;
const Y_AXIS_TITLE_FONT_SIZE = BASE_Y_AXIS_TITLE_FONT_SIZE * 1.28;
const CHART_PLOT_LEFT_NUDGE = 6;
const SINGLE_COMPANY_CHART_RIGHT_PADDING = 52;
const MULTI_COMPANY_CHART_RIGHT_PADDING = 52;
const Y_AXIS_TICK_PADDING = 2;
const Y_AXIS_TITLE_PADDING = 28;
const Y_AXIS_RESERVED_EXTRA_WIDTH = 44;
const Y_AXIS_MIN_RESERVED_WIDTH = 104;
const Y_AXIS_TITLE_MAIN_FONT_SIZE = 15.4;
const Y_AXIS_TITLE_DETAIL_FONT_SIZE = 12.1;
const Y_AXIS_TITLE_HORIZONTAL_OFFSET = 20;
const Y_AXIS_TITLE_VERTICAL_OFFSET = -28;
const SINGLE_COMPANY_WATERMARK_MIN_FONT_SIZE = 64;
const SINGLE_COMPANY_WATERMARK_ALPHA = 0.1;
const EXPORT_DEVICE_PIXEL_RATIO = 8;

const state = {
  chart: null,
  metric: "revenue",
  frequency: "quarterly",
  chartMode: "line",
  visibleCompanies: new Set(DEFAULT_VISIBLE_COMPANIES),
  rangeStart: 0,
  rangeEnd: 0,
  generatedAtLabel: "-",
  dataByFrequency: {
    quarterly: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
    },
    annual: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
    },
    rollingAnnual: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
    },
  },
  forecastFlagsByFrequency: {
    quarterly: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
    },
    annual: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
    },
    rollingAnnual: {
      revenue: new Map(),
      netIncome: new Map(),
      grossMargin: new Map(),
      pe: new Map(),
      roe: new Map(),
      revenueGrowth: new Map(),
    },
  },
};

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("is-error", isError);
}

function getSingleVisibleCompanyId() {
  if (state.visibleCompanies.size !== 1) return null;
  return state.visibleCompanies.values().next().value ?? null;
}

function getEffectiveChartMode() {
  return getSingleVisibleCompanyId() ? state.chartMode : "line";
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
    chartFontFamily: css.getPropertyValue("--font-chart").trim() || fontFallback,
    terminalFontFamily: css.getPropertyValue("--font-terminal").trim() || fontFallback,
  };
}

function initTheme() {
  document.body.dataset.theme = "deep";
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function getLabelsForFrequency(frequency) {
  return frequency === "annual" ? ANNUAL_LABELS : QUARTER_LABELS;
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

  if (!labels.length || !seriesMap) {
    return { hasData: false, start: 0, end: 0 };
  }

  let firstIndex = Number.POSITIVE_INFINITY;
  let lastIndex = -1;

  state.visibleCompanies.forEach((companyId) => {
    const series = seriesMap.get(companyId);
    if (!series) return;

    labels.forEach((label, index) => {
      const value = series.get(label);
      if (!isFiniteNumber(value)) return;
      firstIndex = Math.min(firstIndex, index);
      lastIndex = Math.max(lastIndex, index);
    });
  });

  if (!Number.isFinite(firstIndex) || lastIndex < 0) {
    return {
      hasData: false,
      start: 0,
      end: Math.max(0, labels.length - 1),
    };
  }

  return {
    hasData: true,
    start: firstIndex,
    end: lastIndex,
  };
}

function setRangeToVisibleDataBounds(frequency = state.frequency, metric = state.metric) {
  const labels = getLabelsForFrequency(frequency);
  if (!labels.length) {
    state.rangeStart = 0;
    state.rangeEnd = 0;
    return;
  }

  const bounds = getVisibleDataBounds(frequency, metric);
  state.rangeStart = bounds.start;
  state.rangeEnd = bounds.end;
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
    button.classList.toggle("is-active", setsMatch(state.visibleCompanies, presetItems));
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

function updateViewSummary() {
  if (activeMetricLabelEl) {
    activeMetricLabelEl.textContent = METRICS[state.metric]?.label ?? "-";
  }

  if (activeFrequencyLabelEl) {
    activeFrequencyLabelEl.textContent = FREQUENCY_META[state.frequency]?.granularityLabel ?? "-";
  }

  if (visibleCompaniesLabelEl) {
    visibleCompaniesLabelEl.textContent = `${state.visibleCompanies.size} / ${COMPANIES.length}`;
  }

  if (generatedAtLabelEl) {
    generatedAtLabelEl.textContent = state.generatedAtLabel;
  }

  syncChartModeControl();
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

  QUARTER_LABELS.forEach((period, index) => {
    const windowStart = Math.max(0, index - 3);
    const windowKeys = QUARTER_LABELS.slice(windowStart, index + 1);
    const values = windowKeys.map((key) => quarterSeries.get(key));
    if (!values.every((v) => isFiniteNumber(v))) {
      rolling.set(period, null);
      return;
    }

    const sum = values.reduce((sum, v) => sum + v, 0);
    if (windowKeys.length < 4) {
      // For the first three quarters (2005Q1-Q3), annualize available quarters.
      rolling.set(period, (sum * 4) / windowKeys.length);
      return;
    }

    rolling.set(period, sum);
  });

  return rolling;
}

function aggregatePointRollingAverage(quarterSeries) {
  const rolling = emptySeries(QUARTER_LABELS);

  QUARTER_LABELS.forEach((period, index) => {
    const windowStart = Math.max(0, index - 3);
    const windowKeys = QUARTER_LABELS.slice(windowStart, index + 1);
    const values = windowKeys.map((key) => quarterSeries.get(key));
    if (!values.every((v) => isFiniteNumber(v))) {
      rolling.set(period, null);
      return;
    }

    const avg = values.reduce((sum, v) => sum + v, 0) / windowKeys.length;
    rolling.set(period, avg);
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

  QUARTER_LABELS.forEach((period, index) => {
    const windowStart = Math.max(0, index - 3);
    const windowKeys = QUARTER_LABELS.slice(windowStart, index + 1);
    const pairs = windowKeys.map((key) => ({
      margin: quarterMarginSeries.get(key),
      revenue: quarterRevenueSeries.get(key),
    }));

    if (!pairs.every((pair) => isFiniteNumber(pair.margin) && isFiniteNumber(pair.revenue))) {
      rolling.set(period, null);
      return;
    }

    const revenueSum = pairs.reduce((sum, pair) => sum + pair.revenue, 0);
    if (!isFiniteNumber(revenueSum) || revenueSum === 0) {
      rolling.set(period, null);
      return;
    }

    const grossProfitSum = pairs.reduce((sum, pair) => sum + (pair.margin / 100) * pair.revenue, 0);
    rolling.set(period, (grossProfitSum / revenueSum) * 100);
  });

  return rolling;
}

function computeAnnualRevenueGrowth(annualRevenueSeries) {
  const growth = emptySeries(ANNUAL_LABELS);

  ANNUAL_LABELS.forEach((year, index) => {
    if (index === 0) {
      growth.set(year, null);
      return;
    }

    const prev = annualRevenueSeries.get(ANNUAL_LABELS[index - 1]);
    const curr = annualRevenueSeries.get(year);
    if (!isFiniteNumber(prev) || !isFiniteNumber(curr) || prev === 0) {
      growth.set(year, null);
      return;
    }

    growth.set(year, ((curr - prev) / Math.abs(prev)) * 100);
  });

  return growth;
}

function computeRollingAnnualRevenueGrowth(quarterRevenueSeries) {
  const growth = emptySeries(QUARTER_LABELS);
  const rollingRevenue = aggregateFlowRollingAnnual(quarterRevenueSeries);

  QUARTER_LABELS.forEach((period, index) => {
    if (index < 4) {
      growth.set(period, null);
      return;
    }

    const prev = rollingRevenue.get(QUARTER_LABELS[index - 4]);
    const curr = rollingRevenue.get(period);
    if (!isFiniteNumber(prev) || !isFiniteNumber(curr) || prev === 0) {
      growth.set(period, null);
      return;
    }

    growth.set(period, ((curr - prev) / Math.abs(prev)) * 100);
  });

  return growth;
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
    const inBillions = value / 1e9;
    const abs = Math.abs(inBillions);
    if (abs >= 1000) return `$${decimalFormatter.format(inBillions / 1000)}T`;
    return `$${decimalFormatter.format(inBillions)}B`;
  }

  if (metricKey === "revenueGrowth" || metricKey === "roe" || metricKey === "grossMargin") {
    return `${decimalFormatter.format(value)}%`;
  }

  return `${decimalFormatter.format(value)}x`;
}

function formatMetricValue(metricKey, value) {
  if (!isFiniteNumber(value)) return "无数据";

  if (metricKey === "revenue" || metricKey === "netIncome") {
    return `$${decimalFormatter.format(value / 1e9)}B`;
  }

  if (metricKey === "revenueGrowth" || metricKey === "roe" || metricKey === "grossMargin") {
    return `${decimalFormatter.format(value)}%`;
  }

  return `${decimalFormatter.format(value)}x`;
}

function buildYAxisTitleParts(metricKey, frequencyKey) {
  const metricMeta = METRICS[metricKey] ?? METRICS.revenue;
  const frequencyMeta = FREQUENCY_META[frequencyKey] ?? FREQUENCY_META.quarterly;
  const match = /^(.+?)(（.+）)$/.exec(metricMeta.axisLabel);

  if (!match) {
    return {
      mainText: `${frequencyMeta.granularityLabel}${metricMeta.axisLabel}`,
      detailText: "",
    };
  }

  const [, metricName, metricUnit] = match;
  let detailText = metricUnit;

  if (metricKey === "revenue" || metricKey === "netIncome") {
    detailText = "（十亿美元，Billion USD）";
  }

  return {
    mainText: `${frequencyMeta.granularityLabel}${metricName}`,
    detailText,
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
    setStatus("图表尚未加载完成，暂时无法下载。", true);
    return;
  }

  const chart = state.chart;
  const sourceCanvas = chart.canvas;
  if (!sourceCanvas) {
    setStatus("图表画布不可用，暂时无法下载。", true);
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
  const backgroundColor = wrapStyle?.backgroundColor && wrapStyle.backgroundColor !== "rgba(0, 0, 0, 0)"
    ? wrapStyle.backgroundColor
    : (document.body.dataset.theme === "deep" ? "#101823" : "#263567");

  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");
  if (!exportCtx) {
    setStatus("导出失败：无法创建图片上下文。", true);
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
    setStatus(`正在导出高清图片（${targetDevicePixelRatio}x）...`, false);

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
    setStatus("导出失败：高清重绘未完成。", true);
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

  setStatus(`已下载：${filename}`, false);
}

function syncRangeControls() {
  const labels = getLabelsForFrequency(state.frequency);
  const max = labels.length - 1;

  state.rangeStart = Math.max(0, Math.min(state.rangeStart, max));
  state.rangeEnd = Math.max(0, Math.min(state.rangeEnd, max));
  if (state.rangeStart > state.rangeEnd) {
    state.rangeStart = 0;
    state.rangeEnd = max;
  }

  rangeStartEl.min = "0";
  rangeStartEl.max = String(max);
  rangeEndEl.min = "0";
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
  const max = labels.length - 1;

  let startPct = 0;
  let endPct = 100;

  if (max > 0) {
    startPct = (state.rangeStart / max) * 100;
    endPct = (state.rangeEnd / max) * 100;
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

    return {
      type: useBarDataset ? "bar" : "line",
      label: company.name,
      companyId: company.id,
      data: fullData.slice(state.rangeStart, state.rangeEnd + 1),
      forecastedLabels: [...forecasted],
      borderColor: company.color,
      backgroundColor: useBarDataset ? colorToRgba(company.color, 0.78) : company.color,
      borderWidth: useBarDataset ? 1.2 : 2,
      borderRadius: useBarDataset ? 6 : 0,
      borderSkipped: false,
      barPercentage: useBarDataset ? 0.72 : 0.9,
      categoryPercentage: useBarDataset ? 0.82 : 0.9,
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
  datasets.forEach((dataset) => {
    if (dataset.hidden) return;
    for (let index = dataset.data.length - 1; index >= 0; index -= 1) {
      if (!isFiniteNumber(dataset.data[index])) continue;
      lastVisibleValueIndex = Math.max(lastVisibleValueIndex, index);
      break;
    }
  });

  const trimmedEndIndex = lastVisibleValueIndex >= 0 ? lastVisibleValueIndex : 0;
  const visibleLabels = rangeLabels.slice(0, trimmedEndIndex + 1);
  const trimmedDatasets = datasets.map((dataset) => ({
    ...dataset,
    data: dataset.data.slice(0, trimmedEndIndex + 1),
  }));

  return { labels: visibleLabels, datasets: trimmedDatasets };
}

function replaceArrayContents(target, nextValues) {
  target.splice(0, target.length, ...nextValues);
}

function formatXAxisTick(label) {
  if (state.frequency === "annual") return label;
  if (typeof label !== "string") return "";
  return label.endsWith("Q1") ? label.slice(0, 4) : "";
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

function buildXGridColorCallback(themeTokens) {
  return (context) => {
    const labels = context?.chart?.data?.labels ?? [];
    const rawIndex = context?.index;
    const parsedIndex = Number(context?.tick?.value);
    const tickIndex = Number.isInteger(rawIndex) ? rawIndex : (Number.isFinite(parsedIndex) ? parsedIndex : -1);
    const labelFromTick = typeof context?.tick?.label === "string" ? context.tick.label : null;
    const labelFromValue = typeof context?.tick?.value === "string" ? context.tick.value : null;
    const label = labels[tickIndex] ?? labelFromTick ?? labelFromValue;
    return resolveXGridColor(themeTokens, label, tickIndex >= 0 ? tickIndex : 0);
  };
}

function collectDatasetValues(datasets, includeHidden = false) {
  const values = [];
  datasets.forEach((dataset) => {
    if (!includeHidden && dataset.hidden) return;
    dataset.data.forEach((value) => {
      if (isFiniteNumber(value)) values.push(value);
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
  const safeMax = Math.max(max, 1);
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
  const span = Math.max(max - min, Math.abs(max), 1);
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

function computeYAxisBounds(datasets, chartMode = "line", includeHidden = false) {
  const values = collectDatasetValues(datasets, includeHidden);
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

    if (chartMode === "bar") {
      if (max >= 0) {
        const rounded = roundPositiveAxisBounds(
          0,
          toAxisDisplayValue(state.metric, max),
          true,
        );
        return {
          min: 0,
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

  if (chartMode === "bar") {
    if (!includesNegative) {
      const rounded = roundPositiveAxisBounds(
        0,
        toAxisDisplayValue(state.metric, includesPositive ? max : 0),
        true,
      );
      return {
        min: 0,
        max: includesPositive ? fromAxisDisplayValue(state.metric, rounded.max) : 0,
      };
    }

    const rounded = roundAxisBoundsToNiceValues(
      toAxisDisplayValue(state.metric, min - minPadding),
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

function measureTextWidth(text, font) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
}

function computeYAxisReservedWidth(datasets, chartMode, themeTokens) {
  const bounds = computeYAxisBounds(datasets, chartMode, true);
  const sampleValues = [bounds.min, bounds.max, 0];
  const font = `600 10px ${themeTokens.chartFontFamily}`;
  const widestLabel = sampleValues.reduce((maxWidth, value) => {
    const width = measureTextWidth(formatYAxisTick(state.metric, Number(value)), font);
    return Math.max(maxWidth, width);
  }, 0);

  return Math.max(
    Y_AXIS_MIN_RESERVED_WIDTH,
    Math.ceil(widestLabel + Y_AXIS_RESERVED_EXTRA_WIDTH),
  );
}

function syncChartDatasets(nextDatasets) {
  const existingDatasets = new Map(
    (state.chart?.data?.datasets ?? []).map((dataset) => [dataset.companyId, dataset]),
  );

  state.chart.data.datasets = nextDatasets.map((nextDataset) => {
    const currentDataset = existingDatasets.get(nextDataset.companyId);
    if (!currentDataset) return nextDataset;

    if (!Array.isArray(currentDataset.data)) currentDataset.data = [];
    replaceArrayContents(currentDataset.data, nextDataset.data);

    currentDataset.label = nextDataset.label;
    currentDataset.companyId = nextDataset.companyId;
    currentDataset.type = nextDataset.type;
    currentDataset.forecastedLabels = [...nextDataset.forecastedLabels];
    currentDataset.borderColor = nextDataset.borderColor;
    currentDataset.backgroundColor = nextDataset.backgroundColor;
    currentDataset.borderWidth = nextDataset.borderWidth;
    currentDataset.borderRadius = nextDataset.borderRadius;
    currentDataset.borderSkipped = nextDataset.borderSkipped;
    currentDataset.barPercentage = nextDataset.barPercentage;
    currentDataset.categoryPercentage = nextDataset.categoryPercentage;
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

function syncChartLabels(nextLabels) {
  if (!Array.isArray(state.chart?.data?.labels)) {
    state.chart.data.labels = [...nextLabels];
    return;
  }

  replaceArrayContents(state.chart.data.labels, nextLabels);
}

function applyVisibilityStateToChart() {
  if (!state.chart) return;
  setRangeToVisibleDataBounds();
  syncRangeControls();
  refreshChart("none");
}

function buildChartLayoutPadding(effectiveChartMode) {
  if (getSingleVisibleCompanyId()) {
    return {
      left: 0,
      right: SINGLE_COMPANY_CHART_RIGHT_PADDING,
    };
  }

  return {
    left: 0,
    right: MULTI_COMPANY_CHART_RIGHT_PADDING,
  };
}

function refreshChart(updateMode = undefined) {
  if (!state.chart) return;

  const { labels, datasets } = buildDatasetsForView();
  const effectiveChartMode = getEffectiveChartMode();
  const yBounds = computeYAxisBounds(datasets, effectiveChartMode);
  const themeTokens = getChartThemeTokens();
  const yReservedWidth = computeYAxisReservedWidth(datasets, effectiveChartMode, themeTokens);
  syncChartLabels(labels);
  syncChartDatasets(datasets);
  state.chart.data.datasets.forEach((dataset, index) => {
    state.chart.setDatasetVisibility(index, state.visibleCompanies.has(dataset.companyId));
  });
  state.chart.options.scales.y.title.text = buildYAxisTitle(state.metric, state.frequency);
  state.chart.options.scales.y.min = yBounds.min;
  state.chart.options.scales.y.max = yBounds.max;
  state.chart.options.scales.y.reservedWidth = yReservedWidth;
  state.chart.options.scales.x.title.text = (FREQUENCY_META[state.frequency] ?? FREQUENCY_META.quarterly).axisTitle;
  state.chart.options.scales.x.offset = effectiveChartMode === "bar";
  state.chart.options.scales.x.grid.offset = effectiveChartMode === "bar";
  state.chart.options.layout.padding = buildChartLayoutPadding(effectiveChartMode);
  state.chart.update(updateMode);
  alignRangeWithChartAxis();
  updateRangeVisual();
  updateViewSummary();
}

function createToggle(company) {
  const label = document.createElement("label");
  label.className = "toggle-item";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = state.visibleCompanies.has(company.id);
  checkbox.dataset.companyId = company.id;

  const dot = document.createElement("span");
  dot.className = "color-dot";
  dot.style.backgroundColor = company.color;

  const text = document.createElement("span");
  text.textContent = company.name;

  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      state.visibleCompanies.add(company.id);
    } else {
      state.visibleCompanies.delete(company.id);
    }
    applyVisibilityStateToChart();
  });

  label.append(checkbox, dot, text);
  return label;
}

function setupTogglePanel() {
  togglesEl.innerHTML = "";
  COMPANIES.forEach((company) => {
    togglesEl.appendChild(createToggle(company));
  });
  syncPresetButtons();
}

function syncTogglePanelSelection() {
  const checkboxes = togglesEl.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    checkbox.checked = state.visibleCompanies.has(checkbox.dataset.companyId);
  });
}

function setAllVisibility(visible) {
  state.visibleCompanies = visible ? new Set(COMPANIES.map((item) => item.id)) : new Set();
  syncTogglePanelSelection();
  applyVisibilityStateToChart();
}

function applyCompanyPreset(presetKey) {
  const companyIds = COMPANY_PRESETS[presetKey];
  if (!companyIds) return;
  state.visibleCompanies = new Set(companyIds);
  syncTogglePanelSelection();
  applyVisibilityStateToChart();
}

function buildChart() {
  const themeTokens = getChartThemeTokens();

  const { labels, datasets } = buildDatasetsForView();
  const effectiveChartMode = getEffectiveChartMode();
  const yBounds = computeYAxisBounds(datasets, effectiveChartMode);
  const yReservedWidth = computeYAxisReservedWidth(datasets, effectiveChartMode, themeTokens);

  state.chart = new Chart(chartEl, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: buildChartLayoutPadding(effectiveChartMode),
      },
      onResize() {
        alignRangeWithChartAxis();
        updateRangeVisual();
      },
      interaction: { mode: "index", intersect: false },
      elements: {
        bar: {
          borderRadius: 6,
          borderSkipped: false,
        },
      },
      scales: {
        x: {
          offset: effectiveChartMode === "bar",
          border: { color: "rgba(0,0,0,0)" },
          title: {
            display: true,
            text: (FREQUENCY_META[state.frequency] ?? FREQUENCY_META.quarterly).axisTitle,
            color: themeTokens.axisColor,
            font: { family: themeTokens.chartFontFamily, size: 11, weight: "600" },
          },
          ticks: {
            autoSkip: false,
            color: themeTokens.axisColor,
            font: { family: themeTokens.chartFontFamily, size: 10, weight: "600" },
            callback(value) {
              const label = this.getLabelForValue(value);
              return formatXAxisTick(label);
            },
          },
          grid: {
            color: buildXGridColorCallback(themeTokens),
            offset: effectiveChartMode === "bar",
            borderDash: [],
          },
        },
        y: {
          afterFit(scale) {
            const reservedWidth = scale.options.reservedWidth ?? scale.width;
            scale.width = Math.max(0, reservedWidth - CHART_PLOT_LEFT_NUDGE);
          },
          border: { color: "rgba(0,0,0,0)" },
          min: yBounds.min,
          max: yBounds.max,
          reservedWidth: yReservedWidth,
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
            font: { family: themeTokens.chartFontFamily, size: 10, weight: "600" },
            padding: Y_AXIS_TICK_PADDING,
            callback(value) {
              return formatYAxisTick(state.metric, Number(value));
            },
          },
          grid: {
            color: themeTokens.yGridColor,
            borderDash: [4, 6],
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
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
              const prefix = (FREQUENCY_META[state.frequency] ?? FREQUENCY_META.quarterly).tooltipPrefix;
              return `${prefix}：${context[0].label}`;
            },
            label(context) {
              const label = String(context.label);
              const isForecast =
                Array.isArray(context.dataset.forecastedLabels) &&
                context.dataset.forecastedLabels.includes(label);
              const suffix = isForecast ? "（预测）" : "";
              return `${context.dataset.label}：${formatMetricValue(state.metric, context.parsed.y)}${suffix}`;
            },
          },
        },
      },
    },
    plugins: [singleCompanyTickerWatermarkPlugin, rightTickerLabelsPlugin, customYAxisTitlePlugin],
  });
}

function bindEvents() {
  showAllBtn.addEventListener("click", () => setAllVisibility(true));
  hideAllBtn.addEventListener("click", () => setAllVisibility(false));

  metricInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.metric = input.value;
      setRangeToVisibleDataBounds();
      syncRangeControls();
      refreshChart();
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

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyCompanyPreset(button.dataset.companyPreset);
    });
  });

  rangeStartEl.addEventListener("input", () => {
    const next = Number(rangeStartEl.value);
    state.rangeStart = Number.isFinite(next) ? next : state.rangeStart;
    if (state.rangeStart > state.rangeEnd) state.rangeEnd = state.rangeStart;
    syncRangeControls();
    refreshChart("none");
  });

  rangeEndEl.addEventListener("input", () => {
    const next = Number(rangeEndEl.value);
    state.rangeEnd = Number.isFinite(next) ? next : state.rangeEnd;
    if (state.rangeEnd < state.rangeStart) state.rangeStart = state.rangeEnd;
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
  if (!isoString) return "未知时间";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "未知时间";

  return new Intl.DateTimeFormat("zh-CN", {
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
    throw new Error("未检测到本地 data.js 数据对象");
  }

  const warnings = [];
  let loadedCount = 0;
  let forecastCount = 0;

  COMPANIES.forEach((company) => {
    const rawCompany = sourceData.companies[company.id];
    if (!rawCompany) {
      warnings.push(`${company.name} 缺少本地数据`);
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

    const quarterRevenue = objectToSeries(QUARTER_LABELS, rawCompany.revenue);
    const quarterNetIncome = objectToSeries(QUARTER_LABELS, rawCompany.earnings);
    const quarterGrossMargin = objectToSeries(QUARTER_LABELS, rawCompany.grossMargin);
    const quarterPe = objectToSeries(QUARTER_LABELS, rawCompany.pe);
    const quarterRoe = objectToSeries(QUARTER_LABELS, rawCompany.roe);
    const quarterGrowth = objectToSeries(QUARTER_LABELS, rawCompany.revenueGrowth);

    state.dataByFrequency.quarterly.revenue.set(company.id, quarterRevenue);
    state.dataByFrequency.quarterly.netIncome.set(company.id, quarterNetIncome);
    state.dataByFrequency.quarterly.grossMargin.set(company.id, quarterGrossMargin);
    state.dataByFrequency.quarterly.pe.set(company.id, quarterPe);
    state.dataByFrequency.quarterly.roe.set(company.id, quarterRoe);
    state.dataByFrequency.quarterly.revenueGrowth.set(company.id, quarterGrowth);

    const annualRevenue = aggregateFlowAnnual(quarterRevenue);
    const annualNetIncome = aggregateFlowAnnual(quarterNetIncome);
    const annualGrossMargin = aggregateMarginAnnual(quarterGrossMargin, quarterRevenue);
    const annualPe = aggregatePointAnnual(quarterPe);
    const annualRoe = aggregatePointAnnual(quarterRoe);
    const annualGrowth = computeAnnualRevenueGrowth(annualRevenue);

    const rollingRevenue = aggregateFlowRollingAnnual(quarterRevenue);
    const rollingNetIncome = aggregateFlowRollingAnnual(quarterNetIncome);
    const rollingGrossMargin = aggregateMarginRollingAnnual(quarterGrossMargin, quarterRevenue);
    const rollingPe = aggregatePointRollingAverage(quarterPe);
    const rollingRoe = aggregatePointRollingAverage(quarterRoe);
    const rollingGrowth = computeRollingAnnualRevenueGrowth(quarterRevenue);

    state.dataByFrequency.annual.revenue.set(company.id, annualRevenue);
    state.dataByFrequency.annual.netIncome.set(company.id, annualNetIncome);
    state.dataByFrequency.annual.grossMargin.set(company.id, annualGrossMargin);
    state.dataByFrequency.annual.pe.set(company.id, annualPe);
    state.dataByFrequency.annual.roe.set(company.id, annualRoe);
    state.dataByFrequency.annual.revenueGrowth.set(company.id, annualGrowth);

    state.dataByFrequency.rollingAnnual.revenue.set(company.id, rollingRevenue);
    state.dataByFrequency.rollingAnnual.netIncome.set(company.id, rollingNetIncome);
    state.dataByFrequency.rollingAnnual.grossMargin.set(company.id, rollingGrossMargin);
    state.dataByFrequency.rollingAnnual.pe.set(company.id, rollingPe);
    state.dataByFrequency.rollingAnnual.roe.set(company.id, rollingRoe);
    state.dataByFrequency.rollingAnnual.revenueGrowth.set(company.id, rollingGrowth);

    Object.keys(METRICS).forEach((metricKey) => {
      const qFlags = new Set(rawCompany?.forecastFlags?.[metricKey] || []);
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
  syncPeriodRangeChip();
  setupTogglePanel();
  initTheme();
  bindEvents();
  preloadCompanyLogos();

  try {
    const { warnings, loadedCount, forecastCount, generatedAt } = loadFromLocalData();

    if (loadedCount === 0) {
      throw new Error("本地数据为空，请重新生成 data.js");
    }

    state.generatedAtLabel = formatGeneratedAt(generatedAt);
    setRangeToVisibleDataBounds(state.frequency, state.metric);
    syncRangeControls();
    buildChart();
    alignRangeWithChartAxis();
    updateRangeVisual();
    updateViewSummary();

    const stamp = state.generatedAtLabel;

    if (warnings.length > 0) {
      setStatus(
        `已载入 ${loadedCount}/${COMPANIES.length} 家公司，数据更新于 ${stamp}。另有 ${warnings.length} 家存在缺失数据。`,
        true,
      );
      return;
    }

    setStatus(`数据更新于 ${stamp}，共载入 ${COMPANIES.length} 家公司，预测补点 ${forecastCount} 个。`, false);
  } catch (error) {
    console.error(error);
    setStatus(`加载失败：${error.message}`, true);
  }
}

init();
