(function attachFinancialMetrics(globalScope) {
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

      growth.set(label, ((current - previous) / Math.abs(previous)) * 100);
    });

    return growth;
  }

  const api = { computeYearOverYearGrowth };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.FinancialMetricsUtils = api;
})(typeof window !== "undefined" ? window : globalThis);
