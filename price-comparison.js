(function attachPriceComparison(globalScope) {
  const ALLOWED_PRICE_COMPARISON_METRICS = new Set(["revenue", "netIncome"]);
  const PRICE_OVERLAY_DATASET_ORDER = 0;
  const FINANCIAL_BAR_DATASET_ORDER = 1;

  function canShowPriceComparison({ visibleCompanyCount, chartMode, metric }) {
    return visibleCompanyCount === 1
      && chartMode === "bar"
      && ALLOWED_PRICE_COMPARISON_METRICS.has(metric);
  }

  function normalizePriceComparisonEnabled({
    enabled,
    visibleCompanyCount,
    chartMode,
    metric,
    hasDailyPrices,
  }) {
    return Boolean(enabled)
      && Boolean(hasDailyPrices)
      && canShowPriceComparison({ visibleCompanyCount, chartMode, metric });
  }

  function shouldResetPriceComparison({
    enabled,
    visibleCompanyCount,
    chartMode,
    metric,
  }) {
    return Boolean(enabled)
      && !canShowPriceComparison({ visibleCompanyCount, chartMode, metric });
  }

  function quarterToDateRange(label) {
    const match = /^(\d{4})Q([1-4])$/.exec(label);
    if (!match) return null;

    const year = Number(match[1]);
    const quarter = Number(match[2]);
    const quarterRanges = [
      ["01-01", "03-31"],
      ["04-01", "06-30"],
      ["07-01", "09-30"],
      ["10-01", "12-31"],
    ];
    const [start, end] = quarterRanges[quarter - 1];
    return {
      startDate: `${year}-${start}`,
      endDate: `${year}-${end}`,
    };
  }

  function annualToDateRange(label) {
    if (!/^\d{4}$/.test(label)) return null;
    return {
      startDate: `${label}-01-01`,
      endDate: `${label}-12-31`,
    };
  }

  function getVisiblePeriodDateRange(visibleLabels, frequency) {
    if (!Array.isArray(visibleLabels) || visibleLabels.length === 0) return null;

    const firstLabel = visibleLabels[0];
    const lastLabel = visibleLabels.at(-1);
    const resolver = frequency === "annual" ? annualToDateRange : quarterToDateRange;
    const firstRange = resolver(firstLabel);
    const lastRange = resolver(lastLabel);
    if (!firstRange || !lastRange) return null;

    return {
      startDate: firstRange.startDate,
      endDate: lastRange.endDate,
    };
  }

  function dateToUtcMs(dateKey) {
    const ms = Date.parse(`${dateKey}T00:00:00Z`);
    return Number.isFinite(ms) ? ms : null;
  }

  function buildVisiblePeriodSlots(visibleLabels, frequency) {
    if (!Array.isArray(visibleLabels)) return [];

    const resolver = frequency === "annual" ? annualToDateRange : quarterToDateRange;
    return visibleLabels
      .map((label, index) => {
        const range = resolver(label);
        if (!range) return null;

        const startMs = dateToUtcMs(range.startDate);
        const endMs = dateToUtcMs(range.endDate);
        if (startMs == null || endMs == null || endMs <= startMs) return null;

        return {
          index,
          startMs,
          endMs,
        };
      })
      .filter(Boolean);
  }

  function buildFinancialPeriodEndSeries({ values, visibleLabels, frequency, periodEndDates }) {
    if (!Array.isArray(values) || !Array.isArray(visibleLabels)) return [];

    const slots = buildVisiblePeriodSlots(visibleLabels, frequency);
    const useReportedPeriodEndDates = Boolean(periodEndDates)
      && visibleLabels.every((label, index) => {
        const rawValue = values[index];
        const hasFinancialValue = rawValue != null && rawValue !== "" && Number.isFinite(Number(rawValue));
        return !hasFinancialValue || dateToUtcMs(periodEndDates[label]) != null;
      });

    return values.map((rawValue, index) => {
      const slot = slots.find((candidate) => candidate.index === index);
      const label = visibleLabels[index];
      if (!slot || !label) return null;

      const range = frequency === "annual" ? annualToDateRange(label) : quarterToDateRange(label);
      if (!range) return null;

      const reportedEndDate = useReportedPeriodEndDates ? periodEndDates[label] : null;
      const periodEndDate = dateToUtcMs(reportedEndDate) == null ? range.endDate : reportedEndDate;
      const periodEndMs = dateToUtcMs(periodEndDate);
      const ratio = periodEndMs == null ? 1 : (periodEndMs - slot.startMs) / (slot.endMs - slot.startMs);
      const value = rawValue == null || rawValue === "" ? null : Number(rawValue);
      return {
        x: (index - 0.5) + ratio,
        y: Number.isFinite(value) ? value : null,
        periodLabel: label,
        periodEndDate,
      };
    });
  }

  function findPeriodLabelForDate(dateKey, allLabels, frequency) {
    const dateMs = dateToUtcMs(dateKey);
    if (dateMs == null) return null;

    if (frequency === "annual") {
      return dateKey.slice(0, 4);
    }

    const month = Number(dateKey.slice(5, 7));
    if (!Number.isFinite(month)) return null;
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${dateKey.slice(0, 4)}Q${quarter}`;
  }

  function comparePeriodLabels(left, right, frequency) {
    if (frequency === "annual") return Number(left) - Number(right);

    const leftMatch = /^(\d{4})Q([1-4])$/.exec(left);
    const rightMatch = /^(\d{4})Q([1-4])$/.exec(right);
    if (!leftMatch || !rightMatch) return 0;
    return (Number(leftMatch[1]) * 4 + Number(leftMatch[2]))
      - (Number(rightMatch[1]) * 4 + Number(rightMatch[2]));
  }

  function nextPeriodLabel(label, frequency) {
    if (frequency === "annual") return String(Number(label) + 1);

    const match = /^(\d{4})Q([1-4])$/.exec(label);
    if (!match) return null;
    const year = Number(match[1]);
    const quarter = Number(match[2]);
    return quarter === 4 ? `${year + 1}Q1` : `${year}Q${quarter + 1}`;
  }

  function extendVisibleLabelsThroughLatestPrice({
    visibleLabels,
    allLabels,
    dailyPrices,
    frequency,
    allowExtension = true,
  }) {
    if (!Array.isArray(visibleLabels) || visibleLabels.length === 0) return [];
    if (!Array.isArray(allLabels) || allLabels.length === 0) return [...visibleLabels];
    if (!dailyPrices || typeof dailyPrices !== "object") return [...visibleLabels];
    if (!allowExtension) return [...visibleLabels];

    const latestPriceDate = Object.keys(dailyPrices)
      .filter((date) => dateToUtcMs(date) != null)
      .sort()
      .at(-1);
    const latestPriceLabel = latestPriceDate ? findPeriodLabelForDate(latestPriceDate, allLabels, frequency) : null;
    if (!latestPriceLabel) return [...visibleLabels];

    const firstVisibleIndex = allLabels.indexOf(visibleLabels[0]);
    const lastVisibleIndex = allLabels.indexOf(visibleLabels.at(-1));
    if (firstVisibleIndex < 0 || lastVisibleIndex < 0) {
      return [...visibleLabels];
    }
    if (comparePeriodLabels(latestPriceLabel, visibleLabels.at(-1), frequency) <= 0) {
      return [...visibleLabels];
    }

    const labels = [...visibleLabels];
    while (comparePeriodLabels(labels.at(-1), latestPriceLabel, frequency) < 0) {
      const nextLabel = nextPeriodLabel(labels.at(-1), frequency);
      if (!nextLabel) break;
      labels.push(nextLabel);
    }
    return labels;
  }

  function extendRangeEndThroughLatestPrice({
    rangeStart,
    rangeEnd,
    allLabels,
    dailyPrices,
    frequency,
    allowExtension = true,
  }) {
    const normalizedStart = Number(rangeStart);
    const normalizedEnd = Number(rangeEnd);

    if (!Number.isInteger(normalizedStart) || !Number.isInteger(normalizedEnd)) return rangeEnd;
    if (!Array.isArray(allLabels) || allLabels.length === 0) return normalizedEnd;
    if (!allowExtension || !dailyPrices || typeof dailyPrices !== "object") return normalizedEnd;

    const boundedStart = Math.max(0, Math.min(normalizedStart, allLabels.length - 1));
    const boundedEnd = Math.max(boundedStart, Math.min(normalizedEnd, allLabels.length - 1));
    const visibleLabels = allLabels.slice(boundedStart, boundedEnd + 1);
    const extendedLabels = extendVisibleLabelsThroughLatestPrice({
      visibleLabels,
      allLabels,
      dailyPrices,
      frequency,
      allowExtension,
    });
    const extendedEnd = allLabels.indexOf(extendedLabels.at(-1));

    return extendedEnd > boundedEnd ? extendedEnd : boundedEnd;
  }

  function shouldExtendPriceComparisonLabels({
    rangeEnd,
    latestVisibleFinancialIndex,
    allLabelsLength,
  }) {
    const normalizedRangeEnd = Number(rangeEnd);
    const normalizedLatestFinancialIndex = Number(latestVisibleFinancialIndex);
    const normalizedAllLabelsLength = Number(allLabelsLength);

    if (!Number.isFinite(normalizedRangeEnd) || normalizedRangeEnd < 0) return false;
    if (!Number.isFinite(normalizedAllLabelsLength) || normalizedAllLabelsLength <= 0) return false;
    if (!Number.isFinite(normalizedLatestFinancialIndex) || normalizedLatestFinancialIndex < 0) {
      return normalizedRangeEnd >= normalizedAllLabelsLength - 1;
    }

    return normalizedRangeEnd >= Math.min(
      normalizedLatestFinancialIndex,
      normalizedAllLabelsLength - 1,
    );
  }

  function aggregateFlowRollingAnnualEntries(entries) {
    if (!Array.isArray(entries)) return [];

    return entries.map(([label], index) => {
      const windowStart = index - 3;
      if (windowStart < 0) {
        return [label, null];
      }
      const windowEntries = entries.slice(windowStart, index + 1);
      const values = windowEntries
        .map(([, value]) => (value == null || value === "" ? null : Number(value)))
        .filter((value) => Number.isFinite(value));

      if (windowEntries.length !== 4 || values.length !== windowEntries.length) {
        return [label, null];
      }

      const sum = values.reduce((total, value) => total + value, 0);
      return [label, sum];
    });
  }

  function aggregatePointRollingAverageEntries(entries) {
    if (!Array.isArray(entries)) return [];

    return entries.map(([label], index) => {
      const windowStart = index - 3;
      if (windowStart < 0) {
        return [label, null];
      }
      const windowEntries = entries.slice(windowStart, index + 1);
      const values = windowEntries
        .map(([, value]) => (value == null || value === "" ? null : Number(value)))
        .filter((value) => Number.isFinite(value));

      if (windowEntries.length !== 4 || values.length !== windowEntries.length) {
        return [label, null];
      }

      const sum = values.reduce((total, value) => total + value, 0);
      return [label, sum / values.length];
    });
  }

  function aggregateMarginRollingAnnualEntries(entries) {
    if (!Array.isArray(entries)) return [];

    return entries.map(([label], index) => {
      const windowStart = index - 3;
      if (windowStart < 0) {
        return [label, null];
      }
      const windowEntries = entries.slice(windowStart, index + 1);
      const pairs = windowEntries.map(([, pair]) => ({
        margin: pair?.margin == null || pair?.margin === "" ? null : Number(pair.margin),
        revenue: pair?.revenue == null || pair?.revenue === "" ? null : Number(pair.revenue),
      }));

      if (
        windowEntries.length !== 4 ||
        !pairs.every((pair) => Number.isFinite(pair.margin) && Number.isFinite(pair.revenue))
      ) {
        return [label, null];
      }

      const revenueSum = pairs.reduce((sum, pair) => sum + pair.revenue, 0);
      if (!Number.isFinite(revenueSum) || revenueSum === 0) {
        return [label, null];
      }

      const grossProfitSum = pairs.reduce((sum, pair) => sum + (pair.margin / 100) * pair.revenue, 0);
      return [label, (grossProfitSum / revenueSum) * 100];
    });
  }

  function buildProjectedPriceSeries({ dailyPrices, visibleLabels, frequency }) {
    const slots = buildVisiblePeriodSlots(visibleLabels, frequency);
    if (slots.length === 0 || !dailyPrices || typeof dailyPrices !== "object") return [];

    return Object.entries(dailyPrices)
      .map(([date, value]) => ({ date, value: Number(value), ms: dateToUtcMs(date) }))
      .filter((item) => item.ms != null
        && Number.isFinite(item.value))
      .sort((left, right) => left.ms - right.ms)
      .map((item) => {
        const slot = slots.find((candidate) => item.ms >= candidate.startMs && item.ms <= candidate.endMs);
        if (!slot) return null;

        const ratio = (item.ms - slot.startMs) / (slot.endMs - slot.startMs);
        return {
          x: (slot.index - 0.5) + ratio,
          y: item.value,
          date: item.date,
        };
      })
      .filter(Boolean);
  }

  function getPriceOverlayDatasetOrder() {
    return PRICE_OVERLAY_DATASET_ORDER;
  }

  function getFinancialBarDatasetOrder() {
    return FINANCIAL_BAR_DATASET_ORDER;
  }

  function alignSecondaryAxisZero({ primaryBounds, secondaryBounds }) {
    const primaryMin = Number(primaryBounds?.min);
    const primaryMax = Number(primaryBounds?.max);
    const secondaryMin = Number(secondaryBounds?.min);
    const secondaryMax = Number(secondaryBounds?.max);
    if (![primaryMin, primaryMax, secondaryMin, secondaryMax].every(Number.isFinite)) {
      return secondaryBounds;
    }
    if (primaryMin >= 0 || secondaryMin < 0 || primaryMax <= 0 || secondaryMax <= 0) {
      return secondaryBounds;
    }

    const zeroRatio = (0 - primaryMin) / (primaryMax - primaryMin);
    if (!(zeroRatio > 0 && zeroRatio < 1)) return secondaryBounds;

    return {
      min: -((zeroRatio / (1 - zeroRatio)) * secondaryMax),
      max: secondaryMax,
    };
  }

  const COMPACT_ZERO_BASELINE_METRICS = new Set(["netIncome"]);
  const COMPACT_ZERO_BASELINE_RATIO = 0.025;
  const COMPACT_NEGATIVE_VALUE_PADDING_RATIO = 0.15;
  const COMPACT_NEGATIVE_MAX_SHARE = 0.12;

  function computeCompactBarZeroBaselineMin({ metricKey, chartMode, min, max }) {
    const numericMin = Number(min);
    const numericMax = Number(max);
    if (chartMode !== "bar") return null;
    if (!COMPACT_ZERO_BASELINE_METRICS.has(metricKey)) return null;
    if (!Number.isFinite(numericMin) || !Number.isFinite(numericMax) || numericMax <= 0) return null;

    if (numericMin >= 0) {
      return -(numericMax * COMPACT_ZERO_BASELINE_RATIO);
    }

    const negativeMagnitude = Math.abs(numericMin);
    if (negativeMagnitude / numericMax > COMPACT_NEGATIVE_MAX_SHARE) {
      return null;
    }

    return -Math.max(
      numericMax * COMPACT_ZERO_BASELINE_RATIO,
      negativeMagnitude * (1 + COMPACT_NEGATIVE_VALUE_PADDING_RATIO),
    );
  }

  const api = {
    canShowPriceComparison,
    shouldResetPriceComparison,
    normalizePriceComparisonEnabled,
    getVisiblePeriodDateRange,
    extendVisibleLabelsThroughLatestPrice,
    extendRangeEndThroughLatestPrice,
    shouldExtendPriceComparisonLabels,
    buildFinancialPeriodEndSeries,
    buildProjectedPriceSeries,
    getPriceOverlayDatasetOrder,
    getFinancialBarDatasetOrder,
    alignSecondaryAxisZero,
    computeCompactBarZeroBaselineMin,
    aggregateFlowRollingAnnualEntries,
    aggregatePointRollingAverageEntries,
    aggregateMarginRollingAnnualEntries,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.PriceComparisonUtils = api;
})(typeof window !== "undefined" ? window : globalThis);
