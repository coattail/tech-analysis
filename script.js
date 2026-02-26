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
    axisTitle: "季度",
    tooltipPrefix: "季度",
    csvPeriodicity: "Quarterly",
    csvPeriodColumn: "Period",
    fileToken: "quarterly",
  },
  annual: {
    axisTitle: "年份",
    tooltipPrefix: "年份",
    csvPeriodicity: "Annual",
    csvPeriodColumn: "Year",
    fileToken: "annual",
  },
  rollingAnnual: {
    axisTitle: "季度（滚动年度）",
    tooltipPrefix: "季度（滚动年度）",
    csvPeriodicity: "RollingAnnual (TTM)",
    csvPeriodColumn: "Period",
    fileToken: "rolling-annual",
  },
};

const COMPANIES = [
  { id: "apple", name: "苹果", ticker: "AAPL", color: "#ff9f1c" },
  { id: "microsoft", name: "微软", ticker: "MSFT", color: "#57a0ff" },
  { id: "alphabet", name: "谷歌", ticker: "GOOGL", color: "#3ed07b" },
  { id: "amazon", name: "亚马逊", ticker: "AMZN", color: "#ffd166" },
  { id: "meta", name: "Meta", ticker: "META", color: "#ff5f87" },
  { id: "nvidia", name: "英伟达", ticker: "NVDA", color: "#9be000" },
  { id: "tsmc", name: "台积电", ticker: "TSM", color: "#35d0ff" },
  { id: "avgo", name: "博通", ticker: "AVGO", color: "#b8a1ff" },
  { id: "tsla", name: "特斯拉", ticker: "TSLA", color: "#ff5a3d" },
];
const COMPANY_META = new Map(COMPANIES.map((company) => [company.id, company]));

const rightTickerLabelsPlugin = {
  id: "rightTickerLabels",
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

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
        color: dataset.borderColor || "#eaf2ff",
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
    const css = getComputedStyle(document.body);
    const tickerStroke = css.getPropertyValue("--ticker-stroke").trim() || "rgba(9, 14, 22, 0.88)";
    const isDeepTheme = document.body.dataset.theme === "deep";
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    const labelX = chartArea.right + 8;

    labels.forEach((item) => {
      if (isDeepTheme) {
        ctx.strokeStyle = tickerStroke;
        ctx.strokeText(item.ticker, labelX, item.y);
      }
      ctx.fillStyle = item.color;
      ctx.fillText(item.ticker, labelX, item.y);
    });

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
const themeToggleBtn = document.getElementById("themeToggleBtn");
const periodRangeChipEl = document.getElementById("periodRangeChip");
const metricInputs = Array.from(document.querySelectorAll('input[name="metric"]'));
const frequencyInputs = Array.from(document.querySelectorAll('input[name="frequency"]'));
const THEME_STORAGE_KEY = "enterprise-finance-dashboard-theme";

const decimalFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const csvDecimalFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

const state = {
  chart: null,
  metric: "revenue",
  frequency: "quarterly",
  visibleCompanies: new Set(COMPANIES.map((company) => company.id)),
  rangeStart: 0,
  rangeEnd: 0,
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
  statusEl.style.color = isError ? "#ff8c8c" : "";
}

function getChartThemeTokens() {
  const css = getComputedStyle(document.body);
  return {
    axisColor: css.getPropertyValue("--ink-soft").trim() || "#b1c1d5",
    gridColor: css.getPropertyValue("--line").trim() || "#30475d",
    tooltipBg: css.getPropertyValue("--tooltip-bg").trim() || "#0b121b",
    tooltipBorder: css.getPropertyValue("--tooltip-border").trim() || "#3a4f67",
    tooltipTitle: css.getPropertyValue("--tooltip-title").trim() || "#f6f9ff",
    tooltipBody: css.getPropertyValue("--tooltip-body").trim() || "#edf4ff",
  };
}

function refreshChartTheme() {
  if (!state.chart) return;
  const themeTokens = getChartThemeTokens();

  state.chart.options.scales.x.title.color = themeTokens.axisColor;
  state.chart.options.scales.x.ticks.color = themeTokens.axisColor;
  state.chart.options.scales.x.grid.color = themeTokens.gridColor;

  state.chart.options.scales.y.title.color = themeTokens.axisColor;
  state.chart.options.scales.y.ticks.color = themeTokens.axisColor;
  state.chart.options.scales.y.grid.color = themeTokens.gridColor;

  state.chart.options.plugins.tooltip.backgroundColor = themeTokens.tooltipBg;
  state.chart.options.plugins.tooltip.borderColor = themeTokens.tooltipBorder;
  state.chart.options.plugins.tooltip.titleColor = themeTokens.tooltipTitle;
  state.chart.options.plugins.tooltip.bodyColor = themeTokens.tooltipBody;

  state.chart.update("none");
  alignRangeWithChartAxis();
  updateRangeVisual();
}

function updateThemeToggleUi(theme) {
  if (!themeToggleBtn) return;
  const isDeep = theme === "deep";
  themeToggleBtn.textContent = isDeep ? "切换为清新风格" : "切换为深色专业";
  themeToggleBtn.setAttribute("aria-pressed", isDeep ? "true" : "false");
}

function applyTheme(theme, { persist = true, refreshChartStyle = true } = {}) {
  const finalTheme = theme === "deep" ? "deep" : "fresh";

  if (finalTheme === "deep") {
    document.body.dataset.theme = "deep";
  } else {
    document.body.removeAttribute("data-theme");
  }

  updateThemeToggleUi(finalTheme);

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, finalTheme);
    } catch (error) {
      console.warn("主题偏好保存失败", error);
    }
  }

  if (refreshChartStyle) {
    refreshChartTheme();
  }
}

