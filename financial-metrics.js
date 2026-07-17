(function attachFinancialMetrics(globalScope) {
  const MAX_COMPARABLE_GROWTH_PERCENT = 1000;
  const GROWTH_OVERLAY_METRICS = Object.freeze({
    revenue: "revenueGrowth",
    netIncome: "profitGrowth",
  });

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function computeYearOverYearGrowth(labels, valueSeries, lag) {
    const growth = new Map(labels.map((label) => [label, null]));

    labels.forEach((label, index) => {
      if (index < lag) return;

      const previous = valueSeries.get(labels[index - lag]);
      const current = valueSeries.get(label);
      if (!isFiniteNumber(previous) || !isFiniteNumber(current) || previous === 0) return;

      // A percentage change across the profit/loss boundary is conventionally
      // not meaningful. The same applies to four-digit changes produced by an
      // immaterial comparison base; plotting either case distorts the chart.
      if ((previous < 0 && current >= 0) || (previous >= 0 && current < 0)) return;

      const value = ((current - previous) / Math.abs(previous)) * 100;
      if (Math.abs(value) > MAX_COMPARABLE_GROWTH_PERCENT) return;
      growth.set(label, value);
    });

    return growth;
  }

  function getGrowthOverlayMetric(metric) {
    return GROWTH_OVERLAY_METRICS[metric] ?? null;
  }

  function canShowGrowthOverlay({ visibleCompanyCount, chartMode, metric }) {
    return Number(visibleCompanyCount) === 1
      && chartMode === "bar"
      && getGrowthOverlayMetric(metric) != null;
  }

  function normalizeGrowthOverlayEnabled({ enabled, visibleCompanyCount, chartMode, metric }) {
    return Boolean(enabled) && canShowGrowthOverlay({ visibleCompanyCount, chartMode, metric });
  }

  function shouldCarryGrowthOverlay({ enabled, nextMetric }) {
    return Boolean(enabled) && getGrowthOverlayMetric(nextMetric) != null;
  }

  function getNiceAxisStep(range, targetMaxTicks = 10) {
    if (!Number.isFinite(range) || range <= 0) return 1;

    const magnitude = 10 ** Math.floor(Math.log10(range));
    const multipliers = [1, 2, 2.5, 5, 10];

    for (let powerOffset = -1; powerOffset <= 2; powerOffset += 1) {
      const base = magnitude * (10 ** powerOffset);
      for (const multiplier of multipliers) {
        const step = base * multiplier;
        if (range / step <= targetMaxTicks) return step;
      }
    }

    return magnitude * 10;
  }

  function computeTightMixedAxisBounds({ min, max, targetMaxTicks = 10 } = {}) {
    const numericMin = Number(min);
    const numericMax = Number(max);
    if (!Number.isFinite(numericMin) || !Number.isFinite(numericMax)) return null;
    if (numericMin >= 0 || numericMax <= 0 || numericMax <= numericMin) return null;

    // Tick rounding already supplies breathing room around mixed-sign bars.
    // Padding before this pass can cross a tick boundary and create an entire
    // unused band (for example, -1.9B becoming a -4B axis minimum).
    const step = getNiceAxisStep(numericMax - numericMin, targetMaxTicks);
    return {
      min: Number((Math.floor(numericMin / step) * step).toPrecision(12)),
      max: Number((Math.ceil(numericMax / step) * step).toPrecision(12)),
    };
  }

  function normalizeAxisBounds(bounds) {
    const rawMin = Number(bounds?.min);
    const rawMax = Number(bounds?.max);
    if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax) || rawMax <= rawMin) {
      return { min: 0, max: 1 };
    }
    return {
      min: Math.min(0, rawMin),
      max: Math.max(0, rawMax),
    };
  }

  function getZeroRatio(bounds) {
    const span = bounds.max - bounds.min;
    return span > 0 ? (0 - bounds.min) / span : 0;
  }

  function niceCeiling(value) {
    if (!Number.isFinite(value) || value <= 0) return 1;

    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    const steps = [
      1, 1.1, 1.2, 1.25, 1.3, 1.4, 1.5, 1.6, 1.75, 1.8,
      2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.5,
      5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10,
    ];
    const step = steps.find((candidate) => candidate >= normalized - 1e-12) ?? 10;
    return step * magnitude;
  }

  function expandBoundsToFriendlyRatio(bounds, { numerator, denominator }) {
    const positiveParts = denominator - numerator;
    const positiveExtent = Math.max(0, bounds.max);
    const negativeExtent = Math.max(0, -bounds.min);
    const unit = niceCeiling(
      Math.max(
        positiveExtent / positiveParts,
        negativeExtent / numerator,
        Number.EPSILON,
      ),
    );
    return {
      min: -(unit * numerator),
      max: unit * positiveParts,
    };
  }

  function buildFriendlyZeroRatioCandidates(maxDenominator = 20) {
    const candidates = [];
    const seenRatios = new Set();

    for (let denominator = 2; denominator <= maxDenominator; denominator += 1) {
      for (let numerator = 1; numerator < denominator; numerator += 1) {
        const divisor = (() => {
          let left = numerator;
          let right = denominator;
          while (right !== 0) {
            const remainder = left % right;
            left = right;
            right = remainder;
          }
          return left;
        })();
        const reducedNumerator = numerator / divisor;
        const reducedDenominator = denominator / divisor;
        const ratioKey = `${reducedNumerator}/${reducedDenominator}`;
        if (seenRatios.has(ratioKey)) continue;
        seenRatios.add(ratioKey);
        candidates.push({
          numerator: reducedNumerator,
          denominator: reducedDenominator,
        });
      }
    }

    return candidates;
  }

  function alignYAxisZeroPositions({ primaryBounds, secondaryBounds }) {
    const primary = normalizeAxisBounds(primaryBounds);
    const secondary = normalizeAxisBounds(secondaryBounds);
    const primaryRatio = getZeroRatio(primary);
    const secondaryRatio = getZeroRatio(secondary);

    if (Math.abs(primaryRatio - secondaryRatio) < 1e-9) {
      return { primaryBounds: primary, secondaryBounds: secondary, zeroRatio: primaryRatio };
    }

    const candidates = buildFriendlyZeroRatioCandidates();

    const primarySpan = primary.max - primary.min;
    const secondarySpan = secondary.max - secondary.min;
    let best = null;

    candidates.forEach((candidate) => {
      const zeroRatio = candidate.numerator / candidate.denominator;
      const nextPrimary = expandBoundsToFriendlyRatio(primary, candidate);
      const nextSecondary = expandBoundsToFriendlyRatio(secondary, candidate);
      const primaryExpansion = (nextPrimary.max - nextPrimary.min) / primarySpan;
      const secondaryExpansion = (nextSecondary.max - nextSecondary.min) / secondarySpan;
      const cost = primaryExpansion + secondaryExpansion * 1.15;

      if (!best || cost < best.cost) {
        best = {
          cost,
          zeroRatio,
          primaryBounds: nextPrimary,
          secondaryBounds: nextSecondary,
        };
      }
    });

    return best ?? { primaryBounds: primary, secondaryBounds: secondary, zeroRatio: primaryRatio };
  }

  function computeGrowthChartExpansionRatio({ primaryBounds, alignedPrimaryBounds }) {
    const primary = normalizeAxisBounds(primaryBounds);
    const aligned = normalizeAxisBounds(alignedPrimaryBounds);
    const primarySpan = primary.max - primary.min;
    const alignedSpan = aligned.max - aligned.min;
    if (primarySpan <= 0 || alignedSpan <= primarySpan) return 1;
    return alignedSpan / primarySpan;
  }

  function resolveWatermarkReferencePlotHeight({
    plotHeight,
    basePlotHeight,
    growthChartExtraHeight,
    hasGrowthOverlay,
  }) {
    const currentHeight = Number(plotHeight);
    if (!Number.isFinite(currentHeight) || currentHeight <= 0) return 0;
    if (!hasGrowthOverlay) return currentHeight;

    const recordedBaseHeight = Number(basePlotHeight);
    if (Number.isFinite(recordedBaseHeight) && recordedBaseHeight > 0) {
      return Math.min(currentHeight, recordedBaseHeight);
    }

    const extraHeight = Math.max(0, Number(growthChartExtraHeight) || 0);
    return Math.max(1, currentHeight - extraHeight);
  }

  const api = {
    computeYearOverYearGrowth,
    getGrowthOverlayMetric,
    canShowGrowthOverlay,
    normalizeGrowthOverlayEnabled,
    shouldCarryGrowthOverlay,
    computeTightMixedAxisBounds,
    alignYAxisZeroPositions,
    computeGrowthChartExpansionRatio,
    resolveWatermarkReferencePlotHeight,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.FinancialMetricsUtils = api;
})(typeof window !== "undefined" ? window : globalThis);