function initTheme() {
  let savedTheme = "fresh";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "fresh" || stored === "deep") {
      savedTheme = stored;
    }
  } catch (error) {
    console.warn("主题偏好读取失败", error);
  }

  applyTheme(savedTheme, { persist: false, refreshChartStyle: false });
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
  periodRangeChipEl.textContent = `时间范围：${first}-${last}`;
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

function formatCsvMetricValue(metricKey, value) {
  if (!isFiniteNumber(value)) return "";
  if (metricKey === "revenue" || metricKey === "netIncome") {
    return csvDecimalFormatter.format(value / 1e9);
  }
  return csvDecimalFormatter.format(value);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
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

function getVisibleLabels() {
  const labels = getLabelsForFrequency(state.frequency);
  return labels.slice(state.rangeStart, state.rangeEnd + 1);
}

function buildCurrentMetricCsv() {
  const visibleCompanies = COMPANIES.filter((company) => state.visibleCompanies.has(company.id));
  const exportCompanies = visibleCompanies.length > 0 ? visibleCompanies : COMPANIES;
  const metricKey = state.metric;
  const labels = getVisibleLabels();
  const frequencyMeta = FREQUENCY_META[state.frequency] ?? FREQUENCY_META.quarterly;
  const rows = [];

  rows.push(["Metric", METRICS[metricKey].label]);
  rows.push(["Unit", METRICS[metricKey].axisLabel]);
  rows.push(["Periodicity", frequencyMeta.csvPeriodicity]);
  rows.push(["Periods", `${labels[0]}-${labels[labels.length - 1]}`]);
  rows.push([
    "ExportedAt",
    new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date()),
  ]);
  rows.push([]);

  rows.push([
    frequencyMeta.csvPeriodColumn,
    ...exportCompanies.map((company) => company.name),
    ...exportCompanies.map((company) => `${company.name}_预测标记`),
  ]);

  labels.forEach((label) => {
    const values = exportCompanies.map((company) => {
      const series = state.dataByFrequency[state.frequency][metricKey].get(company.id);
      return formatCsvMetricValue(metricKey, series?.get(label));
    });

    const flags = exportCompanies.map((company) => {
      const set = state.forecastFlagsByFrequency[state.frequency][metricKey].get(company.id) ?? new Set();
      return set.has(label) ? "Y" : "";
    });

    rows.push([label, ...values, ...flags]);
  });

  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function downloadCurrentMetricCsv() {
  if (!state.chart) {
    setStatus("图表尚未加载完成，暂时无法下载。", true);
    return;
  }

  const csv = buildCurrentMetricCsv();
  const metricToken = toMetricFileToken(state.metric);
  const freqToken = (FREQUENCY_META[state.frequency] ?? FREQUENCY_META.quarterly).fileToken;
  const fileStamp = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");

  const filename = `finance-${freqToken}-${metricToken}-${fileStamp}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

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
  const visibleLabels = fullLabels.slice(state.rangeStart, state.rangeEnd + 1);
  const metricKey = state.metric;
  const spanGapThreshold = metricKey === "pe" || metricKey === "roe" || metricKey === "grossMargin" ? 4 : false;

  const datasets = COMPANIES.map((company) => {
    const series = state.dataByFrequency[state.frequency][metricKey].get(company.id) ?? emptySeries(fullLabels);
    const forecasted = state.forecastFlagsByFrequency[state.frequency][metricKey].get(company.id) ?? new Set();

    const fullData = fullLabels.map((label) => series.get(label) ?? null);

    return {
      label: company.name,
      companyId: company.id,
      data: fullData.slice(state.rangeStart, state.rangeEnd + 1),
      forecastedLabels: [...forecasted],
      borderColor: company.color,
      backgroundColor: company.color,
      borderWidth: 2.2,
      pointRadius: 1.8,
      pointHoverRadius: 5,
      pointHitRadius: 10,
      spanGaps: spanGapThreshold,
      tension: 0.2,
      hidden: !state.visibleCompanies.has(company.id),
    };
  });

  return { labels: visibleLabels, datasets };
}

function formatXAxisTick(label) {
  if (state.frequency === "annual") return label;
  if (typeof label !== "string") return "";
  return label.endsWith("Q1") ? label.slice(0, 4) : "";
}

function refreshChart() {
  if (!state.chart) return;

  const { labels, datasets } = buildDatasetsForView();
  state.chart.data.labels = labels;
  state.chart.data.datasets = datasets;
  state.chart.options.scales.y.title.text = METRICS[state.metric].axisLabel;
  state.chart.options.scales.x.title.text = (FREQUENCY_META[state.frequency] ?? FREQUENCY_META.quarterly).axisTitle;
  state.chart.update();
  alignRangeWithChartAxis();
  updateRangeVisual();
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
    refreshChart();
  });

  label.append(checkbox, dot, text);
  return label;
}

function setupTogglePanel() {
  togglesEl.innerHTML = "";
  COMPANIES.forEach((company) => {
    togglesEl.appendChild(createToggle(company));
  });
}

function setAllVisibility(visible) {
  state.visibleCompanies = visible ? new Set(COMPANIES.map((item) => item.id)) : new Set();

  const checkboxes = togglesEl.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    checkbox.checked = visible;
  });

  refreshChart();
}

function buildChart() {
  const themeTokens = getChartThemeTokens();

  const { labels, datasets } = buildDatasetsForView();

  state.chart = new Chart(chartEl, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          right: 52,
        },
      },
      onResize() {
        alignRangeWithChartAxis();
        updateRangeVisual();
      },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          border: { color: "rgba(0,0,0,0)" },
          title: {
            display: true,
            text: (FREQUENCY_META[state.frequency] ?? FREQUENCY_META.quarterly).axisTitle,
            color: themeTokens.axisColor,
            font: { family: "IBM Plex Mono, monospace", size: 11 },
          },
          ticks: {
            autoSkip: false,
            color: themeTokens.axisColor,
            font: { family: "IBM Plex Mono, monospace", size: 10 },
            callback(value) {
              const label = this.getLabelForValue(value);
              return formatXAxisTick(label);
            },
          },
          grid: { color: themeTokens.gridColor },
        },
        y: {
          border: { color: "rgba(0,0,0,0)" },
          title: {
            display: true,
            text: METRICS[state.metric].axisLabel,
            color: themeTokens.axisColor,
            font: { family: "IBM Plex Mono, monospace", size: 11 },
          },
          ticks: {
            color: themeTokens.axisColor,
            font: { family: "IBM Plex Mono, monospace", size: 10 },
            callback(value) {
              return formatYAxisTick(state.metric, Number(value));
            },
          },
          grid: { color: themeTokens.gridColor },
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
    plugins: [rightTickerLabelsPlugin],
  });
}

function bindEvents() {
  showAllBtn.addEventListener("click", () => setAllVisibility(true));
  hideAllBtn.addEventListener("click", () => setAllVisibility(false));

  metricInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.metric = input.value;
      refreshChart();
    });
  });

  frequencyInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.frequency = input.value;
      const labels = getLabelsForFrequency(state.frequency);
      state.rangeStart = 0;
      state.rangeEnd = labels.length - 1;
      syncRangeControls();
      refreshChart();
    });
  });

  rangeStartEl.addEventListener("input", () => {
    const next = Number(rangeStartEl.value);
    state.rangeStart = Number.isFinite(next) ? next : state.rangeStart;
    if (state.rangeStart > state.rangeEnd) state.rangeEnd = state.rangeStart;
    syncRangeControls();
    refreshChart();
  });

  rangeEndEl.addEventListener("input", () => {
    const next = Number(rangeEndEl.value);
    state.rangeEnd = Number.isFinite(next) ? next : state.rangeEnd;
    if (state.rangeEnd < state.rangeStart) state.rangeStart = state.rangeEnd;
    syncRangeControls();
    refreshChart();
  });

  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      downloadCurrentMetricCsv();
    });
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const nextTheme = document.body.dataset.theme === "deep" ? "fresh" : "deep";
      applyTheme(nextTheme, { persist: true, refreshChartStyle: true });
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

  try {
    const { warnings, loadedCount, forecastCount, generatedAt } = loadFromLocalData();

    if (loadedCount === 0) {
      throw new Error("本地数据为空，请重新生成 data.js");
    }

    state.rangeStart = 0;
    state.rangeEnd = getLabelsForFrequency(state.frequency).length - 1;
    syncRangeControls();
    buildChart();
    alignRangeWithChartAxis();
    updateRangeVisual();

    const stamp = formatGeneratedAt(generatedAt);

    if (warnings.length > 0) {
      setStatus(
        `加载完成：${loadedCount}/${COMPANIES.length} 家公司可用（季度 + 年度 + 滚动年度（TTM）三模式，数据时间 ${stamp}），${warnings.length} 家缺失。预测补点 ${forecastCount} 个。`,
        true,
      );
      return;
    }

    setStatus(`加载完成：季度 + 年度 + 滚动年度（TTM）三模式，数据时间 ${stamp}，预测补点 ${forecastCount} 个。`, false);
  } catch (error) {
    console.error(error);
    setStatus(`加载失败：${error.message}`, true);
  }
}

init();
